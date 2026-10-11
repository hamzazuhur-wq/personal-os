// ============================================================
// MODULE 11 PHASE 6 — RECOMMENDATION CONTEXT BUILDER
// ============================================================
//
// BOUNDED · DETERMINISTIC · NO AI CALLS · NO DB WRITES
//
// Takes a ranked ProactiveCandidate and produces a compact,
// structured RecommendationContext containing:
//   - the candidate itself
//   - policy bundle (SOUL + RULES + optional DOMAIN_KNOWLEDGE)
//   - signal-specific bounded domain data
//   - relevant metrics/evidence
//   - action allowlist
//
// Context is passed to the future AI Recommendation Engine.
//
// This phase does NOT:
//   - call any AI provider
//   - persist recommendations
//   - mutate the database
//   - send full database dumps
//
// Contract:
//   - deterministic: same input → same context
//   - bounded: explicit maximums per entity type
//   - factual: no invented relationships or prose
//   - secure: no secrets, no credentials
//   - compact: target <= 3500 tokens per context
//
// ============================================================

import { ProactiveCandidate, SignalType } from '../../../types/recommendation.types';
import { PolicyBundle, requiresDomainKnowledge } from './policyLoaderCore';
import type { Goal } from '../../../types/goal.types';
import type { Project } from '../../../types/project.types';
import type { Task } from '../../../types/task.types';
import type { Activity } from '../../../types/activity.types';
import type { Skill, SkillLevelRelation } from '../../../types/skill.types';
import type { Level } from '../../../types/level.types';
import type { Practice } from '../../../types/practice.types';
import type { Capture } from '../../../types/capture.types';

// Phase 6 Metrics Types
// These are simpler per-entity metric summaries used for context,
// distinct from the full MetricsBundle in metricsService.

export interface GoalMetrics {
  goalId: string;
  health: 'healthy' | 'at_risk' | 'stalled';
  completedTasksCount: number;
  openTasksCount: number;
  totalTasksCount: number;
  daysSinceLastActivity: number;
  completionRate: number;
}

export interface ProjectMetrics {
  projectId: string;
  health: 'healthy' | 'at_risk' | 'stalled';
  completedTasksCount: number;
  openTasksCount: number;
  totalTasksCount: number;
  daysSinceLastActivity: number;
  completionRate: number;
}

export interface SkillMetrics {
  skillId: string;
  evidenceCount: number;
  lastAppliedDate: string | null;
  daysSinceLastApplied: number | null;
  recentProjectsCount: number;
}

export interface LifeAreaMetrics {
  area: string;
  activitiesCount: number;
  tasksCount: number;
  pointsEarned: number;
  hoursSpent: number;
  percentOfTotal: number;
}

export interface ExecutionMetrics {
  totalTasksCompleted: number;
  totalActivitiesLogged: number;
  totalPointsEarned: number;
  activeGoalsCount: number;
  activeProjectsCount: number;
  completionRate: number;
  averageTasksPerDay: number;
  averageActivitiesPerDay: number;
  currentStreak: number;
  longestStreak: number;
}

// ─── Context Types ───────────────────────────────────────────

/**
 * Complete bounded context for generating a single recommendation.
 * Passed to the future AI recommendation engine.
 */
export interface RecommendationContext {
  /** The ranked candidate this context supports. */
  candidate: ProactiveCandidate;

  /** Policy bundle (SOUL + RULES + optional DOMAIN_KNOWLEDGE). */
  policy: PolicyBundle;

  /** Signal-specific bounded domain data. */
  domainData: SignalDomainData;

  /** Relevant metrics for this candidate. */
  metrics: RelevantMetrics;

  /** Allowed tool names for this signal type. */
  allowedActions: string[];

  /** ISO timestamp when context was built. */
  contextBuiltAt: string;
}

/**
 * Signal-specific domain data. Only the relevant signal field
 * is populated; others are null.
 */
