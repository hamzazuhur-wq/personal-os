import { PointSourceType } from './practice.types';

// ============================================================
// Module 09 — Review & Analytics data contracts.
// Pure read-model types consumed by the dashboard UI, drill-down
// panels and AI read tools. Chart components NEVER calculate
// business logic — they render these prepared shapes only.
// ============================================================

export type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface AnalyticsDateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD inclusive (local calendar days)
  endDate: string; // YYYY-MM-DD inclusive
}

/** Shared filter contract for every analytics query. */
export interface AnalyticsFilter {
  startDate: string;
  endDate: string;
  lifeAreaId?: string;
  goalId?: string;
  goalScope?: 'exact' | 'subtree';
  projectId?: string;
}

/**
 * Task execution within a period.
 * - completed: tasks whose completion timestamp falls inside the range
 * - remaining: tasks currently open (not completed / cancelled) in scope
 * - total: completed + remaining — a factual denominator, never fabricated
 * - percent: null when there is no denominator (total === 0)
 */
export interface TaskExecutionStats {
  completed: number;
  total: number;
  remaining: number;
  percent: number | null;
}

// ─── Level 1: Life Areas Overview ──────────────────────────

export interface ReviewOverviewKpis {
  tasksCompleted: number;
  projectsAdvanced: number;
  goalsProgressed: number;
  subGoalsProgressed: number;
  activitiesLogged: number;
  developmentPoints: number;
}

export interface LifeAreaOverviewCardData {
  lifeAreaId: string;
  name: string;
  points: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsAdvanced: number;
  goalsProgressed: number;
  activitiesLogged: number;
}

export interface ReviewOverview {
  range: AnalyticsDateRange;
  kpis: ReviewOverviewKpis;
  byLifeArea: LifeAreaOverviewCardData[];
}

// ─── Development Points analytics ───────────────────────────

/** One aggregate row of a point breakdown (by goal / project / source). */
export interface PointBreakdownRow {
  key: string; // goal id / project id / source type bucket
  label: string;
  points: number;
  eventCount: number;
  lastOccurredAt?: string; // ISO
}

export interface PointEventView {
  id: string;
  points: number;
  source_type: PointSourceType;
  occurred_at: string; // ISO
  reason?: string;
  note?: string;
  life_area_id?: string;
  goal_id?: string;
  project_id?: string;
  task_id?: string;
  activity_id?: string;
  practice_id?: string;
  skill_id?: string;
}

/**
 * Aggregated view over ONE ledger event set. Every breakdown partitions the
 * exact same event array, so byGoal + byProject + bySourceType always
 * reconcile to `total` / `eventCount`. No double counting by construction.
 */
export interface DevelopmentPointStats {
  total: number;
  eventCount: number;
  byGoal: PointBreakdownRow[];
  byProject: PointBreakdownRow[];
  bySourceType: PointBreakdownRow[];
  events: PointEventView[]; // newest first, bounded to range (+ cap)
}

// ─── Goal / Project execution rows ─────────────────────────

export interface GoalExecutionRow {
  goalId: string;
  title: string;
  /** Full ancestor chain label, e.g. "Professional → Branding → Positioning" */
  pathLabel: string;
  depth: number;
  completedTasks: number;
  totalTasks: number;
  points: number;
}

export interface ProjectExecutionRow {
  projectId: string;
  title: string;
  status: string;
  areaId?: string;
  areaName?: string;
  /** Goal path of primary_goal_id when present ("A → B") */
  goalPathLabel?: string;
  completedTasks: number;
  totalTasks: number;
  activities: number;
  points: number;
  advancedInPeriod: boolean;
}

// ─── Activity evidence timeline ─────────────────────────────

export interface ActivityEvidenceItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category?: string;
  durationMinutes?: number;
  projectId?: string;
  projectTitle?: string;
  goalId?: string;
  /** "Professional → Branding → Positioning" */
  goalPathLabel?: string;
  points?: number; // valid ledger points attributed to this activity, if any
}

// ─── Trend series ────────────────────────────────────────────

export type TrendMetric = 'points' | 'activities' | 'tasks_completed';

export interface TrendSeriesPoint {
  date: string; // YYYY-MM-DD bucket start
  label: string; // display label e.g. "Aug 22"
  value: number;
}

export interface TrendSeriesBundle {
  granularity: 'day';
  points: TrendSeriesPoint[];
  activities: TrendSeriesPoint[];
  tasks_completed: TrendSeriesPoint[];
}

// ─── Level 2: Life Area Dashboard bundle ────────────────────

export interface LifeAreaDashboardData {
  lifeAreaId: string;
  name: string;
  range: AnalyticsDateRange;
  kpis: {
    developmentPoints: number;
    tasksCompleted: number;
    tasksTotal: number;
    projectsAdvanced: number;
    goalsProgressed: number;
    subGoalsProgressed: number;
    activitiesLogged: number;
  };
  taskExecution: TaskExecutionStats;
  points: DevelopmentPointStats;
  goalRows: GoalExecutionRow[];
  projectRows: ProjectExecutionRow[];
  timeline: ActivityEvidenceItem[];
  trend: TrendSeriesBundle;
  /** Tasks behind taskExecution, resolved for drill-down lists. */
  taskDrilldown: {
    completed: Array<{
      id: string;
      title: string;
      completedAt?: string;
      goalId?: string;
      goalPathLabel?: string;
      projectName?: string;
      points?: number;
    }>;
    remaining: Array<{
      id: string;
      title: string;
      status: string;
      goalId?: string;
      goalPathLabel?: string;
      projectName?: string;
    }>;
  };
}
