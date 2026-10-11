/**
 * Module 11 Phase 3 — Deterministic Signal Engine Verification
 *
 * Tests the pure evaluate() function from deterministicSignalEngine.ts.
 * No Dexie, no IndexedDB, no AI provider, no side effects.
 *
 * Coverage:
 *   §01  goal_inactive           — positive, negative, severity
 *   §02  goal_without_clear_next_action — positive, each negative branch
 *   §03  completed_goal_followup — positive, negative (out-of-period, successor)
 *   §04  project_stalled         — positive, negative, paused exclusion
 *   §05  project_next_action     — positive, negative branches
 *   §06  skill_evidence_gap      — positive (medium/high), negative, archived exclusion
 *   §07  life_area_attention     — positive, no-baseline, increasing, small-drop
 *   §08  execution_decline       — positive (medium/high), negative branches
 *   §09  learning_without_application — positive, with-application, below-threshold
 *   §10  idea_opportunity        — positive (goal/area links), negative branches
 *   §11  goal_next_action        — positive, has-next-action, no-engagement exclusion
 *   §12  cross-signal deduplication — mutual exclusions, dedupeKey uniqueness
 *   §13  clean data baseline     — all healthy data → zero candidates
 *   §14  determinism             — same input → identical output across 3 calls
 */

import { evaluate, SignalEngineInput } from '../services/ai/proactive/deterministicSignalEngine';
import { ProactiveCandidate } from '../types/recommendation.types';
import { Goal } from '../types/goal.types';
import { Project } from '../types/project.types';
import { Task } from '../types/task.types';
import { Activity } from '../types/activity.types';
import { Capture } from '../types/capture.types';
import { Skill } from '../types/skill.types';
import {
  GoalHealthMetrics,
  ProjectHealthMetrics,
  ExecutionMetrics,
  TrendMetrics,
  SkillMetrics,
  LifeAreaBalanceMetrics,
} from '../types/metrics.types';

// ─── Harness ─────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

// ─── Fixed timestamps (deterministic) ────────────────────────

const NOW       = '2026-06-15T12:00:00.000Z';
const TODAY     = '2026-06-15';
const P_START   = '2026-05-16'; // 30-day period
const P_END     = TODAY;

// Pre-computed relative dates (deterministic offsets from NOW)
const D_3_AGO   = '2026-06-12'; // 3 days ago  (within 7d)
const D_8_AGO   = '2026-06-07'; // 8 days ago  (outside 7d)
const D_20_AGO  = '2026-05-26'; // 20 days ago (within period)
const D_25_AGO  = '2026-05-21'; // 25 days ago (within period)
const D_35_AGO  = '2026-05-11'; // 35 days ago (outside period)
const D_45_AGO  = '2026-05-01'; // 45 days ago
const D_65_AGO  = '2026-04-11'; // 65 days ago

// ─── Minimal domain-record factories ────────────────────────
// These produce the minimal shape required by the engine types.
// Optional fields are omitted unless the test specifically needs them.

