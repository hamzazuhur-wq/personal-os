// ============================================================
// MODULE 11 PHASE 3 — DETERMINISTIC SIGNAL ENGINE
// ============================================================
//
// PURE · DETERMINISTIC · SIDE-EFFECT FREE
//
// This module evaluates domain data + Module 10 metric results
// and produces ProactiveCandidate[] for the downstream ranker.
//
// Contract:
//   - ZERO AI calls
//   - ZERO DB reads or writes
//   - ZERO imports from any Dexie adapter or IAIProvider
//   - All time from input.now — never Date.now() or new Date()
//   - Same input → same output (referential transparency)
//
// Module 10 is the authoritative analytics layer. This engine
// REUSES Module 10 results passed in via SignalEngineInput.
// It does NOT re-implement metric calculations.
//
// Thresholds introduced here are conservative and documented.
// Any threshold that could be expressed by Module 10 semantics
// DEFERS to Module 10 (e.g. stall = signal.status === 'stalled').
//
// ── Signals implemented ──────────────────────────────────────
//  1. goal_inactive
//  2. goal_without_clear_next_action
//  3. goal_next_action
//  4. project_stalled
//  5. project_next_action
//  6. skill_evidence_gap
//  7. life_area_attention
//  8. execution_decline
//  9. learning_without_application
// 10. completed_goal_followup
// 11. idea_opportunity
// ============================================================

import { Goal } from '../../../types/goal.types';
import { Project } from '../../../types/project.types';
import { Task } from '../../../types/task.types';
import { Activity } from '../../../types/activity.types';
import { Capture } from '../../../types/capture.types';
import { Skill, SkillEvidence } from '../../../types/skill.types';
import { LifeArea } from '../../../types/vision.types';
import {
  GoalHealthMetrics,
  ProjectHealthMetrics,
  ExecutionMetrics,
  TrendMetrics,
  SkillMetrics,
  LifeAreaBalanceMetrics,
} from '../../../types/metrics.types';
import {
  ProactiveCandidate,
  SignalSeverity,
  RecommendationScopeType,
} from '../../../types/recommendation.types';

// ─── Input contract ──────────────────────────────────────────

/**
 * All inputs required by the signal engine. The caller is
 * responsible for fetching domain records and computing Module 10
 * metrics before invoking evaluate().
 *
 * Domain records are passed raw so the engine can cross-reference
 * relationships not captured by aggregated metrics.
 *
 * nowMs is pre-computed from input.now for all date arithmetic
 * within the engine — never re-derived from Date.now().
 */
export interface SignalEngineInput {
  // ── Domain records ─────────────────────────────────────────
  goals: Goal[];
  tasks: Task[];
  projects: Project[];
  activities: Activity[];
  captures: Capture[];          // ideas + other capture types
  lifeAreas: LifeArea[];
  skills: Skill[];
  skillEvidence: SkillEvidence[];

  // ── Module 10 metric results ────────────────────────────────
  // Passed in pre-computed. Never re-calculated inside the engine.
  goalHealthMetrics: GoalHealthMetrics;
  projectHealthMetrics: ProjectHealthMetrics;
  executionMetrics: ExecutionMetrics;
  trendMetrics: TrendMetrics;
  skillMetrics: SkillMetrics;
  lifeAreaBalanceMetrics: LifeAreaBalanceMetrics;

  // ── Temporal context ────────────────────────────────────────
  /** ISO 8601 timestamp of engine invocation. Used as detectedAt. */
  now: string;
  /**
   * Start of the evaluation period (inclusive). Used for
   * "within-period" evidence checks. Typically 30 days before now.
   * Format: YYYY-MM-DD
   */
  periodStartDate: string;
  /**
   * End of the evaluation period (inclusive).
   * Format: YYYY-MM-DD
   */
  periodEndDate: string;
}

// ─── Internal date helpers ───────────────────────────────────
// These operate on the caller-supplied `now` only.
// No Date.now() or new Date() calls anywhere in this file.

/** Parse a YYYY-MM-DD or ISO string into milliseconds (UTC-naive, date-part only). */
function parseDateMs(dateStr: string): number {
  const part = dateStr.slice(0, 10); // take YYYY-MM-DD
  const [y, m, d] = part.split('-').map(Number);
  // Use UTC to avoid DST issues
  return Date.UTC(y, m - 1, d);
}

