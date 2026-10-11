import {
  AnalyticsDateRange,
  AnalyticsFilter,
  ActivityEvidenceItem,
  DateRangePreset,
  DevelopmentPointStats,
  GoalExecutionRow,
  LifeAreaDashboardData,
  LifeAreaOverviewCardData,
  PointBreakdownRow,
  PointEventView,
  ProjectExecutionRow,
  ReviewOverview,
  TaskExecutionStats,
  TrendSeriesBundle,
  TrendSeriesPoint,
} from '../../types/analytics.types';
import { Goal } from '../../types/goal.types';
import { Project } from '../../types/project.types';
import { Task, TaskStatus } from '../../types/task.types';
import { Activity } from '../../types/activity.types';
import { getISOWeekString, getWeekDateRange, getTodayDateString } from '../../utils/dateUtils';
import { GoalHierarchy } from '../../utils/goalHierarchy';
import { posDexieDb } from '../adapters/dexie/posDexieDb';
import { DexieActivityRepository } from '../adapters/dexie/DexieActivityRepository';
import { DexieGoalRepository } from '../adapters/dexie/DexieGoalRepository';
import { DexieProjectRepository } from '../adapters/dexie/DexieProjectRepository';
import { DexieTaskRepository } from '../adapters/dexie/DexieTaskRepository';
import { DexieVisionRepository } from '../adapters/dexie/DexieVisionRepository';

// ============================================================
// Module 09 — Review & Analytics centralized query layer.
//
// READ-ONLY aggregation over the existing repositories / tables.
// The dashboard UI and the AI read tools consume THESE functions
// so both always report identical numbers (AI consistency contract).
//
// Performance contract:
// - One bounded fetch bundle per computation (goals, tasks, projects,
//   activities-in-range via [date+status], ledger events-in-range via
//   [status+occurred_at]). All aggregation is single-pass in-memory.
// - No N+1 loops; no full-ledger scans outside the selected period.
// ============================================================

/** Tasks that still count as open work for execution denominators. */
export const OPEN_TASK_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'not_started',
  'ready',
  'in_progress',
  'blocked',
  'waiting',
]);

/** Safety cap for range-bounded event fetches (personal-scale data). */
export const MAX_RANGE_EVENTS = 10_000;

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  practice_completion: 'Practice',
  task_completion: 'Task Completion',
  activity_completion: 'Activity',
  manual_award: 'Manual Entry',
  adjustment: 'Adjustment',
  goal: 'Goal Completed',
  sub_goal: 'Sub-goal Completed',
  project: 'Project',
  skill: 'Skill',
  level: 'Level',
};

// ─── Date-range resolution ─────────────────────────────────

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local calendar-day start as a UTC ISO instant (lexicographic-safe). */
export function dayStartISO(dateStr: string): string {
  return toLocalDate(dateStr).toISOString();
}