function makeGoal(overrides: Partial<Goal> & { id: string; title: string }): Goal {
  return {
    user_id: 'u1',
    status: 'active',
    goal_type: 'outcome',
    time_horizon: 'annual',
    priority: 'medium',
    created_at: D_45_AGO + 'T00:00:00.000Z',
    updated_at: D_20_AGO + 'T00:00:00.000Z',
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & { id: string; title: string }): Project {
  return {
    user_id: 'u1',
    desired_outcome: 'Ship it',
    status: 'active',
    priority: 'medium',
    created_at: D_45_AGO + 'T00:00:00.000Z',
    updated_at: D_20_AGO + 'T00:00:00.000Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    status: 'not_started',
    created_at: D_20_AGO + 'T00:00:00.000Z',
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> & { id: string; date: string }): Activity {
  return {
    title: 'Test activity',
    status: 'active',
    created_at: overrides.date + 'T00:00:00.000Z',
    updated_at: overrides.date + 'T00:00:00.000Z',
    ...overrides,
  };
}

function makeCapture(overrides: Partial<Capture> & { id: string; content: string }): Capture {
  return {
    user_id: 'u1',
    capture_type: 'idea',
    status: 'inbox',
    created_at: D_20_AGO + 'T00:00:00.000Z',
    updated_at: D_20_AGO + 'T00:00:00.000Z',
    source: 'manual',
    ...overrides,
  };
}

function makeSkill(overrides: Partial<Skill> & { id: string; name: string }): Skill {
  return {
    user_id: 'u1',
    current_proficiency: 'developing',
    target_proficiency: 'competent',
    development_state: 'developing',
    status: 'active',
    created_at: D_45_AGO + 'T00:00:00.000Z',
    updated_at: D_45_AGO + 'T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Empty metrics factories ─────────────────────────────────

function emptyRange() {
  return { preset: 'custom' as const, startDate: P_START, endDate: P_END };
}

function emptyGoalHealth(): GoalHealthMetrics {
  return { statusCounts: {}, inactiveGoalIds: [], healthByGoal: [], overallSignal: { status: 'unknown', reason: 'No goals', evidence: {} } };
}

function emptyProjectHealth(): ProjectHealthMetrics {
  return { statusCounts: {}, inactiveProjectIds: [], healthByProject: [], overallSignal: { status: 'unknown', reason: 'No projects', evidence: {} } };
}

function emptyExecutionMetrics(): ExecutionMetrics {
  return {
    taskCompletionRate: { value: null, unit: 'percent', period: emptyRange(), source: 'Task' },
    taskExecutionVolume: { value: 0, unit: 'count', period: emptyRange(), source: 'Task' },
    activityVolume: { value: 0, unit: 'count', period: emptyRange(), source: 'Activity' },
    activityDuration: { value: null, unit: 'duration_minutes', period: emptyRange(), source: 'Activity' },
    taskCompletionTrend: { value: null, unit: 'trend', period: emptyRange(), source: 'Task' },
    taskAging: [],
    overdueIndicators: [],
  };
}

function emptyTrendMetrics(): TrendMetrics {
  return {
    taskCompletionTrend: { value: null, unit: 'trend', period: emptyRange(), source: 'Task' },
    pointTrend: { value: null, unit: 'trend', period: emptyRange(), source: 'PointLedgerEvent' },
    activityTrend: { value: null, unit: 'trend', period: emptyRange(), source: 'Activity' },
  };
}

function emptySkillMetrics(): SkillMetrics {
  return {
    proficiencyDistribution: {},
    developmentStateDistribution: {},
    skillsWithRecentEvidence: 0,
    skillsWithoutRecentEvidence: [],
    pointsBySkill: [],
  };
}

function emptyLifeAreaBalance(): LifeAreaBalanceMetrics {
  return {
    distributionByPoints: [],
    distributionByActivities: [],
    distributionByTasks: [],
    areaTrends: [],
  };
}

/** Base input with all empty/clean state — produces zero candidates. */
function baseInput(overrides: Partial<SignalEngineInput> = {}): SignalEngineInput {
  return {
    goals: [],
    tasks: [],
    projects: [],
    activities: [],
    captures: [],
    lifeAreas: [],
    skills: [],
    skillEvidence: [],
    goalHealthMetrics: emptyGoalHealth(),
    projectHealthMetrics: emptyProjectHealth(),
    executionMetrics: emptyExecutionMetrics(),
    trendMetrics: emptyTrendMetrics(),
    skillMetrics: emptySkillMetrics(),
    lifeAreaBalanceMetrics: emptyLifeAreaBalance(),
    now: NOW,
    periodStartDate: P_START,
    periodEndDate: P_END,
    ...overrides,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function bySignal(candidates: ProactiveCandidate[], signal: string): ProactiveCandidate[] {
  return candidates.filter((c) => c.signalType === signal);
}

// ============================================================
// §01 — goal_inactive
// ============================================================
function test_goal_inactive(): void {
  section('§01  goal_inactive');

  const stalledGoal = makeGoal({ id: 'g1', title: 'Branding Strategy', updated_at: D_35_AGO + 'T00:00:00.000Z' });
  const healthyGoal = makeGoal({ id: 'g2', title: 'Healthy Goal' });

  const goalHealthWithStalled: GoalHealthMetrics = {
    statusCounts: { active: 2 },
    inactiveGoalIds: ['g1'],
    healthByGoal: [
      { goalId: 'g1', title: 'Branding Strategy', status: 'active', signal: { status: 'stalled', reason: 'No activity in period', evidence: { goalId: 'g1', period: `${P_START}..${P_END}` } } },
      { goalId: 'g2', title: 'Healthy Goal', status: 'active', signal: { status: 'healthy', reason: 'Has evidence', evidence: { goalId: 'g2' } } },
    ],
    overallSignal: { status: 'at_risk', reason: '1 stalled', evidence: {} },
  };

  // ── positive: stalled goal produces candidate ─────────────
  const c1 = evaluate(baseInput({ goals: [stalledGoal, healthyGoal], goalHealthMetrics: goalHealthWithStalled }));
  const inactive = bySignal(c1, 'goal_inactive');
  check('produces candidate for stalled goal', inactive.length === 1);
  check('scopeId is goalId', inactive[0]?.scopeId === 'g1');
  check('dedupeKey is goal_inactive:g1', inactive[0]?.dedupeKey === 'goal_inactive:g1');
  check('scopeType is goal', inactive[0]?.scopeType === 'goal');
  check('detectedAt equals input.now', inactive[0]?.detectedAt === NOW);
  check('evidence contains goalTitle', inactive[0]?.evidence?.['goalTitle'] === 'Branding Strategy');

  // ── severity: updated >30 days ago → high ─────────────────
  check('severity high when updated_at >30 days ago', inactive[0]?.severity === 'high');

  // ── severity: recently updated stalled goal → medium ──────
  const recentlyUpdatedGoal = makeGoal({ id: 'g3', title: 'Recent Stall', updated_at: D_8_AGO + 'T00:00:00.000Z' });
  const healthWithRecent: GoalHealthMetrics = {
    ...goalHealthWithStalled,
    healthByGoal: [
      { goalId: 'g3', title: 'Recent Stall', status: 'active', signal: { status: 'stalled', reason: 'No activity', evidence: {} } },
    ],
  };
  const c2 = evaluate(baseInput({ goals: [recentlyUpdatedGoal], goalHealthMetrics: healthWithRecent }));
  const recentInactive = bySignal(c2, 'goal_inactive');
  check('severity medium when updated_at ≤30 days ago', recentInactive[0]?.severity === 'medium');

  // ── negative: healthy goal → no candidate ─────────────────
  const healthyOnly: GoalHealthMetrics = {
    ...emptyGoalHealth(),
    healthByGoal: [
      { goalId: 'g2', title: 'Healthy Goal', status: 'active', signal: { status: 'healthy', reason: 'Has evidence', evidence: {} } },
    ],
  };
  const c3 = evaluate(baseInput({ goals: [healthyGoal], goalHealthMetrics: healthyOnly }));
  check('no candidate for healthy goal', bySignal(c3, 'goal_inactive').length === 0);

  // ── negative: stalled row but goal not in goals array ─────
  const c4 = evaluate(baseInput({ goals: [], goalHealthMetrics: goalHealthWithStalled }));
  check('no candidate when goal missing from domain records', bySignal(c4, 'goal_inactive').length === 0);

  // ── negative: non-active goal status ─────────────────────
  const completedGoal = makeGoal({ id: 'g4', title: 'Completed', status: 'completed' });
  const healthCompleted: GoalHealthMetrics = {
    ...emptyGoalHealth(),
    healthByGoal: [
      { goalId: 'g4', title: 'Completed', status: 'completed', signal: { status: 'stalled', reason: 'n/a', evidence: {} } },
    ],
  };
  const c5 = evaluate(baseInput({ goals: [completedGoal], goalHealthMetrics: healthCompleted }));
  check('no candidate for non-active goal status', bySignal(c5, 'goal_inactive').length === 0);
}

// ============================================================
// §02 — goal_without_clear_next_action
// ============================================================
function test_goal_without_clear_next_action(): void {
  section('§02  goal_without_clear_next_action');

  const g = makeGoal({ id: 'g-no-action', title: 'Goal With No Path' });

  // ── positive: no tasks, no activities, no sub-goals, no projects ──
  const c1 = evaluate(baseInput({ goals: [g] }));
  const noAction = bySignal(c1, 'goal_without_clear_next_action');
  check('positive: emits when no evidence path exists', noAction.length === 1);
  check('dedupeKey is goal_no_action:g-no-action', noAction[0]?.dedupeKey === 'goal_no_action:g-no-action');
  check('severity is medium', noAction[0]?.severity === 'medium');
  check('scopeType is goal', noAction[0]?.scopeType === 'goal');

  // ── negative A: has open task directly linked ─────────────
  const openTask = makeTask({ id: 't1', title: 'Do something', related_goal_id: 'g-no-action', status: 'not_started' });
  const c2 = evaluate(baseInput({ goals: [g], tasks: [openTask] }));
  check('negative A: no candidate when goal has open task', bySignal(c2, 'goal_without_clear_next_action').length === 0);

  // ── negative B: has open task via sub-goal ────────────────
  const subGoal = makeGoal({ id: 'g-sub', title: 'Sub Goal', parent_goal_id: 'g-no-action' });
  const subTask = makeTask({ id: 't2', title: 'Sub task', related_goal_id: 'g-sub', status: 'ready' });
  const c3 = evaluate(baseInput({ goals: [g, subGoal], tasks: [subTask] }));
  check('negative B: no candidate when sub-goal has open task', bySignal(c3, 'goal_without_clear_next_action').length === 0);

  // ── negative C: recent activity within 7 days ────────────
  const recentAct = makeActivity({ id: 'a1', date: D_3_AGO, related_goal_id: 'g-no-action' });
  const c4 = evaluate(baseInput({ goals: [g], activities: [recentAct] }));
  check('negative C: no candidate when recent activity (≤7 days)', bySignal(c4, 'goal_without_clear_next_action').length === 0);

  // ── case: old activity (>7 days) does NOT suppress ────────
  const oldAct = makeActivity({ id: 'a2', date: D_8_AGO, related_goal_id: 'g-no-action' });
  const c5 = evaluate(baseInput({ goals: [g], activities: [oldAct] }));
  check('old activity (>7 days) does not suppress signal', bySignal(c5, 'goal_without_clear_next_action').length === 1);

  // ── negative D: active project with recent work ───────────
  const proj = makeProject({ id: 'p1', title: 'Linked Project', primary_goal_id: 'g-no-action', status: 'active' });
  const projAct = makeActivity({ id: 'a3', date: D_20_AGO, related_project_id: 'p1' });
  const c6 = evaluate(baseInput({ goals: [g], projects: [proj], activities: [projAct] }));
  check('negative D: no candidate when active project has period activity', bySignal(c6, 'goal_without_clear_next_action').length === 0);

  // ── negative D: active project with open task (no activity) ─
  const projTask = makeTask({ id: 't3', title: 'Project task', related_project_id: 'p1', status: 'in_progress' });
  const c7 = evaluate(baseInput({ goals: [g], projects: [proj], tasks: [projTask] }));
  check('negative D: no candidate when active project has open task', bySignal(c7, 'goal_without_clear_next_action').length === 0);

  // ── not emitted for non-active goals ─────────────────────
  const pausedGoal = makeGoal({ id: 'g-paused', title: 'Paused', status: 'paused' });
  const c8 = evaluate(baseInput({ goals: [pausedGoal] }));
  check('no candidate for paused goal', bySignal(c8, 'goal_without_clear_next_action').length === 0);

  // ── completed task does NOT count as open task ────────────
  const completedTask = makeTask({ id: 't4', title: 'Done', related_goal_id: 'g-no-action', status: 'completed' });
  const c9 = evaluate(baseInput({ goals: [g], tasks: [completedTask] }));
  check('completed task does not suppress signal (not open)', bySignal(c9, 'goal_without_clear_next_action').length === 1);
}

// ============================================================
// §03 — completed_goal_followup
// ============================================================
function test_completed_goal_followup(): void {
  section('§03  completed_goal_followup');

  const recentlyCompleted = makeGoal({
    id: 'g-done',
    title: 'Completed Brand Strategy',
    status: 'completed',
    completed_at: D_20_AGO + 'T00:00:00.000Z',
  });

  // ── positive: recently completed, no successor ────────────
  const c1 = evaluate(baseInput({ goals: [recentlyCompleted] }));
  const followup = bySignal(c1, 'completed_goal_followup');
  check('positive: emits for recently completed goal', followup.length === 1);
  check('dedupeKey is goal_done:g-done', followup[0]?.dedupeKey === 'goal_done:g-done');
  check('severity is low', followup[0]?.severity === 'low');
  check('evidence contains completedAt', followup[0]?.evidence?.['completedAt'] !== undefined);

  // ── negative: completed outside period ────────────────────
  const oldCompleted = makeGoal({
    id: 'g-old-done',
    title: 'Old Win',
    status: 'completed',
    completed_at: D_45_AGO + 'T00:00:00.000Z', // before P_START
  });
  const c2 = evaluate(baseInput({ goals: [oldCompleted] }));
  check('negative: no candidate for goal completed outside period', bySignal(c2, 'completed_goal_followup').length === 0);

  // ── negative: has active child goal (successor exists) ────
  const childGoal = makeGoal({ id: 'g-child', title: 'Next Phase', status: 'active', parent_goal_id: 'g-done' });
  const c3 = evaluate(baseInput({ goals: [recentlyCompleted, childGoal] }));
  check('negative: no candidate when active child goal exists', bySignal(c3, 'completed_goal_followup').length === 0);

  // ── negative: has active linked project ───────────────────
  const successorProject = makeProject({ id: 'p-succ', title: 'Implementation', primary_goal_id: 'g-done', status: 'active' });
  const c4 = evaluate(baseInput({ goals: [recentlyCompleted], projects: [successorProject] }));
  check('negative: no candidate when active project exists for goal', bySignal(c4, 'completed_goal_followup').length === 0);

  // ── negative: completed_at is null ────────────────────────
  const noDate = makeGoal({ id: 'g-nodate', title: 'No Date', status: 'completed' });
  const c5 = evaluate(baseInput({ goals: [noDate] }));
  check('negative: no candidate when completed_at is missing', bySignal(c5, 'completed_goal_followup').length === 0);
}

// ============================================================
// §04 — project_stalled
// ============================================================
function test_project_stalled(): void {
  section('§04  project_stalled');

  const stalledProj = makeProject({ id: 'p-stall', title: 'Stalled Project', updated_at: D_25_AGO + 'T00:00:00.000Z' });
  const healthyProj = makeProject({ id: 'p-ok', title: 'Active Project' });

  const projectHealthWithStalled: ProjectHealthMetrics = {
    statusCounts: { active: 2 },
    inactiveProjectIds: ['p-stall'],
    healthByProject: [
      { projectId: 'p-stall', title: 'Stalled Project', status: 'active', signal: { status: 'stalled', reason: 'No activity in period', evidence: { projectId: 'p-stall' } } },
      { projectId: 'p-ok', title: 'Active Project', status: 'active', signal: { status: 'healthy', reason: 'Has evidence', evidence: {} } },
    ],
    overallSignal: { status: 'at_risk', reason: '1 stalled', evidence: {} },
  };

  // ── positive ─────────────────────────────────────────────
  const c1 = evaluate(baseInput({ projects: [stalledProj, healthyProj], projectHealthMetrics: projectHealthWithStalled }));
  const stalled = bySignal(c1, 'project_stalled');
  check('positive: emits for stalled project', stalled.length === 1);
  check('scopeId is projectId', stalled[0]?.scopeId === 'p-stall');
  check('dedupeKey is project_stalled:p-stall', stalled[0]?.dedupeKey === 'project_stalled:p-stall');
  check('evidence contains projectTitle', stalled[0]?.evidence?.['projectTitle'] === 'Stalled Project');

  // ── severity: updated >21 days → high ────────────────────
  check('severity high when updated_at >21 days ago', stalled[0]?.severity === 'high');

  // ── severity: recently updated stalled project → medium ───
  const recentStalled = makeProject({ id: 'p-recent-stall', title: 'Recent Stall', updated_at: D_8_AGO + 'T00:00:00.000Z' });
  const recentHealth: ProjectHealthMetrics = {
    ...projectHealthWithStalled,
    healthByProject: [
      { projectId: 'p-recent-stall', title: 'Recent Stall', status: 'active', signal: { status: 'stalled', reason: 'No activity', evidence: {} } },
    ],
  };
  const c2 = evaluate(baseInput({ projects: [recentStalled], projectHealthMetrics: recentHealth }));
  check('severity medium when updated_at ≤21 days ago', bySignal(c2, 'project_stalled')[0]?.severity === 'medium');

  // ── negative: healthy project ─────────────────────────────
  const healthyOnly: ProjectHealthMetrics = {
    ...emptyProjectHealth(),
    healthByProject: [
      { projectId: 'p-ok', title: 'Active Project', status: 'active', signal: { status: 'healthy', reason: 'Has evidence', evidence: {} } },
    ],
  };
  const c3 = evaluate(baseInput({ projects: [healthyProj], projectHealthMetrics: healthyOnly }));
  check('negative: no candidate for healthy project', bySignal(c3, 'project_stalled').length === 0);

  // ── negative: stalled row but project status is paused ────
  const pausedProj = makeProject({ id: 'p-paused', title: 'Paused', status: 'paused' });
  const pausedHealth: ProjectHealthMetrics = {
    ...emptyProjectHealth(),
    healthByProject: [
      { projectId: 'p-paused', title: 'Paused', status: 'paused', signal: { status: 'stalled', reason: 'Paused', evidence: {} } },
    ],
  };
  const c4 = evaluate(baseInput({ projects: [pausedProj], projectHealthMetrics: pausedHealth }));
  check('negative: no candidate for paused project', bySignal(c4, 'project_stalled').length === 0);

  // ── negative: stalled row but project missing from records ─
  const c5 = evaluate(baseInput({ projects: [], projectHealthMetrics: projectHealthWithStalled }));
  check('negative: no candidate when project missing from domain records', bySignal(c5, 'project_stalled').length === 0);
}

// ============================================================
// §05 — project_next_action
// ============================================================
function test_project_next_action(): void {
  section('§05  project_next_action');

  const goal = makeGoal({ id: 'g-linked', title: 'Linked Goal' });
  const proj = makeProject({ id: 'p-live', title: 'Live Project', primary_goal_id: 'g-linked' });

  // ── positive: active project, period activity, no next-action task ──
  const periodAct = makeActivity({ id: 'a1', date: D_20_AGO, related_project_id: 'p-live' });
  const c1 = evaluate(baseInput({ goals: [goal], projects: [proj], activities: [periodAct] }));
  const pna = bySignal(c1, 'project_next_action');
  check('positive: emits for project with activity but no next-action task', pna.length === 1);
  check('dedupeKey is project_next_action:p-live', pna[0]?.dedupeKey === 'project_next_action:p-live');
  check('severity is medium', pna[0]?.severity === 'medium');

  // ── positive: open tasks but no next-action task ──────────
  const openTask = makeTask({ id: 't1', title: 'Task', related_project_id: 'p-live', status: 'not_started' });
  const c2 = evaluate(baseInput({ goals: [goal], projects: [proj], tasks: [openTask] }));
  check('positive: emits for project with open tasks but no next-action task', bySignal(c2, 'project_next_action').length === 1);

  // ── negative: project has is_next_action task ────────────
  const nextActionTask = makeTask({ id: 't2', title: 'Next!', related_project_id: 'p-live', status: 'ready', is_next_action: true });
  const c3 = evaluate(baseInput({ goals: [goal], projects: [proj], tasks: [nextActionTask] }));
  check('negative: no candidate when project has next-action task', bySignal(c3, 'project_next_action').length === 0);

  // ── negative: project has no engagement (no tasks, no activity) ──
  const c4 = evaluate(baseInput({ goals: [goal], projects: [proj] }));
  check('negative: no candidate when no engagement evidence', bySignal(c4, 'project_next_action').length === 0);

  // ── negative: project has no active linked goal ───────────
  const projNoGoal = makeProject({ id: 'p-no-goal', title: 'Orphan Project' });
  const actNoGoal = makeActivity({ id: 'a2', date: D_20_AGO, related_project_id: 'p-no-goal' });
  const c5 = evaluate(baseInput({ goals: [goal], projects: [projNoGoal], activities: [actNoGoal] }));
  check('negative: no candidate when project has no primary_goal_id', bySignal(c5, 'project_next_action').length === 0);

  // ── negative: primary goal is not active ─────────────────
  const completedGoal = makeGoal({ id: 'g-done2', title: 'Done', status: 'completed' });
  const projWithDoneGoal = makeProject({ id: 'p-done-goal', title: 'Project', primary_goal_id: 'g-done2' });
  const actDoneGoal = makeActivity({ id: 'a3', date: D_20_AGO, related_project_id: 'p-done-goal' });
  const c6 = evaluate(baseInput({ goals: [completedGoal], projects: [projWithDoneGoal], activities: [actDoneGoal] }));
  check('negative: no candidate when linked goal is not active', bySignal(c6, 'project_next_action').length === 0);

  // ── negative: activity is outside period ─────────────────
  const oldAct = makeActivity({ id: 'a4', date: D_45_AGO, related_project_id: 'p-live' }); // before P_START
  const c7 = evaluate(baseInput({ goals: [goal], projects: [proj], activities: [oldAct] }));
  check('negative: no candidate for out-of-period activity with no open tasks', bySignal(c7, 'project_next_action').length === 0);
}

// ============================================================
// §06 — skill_evidence_gap
// ============================================================
function test_skill_evidence_gap(): void {
  section('§06  skill_evidence_gap');

  const skill45 = makeSkill({ id: 's-45', name: 'Copywriting' });
  const skill65 = makeSkill({ id: 's-65', name: 'Python' });
  const skillNull = makeSkill({ id: 's-null', name: 'Strategy' });
  const archivedSkill = makeSkill({ id: 's-arch', name: 'Legacy', status: 'archived' });
  const recentSkill = makeSkill({ id: 's-recent', name: 'Design' });

  const skillMetricsWithGaps: SkillMetrics = {
    ...emptySkillMetrics(),
    skillsWithoutRecentEvidence: [
      { skillId: 's-45', name: 'Copywriting', lastEvidenceAt: D_45_AGO + 'T00:00:00.000Z', daysSinceEvidence: 45 },
      { skillId: 's-65', name: 'Python', lastEvidenceAt: D_65_AGO + 'T00:00:00.000Z', daysSinceEvidence: 65 },
      { skillId: 's-null', name: 'Strategy', lastEvidenceAt: null, daysSinceEvidence: null },
      { skillId: 's-arch', name: 'Legacy', lastEvidenceAt: D_45_AGO + 'T00:00:00.000Z', daysSinceEvidence: 45 },
    ],
  };

  const allSkills = [skill45, skill65, skillNull, archivedSkill, recentSkill];
  const c1 = evaluate(baseInput({ skills: allSkills, skillMetrics: skillMetricsWithGaps }));
  const gaps = bySignal(c1, 'skill_evidence_gap');

  // ── positive: 45 days → medium ───────────────────────────
  const gap45 = gaps.find((g) => g.scopeId === 's-45');
  check('positive: emits for skill with 45-day gap', gap45 !== undefined);
  check('dedupeKey is skill_gap:s-45', gap45?.dedupeKey === 'skill_gap:s-45');
  check('severity medium for 45-day gap (30 < days ≤ 60)', gap45?.severity === 'medium');
  check('evidence contains daysSinceEvidence', gap45?.evidence?.['daysSinceEvidence'] === 45);

  // ── positive: 65 days → high ─────────────────────────────
  const gap65 = gaps.find((g) => g.scopeId === 's-65');
  check('positive: emits for skill with 65-day gap', gap65 !== undefined);
  check('severity high for 65-day gap (> 60)', gap65?.severity === 'high');

  // ── positive: null evidence → high ───────────────────────
  const gapNull = gaps.find((g) => g.scopeId === 's-null');
  check('positive: emits for skill with null lastEvidenceAt', gapNull !== undefined);
  check('severity high when no evidence ever', gapNull?.severity === 'high');

  // ── negative: archived skill excluded ────────────────────
  const archGap = gaps.find((g) => g.scopeId === 's-arch');
  check('negative: archived skill not emitted', archGap === undefined);

  // ── negative: skill with recent evidence not in gap list ──
  // recentSkill is active but NOT in skillsWithoutRecentEvidence → no candidate
  const recentGap = gaps.find((g) => g.scopeId === 's-recent');
  check('negative: no candidate for skill not in gap list', recentGap === undefined);

  // ── total: exactly 3 candidates (45d + 65d + null, not archived) ──
  check('total gap candidates: 3 active skills with gaps', gaps.length === 3);
}

// ============================================================
// §07 — life_area_attention
// ============================================================
function test_life_area_attention(): void {
  section('§07  life_area_attention');

  // ── positive: 30%+ relative drop ─────────────────────────
  const lifeAreaBalance: LifeAreaBalanceMetrics = {
    ...emptyLifeAreaBalance(),
    areaTrends: [
      { lifeAreaId: 'la-1', name: 'Psychology', trend: 'decreased', currentPeriodValue: 10, previousPeriodValue: 100 }, // 90% drop
      { lifeAreaId: 'la-2', name: 'Professional', trend: 'increased', currentPeriodValue: 90, previousPeriodValue: 60 },
      { lifeAreaId: 'la-3', name: 'Health', trend: 'unchanged', currentPeriodValue: 50, previousPeriodValue: 50 },
      { lifeAreaId: 'la-4', name: 'Finance', trend: 'decreased', currentPeriodValue: 0, previousPeriodValue: 0 },       // no baseline
      { lifeAreaId: 'la-5', name: 'Relationships', trend: 'decreased', currentPeriodValue: 40, previousPeriodValue: 50 }, // only 20% drop (< 30%)
    ],
  };

  const c1 = evaluate(baseInput({ lifeAreaBalanceMetrics: lifeAreaBalance }));
  const attn = bySignal(c1, 'life_area_attention');

  // Only la-1 should fire (90% drop, trend decreased)
  check('positive: emits for area with 90% drop', attn.find((c) => c.scopeId === 'la-1') !== undefined);
  check('dedupeKey is life_area:la-1', attn.find((c) => c.scopeId === 'la-1')?.dedupeKey === 'life_area:la-1');
  check('severity is medium (conservative)', attn.find((c) => c.scopeId === 'la-1')?.severity === 'medium');
  check('evidence contains relativeDrop', (attn.find((c) => c.scopeId === 'la-1')?.evidence?.['relativeDrop'] as number) >= 30);

  // ── negative: increasing area ─────────────────────────────
  check('negative: no candidate for increasing area', attn.find((c) => c.scopeId === 'la-2') === undefined);

  // ── negative: unchanged area ──────────────────────────────
  check('negative: no candidate for unchanged area', attn.find((c) => c.scopeId === 'la-3') === undefined);

  // ── negative: no baseline (prev = 0) ─────────────────────
  check('negative: no candidate when previousPeriodValue = 0 (no baseline)', attn.find((c) => c.scopeId === 'la-4') === undefined);

  // ── negative: drop < 30% ─────────────────────────────────
  check('negative: no candidate when relative drop < 30%', attn.find((c) => c.scopeId === 'la-5') === undefined);

  // ── exactly 1 candidate ───────────────────────────────────
  check('exactly 1 life_area_attention candidate', attn.length === 1);

  // ── null prev value ───────────────────────────────────────
  const nullBaseline: LifeAreaBalanceMetrics = {
    ...emptyLifeAreaBalance(),
    areaTrends: [
      { lifeAreaId: 'la-6', name: 'Social', trend: 'decreased', currentPeriodValue: 5, previousPeriodValue: null },
    ],
  };
  const c2 = evaluate(baseInput({ lifeAreaBalanceMetrics: nullBaseline }));
  check('negative: no candidate when previousPeriodValue is null', bySignal(c2, 'life_area_attention').length === 0);
}

// ============================================================
// §08 — execution_decline
// ============================================================
function test_execution_decline(): void {
  section('§08  execution_decline');

  // ── positive: rate 45%, trend decreased → medium ─────────
  const execMedium: ExecutionMetrics = {
    ...emptyExecutionMetrics(),
    taskCompletionRate: { value: 45, unit: 'percent', period: emptyRange(), source: 'Task' },
  };
  const trendDecreased: TrendMetrics = {
    ...emptyTrendMetrics(),
    taskCompletionTrend: { value: 'decreased', unit: 'trend', period: emptyRange(), source: 'Task' },
  };
  const c1 = evaluate(baseInput({ executionMetrics: execMedium, trendMetrics: trendDecreased }));
  const decl1 = bySignal(c1, 'execution_decline');
  check('positive: emits for rate 45% + decreased trend', decl1.length === 1);
  check('severity medium for rate 45% (40 ≤ rate < 60)', decl1[0]?.severity === 'medium');
  check('dedupeKey is exec_decline:' + P_START, decl1[0]?.dedupeKey === `exec_decline:${P_START}`);
  check('scopeType is global', decl1[0]?.scopeType === 'global');
  check('scopeId is global', decl1[0]?.scopeId === 'global');
  check('evidence contains taskCompletionRate', decl1[0]?.evidence?.['taskCompletionRate'] === 45);

  // ── positive: rate 35% → high ────────────────────────────
  const execHigh: ExecutionMetrics = {
    ...emptyExecutionMetrics(),
    taskCompletionRate: { value: 35, unit: 'percent', period: emptyRange(), source: 'Task' },
  };
  const c2 = evaluate(baseInput({ executionMetrics: execHigh, trendMetrics: trendDecreased }));
  check('severity high for rate 35% (< 40)', bySignal(c2, 'execution_decline')[0]?.severity === 'high');

  // ── negative: trend is increased ─────────────────────────
  const trendIncreased: TrendMetrics = {
    ...emptyTrendMetrics(),
    taskCompletionTrend: { value: 'increased', unit: 'trend', period: emptyRange(), source: 'Task' },
  };
  const c3 = evaluate(baseInput({ executionMetrics: execMedium, trendMetrics: trendIncreased }));
  check('negative: no candidate when trend is increased', bySignal(c3, 'execution_decline').length === 0);

  // ── negative: trend is null (insufficient data) ───────────
  const c4 = evaluate(baseInput({ executionMetrics: execMedium })); // trendMetrics default has null trend
  check('negative: no candidate when trend is null', bySignal(c4, 'execution_decline').length === 0);

  // ── negative: rate is null ────────────────────────────────
  const c5 = evaluate(baseInput({ trendMetrics: trendDecreased })); // executionMetrics default has null rate
  check('negative: no candidate when rate is null', bySignal(c5, 'execution_decline').length === 0);

  // ── negative: rate ≥ 60% (conservative floor) ────────────
  const execHigh2: ExecutionMetrics = {
    ...emptyExecutionMetrics(),
    taskCompletionRate: { value: 65, unit: 'percent', period: emptyRange(), source: 'Task' },
  };
  const c6 = evaluate(baseInput({ executionMetrics: execHigh2, trendMetrics: trendDecreased }));
  check('negative: no candidate when rate ≥ 60% (mild dip, not surfaced)', bySignal(c6, 'execution_decline').length === 0);

  // ── negative: trend unchanged ─────────────────────────────
  const trendUnchanged: TrendMetrics = {
    ...emptyTrendMetrics(),
    taskCompletionTrend: { value: 'unchanged', unit: 'trend', period: emptyRange(), source: 'Task' },
  };
  const c7 = evaluate(baseInput({ executionMetrics: execMedium, trendMetrics: trendUnchanged }));
  check('negative: no candidate when trend unchanged', bySignal(c7, 'execution_decline').length === 0);
}

// ============================================================
// §09 — learning_without_application
// ============================================================
function test_learning_without_application(): void {
  section('§09  learning_without_application');

  const devGoal = makeGoal({ id: 'g-dev', title: 'Learn Python', goal_type: 'development' });
  const acqGoal = makeGoal({ id: 'g-acq', title: 'Acquire Skill', goal_type: 'acquisition' });
  const outcomeGoal = makeGoal({ id: 'g-out', title: 'Ship Product', goal_type: 'outcome' });

  // 4 learning activities within period
  const learningActs: Activity[] = [
    makeActivity({ id: 'la1', date: D_20_AGO, category: 'Study & Research' }),
    makeActivity({ id: 'la2', date: D_20_AGO, category: 'Study & Research' }),
    makeActivity({ id: 'la3', date: D_20_AGO, category: 'Skill Acquisition' }),
    makeActivity({ id: 'la4', date: D_20_AGO, category: 'Skill Acquisition' }),
  ];

  // ── positive: 4 learning activities, 0 application evidence ─
  const c1 = evaluate(baseInput({ goals: [devGoal, acqGoal], activities: learningActs }));
  const lwoa1 = bySignal(c1, 'learning_without_application');
  check('positive: emits for 4 learning activities and no application', lwoa1.length === 1);
  check('dedupeKey is learning_gap:' + P_START, lwoa1[0]?.dedupeKey === `learning_gap:${P_START}`);
  check('scopeType is global', lwoa1[0]?.scopeType === 'global');
  check('evidence contains learningActivityCount = 4', lwoa1[0]?.evidence?.['learningActivityCount'] === 4);
  check('evidence contains applicationTaskCount = 0', lwoa1[0]?.evidence?.['applicationTaskCount'] === 0);

  // ── negative: application task present (completed, linked to dev goal) ──
  const appTask = makeTask({
    id: 'app-t1',
    title: 'Build CLI',
    status: 'completed',
    completed_at: D_20_AGO + 'T00:00:00.000Z',
    related_goal_id: 'g-dev',
  });
  const c2 = evaluate(baseInput({ goals: [devGoal], activities: learningActs, tasks: [appTask] }));
  check('negative: no candidate when completed application task exists', bySignal(c2, 'learning_without_application').length === 0);

  // ── negative: application project activity ─────────────────
  const devProject = makeProject({ id: 'p-dev', title: 'Python Project', primary_goal_id: 'g-dev', status: 'active' });
  const appProjAct = makeActivity({ id: 'pa1', date: D_20_AGO, related_project_id: 'p-dev' });
  const c3 = evaluate(baseInput({ goals: [devGoal], projects: [devProject], activities: [...learningActs, appProjAct] }));
  check('negative: no candidate when application project activity exists', bySignal(c3, 'learning_without_application').length === 0);

  // ── negative: below 3 learning threshold ─────────────────
  const twoLearning: Activity[] = [
    makeActivity({ id: 'la5', date: D_20_AGO, category: 'Study & Research' }),
    makeActivity({ id: 'la6', date: D_20_AGO, category: 'Study & Research' }),
  ];
  const c4 = evaluate(baseInput({ activities: twoLearning }));
  check('negative: no candidate when fewer than 3 learning activities', bySignal(c4, 'learning_without_application').length === 0);

  // ── negative: learning outside period ────────────────────
  const oldLearning: Activity[] = [
    makeActivity({ id: 'la7', date: D_45_AGO, category: 'Study & Research' }),
    makeActivity({ id: 'la8', date: D_45_AGO, category: 'Study & Research' }),
    makeActivity({ id: 'la9', date: D_45_AGO, category: 'Study & Research' }),
    makeActivity({ id: 'la10', date: D_45_AGO, category: 'Study & Research' }),
  ];
  const c5 = evaluate(baseInput({ activities: oldLearning }));
  check('negative: no candidate for out-of-period learning activities', bySignal(c5, 'learning_without_application').length === 0);

  // ── negative: application task linked to outcome goal (NOT dev/acq) ──
  const outcomeTask = makeTask({
    id: 'app-t2',
    title: 'Ship Feature',
    status: 'completed',
    completed_at: D_20_AGO + 'T00:00:00.000Z',
    related_goal_id: 'g-out', // outcome goal, not development/acquisition
  });
  const c6 = evaluate(baseInput({ goals: [outcomeGoal], activities: learningActs, tasks: [outcomeTask] }));
  check('negative: outcome-goal task is not application evidence (no heuristic inference)', bySignal(c6, 'learning_without_application').length === 1);

  // ── no keyword heuristics: task with "apply" in title ─────
  const keywordTask = makeTask({
    id: 'app-t3',
    title: 'Apply learning to project', // keyword in title should NOT count
    status: 'completed',
    completed_at: D_20_AGO + 'T00:00:00.000Z',
    // No related_goal_id pointing to a dev/acq goal
  });
  const c7 = evaluate(baseInput({ activities: learningActs, tasks: [keywordTask] }));
  check('no keyword heuristic: task title alone does not suppress signal', bySignal(c7, 'learning_without_application').length === 1);
}

// ============================================================
// §10 — idea_opportunity
// ============================================================
function test_idea_opportunity(): void {
  section('§10  idea_opportunity');

  const activeGoal = makeGoal({ id: 'g-active', title: 'Build Brand', life_area_id: 'la-brand' });
  const completedGoal = makeGoal({ id: 'g-done', title: 'Done Goal', status: 'completed', life_area_id: 'la-brand' });

  // ── positive: idea with explicit related_goal_id → active goal ──
  const ideaDirectLink = makeCapture({ id: 'cap-1', content: 'Idea about branding', related_goal_id: 'g-active' });
  const c1 = evaluate(baseInput({ goals: [activeGoal], captures: [ideaDirectLink] }));
  const opp1 = bySignal(c1, 'idea_opportunity');
  check('positive: emits for idea with explicit active goal link', opp1.length === 1);
  check('dedupeKey is idea_opp:cap-1:g-active', opp1[0]?.dedupeKey === 'idea_opp:cap-1:g-active');
  check('scopeType is idea', opp1[0]?.scopeType === 'idea');
  check('scopeId is captureId', opp1[0]?.scopeId === 'cap-1');
  check('severity is low', opp1[0]?.severity === 'low');
  check('evidence contains relatedGoalId', opp1[0]?.evidence?.['relatedGoalId'] === 'g-active');
  check('evidence contains matchReason explicit_goal_link', opp1[0]?.evidence?.['matchReason'] === 'explicit_goal_link');

  // ── negative: idea with no goal link ─────────────────────
  const orphanIdea = makeCapture({ id: 'cap-3', content: 'Random thought' });
  const c3 = evaluate(baseInput({ goals: [activeGoal], captures: [orphanIdea] }));
  check('negative: no candidate for idea with no explicit goal link', bySignal(c3, 'idea_opportunity').length === 0);

  // ── negative: idea linked to completed (non-active) goal ──
  const ideaCompletedGoal = makeCapture({ id: 'cap-4', content: 'Idea for done goal', related_goal_id: 'g-done' });
  const c4 = evaluate(baseInput({ goals: [completedGoal], captures: [ideaCompletedGoal] }));
  check('negative: no candidate for idea linked to non-active goal', bySignal(c4, 'idea_opportunity').length === 0);

  // ── negative: archived capture ───────────────────────────
  const archivedIdea = makeCapture({ id: 'cap-5', content: 'Old idea', related_goal_id: 'g-active', status: 'archived' });
  const c5 = evaluate(baseInput({ goals: [activeGoal], captures: [archivedIdea] }));
  check('negative: no candidate for archived capture', bySignal(c5, 'idea_opportunity').length === 0);

  // ── negative: capture already linked to a project ─────────
  const executedIdea = makeCapture({ id: 'cap-6', content: 'Being worked on', related_goal_id: 'g-active', related_project_id: 'p-exec' });
  const c6 = evaluate(baseInput({ goals: [activeGoal], captures: [executedIdea] }));
  check('negative: no candidate for idea already linked to project', bySignal(c6, 'idea_opportunity').length === 0);

  // ── negative: non-idea capture type ──────────────────────
  const noteCapture = makeCapture({ id: 'cap-7', content: 'Just a note', capture_type: 'note', related_goal_id: 'g-active' });
  const c7 = evaluate(baseInput({ goals: [activeGoal], captures: [noteCapture] }));
  check('negative: no candidate for non-idea capture type', bySignal(c7, 'idea_opportunity').length === 0);
}

// ============================================================
// §11 — goal_next_action
// ============================================================
function test_goal_next_action(): void {
  section('§11  goal_next_action');

  const g = makeGoal({ id: 'g-gna', title: 'Goal With Tasks' });

  // ── positive: open tasks but no is_next_action ────────────
  const openTask = makeTask({ id: 't1', title: 'Some task', related_goal_id: 'g-gna', status: 'not_started' });
  const c1 = evaluate(baseInput({ goals: [g], tasks: [openTask] }));
  const gna = bySignal(c1, 'goal_next_action');
  check('positive: emits for goal with open tasks and no next-action task', gna.length === 1);
  check('dedupeKey is goal_next_action:g-gna', gna[0]?.dedupeKey === 'goal_next_action:g-gna');
  check('severity is low', gna[0]?.severity === 'low');
  check('evidence contains openTaskCount = 1', gna[0]?.evidence?.['openTaskCount'] === 1);
  check('evidence nextActionTaskCount = 0', gna[0]?.evidence?.['nextActionTaskCount'] === 0);

  // ── positive: recent activity (within period) as evidence ─
  // Use an activity within 7 days so goal_without_clear_next_action is
  // suppressed (its C-check fires), allowing goal_next_action to survive dedup.
  const gNoTasks = makeGoal({ id: 'g-act-only', title: 'Activity Only' });
  const actForGoal = makeActivity({ id: 'a-gna', date: D_3_AGO, related_goal_id: 'g-act-only' });
  const c2 = evaluate(baseInput({ goals: [gNoTasks], activities: [actForGoal] }));
  check('positive: emits for goal with recent activity (≤7 days) and no next-action task', bySignal(c2, 'goal_next_action').find((c) => c.scopeId === 'g-act-only') !== undefined);

  // ── negative: goal has is_next_action task ────────────────
  const nextActionTask = makeTask({ id: 't2', title: 'THE action', related_goal_id: 'g-gna', status: 'ready', is_next_action: true });
  const c3 = evaluate(baseInput({ goals: [g], tasks: [nextActionTask] }));
  check('negative: no candidate when goal already has next-action task', bySignal(c3, 'goal_next_action').length === 0);

  // ── negative: no open tasks, no period activity (→ goal_without_clear_next_action territory) ──
  const c4 = evaluate(baseInput({ goals: [g] }));
  check('negative: no goal_next_action when goal has no engagement at all', bySignal(c4, 'goal_next_action').length === 0);

  // ── cross-check: goal_without_clear_next_action fires for no-engagement case ──
  check('cross-check: goal_without_clear_next_action fires when no engagement', bySignal(c4, 'goal_without_clear_next_action').length === 1);
}

// ============================================================
// §12 — cross-signal deduplication
// ============================================================
function test_cross_signal_dedup(): void {
  section('§12  cross-signal deduplication');

  // ── goal_inactive suppresses goal_next_action for same goal ─
  const stalledGoal = makeGoal({ id: 'g-stall', title: 'Stalled', updated_at: D_35_AGO + 'T00:00:00.000Z' });
  const openTask = makeTask({ id: 't1', title: 'Task', related_goal_id: 'g-stall', status: 'not_started' });
  const stalledHealth: GoalHealthMetrics = {
    ...emptyGoalHealth(),
    healthByGoal: [
      { goalId: 'g-stall', title: 'Stalled', status: 'active', signal: { status: 'stalled', reason: 'No activity', evidence: {} } },
    ],
  };
  const c1 = evaluate(baseInput({ goals: [stalledGoal], tasks: [openTask], goalHealthMetrics: stalledHealth }));
  const inactive1 = bySignal(c1, 'goal_inactive');
  const nextAction1 = bySignal(c1, 'goal_next_action');
  check('goal_inactive fires for stalled goal with open task', inactive1.length === 1);
  check('goal_next_action suppressed when goal_inactive fired for same goal', nextAction1.length === 0);

  // ── goal_without_clear_next_action suppresses goal_next_action ──
  const noActionGoal = makeGoal({ id: 'g-none', title: 'Nothing' });
  // No tasks, no activities → goal_without_clear_next_action fires
  // goal_next_action should NOT also fire (no engagement = guard in signal fn)
  const c2 = evaluate(baseInput({ goals: [noActionGoal] }));
  const noAction2 = bySignal(c2, 'goal_without_clear_next_action');
  const nextAction2 = bySignal(c2, 'goal_next_action');
  check('goal_without_clear_next_action fires for no-engagement goal', noAction2.length === 1);
  check('goal_next_action not emitted for no-engagement goal', nextAction2.length === 0);

  // ── project_stalled suppresses project_next_action ────────
  const stalledProj = makeProject({ id: 'p-stall2', title: 'Stalled Project', primary_goal_id: 'g-link', updated_at: D_25_AGO + 'T00:00:00.000Z' });
  const linkedGoal = makeGoal({ id: 'g-link', title: 'Linked' });
  const projTask = makeTask({ id: 't2', title: 'Proj task', related_project_id: 'p-stall2', status: 'not_started' });
  const projHealth: ProjectHealthMetrics = {
    ...emptyProjectHealth(),
    healthByProject: [
      { projectId: 'p-stall2', title: 'Stalled Project', status: 'active', signal: { status: 'stalled', reason: 'No activity', evidence: {} } },
    ],
  };
  const c3 = evaluate(baseInput({ goals: [linkedGoal], projects: [stalledProj], tasks: [projTask], projectHealthMetrics: projHealth }));
  const projStalled3 = bySignal(c3, 'project_stalled');
  const projNextAction3 = bySignal(c3, 'project_next_action');
  check('project_stalled fires', projStalled3.length === 1);
  check('project_next_action suppressed when project_stalled fired', projNextAction3.length === 0);

  // ── dedupeKey uniqueness: same dedupeKey cannot appear twice ─
  const g = makeGoal({ id: 'g-dup', title: 'Dup Test' });
  // Create input that would emit goal_inactive (stalled signal)
  const dupHealth: GoalHealthMetrics = {
    ...emptyGoalHealth(),
    healthByGoal: [
      { goalId: 'g-dup', title: 'Dup Test', status: 'active', signal: { status: 'stalled', reason: 'Stalled', evidence: {} } },
    ],
  };
  const c4 = evaluate(baseInput({ goals: [g], goalHealthMetrics: dupHealth }));
  const allKeys = c4.map((c) => c.dedupeKey);
  const uniqueKeys = new Set(allKeys);
  check('all dedupeKeys are unique in output', allKeys.length === uniqueKeys.size);
}

// ============================================================
// §13 — clean data baseline (no false positives)
// ============================================================
function test_clean_data_baseline(): void {
  section('§13  clean data baseline — zero candidates');

  // All goals healthy
  const activeGoal = makeGoal({ id: 'g1', title: 'Healthy Goal', updated_at: D_3_AGO + 'T00:00:00.000Z' });
  const openTask = makeTask({ id: 't1', title: 'Next action', related_goal_id: 'g1', status: 'ready', is_next_action: true });
  const recentAct = makeActivity({ id: 'a1', date: D_3_AGO, related_goal_id: 'g1' });
  const healthyGoalHealth: GoalHealthMetrics = {
    statusCounts: { active: 1 },
    inactiveGoalIds: [],
    healthByGoal: [{ goalId: 'g1', title: 'Healthy Goal', status: 'active', signal: { status: 'healthy', reason: 'Has evidence', evidence: {} } }],
    overallSignal: { status: 'healthy', reason: 'All active goals healthy', evidence: {} },
  };

  // All projects healthy and with next-action tasks
  const activeProject = makeProject({ id: 'p1', title: 'Live Project', primary_goal_id: 'g1' });
  const projNextAction = makeTask({ id: 't2', title: 'Project next action', related_project_id: 'p1', status: 'ready', is_next_action: true });
  const healthyProjectHealth: ProjectHealthMetrics = {
    statusCounts: { active: 1 },
    inactiveProjectIds: [],
    healthByProject: [{ projectId: 'p1', title: 'Live Project', status: 'active', signal: { status: 'healthy', reason: 'Has evidence', evidence: {} } }],
    overallSignal: { status: 'healthy', reason: 'All active projects healthy', evidence: {} },
  };

  // Skill with recent evidence → NOT in skillsWithoutRecentEvidence
  const skill = makeSkill({ id: 's1', name: 'TypeScript' });
  const healthySkillMetrics: SkillMetrics = {
    ...emptySkillMetrics(),
    skillsWithRecentEvidence: 1,
    skillsWithoutRecentEvidence: [],
  };

  // Life area with stable trend
  const healthyAreaBalance: LifeAreaBalanceMetrics = {
    ...emptyLifeAreaBalance(),
    areaTrends: [
      { lifeAreaId: 'la1', name: 'Professional', trend: 'unchanged', currentPeriodValue: 50, previousPeriodValue: 50 },
    ],
  };

  // Execution metrics: healthy completion rate, not declining
  const healthyExecution: ExecutionMetrics = {
    ...emptyExecutionMetrics(),
    taskCompletionRate: { value: 80, unit: 'percent', period: emptyRange(), source: 'Task' },
  };
  const healthyTrend: TrendMetrics = {
    ...emptyTrendMetrics(),
    taskCompletionTrend: { value: 'increased', unit: 'trend', period: emptyRange(), source: 'Task' },
  };

  // No ideas without links, no learning without application
  const cleanInput = baseInput({
    goals: [activeGoal],
    tasks: [openTask, projNextAction],
    projects: [activeProject],
    activities: [recentAct],
    captures: [],
    skills: [skill],
    goalHealthMetrics: healthyGoalHealth,
    projectHealthMetrics: healthyProjectHealth,
    executionMetrics: healthyExecution,
    trendMetrics: healthyTrend,
    skillMetrics: healthySkillMetrics,
    lifeAreaBalanceMetrics: healthyAreaBalance,
  });

  const candidates = evaluate(cleanInput);
  check('clean data: zero candidates produced', candidates.length === 0,
    `got ${candidates.length}: ${candidates.map((c) => c.signalType + ':' + c.scopeId).join(', ')}`);
}

// ============================================================
// §14 — determinism
// ============================================================
function test_determinism(): void {
  section('§14  determinism — same input → same output');

  const g = makeGoal({ id: 'g-det', title: 'Det Goal', updated_at: D_35_AGO + 'T00:00:00.000Z' });
  const stalledHealth: GoalHealthMetrics = {
    ...emptyGoalHealth(),
    healthByGoal: [
      { goalId: 'g-det', title: 'Det Goal', status: 'active', signal: { status: 'stalled', reason: 'No activity', evidence: {} } },
    ],
  };
  const skill = makeSkill({ id: 's-det', name: 'Det Skill' });
  const skillGapMetrics: SkillMetrics = {
    ...emptySkillMetrics(),
    skillsWithoutRecentEvidence: [{ skillId: 's-det', name: 'Det Skill', lastEvidenceAt: null, daysSinceEvidence: null }],
  };

  const input = baseInput({
    goals: [g],
    skills: [skill],
    goalHealthMetrics: stalledHealth,
    skillMetrics: skillGapMetrics,
  });

  const run1 = evaluate(input);
  const run2 = evaluate(input);
  const run3 = evaluate(input);

  check('run1 and run2 produce same candidate count', run1.length === run2.length);
  check('run1 and run3 produce same candidate count', run1.length === run3.length);
  check('run1 and run2 produce identical dedupeKeys',
    JSON.stringify(run1.map((c) => c.dedupeKey)) === JSON.stringify(run2.map((c) => c.dedupeKey)));
  check('run1 and run3 produce identical dedupeKeys',
    JSON.stringify(run1.map((c) => c.dedupeKey)) === JSON.stringify(run3.map((c) => c.dedupeKey)));
  check('run1 and run2 produce identical severities',
    JSON.stringify(run1.map((c) => c.severity)) === JSON.stringify(run2.map((c) => c.severity)));
  check('all detectedAt equal input.now',
    run1.every((c) => c.detectedAt === NOW));
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Module 11 Phase 3 — Deterministic Signal Engine Tests');
  console.log('═══════════════════════════════════════════════════════════');

  test_goal_inactive();
  test_goal_without_clear_next_action();
  test_completed_goal_followup();
  test_project_stalled();
  test_project_next_action();
  test_skill_evidence_gap();
  test_life_area_attention();
  test_execution_decline();
  test_learning_without_application();
  test_idea_opportunity();
  test_goal_next_action();
  test_cross_signal_dedup();
  test_clean_data_baseline();
  test_determinism();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Phase 3 verification: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
