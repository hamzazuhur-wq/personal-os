// ============================================================
// MODULE 10 — METRIC DEFINITIONS
// ============================================================
// Semantic definitions for every computed metric. Each entry
// documents the exact formula, period semantics, source data,
// unit, and null behavior. The metric service computes values
// from these definitions; UI and AI consume the results.
// ============================================================

import { MetricDefinition } from '../../types/metrics.types';

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ─── Execution ─────────────────────────────────────────────

  taskCompletionRate: {
    id: 'taskCompletionRate',
    name: 'Task Completion Rate',
    description: 'Ratio of completed tasks to total open+completed tasks in the period.',
    calculation: 'completedTasks / totalTasks * 100',
    period: 'Tasks with completed_at in [startDate, endDate]',
    source: 'Task.status, Task.completed_at',
    unit: 'percent',
    nullable: true,
  },

  taskExecutionVolume: {
    id: 'taskExecutionVolume',
    name: 'Task Execution Volume',
    description: 'Number of tasks completed in the period.',
    calculation: 'count(Task.status === "completed" AND completed_at in range)',
    period: 'Tasks with completed_at in [startDate, endDate]',
    source: 'Task.status, Task.completed_at',
    unit: 'count',
    nullable: false,
  },

  activityVolume: {
    id: 'activityVolume',
    name: 'Activity Volume',
    description: 'Number of activity logs recorded in the period.',
    calculation: 'count(Activity.date in [startDate, endDate])',
    period: 'Activity.date in [startDate, endDate]',
    source: 'Activity.date',
    unit: 'count',
    nullable: false,
  },

  activityDuration: {
    id: 'activityDuration',
    name: 'Activity Duration',
    description: 'Total minutes of recorded activity in the period.',
    calculation: 'sum(Activity.duration_minutes where Activity.date in range)',
    period: 'Activity.date in [startDate, endDate]',
    source: 'Activity.duration_minutes, Activity.date',
    unit: 'duration_minutes',
    nullable: true,
  },

  taskCompletionTrend: {
    id: 'taskCompletionTrend',
    name: 'Task Completion Trend',
    description: 'Direction of task completion volume compared to the previous equal-length period.',
    calculation: 'compare(currentPeriodCompletedTasks, previousPeriodCompletedTasks)',
    period: 'Current range vs previous range of equal length',
    source: 'Task.status, Task.completed_at',
    unit: 'trend',
    nullable: true,
  },

  taskAging: {
    id: 'taskAging',
    name: 'Task Aging',
    description: 'Open tasks bucketed by age since creation.',
    calculation: 'count(open tasks) grouped by age bucket',
    period: 'All open tasks (not period-scoped)',
    source: 'Task.status, Task.created_at',
    unit: 'count',
    nullable: false,
  },

  overdueIndicators: {
    id: 'overdueIndicators',
    name: 'Overdue Indicators',
    description: 'Open tasks whose due_date has passed.',
    calculation: 'count(open tasks where due_date < today)',
    period: 'Current date reference',
    source: 'Task.status, Task.due_date',
    unit: 'count',
    nullable: false,
  },

  // ─── Goal health ───────────────────────────────────────────

  goalStatusCounts: {
    id: 'goalStatusCounts',
    name: 'Goal Status Counts',
    description: 'Number of goals in each status category.',
    calculation: 'count(Goal) grouped by status',
    period: 'All goals (not period-scoped)',
    source: 'Goal.status',
    unit: 'count',
    nullable: false,
  },

  goalInactivitySignal: {
    id: 'goalInactivitySignal',
    name: 'Goal Inactivity Signal',
    description: 'Active goals with no qualifying evidence in the period.',
    calculation: 'Goal.status === "active" AND no completed tasks, activities, or point events attributed to goal or subtree in period',
    period: '[startDate, endDate]',
    source: 'Goal.status, Task.completed_at, Activity.date, PointLedgerEvent.occurred_at',
    unit: 'boolean',
    nullable: false,
  },

  // ─── Project health ────────────────────────────────────────

  projectStatusCounts: {
    id: 'projectStatusCounts',
    name: 'Project Status Counts',
    description: 'Number of projects in each status category.',
    calculation: 'count(Project) grouped by status',
    period: 'All projects (not period-scoped)',
    source: 'Project.status',
    unit: 'count',
    nullable: false,
  },

  projectInactivitySignal: {
    id: 'projectInactivitySignal',
    name: 'Project Inactivity Signal',
    description: 'Active projects with no qualifying activity in the period.',
    calculation: 'Project.status === "active" AND no completed tasks, activities, or point events attributed to project in period',
    period: '[startDate, endDate]',
    source: 'Project.status, Task.completed_at, Activity.date, PointLedgerEvent.occurred_at',
    unit: 'boolean',
    nullable: false,
  },

  // ─── Development ───────────────────────────────────────────

  allTimePoints: {
    id: 'allTimePoints',
    name: 'All-Time Development Points',
    description: 'Total valid point ledger events across all time.',
    calculation: 'sum(PointLedgerEvent.points where status === "valid")',
    period: 'All time',
    source: 'PointLedgerEvent.points, PointLedgerEvent.status',
    unit: 'points',
    nullable: false,
  },

  periodPoints: {
    id: 'periodPoints',
    name: 'Period Development Points',
    description: 'Total valid point ledger events within the selected period.',
    calculation: 'sum(PointLedgerEvent.points where status === "valid" AND occurred_at in range)',
    period: '[startDate, endDate]',
    source: 'PointLedgerEvent.points, PointLedgerEvent.status, PointLedgerEvent.occurred_at',
    unit: 'points',
    nullable: false,
  },

  pointsByLifeArea: {
    id: 'pointsByLifeArea',
    name: 'Points by Life Area',
    description: 'Point totals partitioned by Life Area for the period.',
    calculation: 'sum(PointLedgerEvent.points) grouped by life_area_id where occurred_at in range',
    period: '[startDate, endDate]',
    source: 'PointLedgerEvent.points, PointLedgerEvent.life_area_id, PointLedgerEvent.occurred_at',
    unit: 'points',
    nullable: false,
  },

  pointAcceleration: {
    id: 'pointAcceleration',
    name: 'Point Acceleration',
    description: 'Percentage change in point accumulation between the current and previous equal-length period.',
    calculation: '(currentPeriodPoints - previousPeriodPoints) / previousPeriodPoints * 100',
    period: 'Current range vs previous range of equal length',
    source: 'PointLedgerEvent.points, PointLedgerEvent.occurred_at',
    unit: 'percent',
    nullable: true,
  },

  pointTrend: {
    id: 'pointTrend',
    name: 'Point Trend',
    description: 'Direction of point accumulation compared to the previous equal-length period.',
    calculation: 'compare(currentPeriodPoints, previousPeriodPoints)',
    period: 'Current range vs previous range of equal length',
    source: 'PointLedgerEvent.points, PointLedgerEvent.occurred_at',
    unit: 'trend',
    nullable: true,
  },

  // ─── Life Area balance ─────────────────────────────────────

  distributionByPoints: {
    id: 'distributionByPoints',
    name: 'Attention Distribution by Points',
    description: 'How development points are distributed across Life Areas.',
    calculation: 'pointsByLifeArea as percentage of total',
    period: '[startDate, endDate]',
    source: 'PointLedgerEvent.life_area_id, PointLedgerEvent.points',
    unit: 'percent',
    nullable: true,
  },

  distributionByActivities: {
    id: 'distributionByActivities',
    name: 'Attention Distribution by Activities',
    description: 'How activity logs are distributed across Life Areas.',
    calculation: 'count(Activity) grouped by related_life_area_id or goal attribution',
    period: '[startDate, endDate]',
    source: 'Activity.related_life_area_id, Activity.related_goal_id',
    unit: 'count',
    nullable: true,
  },

  distributionByTasks: {
    id: 'distributionByTasks',
    name: 'Attention Distribution by Tasks',
    description: 'How completed tasks are distributed across Life Areas.',
    calculation: 'count(completed tasks) grouped by task life area attribution',
    period: '[startDate, endDate]',
    source: 'Task.related_goal_id, Task.related_project_id, Goal.life_area_id, Project.life_area_id',
    unit: 'count',
    nullable: true,
  },

  areaTrends: {
    id: 'areaTrends',
    name: 'Life Area Trends',
    description: 'Point trend direction for each Life Area.',
    calculation: 'compare(currentPeriodAreaPoints, previousPeriodAreaPoints) per Life Area',
    period: 'Current range vs previous range of equal length',
    source: 'PointLedgerEvent.life_area_id, PointLedgerEvent.occurred_at',
    unit: 'trend',
    nullable: true,
  },

  // ─── Skill metrics ─────────────────────────────────────────

  proficiencyDistribution: {
    id: 'proficiencyDistribution',
    name: 'Skill Proficiency Distribution',
    description: 'Count of active skills by proficiency level.',
    calculation: 'count(Skill) grouped by current_proficiency where status === "active"',
    period: 'All skills (not period-scoped)',
    source: 'Skill.current_proficiency, Skill.status',
    unit: 'count',
    nullable: false,
  },

  developmentStateDistribution: {
    id: 'developmentStateDistribution',
    name: 'Skill Development State Distribution',
    description: 'Count of active skills by development state.',
    calculation: 'count(Skill) grouped by development_state where status === "active"',
    period: 'All skills (not period-scoped)',
    source: 'Skill.development_state, Skill.status',
    unit: 'count',
    nullable: false,
  },

  skillsWithRecentEvidence: {
    id: 'skillsWithRecentEvidence',
    name: 'Skills with Recent Evidence',
    description: 'Skills that have evidence or history entries in the period.',
    calculation: 'count(distinct Skill with SkillEvidence or SkillHistory in period)',
    period: '[startDate, endDate]',
    source: 'SkillEvidence.created_at, SkillHistory.changed_at',
    unit: 'count',
    nullable: false,
  },

  skillsWithoutRecentEvidence: {
    id: 'skillsWithoutRecentEvidence',
    name: 'Skills Without Recent Evidence',
    description: 'Active skills with no evidence or history in the period.',
    calculation: 'Active skills where no SkillEvidence or SkillHistory in period',
    period: '[startDate, endDate]',
    source: 'Skill.status, SkillEvidence.created_at, SkillHistory.changed_at',
    unit: 'count',
    nullable: false,
  },

  // ─── Level metrics ─────────────────────────────────────────

  currentLevel: {
    id: 'currentLevel',
    name: 'Current Level',
    description: 'The level marked as current for a Life Area.',
    calculation: 'Level where status === "current" for the Life Area',
    period: 'Current state (not period-scoped)',
    source: 'Level.status, Level.life_area_id',
    unit: 'level',
    nullable: true,
  },

  nextLevel: {
    id: 'nextLevel',
    name: 'Next Level',
    description: 'The next unlocked or locked level after the current one.',
    calculation: 'Level with display_order > currentLevel.display_order where status is "unlocked" or "locked"',
    period: 'Current state (not period-scoped)',
    source: 'Level.status, Level.display_order, Level.life_area_id',
    unit: 'level',
    nullable: true,
  },

  requirementProgress: {
    id: 'requirementProgress',
    name: 'Requirement Progress',
    description: 'Current vs target progress for each requirement of a level.',
    calculation: 'For development_points requirements: sum valid points in scope / target_points',
    period: 'All time (point ledger)',
    source: 'LevelRequirement.target_points, PointLedgerEvent',
    unit: 'points',
    nullable: true,
  },

  // ─── Planning vs execution ─────────────────────────────────

  taskExecutionRate: {
    id: 'taskExecutionRate',
    name: 'Task Execution Rate',
    description: 'Ratio of completed tasks to total tasks in the period.',
    calculation: 'completedTasks / totalTasks',
    period: '[startDate, endDate]',
    source: 'Task.status, Task.completed_at',
    unit: 'ratio',
    nullable: true,
  },

  goalEvidenceRate: {
    id: 'goalEvidenceRate',
    name: 'Goal Evidence Rate',
    description: 'Ratio of active goals with execution evidence to total active goals.',
    calculation: 'activeGoalsWithEvidence / totalActiveGoals',
    period: '[startDate, endDate]',
    source: 'Goal.status, Task.completed_at, Activity.date, PointLedgerEvent.occurred_at',
    unit: 'ratio',
    nullable: true,
  },

  projectActivityRate: {
    id: 'projectActivityRate',
    name: 'Project Activity Rate',
    description: 'Ratio of active projects with recent activity to total active projects.',
    calculation: 'activeProjectsWithActivity / totalActiveProjects',
    period: '[startDate, endDate]',
    source: 'Project.status, Task.completed_at, Activity.date, PointLedgerEvent.occurred_at',
    unit: 'ratio',
    nullable: true,
  },

  // ─── Consistency ───────────────────────────────────────────

  activeDays: {
    id: 'activeDays',
    name: 'Active Days',
    description: 'Number of distinct calendar days with at least one activity log in the period.',
    calculation: 'count(distinct Activity.date in range)',
    period: '[startDate, endDate]',
    source: 'Activity.date',
    unit: 'days',
    nullable: false,
  },

  weeksWithActivity: {
    id: 'weeksWithActivity',
    name: 'Weeks with Activity',
    description: 'Number of distinct ISO weeks that contain at least one activity in the period.',
    calculation: 'count(distinct ISO week of Activity.date in range)',
    period: '[startDate, endDate]',
    source: 'Activity.date',
    unit: 'weeks',
    nullable: false,
  },

  currentStreak: {
    id: 'currentStreak',
    name: 'Current Activity Streak',
    description: 'Consecutive calendar days with activity ending at the end of the period (or today).',
    calculation: 'consecutive days with Activity.date, ending at period end date or today',
    period: 'Current streak as of period end',
    source: 'Activity.date',
    unit: 'days',
    nullable: true,
  },
};
