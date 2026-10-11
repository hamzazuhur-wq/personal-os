import { AIToolDefinition } from '../../../types/aiTool.types';

export const AI_TOOL_DEFINITIONS: AIToolDefinition[] = [
  // ─── Read Tools ───────────────────────────────────────────
  {
    name: 'getVision',
    description: "Returns the user's overarching personal vision and configured Life Areas.",
    classification: 'read',
    domain: 'vision',
    confirmationRequired: false,
    parameters: [],
  },
  {
    name: 'getLifeAreas',
    description: "Returns the active Life Areas with short-term directions and sort order.",
    classification: 'read',
    domain: 'vision',
    confirmationRequired: false,
    parameters: [
      { name: 'includeArchived', type: 'boolean', description: 'Whether to include archived areas', required: false },
    ],
  },
  {
    name: 'getActiveGoals',
    description: "Returns the user's currently active Strategic Goals and objectives.",
    classification: 'read',
    domain: 'goals',
    confirmationRequired: false,
    parameters: [
      { name: 'life_area_id', type: 'string', description: 'Filter by Life Area ID', required: false },
      { name: 'time_horizon', type: 'string', description: 'Filter by horizon: long_term|annual|six_month|monthly|weekly', required: false },
    ],
  },
  {
    name: 'getGoalDetail',
    description: "Returns details of a specific Goal including child sub-goals.",
    classification: 'read',
    domain: 'goals',
    confirmationRequired: false,
    parameters: [
      { name: 'goalId', type: 'string', description: 'ID of the goal to inspect', required: true },
    ],
  },
  {
    name: 'getLevels',
    description: "Returns all Development Levels for a given Life Area including status and order.",
    classification: 'read',
    domain: 'levels',
    confirmationRequired: false,
    parameters: [
      { name: 'lifeAreaId', type: 'string', description: 'Life Area ID', required: true },
    ],
  },
  {
    name: 'getLevelDetail',
    description: "Returns a specific Level with requirements, skills, milestones, and eligibility.",
    classification: 'read',
    domain: 'levels',
    confirmationRequired: false,
    parameters: [
      { name: 'levelId', type: 'string', description: 'Level ID', required: true },
    ],
  },
  {
    name: 'getSkills',
    description: "Returns tracked skills in the Skill Matrix filtered by Life Area or proficiency.",
    classification: 'read',
    domain: 'skills',
    confirmationRequired: false,
    parameters: [
      { name: 'life_area_id', type: 'string', description: 'Filter by Life Area ID', required: false },
      { name: 'development_state', type: 'string', description: 'Filter by state: not_started|developing|maintaining|demonstrated', required: false },
    ],
  },
  {
    name: 'getSkillDetail',
    description: "Returns details for a specific Skill including evidence and change history.",
    classification: 'read',
    domain: 'skills',
    confirmationRequired: false,
    parameters: [
      { name: 'skillId', type: 'string', description: 'Skill ID', required: true },
    ],
  },
  {
    name: 'getActiveProjects',
    description: "Returns the active and paused projects in the user's system.",
    classification: 'read',
    domain: 'projects',
    confirmationRequired: false,
    parameters: [
      { name: 'life_area_id', type: 'string', description: 'Filter by Life Area ID', required: false },
    ],
  },
  {
    name: 'getProjectDetail',
    description: "Returns full project details including linked tasks and activity history.",
    classification: 'read',
    domain: 'projects',
    confirmationRequired: false,
    parameters: [
      { name: 'projectId', type: 'string', description: 'Project ID', required: true },
    ],
  },
  {
    name: 'getTasks',
    description: "Returns active and scheduled tasks filtered by status or priority.",
    classification: 'read',
    domain: 'tasks',
    confirmationRequired: false,
    parameters: [
      { name: 'status', type: 'string', description: 'Filter: todo|in_progress|done|all', required: false },
    ],
  },
  {
    name: 'getDailyActivities',
    description: "Returns recorded daily activity logs for a specified date range.",
    classification: 'read',
    domain: 'activities',
    confirmationRequired: false,
    parameters: [
      { name: 'startDate', type: 'string', description: 'Start date YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'End date YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getWeeklyOverview',
    description: "Returns the current weekly focus and focus objectives.",
    classification: 'read',
    domain: 'weekly',
    confirmationRequired: false,
    parameters: [],
  },
  {
    name: 'getMemories',
    description: "Returns curated AI memory items (preferences, constraints, decisions).",
    classification: 'read',
    domain: 'memory',
    confirmationRequired: false,
    parameters: [
      { name: 'type', type: 'string', description: 'Memory type: preference|constraint|decision|context|interaction_preference', required: false },
    ],
  },
  {
    name: 'getDevelopmentPointSummary',
    description:
      "Returns Development Point totals (all-time / last 7 days / last 30 days) with a per-Life-Area breakdown. Read-only.",
    classification: 'read',
    domain: 'development',
    confirmationRequired: false,
    parameters: [
      { name: 'lifeAreaId', type: 'string', description: 'Optional Life Area ID to scope the summary', required: false },
    ],
  },
  {
    name: 'getDevelopmentPointHistory',
    description:
      "Returns recent Development Point ledger events, newest first. Read-only.",
    classification: 'read',
    domain: 'development',
    confirmationRequired: false,
    parameters: [
      { name: 'limit', type: 'number', description: 'Maximum events to return (default 10)', required: false },
      { name: 'goalId', type: 'string', description: 'Filter by Goal ID', required: false },
      { name: 'projectId', type: 'string', description: 'Filter by Project ID', required: false },
      { name: 'taskId', type: 'string', description: 'Filter by Task ID', required: false },
      { name: 'lifeAreaId', type: 'string', description: 'Filter by Life Area ID', required: false },
    ],
  },
  {
    name: 'getReviewOverview',
    description:
      "Returns the period Review & Analytics overview: tasks completed, projects advanced, goals progressed, activities logged and development points across all Life Areas. Uses the same analytics service as the Review dashboard.",
    classification: 'read',
    domain: 'review',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD (overrides preset)', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD (overrides preset)', required: false },
    ],
  },
  {
    name: 'getLifeAreaReview',
    description:
      "Returns a full review digest for one Life Area and period: KPIs, task execution (completed/total), point breakdown by goal/project/source, goal execution rows and advanced projects. Same analytics service as the dashboard.",
    classification: 'read',
    domain: 'review',
    confirmationRequired: false,
    parameters: [
      { name: 'lifeAreaId', type: 'string', description: 'Life Area ID (or use lifeAreaName)', required: false },
      { name: 'lifeAreaName', type: 'string', description: 'Life Area name, e.g. "Professional"', required: false },
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },

  // ─── Module 10: Metrics & Analytics Read Tools ─────────────

  {
    name: 'getExecutionMetrics',
    description:
      'Returns execution metrics for a period: task completion rate, execution volume, activity volume, activity duration, task aging, overdue indicators, and trend direction. Deterministic.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getGoalHealthMetrics',
    description:
      'Returns goal health metrics: status counts, inactive goals, per-goal health signals (healthy/at_risk/stalled), and overall signal with documented rules.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getProjectHealthMetrics',
    description:
      'Returns project health metrics: status counts, inactive projects, per-project health signals (healthy/at_risk/stalled), and overall signal with documented rules.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getDevelopmentMetrics',
    description:
      'Returns development point metrics: all-time total, period total, distribution by Life Area, point acceleration vs previous period, and trend direction.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getLifeAreaBalanceMetrics',
    description:
      'Returns attention balance metrics across Life Areas: distribution by points, activities, tasks, and trend direction per area.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getSkillMetrics',
    description:
      'Returns skill development metrics: proficiency distribution, development state distribution, skills with/without recent evidence, and points by skill.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getLevelMetrics',
    description:
      'Returns level progression metrics: current level, next level, and requirement progress (current/target/percent) for each requirement.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'lifeAreaId', type: 'string', description: 'Optional Life Area ID to scope levels', required: false },
    ],
  },
  {
    name: 'getPlanningExecutionMetrics',
    description:
      'Returns planning-vs-execution ratios: task execution rate, goal evidence rate, project activity rate. Null when denominator is zero.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getTrendMetrics',
    description:
      'Returns trend directions (increased/decreased/unchanged) for task completion, development points, and activity volume compared to the previous equal-length period.',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'getConsistencyMetrics',
    description:
      'Returns consistency metrics: active days, weeks with activity, and current activity streak (consecutive days ending at period end).',
    classification: 'read',
    domain: 'metrics',
    confirmationRequired: false,
    parameters: [
      { name: 'preset', type: 'string', description: 'Period preset: today|this_week|this_month|this_year (default this_month)', required: false },
      { name: 'startDate', type: 'string', description: 'Custom range start YYYY-MM-DD', required: false },
      { name: 'endDate', type: 'string', description: 'Custom range end YYYY-MM-DD', required: false },
    ],
  },

  // ─── Write Tools (High-Impact / Confirmation Required) ────
  {
    name: 'createGoal',
    description: "Creates a new Strategic Goal in the user's strategic architecture.",
    classification: 'write',
    domain: 'goals',
    confirmationRequired: true,
    parameters: [
      { name: 'title', type: 'string', description: 'Goal title', required: true },
      { name: 'goal_type', type: 'string', description: 'outcome|development|performance|acquisition|milestone', required: true },
      { name: 'time_horizon', type: 'string', description: 'long_term|annual|six_month|monthly|weekly', required: true },
      { name: 'priority', type: 'string', description: 'low|medium|high', required: true },
      { name: 'life_area_id', type: 'string', description: 'Associated Life Area ID', required: false },
    ],
  },
  {
    name: 'updateGoal',
    description: "Updates properties or progression links of an existing Goal.",
    classification: 'write',
    domain: 'goals',
    confirmationRequired: true,
    parameters: [
      { name: 'id', type: 'string', description: 'Goal ID', required: true },
      { name: 'title', type: 'string', description: 'New title', required: false },
      { name: 'level_id', type: 'string', description: 'Link to Level ID', required: false },
    ],
  },
  {
    name: 'archiveGoal',
    description: "Archives a Strategic Goal while preserving all historical links.",
    classification: 'write',
    domain: 'goals',
    confirmationRequired: true,
    parameters: [
      { name: 'id', type: 'string', description: 'Goal ID to archive', required: true },
    ],
  },
  {
    name: 'createProject',
    description: "Creates a new Active Project.",
    classification: 'write',
    domain: 'projects',
    confirmationRequired: true,
    parameters: [
      { name: 'title', type: 'string', description: 'Project title', required: true },
      { name: 'desired_outcome', type: 'string', description: 'Definition of done / outcome', required: true },
      { name: 'priority', type: 'string', description: 'low|medium|high', required: true },
      { name: 'life_area_id', type: 'string', description: 'Life Area ID', required: false },
      { name: 'primary_goal_id', type: 'string', description: 'Linked Goal ID', required: false },
    ],
  },
  {
    name: 'archiveProject',
    description: "Archives a project without permanent data loss.",
    classification: 'write',
    domain: 'projects',
    confirmationRequired: true,
    parameters: [
      { name: 'id', type: 'string', description: 'Project ID', required: true },
    ],
  },
  {
    name: 'createSkill',
    description: "Creates a new capability item in the Skill Matrix.",
    classification: 'write',
    domain: 'skills',
    confirmationRequired: true,
    parameters: [
      { name: 'name', type: 'string', description: 'Skill name', required: true },
      { name: 'current_proficiency', type: 'string', description: 'foundation|developing|competent|advanced|expert', required: true },
      { name: 'target_proficiency', type: 'string', description: 'foundation|developing|competent|advanced|expert', required: true },
      { name: 'development_state', type: 'string', description: 'not_started|developing|maintaining|demonstrated', required: true },
      { name: 'life_area_id', type: 'string', description: 'Life Area ID', required: false },
    ],
  },
  {
    name: 'updateSkillProficiency',
    description: "Updates skill proficiency level and permanently logs the reason to audit history.",
    classification: 'write',
    domain: 'skills',
    confirmationRequired: true,
    parameters: [
      { name: 'id', type: 'string', description: 'Skill ID', required: true },
      { name: 'newProficiency', type: 'string', description: 'New level', required: true },
      { name: 'reason', type: 'string', description: 'Mandatory reason for change', required: true },
    ],
  },
  {
    name: 'createTask',
    description: "Creates an action task in the user's execution stream.",
    classification: 'write',
    domain: 'tasks',
    confirmationRequired: true,
    parameters: [
      { name: 'title', type: 'string', description: 'Task title', required: true },
      { name: 'priority', type: 'string', description: 'low|medium|high|urgent', required: false },
      { name: 'due_date', type: 'string', description: 'Due date YYYY-MM-DD', required: false },
    ],
  },
  {
    name: 'saveMemory',
    description: "Saves a durable user preference, constraint, or personal context to AI memory.",
    classification: 'write',
    domain: 'memory',
    confirmationRequired: true,
    parameters: [
      { name: 'content', type: 'string', description: 'The preference or constraint statement', required: true },
      { name: 'type', type: 'string', description: 'preference|constraint|decision|context|interaction_preference', required: true },
    ],
  },
  {
    name: 'archiveMemory',
    description: "Archives an outdated memory item.",
    classification: 'write',
    domain: 'memory',
    confirmationRequired: true,
    parameters: [
      { name: 'id', type: 'string', description: 'Memory ID to archive', required: true },
    ],
  },
];

export function getToolDefinition(toolName: string): AIToolDefinition | undefined {
  return AI_TOOL_DEFINITIONS.find((t) => t.name === toolName);
}