/**
 * Days elapsed between two ISO/date strings. Positive when
 * `laterStr` is after `earlierStr`. Returns null when either
 * string is falsy or unparseable.
 */
function daysBetween(earlierStr: string | null | undefined, laterStr: string): number | null {
  if (!earlierStr) return null;
  try {
    const diff = parseDateMs(laterStr) - parseDateMs(earlierStr);
    return Math.floor(diff / 86_400_000);
  } catch {
    return null;
  }
}

/**
 * Returns true when `dateStr` falls within [startDate, endDate]
 * (date-part comparison only).
 */
function isWithinPeriod(dateStr: string | null | undefined, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= startDate && d <= endDate;
}

// ─── Open-task status set ─────────────────────────────────────
// Mirrors OPEN_TASK_STATUSES from reviewAnalyticsService without
// importing it (keeps this file free of analytics-service deps).
const OPEN_TASK_STATUSES = new Set(['not_started', 'ready', 'in_progress', 'blocked', 'waiting']);

function isOpenTask(task: Task): boolean {
  return OPEN_TASK_STATUSES.has(task.status);
}

// ─── Candidate builder ────────────────────────────────────────

function makeCandidate(
  signalType: ProactiveCandidate['signalType'],
  scopeType: RecommendationScopeType,
  scopeId: string,
  severity: SignalSeverity,
  evidence: Record<string, unknown>,
  dedupeKey: string,
  now: string,
): ProactiveCandidate {
  return { signalType, scopeType, scopeId, severity, evidence, dedupeKey, detectedAt: now };
}

