// ============================================================
// MODULE 10 — CENTRAL METRICS SERVICE
// ============================================================
// Deterministic metric computation over the existing domain
// repositories. Extends Module 09 analytics with:
//   - period-over-period comparison
//   - health signals (goal / project)
//   - trend detection
//   - planning-vs-execution ratios
//   - skill / level / consistency metrics
//   - life-area balance / attention distribution
//
// Performance contract:
// - Reuses Module 09 bounded fetch bundles (MAX_RANGE_EVENTS = 10,000)
// - Single-pass in-memory aggregation
// - No N+1 queries
// - No new database tables
// ============================================================

import { AnalyticsFilter, AnalyticsDateRange } from '../../types/analytics.types';
import { Goal } from '../../types/goal.types';
import { Project } from '../../types/project.types';
import { Task } from '../../types/task.types';
import { Activity } from '../../types/activity.types';
import { PointEventView } from '../../types/analytics.types';
import { Skill, SkillEvidence, SkillHistory } from '../../types/skill.types';
import { Level, LevelRequirement } from '../../types/level.types';
import { LifeArea } from '../../types/vision.types';
import {
  dayStartISO,
  dayEndISO,
  isWithinDayWindow,
  OPEN_TASK_STATUSES,
  MAX_RANGE_EVENTS,
} from './reviewAnalyticsService';
import { pointService } from '../points/pointService';
import { getISOWeekString } from '../../utils/dateUtils';
import { posDexieDb } from '../adapters/dexie/posDexieDb';
import {
  MetricValue,
  PeriodComparison,
  HealthSignal,
  ExecutionMetrics,
  GoalHealthMetrics,
  ProjectHealthMetrics,
  DevelopmentMetrics,
  LifeAreaBalanceMetrics,
  SkillMetrics,
  LevelMetrics,
  PlanningExecutionMetrics,
  TrendMetrics,
  ConsistencyMetrics,
  MetricsBundle,
  TaskAgingBucket,
  OverdueIndicator,
  GoalHealthRow,
  ProjectHealthRow,
  LifeAreaPointMetric,
  LifeAreaBalanceRow,
  LifeAreaTrendRow,
  SkillGapRow,
  SkillPointRow,
  RequirementProgressRow,
} from '../../types/metrics.types';

// ─── Date helpers ────────────────────────────────────────────

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = toLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatYMD(d);
}

function getTodayDateString(): string {
  return formatYMD(new Date());
}

