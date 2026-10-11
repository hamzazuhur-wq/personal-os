// ============================================================
// MODULE 10 — METRICS & ANALYTICS TYPES
// ============================================================
// Deterministic metric results consumed by Dashboard, Review,
// AI tools, and future Module 11 proactive signals.
// ============================================================

import { AnalyticsDateRange } from './analytics.types';

// ─── Core metric primitives ──────────────────────────────────

/**
 * A typed metric value that may be absent when data is insufficient.
 * - value: the computed result, or null when the denominator is zero / no data
 * - unit: human-readable unit for display
 * - period: the time scope the metric covers
 * - source: which domain data fed the calculation
 */
export interface MetricValue<T> {
  value: T | null;
  unit: string;
  period: AnalyticsDateRange;
  source: string;
}

/**
 * Comparison between two periods for the same metric.
 * - absoluteChange: current - previous (may be negative)
 * - percentChange: (current - previous) / previous * 100, or null when previous is null/0
 */
export interface PeriodComparison<T> {
  current: MetricValue<T>;
  previous: MetricValue<T>;
  absoluteChange: number | null;
  percentChange: number | null;
}

/**
 * Deterministic health signal with documented evidence.
 * - status: 'healthy' | 'at_risk' | 'stalled' | 'unknown'
 * - reason: one-line explanation of the classification
 * - evidence: the raw facts that produced the signal
 */
export interface HealthSignal {
  status: 'healthy' | 'at_risk' | 'stalled' | 'unknown';
  reason: string;
  evidence: Record<string, unknown>;
}

/**
 * Semantic definition of a metric (metadata only, no computation).
 */
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  calculation: string;
  period: string;
  source: string;
  unit: string;
  nullable: boolean;
}

// ─── Execution metrics ───────────────────────────────────────

export interface ExecutionMetrics {
  taskCompletionRate: MetricValue<number | null>;
  taskExecutionVolume: MetricValue<number>;
  activityVolume: MetricValue<number>;
  activityDuration: MetricValue<number | null>;
  taskCompletionTrend: MetricValue<'increased' | 'decreased' | 'unchanged' | null>;
  taskAging: TaskAgingBucket[];
  overdueIndicators: OverdueIndicator[];
}

export interface TaskAgingBucket {
  label: string;
  count: number;
  taskIds: string[];
}

export interface OverdueIndicator {
  taskId: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

// ─── Goal health metrics ─────────────────────────────────────

export interface GoalHealthMetrics {
  statusCounts: Record<string, number>;
  inactiveGoalIds: string[];
  healthByGoal: GoalHealthRow[];
  overallSignal: HealthSignal;
}

export interface GoalHealthRow {
  goalId: string;
  title: string;
  status: string;
  signal: HealthSignal;
}

// ─── Project health metrics ──────────────────────────────────

export interface ProjectHealthMetrics {
  statusCounts: Record<string, number>;
  inactiveProjectIds: string[];
  healthByProject: ProjectHealthRow[];
  overallSignal: HealthSignal;
}

export interface ProjectHealthRow {
  projectId: string;
  title: string;
  status: string;
  signal: HealthSignal;
}

// ─── Development metrics ─────────────────────────────────────

export interface DevelopmentMetrics {
  allTimePoints: MetricValue<number>;
  periodPoints: MetricValue<number>;
  pointsByLifeArea: LifeAreaPointMetric[];
  pointAcceleration: PeriodComparison<number> | null;
  pointTrend: MetricValue<'increased' | 'decreased' | 'unchanged' | null>;
}

export interface LifeAreaPointMetric {
  lifeAreaId: string;
  name: string;
  points: number;
  percentOfTotal: number | null;
}

// ─── Life Area balance metrics ───────────────────────────────

export interface LifeAreaBalanceMetrics {
  distributionByPoints: LifeAreaBalanceRow[];
  distributionByActivities: LifeAreaBalanceRow[];
  distributionByTasks: LifeAreaBalanceRow[];
  areaTrends: LifeAreaTrendRow[];
}

export interface LifeAreaBalanceRow {
  lifeAreaId: string;
  name: string;
  value: number;
  percentOfTotal: number | null;
}

export interface LifeAreaTrendRow {
  lifeAreaId: string;
  name: string;
  trend: 'increased' | 'decreased' | 'unchanged' | null;
  currentPeriodValue: number | null;
  previousPeriodValue: number | null;
}

// ─── Skill metrics ───────────────────────────────────────────

export interface SkillMetrics {
  proficiencyDistribution: Record<string, number>;
  developmentStateDistribution: Record<string, number>;
  skillsWithRecentEvidence: number;
  skillsWithoutRecentEvidence: SkillGapRow[];
  pointsBySkill: SkillPointRow[];
}

export interface SkillGapRow {
  skillId: string;
  name: string;
  lastEvidenceAt: string | null;
  daysSinceEvidence: number | null;
}

export interface SkillPointRow {
  skillId: string;
  name: string;
  points: number;
}

// ─── Level metrics ───────────────────────────────────────────

export interface LevelMetrics {
  currentLevel: LevelProgressRow | null;
  nextLevel: LevelProgressRow | null;
  requirements: RequirementProgressRow[];
}

export interface LevelProgressRow {
  levelId: string;
  name: string;
  status: string;
  displayOrder: number;
}

export interface RequirementProgressRow {
  requirementId: string;
  name: string;
  type: string;
  status: string;
  current: number;
  target: number;
  percent: number | null;
}

// ─── Planning vs execution metrics ───────────────────────────

export interface PlanningExecutionMetrics {
  taskExecutionRate: MetricValue<number | null>;
  goalEvidenceRate: MetricValue<number | null>;
  projectActivityRate: MetricValue<number | null>;
}

// ─── Time trends ─────────────────────────────────────────────

export interface TrendMetrics {
  taskCompletionTrend: MetricValue<'increased' | 'decreased' | 'unchanged' | null>;
  pointTrend: MetricValue<'increased' | 'decreased' | 'unchanged' | null>;
  activityTrend: MetricValue<'increased' | 'decreased' | 'unchanged' | null>;
}

// ─── Consistency metrics ─────────────────────────────────────

export interface ConsistencyMetrics {
  activeDays: MetricValue<number>;
  weeksWithActivity: MetricValue<number>;
  currentStreak: MetricValue<number | null>;
}

// ─── Bundled metrics response ────────────────────────────────

export interface MetricsBundle {
  range: AnalyticsDateRange;
  execution: ExecutionMetrics;
  goalHealth: GoalHealthMetrics;
  projectHealth: ProjectHealthMetrics;
  development: DevelopmentMetrics;
  lifeAreaBalance: LifeAreaBalanceMetrics;
  skills: SkillMetrics;
  levels: LevelMetrics;
  planningExecution: PlanningExecutionMetrics;
  trends: TrendMetrics;
  consistency: ConsistencyMetrics;
}