// ============================================================
// SIGNAL 1 — goal_inactive
// ============================================================
//
// Source:  goalHealthMetrics.healthByGoal (Module 10 canonical)
// Fires:   row.signal.status === 'stalled' AND goal.status === 'active'
//
// Severity: Module 10 stalled semantics are the authority on whether
// a goal is inactive. The engine adds one conservative severity split
// using the goal's own updated_at timestamp:
//   - high   → goal has not been updated in > 30 days relative to now
//   - medium → stalled but updated more recently
//
// The 30-day updated_at split is a display-level tiebreaker only and
// does not redefine Module 10's stall concept. If updated_at is absent
// the severity defaults to 'medium' (conservative).
// ============================================================
function signalGoalInactive(input: SignalEngineInput): ProactiveCandidate[] {
  const { goalHealthMetrics, goals, now } = input;
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const candidates: ProactiveCandidate[] = [];

  for (const row of goalHealthMetrics.healthByGoal) {
    if (row.signal.status !== 'stalled') continue;
    const goal = goalById.get(row.goalId);
    if (!goal || goal.status !== 'active') continue;

    const daysSinceUpdate = daysBetween(goal.updated_at, now);
    const severity: SignalSeverity =
      daysSinceUpdate !== null && daysSinceUpdate > 30 ? 'high' : 'medium';

    candidates.push(makeCandidate(
      'goal_inactive',
      'goal',
      goal.id,
      severity,
      {
        goalId: goal.id,
        goalTitle: goal.title,
        goalStatus: goal.status,
        stalledHealthSignal: row.signal.reason,
        stalledHealthEvidence: row.signal.evidence,
        daysSinceUpdate,
      },
      `goal_inactive:${goal.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 2 — goal_without_clear_next_action
// ============================================================
//
// Fires only when ALL of the following are absent:
//  A. ≥1 open task with related_goal_id === goal.id
//  B. ≥1 open task linked via any direct sub-goal of this goal
//  C. Any activity with related_goal_id === goal.id within 7 days
//  D. Any active project with primary_goal_id === goal.id that has
//     a recent activity or open task in the period
//
// If ANY one of A–D is present → do not emit (ambiguous = skip).
// Only 'active' goals are evaluated.
//
// Note: This is distinct from goal_next_action. This signal fires
// when there is truly no evidence path. goal_next_action fires when
// there IS engagement but no explicit next-action task.
// ============================================================
function signalGoalWithoutClearNextAction(input: SignalEngineInput): ProactiveCandidate[] {
  const { goals, tasks, activities, projects, now, periodStartDate, periodEndDate } = input;
  const candidates: ProactiveCandidate[] = [];

  // Build lookup maps once
  const openTasksByGoalId = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!isOpenTask(t) || !t.related_goal_id) continue;
    const arr = openTasksByGoalId.get(t.related_goal_id) ?? [];
    arr.push(t);
    openTasksByGoalId.set(t.related_goal_id, arr);
  }

  // Sub-goals: map parentGoalId → child goals
  const subGoalsByParentId = new Map<string, Goal[]>();
  for (const g of goals) {
    if (!g.parent_goal_id) continue;
    const arr = subGoalsByParentId.get(g.parent_goal_id) ?? [];
    arr.push(g);
    subGoalsByParentId.set(g.parent_goal_id, arr);
  }

  // Projects by primary_goal_id
  const activeProjectsByGoalId = new Map<string, Project[]>();
  for (const p of projects) {
    if (p.status !== 'active' || !p.primary_goal_id) continue;
    const arr = activeProjectsByGoalId.get(p.primary_goal_id) ?? [];
    arr.push(p);
    activeProjectsByGoalId.set(p.primary_goal_id, arr);
  }

  // Recent activity lookup (within 7 days of now)
  const recentActivityGoalIds = new Set<string>();
  for (const a of activities) {
    if (!a.related_goal_id) continue;
    const age = daysBetween(a.date, now);
    if (age !== null && age <= 7) {
      recentActivityGoalIds.add(a.related_goal_id);
    }
  }

  // Project activity lookup (within period)
  const activeProjectIdsWithRecentWork = new Set<string>();
  for (const t of tasks) {
    if (isOpenTask(t) && t.related_project_id) {
      activeProjectIdsWithRecentWork.add(t.related_project_id);
    }
  }
  for (const a of activities) {
    if (a.related_project_id && isWithinPeriod(a.date, periodStartDate, periodEndDate)) {
      activeProjectIdsWithRecentWork.add(a.related_project_id);
    }
  }

  for (const goal of goals) {
    if (goal.status !== 'active') continue;

    // A: open task directly linked
    const directOpenTasks = openTasksByGoalId.get(goal.id) ?? [];
    if (directOpenTasks.length > 0) continue;

    // B: open task via sub-goals
    const subGoals = subGoalsByParentId.get(goal.id) ?? [];
    const subGoalHasOpenTask = subGoals.some(
      (sg) => (openTasksByGoalId.get(sg.id) ?? []).length > 0
    );
    if (subGoalHasOpenTask) continue;

    // C: recent activity within 7 days
    if (recentActivityGoalIds.has(goal.id)) continue;

    // D: active project with recent work
    const linkedProjects = activeProjectsByGoalId.get(goal.id) ?? [];
    const projectHasRecentWork = linkedProjects.some(
      (p) => activeProjectIdsWithRecentWork.has(p.id)
    );
    if (projectHasRecentWork) continue;

    // None of A–D present → emit
    candidates.push(makeCandidate(
      'goal_without_clear_next_action',
      'goal',
      goal.id,
      'medium',
      {
        goalId: goal.id,
        goalTitle: goal.title,
        goalStatus: goal.status,
        directOpenTaskCount: 0,
        subGoalCount: subGoals.length,
        recentActivityCount: 0,
        linkedActiveProjectCount: linkedProjects.length,
      },
      `goal_no_action:${goal.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 3 — completed_goal_followup
// ============================================================
//
// Fires for goals completed within the evaluation period that
// have no obvious successor: no active child goal and no active
// project still linked to that goal.
//
// Severity: 'low' — this is a follow-up opportunity, not a problem.
// ============================================================
function signalCompletedGoalFollowup(input: SignalEngineInput): ProactiveCandidate[] {
  const { goals, projects, periodStartDate, periodEndDate, now } = input;
  const candidates: ProactiveCandidate[] = [];

  // Active sub-goals by parent
  const activeChildGoalsByParent = new Map<string, number>();
  for (const g of goals) {
    if (g.parent_goal_id && g.status === 'active') {
      activeChildGoalsByParent.set(g.parent_goal_id, (activeChildGoalsByParent.get(g.parent_goal_id) ?? 0) + 1);
    }
  }

  // Active projects by primary_goal_id
  const activeProjectCountByGoalId = new Map<string, number>();
  for (const p of projects) {
    if (p.primary_goal_id && p.status === 'active') {
      activeProjectCountByGoalId.set(p.primary_goal_id, (activeProjectCountByGoalId.get(p.primary_goal_id) ?? 0) + 1);
    }
  }

  for (const goal of goals) {
    if (goal.status !== 'completed') continue;
    if (!goal.completed_at) continue;
    if (!isWithinPeriod(goal.completed_at, periodStartDate, periodEndDate)) continue;

    const activeChildCount = activeChildGoalsByParent.get(goal.id) ?? 0;
    const activeProjectCount = activeProjectCountByGoalId.get(goal.id) ?? 0;

    // Only emit when there is no clear successor
    if (activeChildCount > 0 || activeProjectCount > 0) continue;

    candidates.push(makeCandidate(
      'completed_goal_followup',
      'goal',
      goal.id,
      'low',
      {
        goalId: goal.id,
        goalTitle: goal.title,
        completedAt: goal.completed_at,
        activeChildGoalCount: 0,
        activeLinkedProjectCount: 0,
      },
      `goal_done:${goal.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 4 — project_stalled
// ============================================================
//
// Source:  projectHealthMetrics.healthByProject (Module 10 canonical)
// Fires:   row.signal.status === 'stalled' AND project.status === 'active'
//
// Severity: Module 10 stall semantics are the authority. The engine
// adds a conservative severity split using project.updated_at:
//   - high   → not updated in > 21 days relative to now
//   - medium → stalled but updated more recently
//
// The 21-day split is a display tiebreaker only. If updated_at is
// absent the severity defaults to 'medium' (conservative).
// ============================================================
function signalProjectStalled(input: SignalEngineInput): ProactiveCandidate[] {
  const { projectHealthMetrics, projects, now } = input;
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const candidates: ProactiveCandidate[] = [];

  for (const row of projectHealthMetrics.healthByProject) {
    if (row.signal.status !== 'stalled') continue;
    const project = projectById.get(row.projectId);
    if (!project || project.status !== 'active') continue;

    const daysSinceUpdate = daysBetween(project.updated_at, now);
    const severity: SignalSeverity =
      daysSinceUpdate !== null && daysSinceUpdate > 21 ? 'high' : 'medium';

    candidates.push(makeCandidate(
      'project_stalled',
      'project',
      project.id,
      severity,
      {
        projectId: project.id,
        projectTitle: project.title,
        projectStatus: project.status,
        stalledHealthSignal: row.signal.reason,
        stalledHealthEvidence: row.signal.evidence,
        daysSinceUpdate,
      },
      `project_stalled:${project.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 5 — project_next_action
// ============================================================
//
// Fires for active projects that:
//  - Have recent engagement (open tasks OR activity within period)
//  - Have no task marked is_next_action === true
//  - Have at least one linked active goal (confirming the project
//    is still strategically relevant)
//
// If there is no recent engagement, the project_stalled signal
// is more appropriate — do not emit project_next_action.
// ============================================================
function signalProjectNextAction(input: SignalEngineInput): ProactiveCandidate[] {
  const { projects, tasks, activities, goals, periodStartDate, periodEndDate, now } = input;
  const candidates: ProactiveCandidate[] = [];

  // Active goals set
  const activeGoalIds = new Set(goals.filter((g) => g.status === 'active').map((g) => g.id));

  // Open tasks by project
  const openTasksByProject = new Map<string, Task[]>();
  const nextActionTaskProjectIds = new Set<string>();
  for (const t of tasks) {
    if (!t.related_project_id) continue;
    if (isOpenTask(t)) {
      const arr = openTasksByProject.get(t.related_project_id) ?? [];
      arr.push(t);
      openTasksByProject.set(t.related_project_id, arr);
    }
    if (t.is_next_action === true && isOpenTask(t)) {
      nextActionTaskProjectIds.add(t.related_project_id);
    }
  }

  // Activity within period by project
  const projectsWithPeriodActivity = new Set<string>();
  for (const a of activities) {
    if (a.related_project_id && isWithinPeriod(a.date, periodStartDate, periodEndDate)) {
      projectsWithPeriodActivity.add(a.related_project_id);
    }
  }

  for (const project of projects) {
    if (project.status !== 'active') continue;

    // Must have at least one linked active goal
    if (!project.primary_goal_id || !activeGoalIds.has(project.primary_goal_id)) continue;

    // Must have recent engagement (open tasks or period activity)
    const hasOpenTasks = (openTasksByProject.get(project.id) ?? []).length > 0;
    const hasPeriodActivity = projectsWithPeriodActivity.has(project.id);
    if (!hasOpenTasks && !hasPeriodActivity) continue;

    // Must NOT already have an explicit next-action task
    if (nextActionTaskProjectIds.has(project.id)) continue;

    const openTaskCount = (openTasksByProject.get(project.id) ?? []).length;

    candidates.push(makeCandidate(
      'project_next_action',
      'project',
      project.id,
      'medium',
      {
        projectId: project.id,
        projectTitle: project.title,
        linkedGoalId: project.primary_goal_id,
        openTaskCount,
        hasPeriodActivity,
        nextActionTaskCount: 0,
      },
      `project_next_action:${project.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 6 — skill_evidence_gap
// ============================================================
//
// Source:  skillMetrics.skillsWithoutRecentEvidence (Module 10)
// Only 'active' skills are evaluated (archived skills are ignored).
//
// Severity uses Module 10's daysSinceEvidence value:
//   - high   → daysSinceEvidence > 60 OR lastEvidenceAt === null
//   - medium → 30 < days ≤ 60
//   - low    → days ≤ 30
//
// Module 10 defines "without recent evidence" relative to the
// filter period. The engine trusts that classification and only
// adds the severity split.
// ============================================================
function signalSkillEvidenceGap(input: SignalEngineInput): ProactiveCandidate[] {
  const { skillMetrics, skills, now } = input;
  const activeSkillIds = new Set(
    skills.filter((s) => s.status === 'active').map((s) => s.id)
  );
  const candidates: ProactiveCandidate[] = [];

  for (const row of skillMetrics.skillsWithoutRecentEvidence) {
    if (!activeSkillIds.has(row.skillId)) continue;

    let severity: SignalSeverity;
    if (row.lastEvidenceAt === null || row.daysSinceEvidence === null || row.daysSinceEvidence > 60) {
      severity = 'high';
    } else if (row.daysSinceEvidence > 30) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    candidates.push(makeCandidate(
      'skill_evidence_gap',
      'skill',
      row.skillId,
      severity,
      {
        skillId: row.skillId,
        skillName: row.name,
        lastEvidenceAt: row.lastEvidenceAt,
        daysSinceEvidence: row.daysSinceEvidence,
      },
      `skill_gap:${row.skillId}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 7 — life_area_attention
// ============================================================
//
// Source:  lifeAreaBalanceMetrics.areaTrends (Module 10)
//
// Fires when an area shows ALL of:
//  1. trend === 'decreased'
//  2. previousPeriodValue > 0 (baseline exists)
//  3. Relative drop ≥ 30% ((prev - curr) / prev >= 0.30)
//
// Rule 2 implements the "user-relative historical baseline" from
// RECOMMENDATION_RULES.md §6: if no prior-period data exists,
// the engine cannot assert a meaningful drop and must NOT emit
// a strong candidate. Without a prior period value, there is no
// defensible baseline.
//
// Severity is conservatively 'medium' — cannot be 'high' without
// multi-period trend history which the current Module 10 data
// model does not provide.
//
// Do NOT use a hard <10% threshold. Use the relative-drop rule.
// ============================================================
function signalLifeAreaAttention(input: SignalEngineInput): ProactiveCandidate[] {
  const { lifeAreaBalanceMetrics, now } = input;
  const candidates: ProactiveCandidate[] = [];

  for (const trend of lifeAreaBalanceMetrics.areaTrends) {
    if (trend.trend !== 'decreased') continue;

    const prev = trend.previousPeriodValue;
    const curr = trend.currentPeriodValue;

    // No prior-period baseline → cannot assert a meaningful drop
    if (prev === null || prev === 0) continue;
    if (curr === null) continue;

    const relativeDrop = (prev - curr) / prev;
    if (relativeDrop < 0.30) continue;

    candidates.push(makeCandidate(
      'life_area_attention',
      'life_area',
      trend.lifeAreaId,
      'medium',
      {
        areaId: trend.lifeAreaId,
        areaName: trend.name,
        currentPeriodValue: curr,
        previousPeriodValue: prev,
        relativeDrop: Math.round(relativeDrop * 100),
        trend: trend.trend,
      },
      `life_area:${trend.lifeAreaId}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 8 — execution_decline
// ============================================================
//
// Source:  trendMetrics.taskCompletionTrend + executionMetrics (Module 10)
//
// Fires when:
//  - taskCompletionTrend === 'decreased'   (Module 10 period-over-period)
//  - taskCompletionRate is not null        (sufficient data exists)
//
// Severity uses the Module 10 completion rate value as a
// conservative tiebreaker:
//   - high   → rate < 40%
//   - medium → 40% ≤ rate < 60%
//   - (rate ≥ 60% with a 'decreased' trend is not emitted;
//      a mild dip from a high baseline is not a meaningful decline)
//
// The 60% floor keeps the signal conservative. A rate ≥ 60%
// with a declined trend likely reflects a single-period fluctuation
// rather than a meaningful pattern.
//
// scopeType: 'global'  scopeId: 'global'
// ============================================================
function signalExecutionDecline(input: SignalEngineInput): ProactiveCandidate[] {
  const { trendMetrics, executionMetrics, periodStartDate, now } = input;

  if (trendMetrics.taskCompletionTrend.value !== 'decreased') return [];

  const rate = executionMetrics.taskCompletionRate.value;
  if (rate === null || rate === undefined) return [];

  // Conservative: only surface if rate has materially declined
  if (rate >= 60) return [];

  const severity: SignalSeverity = rate < 40 ? 'high' : 'medium';

  return [makeCandidate(
    'execution_decline',
    'global',
    'global',
    severity,
    {
      taskCompletionRate: rate,
      trend: 'decreased',
      periodStartDate,
      taskExecutionVolume: executionMetrics.taskExecutionVolume.value,
    },
    `exec_decline:${periodStartDate}`,
    now,
  )];
}

// ============================================================
// SIGNAL 9 — learning_without_application
// ============================================================
//
// Fires when there is explicit learning evidence but no explicit
// application evidence within the evaluation period.
//
// Learning evidence (explicit only):
//   - Activities with category in the learning set within period
//
// Application evidence (explicit only — NO keyword heuristics):
//   - Completed tasks within period linked to a goal of type
//     'development' or 'acquisition'
//   - Active project linked to a development/acquisition goal that
//     has any activity within the period
//
// Threshold: learning evidence count ≥ 3 AND application evidence
// count === 0. Below 3 learning items there is insufficient evidence
// to assert a learning pattern (conservative).
//
// Do NOT infer application from task title/context text.
// Do NOT infer learning from task titles.
// Use only explicit schema relationships.
//
// scopeType: 'global'  scopeId: 'global'
// ============================================================

const LEARNING_ACTIVITY_CATEGORIES = new Set([
  'Study & Research',
  'Skill Acquisition',
]);

function signalLearningWithoutApplication(input: SignalEngineInput): ProactiveCandidate[] {
  const { activities, tasks, projects, goals, periodStartDate, periodEndDate, now } = input;

  // Development / acquisition goal ids
  const devAcqGoalIds = new Set(
    goals
      .filter((g) => g.goal_type === 'development' || g.goal_type === 'acquisition')
      .map((g) => g.id)
  );

  // ── Learning evidence ────────────────────────────────────
  const learningActivities = activities.filter(
    (a) =>
      isWithinPeriod(a.date, periodStartDate, periodEndDate) &&
      a.category !== undefined &&
      LEARNING_ACTIVITY_CATEGORIES.has(a.category as string)
  );
  const learningCount = learningActivities.length;

  // ── Application evidence ─────────────────────────────────
  // 1. Completed tasks in period linked to a development/acquisition goal
  const applicationTasks = tasks.filter(
    (t) =>
      t.status === 'completed' &&
      isWithinPeriod(t.completed_at, periodStartDate, periodEndDate) &&
      t.related_goal_id !== undefined &&
      devAcqGoalIds.has(t.related_goal_id!)
  );

  // 2. Active projects linked to a dev/acq goal with period activity
  const devProjectIds = new Set(
    projects
      .filter(
        (p) =>
          p.status === 'active' &&
          p.primary_goal_id !== undefined &&
          devAcqGoalIds.has(p.primary_goal_id!)
      )
      .map((p) => p.id)
  );

  const applicationProjectActivity = activities.filter(
    (a) =>
      isWithinPeriod(a.date, periodStartDate, periodEndDate) &&
      a.related_project_id !== undefined &&
      devProjectIds.has(a.related_project_id!)
  );

  const applicationCount = applicationTasks.length + applicationProjectActivity.length;

  // Conservative threshold: ≥3 learning items, zero application evidence
  if (learningCount < 3 || applicationCount > 0) return [];

  return [makeCandidate(
    'learning_without_application',
    'global',
    'global',
    'medium',
    {
      learningActivityCount: learningCount,
      applicationTaskCount: applicationTasks.length,
      applicationProjectActivityCount: applicationProjectActivity.length,
      periodStartDate,
      periodEndDate,
    },
    `learning_gap:${periodStartDate}`,
    now,
  )];
}

// ============================================================
// SIGNAL 10 — idea_opportunity
// ============================================================
//
// Fires when an idea (capture with capture_type === 'idea') has
// an EXPLICIT relationship to an active goal via the schema field:
//   - related_goal_id pointing to an active goal
//
// IMPORTANT: This is an EXPLICIT RELATIONSHIP SIGNAL only.
// The Capture schema does not have a related_life_area_id field.
// No semantic similarity, no NLP, no keyword matching.
// Semantic interpretation is the AI reasoning layer's responsibility.
//
// Exclusions (do not emit):
//   - Archived captures (status === 'archived')
//   - Captures already linked to a project (being executed)
//   - Ideas whose related_goal_id points to a non-active goal
//   - Ideas with no related_goal_id (no explicit relationship exists)
//
// scopeType: 'idea'  scopeId: captureId
// ============================================================
function signalIdeaOpportunity(input: SignalEngineInput): ProactiveCandidate[] {
  const { captures, goals, now } = input;
  const candidates: ProactiveCandidate[] = [];

  const activeGoalById = new Map(
    goals.filter((g) => g.status === 'active').map((g) => [g.id, g])
  );

  for (const capture of captures) {
    if (capture.capture_type !== 'idea') continue;
    if (capture.status === 'archived') continue;
    if (capture.related_project_id) continue; // already in execution

    // Only explicit goal link — no fallback heuristics
    if (!capture.related_goal_id) continue;
    const matchedGoal = activeGoalById.get(capture.related_goal_id);
    if (!matchedGoal) continue;

    candidates.push(makeCandidate(
      'idea_opportunity',
      'idea',
      capture.id,
      'low',
      {
        captureId: capture.id,
        captureTitle: capture.title ?? null,
        contentPreview: capture.content.slice(0, 100),
        relatedGoalId: matchedGoal.id,
        relatedGoalTitle: matchedGoal.title,
        matchReason: 'explicit_goal_link',
      },
      `idea_opp:${capture.id}:${matchedGoal.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// SIGNAL 11 — goal_next_action
// ============================================================
//
// Lighter-weight complement to goal_without_clear_next_action.
// Fires for active goals that have engagement evidence (≥1 open
// task or recent activity) but lack an explicit next-action task
// (is_next_action === true).
//
// This is intentionally a lower-severity signal than
// goal_without_clear_next_action. It surfaces goals that are
// "moving" but could benefit from a designated next action.
//
// Mutual exclusion: if the goal already triggered
// goal_without_clear_next_action (no engagement at all), this
// signal does NOT also fire (handled in evaluate() dedup).
// ============================================================
function signalGoalNextAction(input: SignalEngineInput): ProactiveCandidate[] {
  const { goals, tasks, activities, now, periodStartDate, periodEndDate } = input;
  const candidates: ProactiveCandidate[] = [];

  // Open tasks by goal (all)
  const openTasksByGoalId = new Map<string, Task[]>();
  const nextActionTaskGoalIds = new Set<string>();
  for (const t of tasks) {
    if (!t.related_goal_id) continue;
    if (isOpenTask(t)) {
      const arr = openTasksByGoalId.get(t.related_goal_id) ?? [];
      arr.push(t);
      openTasksByGoalId.set(t.related_goal_id, arr);
    }
    if (t.is_next_action === true && isOpenTask(t) && t.related_goal_id) {
      nextActionTaskGoalIds.add(t.related_goal_id);
    }
  }

  // Recent activities by goal (within period)
  const recentActivityGoalIds = new Set<string>();
  for (const a of activities) {
    if (a.related_goal_id && isWithinPeriod(a.date, periodStartDate, periodEndDate)) {
      recentActivityGoalIds.add(a.related_goal_id);
    }
  }

  for (const goal of goals) {
    if (goal.status !== 'active') continue;

    // Already has explicit next-action task → no signal needed
    if (nextActionTaskGoalIds.has(goal.id)) continue;

    const openTasks = openTasksByGoalId.get(goal.id) ?? [];
    const hasOpenTasks = openTasks.length > 0;
    const hasRecentActivity = recentActivityGoalIds.has(goal.id);

    // Must have engagement evidence — otherwise goal_without_clear_next_action applies
    if (!hasOpenTasks && !hasRecentActivity) continue;

    candidates.push(makeCandidate(
      'goal_next_action',
      'goal',
      goal.id,
      'low',
      {
        goalId: goal.id,
        goalTitle: goal.title,
        openTaskCount: openTasks.length,
        hasRecentActivity,
        nextActionTaskCount: 0,
      },
      `goal_next_action:${goal.id}`,
      now,
    ));
  }

  return candidates;
}

// ============================================================
// CROSS-SIGNAL DEDUPLICATION
// ============================================================
//
// Rules applied after all signal functions run:
//
// 1. dedupeKey uniqueness: first candidate with a given dedupeKey
//    wins. Subsequent candidates with the same key are dropped.
//
// 2. Mutual exclusion — goal_inactive vs goal_next_action:
//    A goal that is classified as 'stalled' by Module 10 has no
//    meaningful execution path to recommend a next action for.
//    If goal_inactive fires for a goal, suppress goal_next_action
//    for the same goalId.
//
// 3. Mutual exclusion — goal_without_clear_next_action vs goal_next_action:
//    goal_without_clear_next_action is the stronger/more complete
//    signal. If it fires for a goal, suppress goal_next_action
//    for the same goalId (the signal function already guards this
//    via the engagement-evidence requirement, but this makes it
//    explicit at the dedup layer).
//
// 4. Mutual exclusion — project_stalled vs project_next_action:
//    A stalled project should be revived first before a next-action
//    recommendation. If project_stalled fires, suppress
//    project_next_action for the same projectId.
// ============================================================
function deduplicateCandidates(raw: ProactiveCandidate[]): ProactiveCandidate[] {
  // Collect scope IDs for exclusive signals
  const inactiveGoalIds = new Set<string>();
  const noActionGoalIds = new Set<string>();
  const stalledProjectIds = new Set<string>();

  for (const c of raw) {
    if (c.signalType === 'goal_inactive') inactiveGoalIds.add(c.scopeId);
    if (c.signalType === 'goal_without_clear_next_action') noActionGoalIds.add(c.scopeId);
    if (c.signalType === 'project_stalled') stalledProjectIds.add(c.scopeId);
  }

  const seen = new Set<string>();
  const result: ProactiveCandidate[] = [];

  for (const c of raw) {
    // Mutual-exclusion suppression
    if (
      c.signalType === 'goal_next_action' &&
      (inactiveGoalIds.has(c.scopeId) || noActionGoalIds.has(c.scopeId))
    ) {
      continue;
    }
    if (c.signalType === 'project_next_action' && stalledProjectIds.has(c.scopeId)) {
      continue;
    }

    // dedupeKey uniqueness
    if (seen.has(c.dedupeKey)) continue;
    seen.add(c.dedupeKey);
    result.push(c);
  }

  return result;
}

// ============================================================
// PUBLIC API — evaluate()
// ============================================================

/**
 * Evaluate all signal types against the provided input and return
 * deduplicated ProactiveCandidate[].
 *
 * This function is PURE and DETERMINISTIC:
 *   - No DB reads or writes
 *   - No AI calls
 *   - No side effects
 *   - Same input → same output
 *   - All time from input.now
 *
 * The returned array may be empty — that is a valid output meaning
 * the system has no meaningful signals to surface.
 *
 * Ordering: signals are evaluated in priority order (goal > project
 * > skill > life_area > global). The ranker (Phase 4) will apply
 * formal scoring — this ordering only affects tie-breaking within
 * deduplication.
 */
export function evaluate(input: SignalEngineInput): ProactiveCandidate[] {
  const raw: ProactiveCandidate[] = [
    // Goal signals (highest entity priority)
    ...signalGoalInactive(input),
    ...signalGoalWithoutClearNextAction(input),
    ...signalGoalNextAction(input),
    ...signalCompletedGoalFollowup(input),
    // Project signals
    ...signalProjectStalled(input),
    ...signalProjectNextAction(input),
    // Skill signals
    ...signalSkillEvidenceGap(input),
    // Life area signals
    ...signalLifeAreaAttention(input),
    // Global/cross-cutting signals
    ...signalExecutionDecline(input),
    ...signalLearningWithoutApplication(input),
    // Idea signals
    ...signalIdeaOpportunity(input),
  ];

  return deduplicateCandidates(raw);
}