export type SignalDomainData =
  | { type: 'goal_inactive'; data: GoalInactiveData }
  | { type: 'goal_without_clear_next_action'; data: GoalWithoutActionData }
  | { type: 'goal_next_action'; data: GoalNextActionData }
  | { type: 'project_stalled'; data: ProjectStalledData }
  | { type: 'project_next_action'; data: ProjectNextActionData }
  | { type: 'skill_evidence_gap'; data: SkillEvidenceGapData }
  | { type: 'life_area_attention'; data: LifeAreaAttentionData }
  | { type: 'execution_decline'; data: ExecutionDeclineData }
  | { type: 'learning_without_application'; data: LearningWithoutApplicationData }
  | { type: 'completed_goal_followup'; data: CompletedGoalFollowupData }
  | { type: 'idea_opportunity'; data: IdeaOpportunityData };

export interface GoalInactiveData {
  targetGoal: Goal;
  recentTasks: Task[];           // max 5
  recentActivities: Activity[];  // max 5
  linkedProject?: Project;       // max 1
}

export interface GoalWithoutActionData {
  targetGoal: Goal;
  openTasks: Task[];             // max 5
  subGoals: Goal[];              // immediate children only, max 3
  recentActivities: Activity[];  // max 5
  linkedProjects: Project[];     // max 2
}

export interface GoalNextActionData {
  targetGoal: Goal;
  activeTasks: Task[];           // max 5
  recentActivities: Activity[];  // max 5
  linkedProject?: Project;       // max 1
}

export interface ProjectStalledData {
  targetProject: Project;
  linkedGoal?: Goal;
  recentTasks: Task[];           // max 5
  recentActivities: Activity[];  // max 5
}

export interface ProjectNextActionData {
  targetProject: Project;
  linkedGoal?: Goal;
  openTasks: Task[];             // max 5
  recentActivities: Activity[];  // max 5
}

export interface SkillEvidenceGapData {
  targetSkill: Skill;
  relatedLevels: Level[];        // max 3 (via junction table)
  recentActivities: Activity[];  // max 5
  recentTasks: Task[];           // max 5
  relatedProjects: Project[];    // max 2
}

export interface LifeAreaAttentionData {
  lifeArea: string;
  recentActivities: Activity[];  // max 5
  recentTasks: Task[];           // max 5
  relatedGoals: Goal[];          // max 3
}

export interface ExecutionDeclineData {
  recentTasks: Task[];           // max 5
  recentActivities: Activity[];  // max 5
  recentPractices: Practice[];   // max 3
  pointsLastWeek: number;
  pointsThisWeek: number;
}

export interface LearningWithoutApplicationData {
  learningActivities: Activity[]; // max 5
  applicationTasks: Task[];       // max 5
  relatedGoals: Goal[];           // max 3
  relatedProjects: Project[];     // max 2
}

export interface CompletedGoalFollowupData {
  completedGoal: Goal;
  childGoals: Goal[];            // max 3
  relatedProjects: Project[];    // max 2
  recentActivities: Activity[];  // max 5
}

export interface IdeaOpportunityData {
  targetIdea: Capture;
  relatedGoal?: Goal;
  relatedProject?: Project;
  recentActivities: Activity[];  // max 5
}

export interface RelevantMetrics {
  goal?: GoalMetrics;
  project?: ProjectMetrics;
  skill?: SkillMetrics;
  lifeArea?: LifeAreaMetrics;
  execution?: ExecutionMetrics;
}

// ─── Builder Input ───────────────────────────────────────────

/**
 * Complete domain data needed to build context for any candidate.
 * Passed in by the caller (trigger service or test).
 */
export interface ContextBuilderInput {
  candidate: ProactiveCandidate;
  policy: PolicyBundle;
  now: string; // ISO timestamp for determinism

  // All domain entities, pre-fetched by caller
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
  skills: Skill[];
  levels: Level[];
  practices: Practice[];
  captures: Capture[];
  skillLevelRelations: SkillLevelRelation[];