function computePeriodRange(baseStart: string, baseEnd: string): { startDate: string; endDate: string } {
  const start = toLocalDate(baseStart);
  const end = toLocalDate(baseEnd);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = addDays(baseStart, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { startDate: prevStart, endDate: prevEnd };
}

function toDateRange(filter: AnalyticsFilter): AnalyticsDateRange {
  return { preset: 'custom', startDate: filter.startDate, endDate: filter.endDate };
}

function trendDirection(current: number, previous: number | null): 'increased' | 'decreased' | 'unchanged' | null {
  if (previous === null || previous === 0) return null;
  if (current > previous) return 'increased';
  if (current < previous) return 'decreased';
  return 'unchanged';
}

function activeGoals(inputs: { goals: Goal[] }): Goal[] {
  return inputs.goals.filter((g) => g.status === 'active');
}

function activeProjects(inputs: { projects: Project[] }): Project[] {
  return inputs.projects.filter((p) => p.status === 'active' || p.status === 'paused');
}

function qualifyingGoalEvidence(inputs: {
  tasks: Task[];
  activitiesInRange: Activity[];
  eventsInRange: PointEventView[];
  filter: AnalyticsFilter;
}, goalId: string): boolean {
  const inPeriod = (iso?: string) => isWithinDayWindow(iso, inputs.filter.startDate, inputs.filter.endDate);
  return (
    inputs.tasks.some((t) => t.related_goal_id === goalId && t.status === 'completed' && inPeriod(t.completed_at)) ||
    inputs.activitiesInRange.some((a) => a.related_goal_id === goalId) ||
    inputs.eventsInRange.some((e) => e.goal_id === goalId)
  );
}

function qualifyingProjectEvidence(inputs: {
  tasks: Task[];
  activitiesInRange: Activity[];
  eventsInRange: PointEventView[];
  filter: AnalyticsFilter;
}, projectId: string): boolean {
  const inPeriod = (iso?: string) => isWithinDayWindow(iso, inputs.filter.startDate, inputs.filter.endDate);
  return (
    inputs.tasks.some((t) => t.related_project_id === projectId && t.status === 'completed' && inPeriod(t.completed_at)) ||
    inputs.activitiesInRange.some((a) => a.related_project_id === projectId) ||
    inputs.eventsInRange.some((e) => e.project_id === projectId)
  );
}

function daysBetween(dateStr: string | undefined, referenceDate = getTodayDateString()): number | null {
  if (!dateStr) return null;
  const datePart = dateStr.slice(0, 10);
  const d = toLocalDate(datePart);
  const now = toLocalDate(referenceDate);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

// ─── Metric value constructors ───────────────────────────────

function metric<T>(value: T | null, unit: string, range: AnalyticsDateRange, source: string): MetricValue<T> {
  return { value, unit, period: range, source };
}

function makeComparison<T>(
  current: MetricValue<T>,
  previous: MetricValue<T>
): PeriodComparison<T> {
  const curr = current.value as number;
  const prev = previous.value as number;
  const absoluteChange = curr !== null && prev !== null ? curr - prev : null;
  const percentChange = absoluteChange !== null && prev !== 0 ? Math.round((absoluteChange / prev) * 100) : null;
  return { current, previous, absoluteChange, percentChange };
}

// ─── Shared fetch bundle ─────────────────────────────────────

interface MetricsInputs {
  filter: AnalyticsFilter;
  goals: Goal[];
  tasks: Task[];
  projects: Project[];
  activitiesInRange: Activity[];
  eventsInRange: PointEventView[];
  lifeAreas: LifeArea[];
  skills: Skill[];
  levels: Level[];
  skillEvidence: SkillEvidence[];
  skillHistory: SkillHistory[];
  levelRequirements: LevelRequirement[];
}

async function loadInputs(filter: AnalyticsFilter): Promise<MetricsInputs> {
  const startISO = dayStartISO(filter.startDate);
  const endISO = dayEndISO(filter.endDate);

  let eventsCollection = posDexieDb.point_ledger
    .where('[status+occurred_at]')
    .between(['valid', startISO], ['valid', endISO], true, true)
    .reverse();

  if (filter.lifeAreaId) {
    eventsCollection = eventsCollection.filter(
      (e) => e.status === 'valid' && e.life_area_id === filter.lifeAreaId
    );
  }

  const [
    goals,
    tasks,
    projects,
    activitiesInRange,
    rawEvents,
    lifeAreas,
    skills,
    levels,
    allSkillEvidence,
    allSkillHistory,
    levelRequirements,
  ] = await Promise.all([
    posDexieDb.goals.toArray(),
    posDexieDb.tasks.toArray(),
    posDexieDb.projects.toArray(),
    posDexieDb.activities.where('date').between(filter.startDate, filter.endDate, true, true).toArray(),
    eventsCollection.limit(MAX_RANGE_EVENTS).toArray(),
    posDexieDb.life_areas.toArray(),
    posDexieDb.skills.toArray(),
    posDexieDb.levels.toArray(),
    posDexieDb.skill_evidence.toArray(),
    posDexieDb.skill_history.toArray(),
    posDexieDb.level_requirements.toArray(),
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

  const activeAreas = lifeAreas.filter((a) => a.status === 'active').sort((a, b) => a.sort_order - b.sort_order);

  const scopedSkills = filter.lifeAreaId ? skills.filter((s) => s.life_area_id === filter.lifeAreaId) : skills;
  const scopedLevels = filter.lifeAreaId ? levels.filter((l) => l.life_area_id === filter.lifeAreaId) : levels;
  const scopedSkillEvidence = filter.lifeAreaId
    ? allSkillEvidence.filter((se) => {
        const skill = skills.find((s) => s.id === se.skill_id);
        return skill?.life_area_id === filter.lifeAreaId;
      })
    : allSkillEvidence;
  const scopedSkillHistory = filter.lifeAreaId
    ? allSkillHistory.filter((sh) => {
        const skill = skills.find((s) => s.id === sh.skill_id);
        return skill?.life_area_id === filter.lifeAreaId;
      })
    : allSkillHistory;
  const scopedRequirements = filter.lifeAreaId
    ? levelRequirements.filter((lr) => {
        const level = levels.find((l) => l.id === lr.level_id);
        return level?.life_area_id === filter.lifeAreaId;
      })
    : levelRequirements;

  return {
    filter,
    goals,
    tasks,
    projects,
    activitiesInRange,
    eventsInRange,
    lifeAreas: activeAreas,
    skills: scopedSkills,
    levels: scopedLevels,
    skillEvidence: scopedSkillEvidence,
    skillHistory: scopedSkillHistory,
    levelRequirements: scopedRequirements,
  };
}

// ─── Shared context builders ─────────────────────────────────

function buildGoalContext(goals: Goal[]) {
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

function taskLifeArea(task: Task, goalsCtx: ReturnType<typeof buildGoalContext>, projectById: Map<string, Project>): string | undefined {
  if (task.related_goal_id) {
    const area = goalsCtx.areaOf(task.related_goal_id);
    if (area) return area;
  }
  if (task.related_project_id) {
    return projectById.get(task.related_project_id)?.life_area_id;
  }
  return undefined;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Execution metrics: task completion, activity volume, aging, overdue.
 */
export async function getExecutionMetrics(filter: AnalyticsFilter, referenceDate = getTodayDateString()): Promise<ExecutionMetrics> {
  const inputs = await loadInputs(filter);

  const completedInRange = inputs.tasks.filter(
    (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, filter.startDate, filter.endDate)
  );
  const openTasks = inputs.tasks.filter((t) => OPEN_TASK_STATUSES.has(t.status));
  const total = completedInRange.length + openTasks.length;

  const prevRange = computePeriodRange(filter.startDate, filter.endDate);
  const prevInputs = await loadInputs({ ...filter, startDate: prevRange.startDate, endDate: prevRange.endDate });
  const prevCompleted = prevInputs.tasks.filter(
    (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, prevRange.startDate, prevRange.endDate)
  ).length;

  const totalDuration = inputs.activitiesInRange.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

  const now = referenceDate;
  const ageBuckets: TaskAgingBucket[] = [
    { label: '0-7 days', count: 0, taskIds: [] },
    { label: '8-30 days', count: 0, taskIds: [] },
    { label: '31-90 days', count: 0, taskIds: [] },
    { label: '90+ days', count: 0, taskIds: [] },
  ];
  for (const t of openTasks) {
    if (!t.created_at) continue;
    const age = daysBetween(t.created_at, referenceDate);
    if (age === null) continue;
    const idx = age <= 7 ? 0 : age <= 30 ? 1 : age <= 90 ? 2 : 3;
    ageBuckets[idx].count += 1;
    ageBuckets[idx].taskIds.push(t.id);
  }

  const overdue: OverdueIndicator[] = openTasks
    .filter((t) => t.due_date && t.due_date < now)
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      dueDate: t.due_date!,
      daysOverdue: daysBetween(t.due_date, referenceDate) ?? 0,
      status: t.status,
    }));

  return {
    taskCompletionRate: metric(total > 0 ? Math.round((completedInRange.length / total) * 100) : null, 'percent', toDateRange(filter), 'Task.status + Task.completed_at'),
    taskExecutionVolume: metric(completedInRange.length, 'count', toDateRange(filter), 'Task.status + Task.completed_at'),
    activityVolume: metric(inputs.activitiesInRange.length, 'count', toDateRange(filter), 'Activity.date'),
    activityDuration: metric(totalDuration > 0 ? totalDuration : null, 'duration_minutes', toDateRange(filter), 'Activity.duration_minutes'),
    taskCompletionTrend: metric(trendDirection(completedInRange.length, prevCompleted), 'trend', toDateRange(filter), 'Task.completed_at'),
    taskAging: ageBuckets,
    overdueIndicators: overdue,
  };
}

/**
 * Goal health metrics: status counts, inactivity signals, health classification.
 *
 * Health rules (documented, deterministic):
 * - Healthy:   status === 'completed' OR has qualifying evidence in period
 * - At Risk:   status === 'active' AND has some recent activity but no completion evidence
 * - Stalled:   status === 'active' AND no qualifying evidence in period
 * - Unknown:   status === 'draft' | 'paused' | 'cancelled' | 'archived'
 */
export async function getGoalHealthMetrics(filter: AnalyticsFilter): Promise<GoalHealthMetrics> {
  const inputs = await loadInputs(filter);

  const statusCounts: Record<string, number> = {};
  const inactiveGoalIds: string[] = [];
  const healthByGoal: GoalHealthRow[] = [];

  for (const goal of inputs.goals) {
    statusCounts[goal.status] = (statusCounts[goal.status] || 0) + 1;

    if (goal.status === 'active' && !qualifyingGoalEvidence(inputs, goal.id)) {
      inactiveGoalIds.push(goal.id);
    }

    let signal: HealthSignal;
    if (goal.status === 'completed') {
      signal = { status: 'healthy', reason: 'Goal completed.', evidence: { status: goal.status } };
    } else if (['draft', 'paused', 'cancelled', 'archived'].includes(goal.status)) {
      signal = { status: 'unknown', reason: `Goal is ${goal.status}.`, evidence: { status: goal.status } };
    } else if (qualifyingGoalEvidence(inputs, goal.id)) {
      signal = { status: 'healthy', reason: 'Goal has execution evidence in the period.', evidence: { goalId: goal.id } };
    } else {
      signal = {
        status: 'stalled',
        reason: 'Active goal with no qualifying activity in the period.',
        evidence: { goalId: goal.id, status: goal.status, period: `${filter.startDate}..${filter.endDate}` },
      };
    }

    healthByGoal.push({ goalId: goal.id, title: goal.title, status: goal.status, signal });
  }

  const stalledCount = healthByGoal.filter((g) => g.signal.status === 'stalled').length;
  const activeCount = healthByGoal.filter((g) => g.status === 'active').length;
  let overallSignal: HealthSignal;
  if (activeCount === 0) {
    overallSignal = { status: 'unknown', reason: 'No active goals.', evidence: { activeCount } };
  } else if (stalledCount === 0) {
    overallSignal = { status: 'healthy', reason: 'All active goals have execution evidence.', evidence: { activeCount, stalledCount } };
  } else if (stalledCount <= Math.ceil(activeCount * 0.3)) {
    overallSignal = { status: 'at_risk', reason: `${stalledCount} of ${activeCount} active goals stalled.`, evidence: { activeCount, stalledCount } };
  } else {
    overallSignal = { status: 'stalled', reason: `${stalledCount} of ${activeCount} active goals stalled.`, evidence: { activeCount, stalledCount } };
  }

  return { statusCounts, inactiveGoalIds, healthByGoal, overallSignal };
}

/**
 * Project health metrics: status counts, inactivity signals, health classification.
 *
 * Health rules (documented, deterministic):
 * - Healthy:   status === 'completed' OR has qualifying evidence in period
 * - At Risk:   status === 'active' AND has some recent activity but no completion
 * - Stalled:   status === 'active' AND no qualifying evidence in period
 * - Unknown:   status === 'draft' | 'paused' | 'cancelled' | 'archived'
 */
export async function getProjectHealthMetrics(filter: AnalyticsFilter): Promise<ProjectHealthMetrics> {
  const inputs = await loadInputs(filter);

  const statusCounts: Record<string, number> = {};
  const inactiveProjectIds: string[] = [];
  const healthByProject: ProjectHealthRow[] = [];

  for (const project of inputs.projects) {
    statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;

    if (project.status === 'active' && !qualifyingProjectEvidence(inputs, project.id)) {
      inactiveProjectIds.push(project.id);
    }

    let signal: HealthSignal;
    if (project.status === 'completed') {
      signal = { status: 'healthy', reason: 'Project completed.', evidence: { status: project.status } };
    } else if (['draft', 'paused', 'cancelled', 'archived'].includes(project.status)) {
      signal = { status: 'unknown', reason: `Project is ${project.status}.`, evidence: { status: project.status } };
    } else if (qualifyingProjectEvidence(inputs, project.id)) {
      signal = { status: 'healthy', reason: 'Project has execution evidence in the period.', evidence: { projectId: project.id } };
    } else {
      signal = {
        status: 'stalled',
        reason: 'Active project with no qualifying activity in the period.',
        evidence: { projectId: project.id, status: project.status, period: `${filter.startDate}..${filter.endDate}` },
      };
    }

    healthByProject.push({ projectId: project.id, title: project.title, status: project.status, signal });
  }

  const stalledCount = healthByProject.filter((g) => g.signal.status === 'stalled').length;
  const activeCount = healthByProject.filter((g) => g.status === 'active').length;
  let overallSignal: HealthSignal;
  if (activeCount === 0) {
    overallSignal = { status: 'unknown', reason: 'No active projects.', evidence: { activeCount } };
  } else if (stalledCount === 0) {
    overallSignal = { status: 'healthy', reason: 'All active projects have execution evidence.', evidence: { activeCount, stalledCount } };
  } else if (stalledCount <= Math.ceil(activeCount * 0.3)) {
    overallSignal = { status: 'at_risk', reason: `${stalledCount} of ${activeCount} active projects stalled.`, evidence: { activeCount, stalledCount } };
  } else {
    overallSignal = { status: 'stalled', reason: `${stalledCount} of ${activeCount} active projects stalled.`, evidence: { activeCount, stalledCount } };
  }

  return { statusCounts, inactiveProjectIds, healthByProject, overallSignal };
}

/**
 * Development metrics: all-time points, period points, by Life Area, acceleration, trend.
 */
export async function getDevelopmentMetrics(filter: AnalyticsFilter): Promise<DevelopmentMetrics> {
  const inputs = await loadInputs(filter);
  const prevRange = computePeriodRange(filter.startDate, filter.endDate);
  const prevInputs = await loadInputs({ ...filter, startDate: prevRange.startDate, endDate: prevRange.endDate });

  const currentPoints = inputs.eventsInRange.reduce((sum, e) => sum + e.points, 0);
  const previousPoints = prevInputs.eventsInRange.reduce((sum, e) => sum + e.points, 0);

  const areaPoints = new Map<string, number>();
  for (const e of inputs.eventsInRange) {
    if (e.life_area_id) {
      areaPoints.set(e.life_area_id, (areaPoints.get(e.life_area_id) || 0) + e.points);
    }
  }

  const totalPoints = inputs.eventsInRange.reduce((sum, e) => sum + e.points, 0);
  const byLifeArea: LifeAreaPointMetric[] = inputs.lifeAreas.map((area) => {
    const points = areaPoints.get(area.id) || 0;
    return {
      lifeAreaId: area.id,
      name: area.name,
      points,
      percentOfTotal: totalPoints > 0 ? Math.round((points / totalPoints) * 100) : null,
    };
  });

  const allTimeTotal = (await pointService.getPeriodPointBreakdown(inputs.lifeAreas.map((a) => a.id))).total;

  return {
    allTimePoints: metric(allTimeTotal, 'points', toDateRange(filter), 'PointLedgerEvent (all time)'),
    periodPoints: metric(currentPoints, 'points', toDateRange(filter), 'PointLedgerEvent.occurred_at'),
    pointsByLifeArea: byLifeArea,
    pointAcceleration: previousPoints > 0
      ? makeComparison(
          metric(currentPoints, 'points', toDateRange(filter), 'PointLedgerEvent'),
          metric(previousPoints, 'points', { preset: 'custom', startDate: prevRange.startDate, endDate: prevRange.endDate }, 'PointLedgerEvent')
        )
      : null,
    pointTrend: metric(trendDirection(currentPoints, previousPoints), 'trend', toDateRange(filter), 'PointLedgerEvent.occurred_at'),
  };
}

/**
 * Life Area balance metrics: distribution by points, activities, tasks; area trends.
 */
export async function getLifeAreaBalanceMetrics(filter: AnalyticsFilter): Promise<LifeAreaBalanceMetrics> {
  const inputs = await loadInputs(filter);
  const goalsCtx = buildGoalContext(inputs.goals);
  const projectById = new Map(inputs.projects.map((p) => [p.id, p]));
  const prevRange = computePeriodRange(filter.startDate, filter.endDate);
  const prevInputs = await loadInputs({ ...filter, startDate: prevRange.startDate, endDate: prevRange.endDate });

  const areaPoints = new Map<string, number>();
  for (const e of inputs.eventsInRange) {
    if (e.life_area_id) areaPoints.set(e.life_area_id, (areaPoints.get(e.life_area_id) || 0) + e.points);
  }
  const prevAreaPoints = new Map<string, number>();
  for (const e of prevInputs.eventsInRange) {
    if (e.life_area_id) prevAreaPoints.set(e.life_area_id, (prevAreaPoints.get(e.life_area_id) || 0) + e.points);
  }

  const totalPoints = inputs.eventsInRange.reduce((sum, e) => sum + e.points, 0);
  const totalActivities = inputs.activitiesInRange.length;

  const distributionByPoints: LifeAreaBalanceRow[] = inputs.lifeAreas.map((area) => {
    const points = areaPoints.get(area.id) || 0;
    return {
      lifeAreaId: area.id,
      name: area.name,
      value: points,
      percentOfTotal: totalPoints > 0 ? Math.round((points / totalPoints) * 100) : null,
    };
  });

  const distributionByActivities: LifeAreaBalanceRow[] = inputs.lifeAreas.map((area) => {
    const count = inputs.activitiesInRange.filter(
      (a) => a.related_life_area_id === area.id || (a.related_goal_id && goalsCtx.areaOf(a.related_goal_id) === area.id)
    ).length;
    return {
      lifeAreaId: area.id,
      name: area.name,
      value: count,
      percentOfTotal: totalActivities > 0 ? Math.round((count / totalActivities) * 100) : null,
    };
  });

  const areaTaskCounts = new Map<string, number>();
  for (const t of inputs.tasks) {
    if (t.status === 'completed' && isWithinDayWindow(t.completed_at, filter.startDate, filter.endDate)) {
      const area = taskLifeArea(t, goalsCtx, projectById);
      if (area) areaTaskCounts.set(area, (areaTaskCounts.get(area) || 0) + 1);
    }
  }

  const distributionByTasks: LifeAreaBalanceRow[] = inputs.lifeAreas.map((area) => {
    const count = areaTaskCounts.get(area.id) || 0;
    return {
      lifeAreaId: area.id,
      name: area.name,
      value: count,
      percentOfTotal: null,
    };
  });

  const areaTrends: LifeAreaTrendRow[] = inputs.lifeAreas.map((area) => {
    const current = areaPoints.get(area.id) || 0;
    const previous = prevAreaPoints.get(area.id) || 0;
    return {
      lifeAreaId: area.id,
      name: area.name,
      trend: trendDirection(current, previous),
      currentPeriodValue: current,
      previousPeriodValue: previous,
    };
  });

  return {
    distributionByPoints,
    distributionByActivities,
    distributionByTasks,
    areaTrends,
  };
}

/**
 * Skill metrics: proficiency distribution, evidence counts, points by skill.
 */
export async function getSkillMetrics(filter: AnalyticsFilter): Promise<SkillMetrics> {
  const inputs = await loadInputs(filter);

  const proficiencyDistribution: Record<string, number> = {};
  const developmentStateDistribution: Record<string, number> = {};
  for (const skill of inputs.skills) {
    proficiencyDistribution[skill.current_proficiency] = (proficiencyDistribution[skill.current_proficiency] || 0) + 1;
    developmentStateDistribution[skill.development_state] = (developmentStateDistribution[skill.development_state] || 0) + 1;
  }

  const evidenceBySkill = new Map<string, { lastAt: string | null; count: number }>();
  for (const se of inputs.skillEvidence) {
    const existing = evidenceBySkill.get(se.skill_id) || { lastAt: null, count: 0 };
    existing.count += 1;
    if (!existing.lastAt || se.created_at > existing.lastAt) existing.lastAt = se.created_at;
    evidenceBySkill.set(se.skill_id, existing);
  }
  for (const sh of inputs.skillHistory) {
    const existing = evidenceBySkill.get(sh.skill_id) || { lastAt: null, count: 0 };
    existing.count += 1;
    if (!existing.lastAt || sh.changed_at > existing.lastAt) existing.lastAt = sh.changed_at;
    evidenceBySkill.set(sh.skill_id, existing);
  }

  const skillsWithRecentEvidence = inputs.skills.filter((s) => {
    const ev = evidenceBySkill.get(s.id);
    if (!ev || !ev.lastAt) return false;
    return isWithinDayWindow(ev.lastAt, filter.startDate, filter.endDate);
  }).length;

  const skillsWithoutRecentEvidence: SkillGapRow[] = inputs.skills
    .filter((s) => {
      const ev = evidenceBySkill.get(s.id);
      return !ev || !ev.lastAt || !isWithinDayWindow(ev.lastAt, filter.startDate, filter.endDate);
    })
    .map((s) => {
      const ev = evidenceBySkill.get(s.id);
      return {
        skillId: s.id,
        name: s.name,
        lastEvidenceAt: ev?.lastAt || null,
        daysSinceEvidence: ev?.lastAt ? daysBetween(ev.lastAt) : null,
      };
    });

  const pointsBySkill = new Map<string, number>();
  for (const e of inputs.eventsInRange) {
    if (e.skill_id) pointsBySkill.set(e.skill_id, (pointsBySkill.get(e.skill_id) || 0) + e.points);
  }

  const pointsBySkillRows: SkillPointRow[] = inputs.skills.map((s) => ({
    skillId: s.id,
    name: s.name,
    points: pointsBySkill.get(s.id) || 0,
  }));

  return {
    proficiencyDistribution,
    developmentStateDistribution,
    skillsWithRecentEvidence,
    skillsWithoutRecentEvidence,
    pointsBySkill: pointsBySkillRows,
  };
}

/**
 * Level metrics: current level, next level, requirement progress.
 */
export async function getLevelMetrics(filter: AnalyticsFilter): Promise<LevelMetrics> {
  const inputs = await loadInputs(filter);

  const current = inputs.levels.find((l) => l.status === 'current');
  const next = inputs.levels
    .filter((l) => l.status === 'unlocked' || l.status === 'locked')
    .sort((a, b) => a.display_order - b.display_order)[0];

  const requirements: RequirementProgressRow[] = [];
  for (const req of inputs.levelRequirements) {
    let currentPoints = 0;
    let target = req.target_points || 0;
    let percent: number | null = null;

    if (req.type === 'development_points' && target > 0) {
      const lifeAreaId = req.points_life_area_id || filter.lifeAreaId;
      if (lifeAreaId) {
        const progress = await pointService.getLevelRequirementProgress(req);
        currentPoints = progress.current;
        target = progress.target;
        percent = target > 0 ? Math.round((currentPoints / target) * 100) : null;
      }
    }

    requirements.push({
      requirementId: req.id,
      name: req.type,
      type: req.type,
      status: req.status,
      current: currentPoints,
      target,
      percent,
    });
  }

  return {
    currentLevel: current
      ? { levelId: current.id, name: current.name, status: current.status, displayOrder: current.display_order }
      : null,
    nextLevel: next
      ? { levelId: next.id, name: next.name, status: next.status, displayOrder: next.display_order }
      : null,
    requirements,
  };
}

/**
 * Planning vs execution metrics: task execution rate, goal evidence rate, project activity rate.
 */
export async function getPlanningExecutionMetrics(filter: AnalyticsFilter): Promise<PlanningExecutionMetrics> {
  const inputs = await loadInputs(filter);

  const completedInRange = inputs.tasks.filter(
    (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, filter.startDate, filter.endDate)
  );
  const openTasks = inputs.tasks.filter((t) => OPEN_TASK_STATUSES.has(t.status));
  const totalTasks = completedInRange.length + openTasks.length;

  const activeGoalsList = activeGoals(inputs);
  const goalsWithEvidence = activeGoalsList.filter((g) => qualifyingGoalEvidence(inputs, g.id)).length;

  const activeProjectsList = activeProjects(inputs);
  const projectsWithActivity = activeProjectsList.filter((p) => qualifyingProjectEvidence(inputs, p.id)).length;

  return {
    taskExecutionRate: metric(
      totalTasks > 0 ? Math.round((completedInRange.length / totalTasks) * 100) / 100 : null,
      'ratio',
      toDateRange(filter),
      'Task.status + Task.completed_at'
    ),
    goalEvidenceRate: metric(
      activeGoalsList.length > 0 ? Math.round((goalsWithEvidence / activeGoalsList.length) * 100) / 100 : null,
      'ratio',
      toDateRange(filter),
      'Goal.status + evidence in period'
    ),
    projectActivityRate: metric(
      activeProjectsList.length > 0 ? Math.round((projectsWithActivity / activeProjectsList.length) * 100) / 100 : null,
      'ratio',
      toDateRange(filter),
      'Project.status + evidence in period'
    ),
  };
}

/**
 * Trend metrics: direction of task completion, points, and activity vs previous period.
 */
export async function getTrendMetrics(filter: AnalyticsFilter): Promise<TrendMetrics> {
  const inputs = await loadInputs(filter);
  const prevRange = computePeriodRange(filter.startDate, filter.endDate);
  const prevInputs = await loadInputs({ ...filter, startDate: prevRange.startDate, endDate: prevRange.endDate });

  const currentCompleted = inputs.tasks.filter(
    (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, filter.startDate, filter.endDate)
  ).length;
  const prevCompleted = prevInputs.tasks.filter(
    (t) => t.status === 'completed' && isWithinDayWindow(t.completed_at, prevRange.startDate, prevRange.endDate)
  ).length;

  const currentPoints = inputs.eventsInRange.reduce((sum, e) => sum + e.points, 0);
  const prevPoints = prevInputs.eventsInRange.reduce((sum, e) => sum + e.points, 0);

  const currentActivities = inputs.activitiesInRange.length;
  const prevActivities = prevInputs.activitiesInRange.length;

  return {
    taskCompletionTrend: metric(trendDirection(currentCompleted, prevCompleted), 'trend', toDateRange(filter), 'Task.completed_at'),
    pointTrend: metric(trendDirection(currentPoints, prevPoints), 'trend', toDateRange(filter), 'PointLedgerEvent.occurred_at'),
    activityTrend: metric(trendDirection(currentActivities, prevActivities), 'trend', toDateRange(filter), 'Activity.date'),
  };
}

/**
 * Consistency metrics: active days, weeks with activity, current streak.
 */
export async function getConsistencyMetrics(filter: AnalyticsFilter): Promise<ConsistencyMetrics> {
  const inputs = await loadInputs(filter);

  const activeDays = new Set(inputs.activitiesInRange.map((a) => a.date));
  const weeksSet = new Set<string>();
  for (const a of inputs.activitiesInRange) {
    const d = toLocalDate(a.date);
    const weekId = getISOWeekString(d);
    weeksSet.add(weekId);
  }

  const streakEnd = toLocalDate(filter.endDate);
  const today = toLocalDate(getTodayDateString());
  const endDate = streakEnd > today ? today : streakEnd;
  let streak = 0;
  let cursor = new Date(endDate);
  while (true) {
    const dayStr = formatYMD(cursor);
    if (activeDays.has(dayStr)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (cursor.toDateString() === endDate.toDateString()) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    activeDays: metric(activeDays.size, 'days', toDateRange(filter), 'Activity.date'),
    weeksWithActivity: metric(weeksSet.size, 'weeks', toDateRange(filter), 'Activity.date'),
    currentStreak: metric(streak > 0 ? streak : null, 'days', toDateRange(filter), 'Activity.date'),
  };
}

/**
 * Full metrics bundle for a given period. Single entry point for
 * Dashboard, Review, AI, and future Module 11 consumers.
 */
export async function getMetricsBundle(filter: AnalyticsFilter): Promise<MetricsBundle> {
  const range = { preset: 'custom' as const, startDate: filter.startDate, endDate: filter.endDate };
  const [
    execution,
    goalHealth,
    projectHealth,
    development,
    lifeAreaBalance,
    skills,
    levels,
    planningExecution,
    trends,
    consistency,
  ] = await Promise.all([
    getExecutionMetrics(filter),
    getGoalHealthMetrics(filter),
    getProjectHealthMetrics(filter),
    getDevelopmentMetrics(filter),
    getLifeAreaBalanceMetrics(filter),
    getSkillMetrics(filter),
    getLevelMetrics(filter),
    getPlanningExecutionMetrics(filter),
    getTrendMetrics(filter),
    getConsistencyMetrics(filter),
  ]);

  return {
    range,
    execution,
    goalHealth,
    projectHealth,
    development,
    lifeAreaBalance,
    skills,
    levels,
    planningExecution,
    trends,
    consistency,
  };
}