/** Local calendar-day end (23:59:59.999) as a UTC ISO instant. */
export function dayEndISO(dateStr: string): string {
  const d = toLocalDate(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function resolveDateRange(
  preset: DateRangePreset,
  custom?: { startDate: string; endDate: string }
): AnalyticsDateRange {
  const today = getTodayDateString();
  switch (preset) {
    case 'today':
      return { preset, startDate: today, endDate: today };
    case 'week': {
      const { startDate, endDate } = getWeekDateRange(getISOWeekString(new Date()));
      return { preset, startDate, endDate };
    }
    case 'month': {
      const now = new Date();
      const start = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = formatYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { preset, startDate: start, endDate: end };
    }
    case 'year':
      return {
        preset,
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`,
      };
    case 'custom':
      return {
        preset,
        startDate: custom?.startDate || today,
        endDate: custom?.endDate || today,
      };
  }
}

// ─── Internal shared fetch bundle ───────────────────────────

interface ReviewInputs {
  filter: AnalyticsFilter;
  goals: Goal[];
  tasks: Task[];
  projects: Project[];
  activitiesInRange: Activity[];
  eventsInRange: PointEventView[];
}

async function loadInputs(filter: AnalyticsFilter): Promise<ReviewInputs> {
  const activityRepo = new DexieActivityRepository();
  const goalRepo = new DexieGoalRepository();
  const taskRepo = new DexieTaskRepository();
  const projectRepo = new DexieProjectRepository();

  const startISO = dayStartISO(filter.startDate);
  const endISO = dayEndISO(filter.endDate);

  // Bounded ledger query: [status+occurred_at] between the local-day instants.
  let eventsCollection = posDexieDb.point_ledger
    .where('[status+occurred_at]')
    .between(['valid', startISO], ['valid', endISO], true, true)
    .reverse();

  if (filter.lifeAreaId) {
    eventsCollection = eventsCollection.filter(
      (e) => e.status === 'valid' && e.life_area_id === filter.lifeAreaId
    );
  }

  const [goals, tasks, projects, activitiesInRange, rawEvents] = await Promise.all([
    goalRepo.getGoals(),
    taskRepo.getAll(),
    projectRepo.getProjects({ status: 'all' }),
    activityRepo.getByDateRange(filter.startDate, filter.endDate),
    eventsCollection.limit(MAX_RANGE_EVENTS).toArray(),
  ]);

  const eventsInRange: PointEventView[] = rawEvents.map((e) => ({
    id: e.id,
    points: e.points,
    source_type: e.source_type,
    occurred_at: e.occurred_at,
    reason: e.reason,
    note: e.note,
    life_area_id: e.life_area_id,
    goal_id: e.goal_id,
    project_id: e.project_id,
    task_id: e.task_id,
    activity_id: e.activity_id,
    practice_id: e.practice_id,
    skill_id: e.skill_id,
  }));

  return { filter, goals, tasks, projects, activitiesInRange, eventsInRange };
}

// ─── Attribution helpers ─────────────────────────────────────

interface GoalContext {
  byId: Map<string, Goal>;
  /** Life Area of a goal via its own field or nearest ancestor. */
  areaOf(goalId: string): string | undefined;
}

export function buildGoalContext(goals: Goal[]): GoalContext {
  const byId = new Map<string, Goal>(goals.map((g) => [g.id, g]));
  const areaCache = new Map<string, string | undefined>();

  const areaOf = (goalId: string): string | undefined => {
    if (areaCache.has(goalId)) return areaCache.get(goalId);
    const seen = new Set<string>();
    let current = byId.get(goalId);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (current.life_area_id) {
        areaCache.set(goalId, current.life_area_id);
        return current.life_area_id;
      }
      if (!current.parent_goal_id) break;
      current = byId.get(current.parent_goal_id);
    }
    areaCache.set(goalId, undefined);
    return undefined;
  };

  return { byId, areaOf };
}

/**
 * Derives Life Area attribution for a task (tasks carry no area field).
 * Rule order: linked goal's ancestor chain → linked project → unassigned.
 */
function taskLifeArea(task: Task, goals: GoalContext, projectById: Map<string, Project>): string | undefined {
  if (task.related_goal_id) {
    const area = goals.areaOf(task.related_goal_id);
    if (area) return area;
  }
  if (task.related_project_id) {
    return projectById.get(task.related_project_id)?.life_area_id;
  }
  return undefined;
}

function taskGoalPathLabel(task: Task, goals: Goal[]): string | undefined {
  if (!task.related_goal_id) return undefined;
  return GoalHierarchy.formatGoalPath(task.related_goal_id, goals);
}

export function isWithinDayWindow(iso?: string, startDate?: string, endDate?: string): boolean {
  if (!iso || !startDate || !endDate) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const start = toLocalDate(startDate).getTime();
  const end = toLocalDate(endDate).getTime() + 24 * 3600 * 1000 - 1;
  return t >= start && t <= end;
}

// ─── Core aggregation primitives ────────────────────────────

interface ScopeStatsInput {
  tasks: Task[];
  goalsCtx: GoalContext;
  projectById: Map<string, Project>;
  filter: AnalyticsFilter;
}

/** Period-scoped task execution stats for an arbitrary predicate scope. */
function computeTaskExecution(scope: ScopeStatsInput, match: (t: Task) => boolean): TaskExecutionStats {
  const completedTasks = scope.tasks.filter(
    (t) =>
      match(t) &&
      t.status === 'completed' &&
      isWithinDayWindow(t.completed_at, scope.filter.startDate, scope.filter.endDate)
  ).length;

  const remainingTasks = scope.tasks.filter((t) => match(t) && OPEN_TASK_STATUSES.has(t.status)).length;

  const total = completedTasks + remainingTasks;
  return {
    completed: completedTasks,
    total,
    remaining: remainingTasks,
    percent: total > 0 ? Math.round((completedTasks / total) * 100) : null,
  };
}

/** Distinct goal ids with direct qualifying evidence inside the period. */
function collectEvidencedGoalIds(input: ReviewInputs, inScope: (goalId?: string) => boolean): Set<string> {
  const evidenced = new Set<string>();
  for (const t of input.tasks) {
    if (
      t.related_goal_id &&
      inScope(t.related_goal_id) &&
      t.status === 'completed' &&
      isWithinDayWindow(t.completed_at, input.filter?.startDate, input.filter?.endDate)
    ) {
      evidenced.add(t.related_goal_id);
    }
  }
  for (const a of input.activitiesInRange) {
    if (a.related_goal_id && inScope(a.related_goal_id)) evidenced.add(a.related_goal_id);
  }
  for (const e of input.eventsInRange) {
    if (e.goal_id && inScope(e.goal_id)) evidenced.add(e.goal_id);
  }
  return evidenced;
}

/** Distinct project ids with direct qualifying evidence inside the period. */
function collectAdvancedProjectIds(input: ReviewInputs): Set<string> {
  const advanced = new Set<string>();
  const projectIds = new Set(input.projects.map((p) => p.id));
  for (const t of input.tasks) {
    if (
      t.related_project_id &&
      projectIds.has(t.related_project_id) &&
      t.status === 'completed' &&
      isWithinDayWindow(t.completed_at, input.filter.startDate, input.filter.endDate)
    ) {
      advanced.add(t.related_project_id);
    }
  }
  for (const a of input.activitiesInRange) {
    if (a.related_project_id && projectIds.has(a.related_project_id)) advanced.add(a.related_project_id);
  }
  for (const e of input.eventsInRange) {
    if (e.project_id && projectIds.has(e.project_id)) advanced.add(e.project_id);
  }
  return advanced;
}

/**
 * Aggregates point stats over ONE event array. Every breakdown partitions the
 * same array, so all rows reconcile exactly with `total` / `eventCount`.
 */
function computePointStats(events: PointEventView[], goals: Goal[], projects: Project[], cap = 500): DevelopmentPointStats {
  const byGoalMap = new Map<string, { points: number; count: number; last?: string }>();
  const byProjectMap = new Map<string, { points: number; count: number; last?: string }>();
  const bySourceMap = new Map<string, { points: number; count: number; last?: string }>();

  for (const e of events) {
    if (e.goal_id) {
      const row = byGoalMap.get(e.goal_id) || { points: 0, count: 0 };
      row.points += e.points;
      row.count += 1;
      row.last = !row.last || e.occurred_at > row.last ? e.occurred_at : row.last;
      byGoalMap.set(e.goal_id, row);
    }
    if (e.project_id) {
      const row = byProjectMap.get(e.project_id) || { points: 0, count: 0 };
      row.points += e.points;
      row.count += 1;
      row.last = !row.last || e.occurred_at > row.last ? e.occurred_at : row.last;
      byProjectMap.set(e.project_id, row);
    }
    const src = bySourceMap.get(e.source_type) || { points: 0, count: 0 };
    src.points += e.points;
    src.count += 1;
    src.last = !src.last || e.occurred_at > src.last ? e.occurred_at : src.last;
    bySourceMap.set(e.source_type, src);
  }

  const goalTitle = new Map(goals.map((g) => [g.id, g.title]));
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));

  const toRows = (
    map: Map<string, { points: number; count: number; last?: string }>,
    labelOf: (key: string) => string
  ): PointBreakdownRow[] =>
    Array.from(map.entries())
      .map(([key, v]) => ({ key, label: labelOf(key), points: v.points, eventCount: v.count, lastOccurredAt: v.last }))
      .sort((a, b) => b.points - a.points || b.eventCount - a.eventCount);

  return {
    total: events.reduce((sum, e) => sum + e.points, 0),
    eventCount: events.length,
    byGoal: toRows(byGoalMap, (id) => goalTitle.get(id) || 'Unlinked Goal'),
    byProject: toRows(byProjectMap, (id) => projectTitle.get(id) || 'Unlinked Project'),
    bySourceType: toRows(bySourceMap, (type) => SOURCE_TYPE_LABELS[type] || type),
    events: events.slice(0, cap),
  };
}

function buildDailyBuckets(startDate: string, endDate: string): string[] {
  const buckets: string[] = [];
  const cursor = toLocalDate(startDate);
  const end = toLocalDate(endDate);
  while (cursor <= end) {
    buckets.push(formatYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

function computeTrendBundle(
  input: ReviewInputs,
  match?: { activity?: (a: Activity) => boolean; task?: (t: Task) => boolean; event?: (e: PointEventView) => boolean }
): TrendSeriesBundle {
  const days = buildDailyBuckets(input.filter.startDate, input.filter.endDate);

  const events = match?.event ? input.eventsInRange.filter(match.event) : input.eventsInRange;
  const activities = match?.activity ? input.activitiesInRange.filter(match.activity) : input.activitiesInRange;

  const pointsByDay = new Map<string, number>();
  for (const e of events) {
    const day = e.occurred_at.slice(0, 10);
    pointsByDay.set(day, (pointsByDay.get(day) || 0) + e.points);
  }

  const activitiesByDay = new Map<string, number>();
  for (const a of activities) {
    activitiesByDay.set(a.date, (activitiesByDay.get(a.date) || 0) + 1);
  }

  const tasksByDay = new Map<string, number>();
  for (const t of input.tasks) {
    if (match?.task && !match.task(t)) continue;
    if (t.status !== 'completed' || !t.completed_at) continue;
    const day = t.completed_at.slice(0, 10);
    if (day < input.filter.startDate || day > input.filter.endDate) continue;
    tasksByDay.set(day, (tasksByDay.get(day) || 0) + 1);
  }

  const series = (source: Map<string, number>): TrendSeriesPoint[] =>
    days.map((day) => ({
      date: day,
      label: day.slice(5).replace('-', '/'),
      value: source.get(day) || 0,
    }));

  return {
    granularity: 'day',
    points: series(pointsByDay),
    activities: series(activitiesByDay),
    tasks_completed: series(tasksByDay),
  };
}

function buildTimeline(
  input: ReviewInputs,
  goals: Goal[],
  projectById: Map<string, Project>,
  matchActivity?: (a: Activity) => boolean,
  limit = 60
): ActivityEvidenceItem[] {
  const pointsByActivity = new Map<string, number>();
  for (const e of input.eventsInRange) {
    if (!e.activity_id) continue;
    pointsByActivity.set(e.activity_id, (pointsByActivity.get(e.activity_id) || 0) + e.points);
  }

  const activities = matchActivity ? input.activitiesInRange.filter(matchActivity) : input.activitiesInRange;
  return activities
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
    .map((a) => {
      const project = a.related_project_id ? projectById.get(a.related_project_id) : undefined;
      return {
        id: a.id,
        date: a.date,
        title: a.title,
        category: a.category,
        durationMinutes: a.duration_minutes,
        projectId: a.related_project_id,
        projectTitle: project?.title,
        goalId: a.related_goal_id,
        goalPathLabel: a.related_goal_id ? GoalHierarchy.formatGoalPath(a.related_goal_id, goals) : undefined,
        points: pointsByActivity.get(a.id),
      };
    });
}

function buildTaskDrilldown(
  input: ReviewInputs,
  projectById: Map<string, Project>,
  match: (t: Task) => boolean
) {
  const pointsByTask = new Map<string, number>();
  for (const e of input.eventsInRange) {
    if (!e.task_id) continue;
    pointsByTask.set(e.task_id, (pointsByTask.get(e.task_id) || 0) + e.points);
  }

  const decorate = (t: Task) => {
    const project = t.related_project_id ? projectById.get(t.related_project_id) : undefined;
    return {
      id: t.id,
      title: t.title,
      goalId: t.related_goal_id,
      goalPathLabel: taskGoalPathLabel(t, input.goals),
      projectName: project?.title,
    };
  };

  return {
    completed: input.tasks
      .filter(
        (t) =>
          match(t) &&
          t.status === 'completed' &&
          isWithinDayWindow(t.completed_at, input.filter.startDate, input.filter.endDate)
      )
      .sort((a, b) => ((a.completed_at || '') < (b.completed_at || '') ? 1 : -1))
      .map((t) => ({ ...decorate(t), completedAt: t.completed_at, points: pointsByTask.get(t.id) })),
    remaining: input.tasks
      .filter((t) => match(t) && OPEN_TASK_STATUSES.has(t.status))
      .map((t) => ({ ...decorate(t), status: t.status })),
  };
}

// ─── Public analytics API ────────────────────────────────────

/** Level 1 — cross-area overview for the selected period. */
export async function getReviewOverview(filter: AnalyticsFilter): Promise<ReviewOverview> {
  const inputs = await loadInputs(filter);
  const goalsCtx = buildGoalContext(inputs.goals);
  const projectById = new Map(inputs.projects.map((p) => [p.id, p]));

  const areas = await new DexieVisionRepository().getLifeAreas();
  const activeAreas = areas.filter((a) => a.status === 'active').sort((a, b) => a.sort_order - b.sort_order);

  // Global KPI facts from the same fetched inputs.
  const completedTasksInRange = inputs.tasks.filter(
    (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, filter.startDate, filter.endDate)
  );

  const evidencedGoals = Array.from(collectEvidencedGoalIds(inputs, () => true));
  const goalsProgressed = evidencedGoals.filter((id) => !goalsCtx.byId.get(id)?.parent_goal_id).length;
  const subGoalsProgressed = evidencedGoals.length - goalsProgressed;
  const projectsAdvanced = collectAdvancedProjectIds(inputs);

  const kpis = {
    tasksCompleted: completedTasksInRange.length,
    projectsAdvanced: projectsAdvanced.size,
    goalsProgressed,
    subGoalsProgressed,
    activitiesLogged: inputs.activitiesInRange.length,
    developmentPoints: inputs.eventsInRange.reduce((sum, e) => sum + e.points, 0),
  };

  const byLifeArea: LifeAreaOverviewCardData[] = activeAreas.map((area) => {
    const areaEvents = inputs.eventsInRange.filter((e) => e.life_area_id === area.id);
    const inArea = (t: Task) => taskLifeArea(t, goalsCtx, projectById) === area.id;
    const stats = computeTaskExecution({ tasks: inputs.tasks, goalsCtx, projectById, filter }, inArea);

    const evidenced = Array.from(collectEvidencedGoalIds(inputs, (gid) => !!gid && goalsCtx.areaOf(gid) === area.id));
    const goalsProgressedArea = evidenced.filter((id) => !goalsCtx.byId.get(id)?.parent_goal_id).length;
    const advancedProjects = new Set(
      Array.from(collectAdvancedProjectIds(inputs)).filter((pid) => projectById.get(pid)?.life_area_id === area.id)
    );

    return {
      lifeAreaId: area.id,
      name: area.name,
      points: areaEvents.reduce((sum, e) => sum + e.points, 0),
      tasksCompleted: stats.completed,
      tasksTotal: stats.total,
      projectsAdvanced: advancedProjects.size,
      goalsProgressed: goalsProgressedArea,
      activitiesLogged: inputs.activitiesInRange.filter(
        (a) => a.related_life_area_id === area.id || (a.related_goal_id && goalsCtx.areaOf(a.related_goal_id) === area.id)
      ).length,
    };
  });

  return {
    range: { preset: 'custom', startDate: filter.startDate, endDate: filter.endDate },
    kpis,
    byLifeArea,
  };
}

/**
 * Level 2 (+3 data) — everything the Life Area dashboard renders,
 * derived from ONE bounded fetch bundle so every widget agrees.
 */
export async function getLifeAreaDashboard(lifeAreaId: string, filter: AnalyticsFilter): Promise<LifeAreaDashboardData> {
  const scopedFilter: AnalyticsFilter = { ...filter, lifeAreaId };
  const inputs = await loadInputs(scopedFilter);
  const goalsCtx = buildGoalContext(inputs.goals);
  const projectById = new Map(inputs.projects.map((p) => [p.id, p]));

  const areas = await new DexieVisionRepository().getLifeAreas();
  const areaName = areas.find((a) => a.id === lifeAreaId)?.name || 'Life Area';

  // Goals belonging to this area: own field OR inherited through ancestors.
  const areaGoals = inputs.goals.filter((g) => g.status !== 'archived' && goalsCtx.areaOf(g.id) === lifeAreaId);

  const inAreaTask = (t: Task) => taskLifeArea(t, goalsCtx, projectById) === lifeAreaId;
  const inAreaActivity = (a: Activity) =>
    a.related_life_area_id === lifeAreaId || (!!a.related_goal_id && goalsCtx.areaOf(a.related_goal_id) === lifeAreaId);
  // Ledger events carry their own life_area_id — authoritative for scoping.
  const inAreaEvent = (e: PointEventView) => e.life_area_id === lifeAreaId;
  const taskExecution = computeTaskExecution({ tasks: inputs.tasks, goalsCtx, projectById, filter: scopedFilter }, inAreaTask);

  const evidenced = Array.from(
    collectEvidencedGoalIds(inputs, (gid) => !!gid && goalsCtx.areaOf(gid) === lifeAreaId)
  );
  const goalsProgressed = evidenced.filter((id) => !goalsCtx.byId.get(id)?.parent_goal_id).length;

  const advancedProjectsAll = collectAdvancedProjectIds(inputs);
  const advancedProjectsInArea = new Set(
    Array.from(advancedProjectsAll).filter((pid) => {
      const p = projectById.get(pid);
      return p && (p.life_area_id === lifeAreaId || (!!p.primary_goal_id && goalsCtx.areaOf(p.primary_goal_id) === lifeAreaId));
    })
  );

  const points = computePointStats(inputs.eventsInRange, inputs.goals, inputs.projects);

  // Horizontal comparison rows: every non-archived goal in the area with
  // subtree-scoped task execution (self + descendants, computed once).
  const childrenMap = new Map<string, string[]>();
  for (const g of areaGoals) {
    if (g.parent_goal_id) {
      const list = childrenMap.get(g.parent_goal_id) || [];
      list.push(g.id);
      childrenMap.set(g.parent_goal_id, list);
    }
  }
  const subtreeIds = (rootId: string): Set<string> => {
    const ids = new Set<string>([rootId]);
    const queue = [...(childrenMap.get(rootId) || [])];
    while (queue.length) {
      const id = queue.shift()!;
      if (!ids.has(id)) {
        ids.add(id);
        queue.push(...(childrenMap.get(id) || []));
      }
    }
    return ids;
  };

  const pointsByGoalDirect = new Map(points.byGoal.map((r) => [r.key, r.points]));
  const goalRows: GoalExecutionRow[] = areaGoals.map((g) => {
    const scope = subtreeIds(g.id);
    const rowStats = computeTaskExecution(
      { tasks: inputs.tasks, goalsCtx, projectById, filter: scopedFilter },
      (t) => !!t.related_goal_id && scope.has(t.related_goal_id)
    );
    // Subtree points = union of direct-goal events across the subtree
    // (each ledger event carries its DIRECT goal id — never double counted).
    let subtreePoints = 0;
    for (const gid of scope) subtreePoints += pointsByGoalDirect.get(gid) || 0;
    return {
      goalId: g.id,
      title: g.title,
      pathLabel: GoalHierarchy.formatGoalPath(g.id, inputs.goals),
      depth: GoalHierarchy.getGoalPath(g.id, inputs.goals).length - 1,
      completedTasks: rowStats.completed,
      totalTasks: rowStats.total,
      points: subtreePoints,
    };
  });
  goalRows.sort((a, b) => b.points - a.points || b.completedTasks - a.completedTasks || a.pathLabel.localeCompare(b.pathLabel));

  const activityPointsByActivity = new Map<string, number>();
  for (const e of inputs.eventsInRange) {
    if (e.activity_id) {
      activityPointsByActivity.set(e.activity_id, (activityPointsByActivity.get(e.activity_id) || 0) + e.points);
    }
  }
  const areaProjectRows: ProjectExecutionRow[] = inputs.projects
    .filter((p) => {
      if (p.status === 'archived') return false;
      if (p.life_area_id === lifeAreaId) return true;
      return !!p.primary_goal_id && goalsCtx.areaOf(p.primary_goal_id) === lifeAreaId;
    })
    .map((p) => {
      const projTasks = inputs.tasks.filter((t) => t.related_project_id === p.id);
      const completed = projTasks.filter(
        (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, filter.startDate, filter.endDate)
      ).length;
      const open = projTasks.filter((t) => OPEN_TASK_STATUSES.has(t.status)).length;
      const projActivities = inputs.activitiesInRange.filter((a) => a.related_project_id === p.id).length;
      // Ledger events already carry project_id for task/activity/project awards,
      // so this sum IS the project's point total — no derived double counting.
      const projPoints = inputs.eventsInRange
        .filter((e) => e.project_id === p.id)
        .reduce((sum, e) => sum + e.points, 0);
      return {
        projectId: p.id,
        title: p.title,
        status: p.status,
        areaId: p.life_area_id,
        areaName: areas.find((a) => a.id === p.life_area_id)?.name,
        goalPathLabel: p.primary_goal_id ? GoalHierarchy.formatGoalPath(p.primary_goal_id, inputs.goals) : undefined,
        completedTasks: completed,
        totalTasks: completed + open,
        activities: projActivities,
        points: projPoints,
        advancedInPeriod: advancedProjectsInArea.has(p.id),
      };
    })
    .sort((a, b) => Number(b.advancedInPeriod) - Number(a.advancedInPeriod) || b.points - a.points);

  return {
    lifeAreaId,
    name: areaName,
    range: { preset: 'custom', startDate: filter.startDate, endDate: filter.endDate },
    kpis: {
      developmentPoints: points.total,
      tasksCompleted: taskExecution.completed,
      tasksTotal: taskExecution.total,
      projectsAdvanced: advancedProjectsInArea.size,
      goalsProgressed,
      subGoalsProgressed: evidenced.length - goalsProgressed,
      activitiesLogged: inputs.activitiesInRange.filter(
        (a) => a.related_life_area_id === lifeAreaId || (a.related_goal_id && goalsCtx.areaOf(a.related_goal_id) === lifeAreaId)
      ).length,
    },
    taskExecution,
    points,
    goalRows,
    projectRows: areaProjectRows,
    timeline: buildTimeline(inputs, inputs.goals, projectById, inAreaActivity),
    trend: computeTrendBundle(inputs, { activity: inAreaActivity, task: inAreaTask, event: inAreaEvent }),
    taskDrilldown: buildTaskDrilldown(inputs, projectById, inAreaTask),
  };
}

/**
 * Goal-scoped stats honoring exact vs subtree semantics. Subtree totals are
 * unions over direct-attributed ledger events — never parent+child doubles.
 */
export async function getGoalScopedStats(
  goalId: string,
  scope: 'exact' | 'subtree',
  filter: AnalyticsFilter
): Promise<{ taskExecution: TaskExecutionStats; points: DevelopmentPointStats; goalIds: string[] }> {
  const inputs = await loadInputs(filter);
  const goalRepo = new DexieGoalRepository();
  const goalIds = scope === 'subtree' ? [goalId, ...(await goalRepo.getGoalDescendants(goalId)).map((g) => g.id)] : [goalId];
  const idSet = new Set(goalIds);

  const goalsCtx = buildGoalContext(inputs.goals);
  const projectById = new Map(inputs.projects.map((p) => [p.id, p]));

  const taskExecution = computeTaskExecution(
    { tasks: inputs.tasks, goalsCtx, projectById, filter },
    (t) => !!t.related_goal_id && idSet.has(t.related_goal_id)
  );

  const scopedEvents = inputs.eventsInRange.filter((e) => e.goal_id && idSet.has(e.goal_id));
  const points = computePointStats(scopedEvents, inputs.goals, inputs.projects);

  return { taskExecution, points, goalIds };
}