  // All metrics, pre-computed by caller
  goalMetrics: GoalMetrics[];
  projectMetrics: ProjectMetrics[];
  skillMetrics: SkillMetrics[];
  lifeAreaMetrics: LifeAreaMetrics[];
  executionMetrics: ExecutionMetrics;
}

// ─── Action Allowlists ───────────────────────────────────────
// These match RECOMMENDATION_RULES.md §11 Tool Allowlists.
// Destructive actions are NEVER allowed.

const ACTION_ALLOWLISTS: Record<SignalType, string[]> = {
  goal_inactive: [
    'createTask',
    'createSubGoal',
    'updateGoal',
  ],
  goal_without_clear_next_action: [
    'createTask',
    'createSubGoal',
  ],
  goal_next_action: [
    'createTask',
  ],
  project_stalled: [
    'createTask',
    'updateProject',
  ],
  project_next_action: [
    'createTask',
  ],
  skill_evidence_gap: [
    'createTask',
    'createGoal',
    'createSubGoal',
  ],
  life_area_attention: [
    'createGoal',
    'createTask',
  ],
  execution_decline: [
    'createGoal',
    'createTask',
  ],
  learning_without_application: [
    'createTask',
    'createProject',
  ],
  completed_goal_followup: [
    'createGoal',
    'createSubGoal',
    'createProject',
  ],
  idea_opportunity: [
    // Idea opportunities are recommendation-only unless user
    // explicitly accepts a proposed action. No auto-conversion.
  ],
};

// ─── Context Size Budget ─────────────────────────────────────
// Target: <= 3500 tokens per context before prompt wrapper.
// Rough approximation: 1 token ≈ 4 characters (English text).
// Budget: ~14,000 characters max per context.
//
// We don't implement a tokenizer. Instead, we enforce explicit
// record count limits per entity type (documented in each
// signal-specific builder).

const MAX_CONTEXT_CHARS = 14_000;

// ─── Main Builder ────────────────────────────────────────────

/**
 * Build a bounded RecommendationContext for a single candidate.
 *
 * @throws {Error} if target entity is missing or policy is invalid
 */
export function buildRecommendationContext(input: ContextBuilderInput): RecommendationContext {
  const { candidate, policy, now } = input;

  // Validate policy bundle
  if (!policy.soul || !policy.personalOsRules || !policy.recommendationRules) {
    throw new Error('Invalid policy bundle: missing mandatory policies');
  }

  if (requiresDomainKnowledge(candidate) && !policy.domainKnowledge) {
    throw new Error(`Candidate ${candidate.signalType} requires DOMAIN_KNOWLEDGE but it is missing from policy bundle`);
  }

  // Build signal-specific domain data
  const domainData = buildDomainData(candidate, input);

  // Extract relevant metrics
  const metrics = extractRelevantMetrics(candidate, input);

  // Get action allowlist
  const allowedActions = ACTION_ALLOWLISTS[candidate.signalType] || [];

  const context: RecommendationContext = {
    candidate,
    policy,
    domainData,
    metrics,
    allowedActions,
    contextBuiltAt: now,
  };

  // Sanity check: ensure context is reasonably bounded
  const approxSize = estimateContextSize(context);
  if (approxSize > MAX_CONTEXT_CHARS) {
    console.warn(`[ContextBuilder] Context size ${approxSize} exceeds budget ${MAX_CONTEXT_CHARS} for candidate ${candidate.dedupeKey}`);
  }

  return context;
}

// ─── Signal-Specific Builders ────────────────────────────────

function buildDomainData(candidate: ProactiveCandidate, input: ContextBuilderInput): SignalDomainData {
  switch (candidate.signalType) {
    case 'goal_inactive':
      return { type: 'goal_inactive', data: buildGoalInactiveData(candidate, input) };
    case 'goal_without_clear_next_action':
      return { type: 'goal_without_clear_next_action', data: buildGoalWithoutActionData(candidate, input) };
    case 'goal_next_action':
      return { type: 'goal_next_action', data: buildGoalNextActionData(candidate, input) };
    case 'project_stalled':
      return { type: 'project_stalled', data: buildProjectStalledData(candidate, input) };
    case 'project_next_action':
      return { type: 'project_next_action', data: buildProjectNextActionData(candidate, input) };
    case 'skill_evidence_gap':
      return { type: 'skill_evidence_gap', data: buildSkillEvidenceGapData(candidate, input) };
    case 'life_area_attention':
      return { type: 'life_area_attention', data: buildLifeAreaAttentionData(candidate, input) };
    case 'execution_decline':
      return { type: 'execution_decline', data: buildExecutionDeclineData(candidate, input) };
    case 'learning_without_application':
      return { type: 'learning_without_application', data: buildLearningWithoutApplicationData(candidate, input) };
    case 'completed_goal_followup':
      return { type: 'completed_goal_followup', data: buildCompletedGoalFollowupData(candidate, input) };
    case 'idea_opportunity':
      return { type: 'idea_opportunity', data: buildIdeaOpportunityData(candidate, input) };
    default:
      throw new Error(`Unknown signal type: ${(candidate as any).signalType}`);
  }
}

function buildGoalInactiveData(candidate: ProactiveCandidate, input: ContextBuilderInput): GoalInactiveData {
  const targetGoal = input.goals.find(g => g.id === candidate.scopeId);
  if (!targetGoal) {
    throw new Error(`Goal ${candidate.scopeId} not found for goal_inactive candidate`);
  }

  const recentTasks = input.tasks
    .filter(t => t.related_goal_id === targetGoal.id)
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  const recentActivities = input.activities
    .filter(a => a.related_goal_id === targetGoal.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const linkedProject = input.projects.find(p => p.primary_goal_id === targetGoal.id && p.status === 'active');

  return {
    targetGoal,
    recentTasks,
    recentActivities,
    linkedProject,
  };
}

function buildGoalWithoutActionData(candidate: ProactiveCandidate, input: ContextBuilderInput): GoalWithoutActionData {
  const targetGoal = input.goals.find(g => g.id === candidate.scopeId);
  if (!targetGoal) {
    throw new Error(`Goal ${candidate.scopeId} not found for goal_without_clear_next_action candidate`);
  }

  const openTasks = input.tasks
    .filter(t => t.related_goal_id === targetGoal.id && t.status !== 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const subGoals = input.goals
    .filter(g => g.parent_goal_id === targetGoal.id)
    .slice(0, 3);

  const recentActivities = input.activities
    .filter(a => a.related_goal_id === targetGoal.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const linkedProjects = input.projects
    .filter(p => p.primary_goal_id === targetGoal.id)
    .slice(0, 2);

  return {
    targetGoal,
    openTasks,
    subGoals,
    recentActivities,
    linkedProjects,
  };
}

function buildGoalNextActionData(candidate: ProactiveCandidate, input: ContextBuilderInput): GoalNextActionData {
  const targetGoal = input.goals.find(g => g.id === candidate.scopeId);
  if (!targetGoal) {
    throw new Error(`Goal ${candidate.scopeId} not found for goal_next_action candidate`);
  }

  const activeTasks = input.tasks
    .filter(t => t.related_goal_id === targetGoal.id && (t.status === 'in_progress' || t.status === 'not_started'))
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  const recentActivities = input.activities
    .filter(a => a.related_goal_id === targetGoal.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const linkedProject = input.projects.find(p => p.primary_goal_id === targetGoal.id && p.status === 'active');

  return {
    targetGoal,
    activeTasks,
    recentActivities,
    linkedProject,
  };
}

function buildProjectStalledData(candidate: ProactiveCandidate, input: ContextBuilderInput): ProjectStalledData {
  const targetProject = input.projects.find(p => p.id === candidate.scopeId);
  if (!targetProject) {
    throw new Error(`Project ${candidate.scopeId} not found for project_stalled candidate`);
  }

  const linkedGoal = targetProject.primary_goal_id ? input.goals.find(g => g.id === targetProject.primary_goal_id) : undefined;

  const recentTasks = input.tasks
    .filter(t => t.related_project_id === targetProject.id)
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  const recentActivities = input.activities
    .filter(a => a.related_project_id === targetProject.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    targetProject,
    linkedGoal,
    recentTasks,
    recentActivities,
  };
}

function buildProjectNextActionData(candidate: ProactiveCandidate, input: ContextBuilderInput): ProjectNextActionData {
  const targetProject = input.projects.find(p => p.id === candidate.scopeId);
  if (!targetProject) {
    throw new Error(`Project ${candidate.scopeId} not found for project_next_action candidate`);
  }

  const linkedGoal = targetProject.primary_goal_id ? input.goals.find(g => g.id === targetProject.primary_goal_id) : undefined;

  const openTasks = input.tasks
    .filter(t => t.related_project_id === targetProject.id && t.status !== 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentActivities = input.activities
    .filter(a => a.related_project_id === targetProject.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    targetProject,
    linkedGoal,
    openTasks,
    recentActivities,
  };
}

function buildSkillEvidenceGapData(candidate: ProactiveCandidate, input: ContextBuilderInput): SkillEvidenceGapData {
  const targetSkill = input.skills.find(s => s.id === candidate.scopeId);
  if (!targetSkill) {
    throw new Error(`Skill ${candidate.scopeId} not found for skill_evidence_gap candidate`);
  }

  // Find related levels via junction table
  const relatedLevelIds = input.skillLevelRelations
    .filter(rel => rel.skill_id === targetSkill.id)
    .map(rel => rel.level_id);

  const relatedLevels = input.levels
    .filter(l => relatedLevelIds.includes(l.id))
    .slice(0, 3);

  // Find activities/tasks related to these levels
  const recentActivities = input.activities
    .filter(a => a.related_level_id && relatedLevelIds.includes(a.related_level_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentTasks = input.tasks
    .filter(t => t.related_level_id && relatedLevelIds.includes(t.related_level_id))
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  // Find projects related to these levels
  const relatedProjects = input.projects
    .filter(p => p.level_id && relatedLevelIds.includes(p.level_id))
    .slice(0, 2);

  return {
    targetSkill,
    relatedLevels,
    recentActivities,
    recentTasks,
    relatedProjects,
  };
}

function buildLifeAreaAttentionData(candidate: ProactiveCandidate, input: ContextBuilderInput): LifeAreaAttentionData {
  const lifeArea = candidate.scopeId;

  const recentActivities = input.activities
    .filter(a => a.related_life_area_id === lifeArea)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Tasks don't have direct life_area field, find via related goals
  const goalsInArea = input.goals.filter(g => g.life_area_id === lifeArea);
  const goalIdsInArea = goalsInArea.map(g => g.id);

  const recentTasks = input.tasks
    .filter(t => t.related_goal_id && goalIdsInArea.includes(t.related_goal_id))
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  const relatedGoals = goalsInArea.slice(0, 3);

  return {
    lifeArea,
    recentActivities,
    recentTasks,
    relatedGoals,
  };
}

function buildExecutionDeclineData(candidate: ProactiveCandidate, input: ContextBuilderInput): ExecutionDeclineData {
  const recentTasks = input.tasks
    .filter(t => t.status === 'completed' || t.status === 'in_progress')
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  const recentActivities = input.activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentPractices = input.practices
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  // Extract weekly points from evidence
  const pointsLastWeek = (candidate.evidence.pointsLastWeek as number) || 0;
  const pointsThisWeek = (candidate.evidence.pointsThisWeek as number) || 0;

  return {
    recentTasks,
    recentActivities,
    recentPractices,
    pointsLastWeek,
    pointsThisWeek,
  };
}

function buildLearningWithoutApplicationData(_candidate: ProactiveCandidate, input: ContextBuilderInput): LearningWithoutApplicationData {
  // Activities don't have a 'category' field in ActivityCategory enum matching this
  // Filter by title/description keywords or use all recent activities
  const learningActivities = input.activities
    .filter(a => {
      const content = `${a.title} ${a.description || ''}`.toLowerCase();
      return content.includes('learn') || content.includes('study') || content.includes('research') || content.includes('course');
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Tasks don't have category field - use all completed tasks as proxy for application
  const applicationTasks = input.tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
    .slice(0, 5);

  const relatedGoals = input.goals
    .filter(g => g.status === 'active')
    .slice(0, 3);

  const relatedProjects = input.projects
    .filter(p => p.status === 'active')
    .slice(0, 2);

  return {
    learningActivities,
    applicationTasks,
    relatedGoals,
    relatedProjects,
  };
}

function buildCompletedGoalFollowupData(candidate: ProactiveCandidate, input: ContextBuilderInput): CompletedGoalFollowupData {
  const completedGoal = input.goals.find(g => g.id === candidate.scopeId);
  if (!completedGoal) {
    throw new Error(`Goal ${candidate.scopeId} not found for completed_goal_followup candidate`);
  }

  const childGoals = input.goals
    .filter(g => g.parent_goal_id === completedGoal.id)
    .slice(0, 3);

  const relatedProjects = input.projects
    .filter(p => p.primary_goal_id === completedGoal.id)
    .slice(0, 2);

  const recentActivities = input.activities
    .filter(a => a.related_goal_id === completedGoal.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return {
    completedGoal,
    childGoals,
    relatedProjects,
    recentActivities,
  };
}

function buildIdeaOpportunityData(candidate: ProactiveCandidate, input: ContextBuilderInput): IdeaOpportunityData {
  const targetIdea = input.captures.find(c => c.id === candidate.scopeId);
  if (!targetIdea) {
    throw new Error(`Idea ${candidate.scopeId} not found for idea_opportunity candidate`);
  }

  // Extract related goal ID from evidence (set by signal engine)
  const relatedGoalId = candidate.evidence.relatedGoalId as string | undefined;
  const relatedGoal = relatedGoalId ? input.goals.find(g => g.id === relatedGoalId) : undefined;

  const relatedProject = relatedGoal
    ? input.projects.find(p => p.primary_goal_id === relatedGoal.id && p.status === 'active')
    : undefined;

  const recentActivities = relatedGoal
    ? input.activities
        .filter(a => a.related_goal_id === relatedGoal.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    : [];

  return {
    targetIdea,
    relatedGoal,
    relatedProject,
    recentActivities,
  };
}

// ─── Metrics Extraction ──────────────────────────────────────

function extractRelevantMetrics(candidate: ProactiveCandidate, input: ContextBuilderInput): RelevantMetrics {
  const metrics: RelevantMetrics = {};

  if (candidate.scopeType === 'goal') {
    metrics.goal = input.goalMetrics.find(m => m.goalId === candidate.scopeId);
  } else if (candidate.scopeType === 'project') {
    metrics.project = input.projectMetrics.find(m => m.projectId === candidate.scopeId);
  } else if (candidate.scopeType === 'skill') {
    metrics.skill = input.skillMetrics.find(m => m.skillId === candidate.scopeId);
  } else if (candidate.scopeType === 'life_area') {
    metrics.lifeArea = input.lifeAreaMetrics.find(m => m.area === candidate.scopeId);
  } else if (candidate.scopeType === 'global') {
    metrics.execution = input.executionMetrics;
  }

  return metrics;
}

// ─── Context Size Estimation ─────────────────────────────────

function estimateContextSize(context: RecommendationContext): number {
  // Rough character count approximation.
  // Does not implement a real tokenizer.
  const jsonStr = JSON.stringify(context);
  return jsonStr.length;
}
