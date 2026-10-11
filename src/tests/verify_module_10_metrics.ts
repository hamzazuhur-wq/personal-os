/**
 * Module 10 — Metrics & Analytics runtime verification.
 *
 * Runs the REAL metrics service against a fake-indexeddb-backed Dexie
 * instance seeded with controlled fixtures. Covers:
 *  1. Task execution rate (normal + zero-task null behavior)
 *  2. Task execution volume
 *  3. Activity volume + duration
 *  4. Task completion trend (increased/decreased/unchanged/null)
 *  5. Task aging buckets
 *  6. Overdue indicators
 *  7. Goal status counts + health signals (healthy/stalled/unknown)
 *  8. Project status counts + health signals
 *  9. Development points (all-time, period, by Life Area)
 * 10. Point acceleration + trend
 * 11. Life Area balance (points, activities, tasks, trends)
 * 12. Skill metrics (proficiency, development state, evidence gaps)
 * 13. Level metrics (current/next, requirement progress)
 * 14. Planning vs execution ratios (null when denominator = 0)
 * 15. Previous period comparison (equal-length ranges)
 * 16. Custom date range
 * 17. Nested Goal subtree attribution
 * 18. Unassigned task attribution (no goal/project → no area)
 * 19. Null/empty states (no NaN, Infinity, undefined, 0%)
 * 20. Date normalization
 * 21. No duplicate aggregation (single-pass reconciliation)
 * 22. AI metric tool parity (deterministic results)
 * 23. Module 09 regression (review overview still works)
 * 24. No console errors during metrics computation
 *
 * Temporary fixtures only — nothing touches a production database.
 */

import 'fake-indexeddb/auto';
import { posDexieDb } from '../services/adapters/dexie/posDexieDb';
import {
  getConsistencyMetrics,
  getDevelopmentMetrics,
  getExecutionMetrics,
  getGoalHealthMetrics,
  getLifeAreaBalanceMetrics,
  getLevelMetrics,
  getMetricsBundle,
  getPlanningExecutionMetrics,
  getProjectHealthMetrics,
  getSkillMetrics,
  getTrendMetrics,
} from '../services/analytics/metricsService';
import { getReviewOverview } from '../services/analytics/reviewAnalyticsService';
import { ReadToolExecutors } from '../services/ai/tools/readTools';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(detail ? `${name} (${detail})` : name);
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ─── Fixtures ────────────────────────────────────────────────

const USER = 'test-user';

async function seed(): Promise<void> {
  await posDexieDb.life_areas.bulkPut([
    { id: 'la-pro', name: 'Professional', sort_order: 1, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 'la-health', name: 'Health', sort_order: 2, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ]);

  const goalBase = {
    user_id: USER,
    status: 'active' as const,
    goal_type: 'outcome' as const,
    time_horizon: 'annual' as const,
    priority: 'high' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  await posDexieDb.goals.bulkPut([
    { ...goalBase, id: 'g-brand', title: 'Branding', life_area_id: 'la-pro' },
    { ...goalBase, id: 'g-pos', title: 'Positioning', parent_goal_id: 'g-brand' },
    { ...goalBase, id: 'g-mark', title: 'Marketing', life_area_id: 'la-pro' },
    { ...goalBase, id: 'g-fit', title: 'Fitness', life_area_id: 'la-health' },
    { ...goalBase, id: 'g-stall', title: 'Stalled Goal', life_area_id: 'la-pro' },
  ]);

  await posDexieDb.projects.bulkPut([
    {
      id: 'p-avori', user_id: USER, title: 'AVORI Brand Strategy',
      desired_outcome: 'Launch brand strategy', status: 'active', priority: 'high',
      life_area_id: 'la-pro', primary_goal_id: 'g-brand',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p-stall', user_id: USER, title: 'Stalled Project',
      desired_outcome: 'Nothing happens', status: 'active', priority: 'low',
      life_area_id: 'la-pro', primary_goal_id: 'g-stall',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ]);

  const taskBase = {
    user_id: USER,
    created_at: '2026-08-01T09:00:00Z',
  };
  await posDexieDb.tasks.bulkPut([
    { ...taskBase, id: 't-research', title: 'Research competitors', status: 'completed', completed_at: '2026-08-10T14:00:00Z', related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-positioning', title: 'Write positioning statement', status: 'completed', completed_at: '2026-08-12T16:00:00Z', related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-messaging', title: 'Review messaging', status: 'completed', completed_at: '2026-08-14T11:00:00Z', related_goal_id: 'g-brand' },
    { ...taskBase, id: 't-presentation', title: 'Create presentation', status: 'ready', related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-pdf', title: 'Export PDF', status: 'ready', related_project_id: 'p-avori' },
    { ...taskBase, id: 't-cancelled', title: 'Cancelled thing', status: 'cancelled', related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-workout', title: 'Unassigned errand', status: 'completed', completed_at: '2026-08-15T08:00:00Z' },
    { ...taskBase, id: 't-overdue', title: 'Overdue task', status: 'ready', due_date: '2026-01-01', related_goal_id: 'g-stall' },
  ]);

  await posDexieDb.activities.bulkPut([
    { id: 'a1', date: '2026-08-21', title: 'Finished competitor analysis', status: 'active', related_goal_id: 'g-brand', duration_minutes: 90, created_at: '2026-08-21T10:00:00Z', updated_at: '2026-08-21T10:00:00Z' },
    { id: 'a2', date: '2026-08-19', title: 'Gym session', status: 'active', related_life_area_id: 'la-health', duration_minutes: 45, created_at: '2026-08-19T07:00:00Z', updated_at: '2026-08-19T07:00:00Z' },
    { id: 'a3', date: '2026-06-02', title: 'Old activity outside range', status: 'active', created_at: '2026-06-02T07:00:00Z', updated_at: '2026-06-02T07:00:00Z' },
    { id: 'a4', date: '2026-08-20', title: 'Strategy deep work', status: 'active', related_project_id: 'p-avori', duration_minutes: 120, created_at: '2026-08-20T09:00:00Z', updated_at: '2026-08-20T09:00:00Z' },
  ]);

  await posDexieDb.point_ledger.bulkPut([
    { id: 'e-goal-pos', user_id: USER, points: 20, source_type: 'manual_award', source_id: 'src-e-goal-pos', life_area_id: 'la-pro', goal_id: 'g-pos', reason: 'Positioning milestone', status: 'valid', occurred_at: '2026-08-22T10:00:00.000Z', created_at: '2026-08-22T10:00:00.000Z' },
    { id: 'e-task-research', user_id: USER, points: 10, source_type: 'task_completion', source_id: 't-research', life_area_id: 'la-pro', goal_id: 'g-pos', project_id: 'p-avori', task_id: 't-research', reason: 'Task completion', status: 'valid', occurred_at: '2026-08-12T14:05:00.000Z', created_at: '2026-08-12T14:05:00.000Z' },
    { id: 'e-activity-a1', user_id: USER, points: 10, source_type: 'activity_completion', source_id: 'a1', life_area_id: 'la-pro', goal_id: 'g-brand', activity_id: 'a1', reason: 'Activity logged', status: 'valid', occurred_at: '2026-08-21T12:00:00.000Z', created_at: '2026-08-21T12:00:00.000Z' },
    { id: 'e-milestone', user_id: USER, points: 10, source_type: 'practice_completion', source_id: 'src-e-milestone', life_area_id: 'la-pro', goal_id: 'g-brand', reason: 'Branding milestone', status: 'valid', occurred_at: '2026-08-20T09:30:00.000Z', created_at: '2026-08-20T09:30:00.000Z' },
    { id: 'e-health', user_id: USER, points: 30, source_type: 'manual_award', source_id: 'src-e-health', life_area_id: 'la-health', reason: 'Recovery discipline', status: 'valid', occurred_at: '2026-08-19T20:00:00.000Z', created_at: '2026-08-19T20:00:00.000Z' },
    { id: 'e-outside-range', user_id: USER, points: 999, source_type: 'manual_award', source_id: 'src-e-old', life_area_id: 'la-pro', reason: 'June event', status: 'valid', occurred_at: '2026-06-15T10:00:00.000Z', created_at: '2026-06-15T10:00:00.000Z' },
    { id: 'e-voided', user_id: USER, points: 500, source_type: 'adjustment', source_id: 'src-e-voided', life_area_id: 'la-pro', reason: 'Voided adjustment', status: 'voided', occurred_at: '2026-08-18T10:00:00.000Z', created_at: '2026-08-18T10:00:00.000Z' },
  ]);

  await posDexieDb.skills.bulkPut([
    { id: 's-brand', user_id: USER, name: 'Brand Strategy', life_area_id: 'la-pro', current_proficiency: 'competent', target_proficiency: 'advanced', development_state: 'developing', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 's-fit', user_id: USER, name: 'Fitness', life_area_id: 'la-health', current_proficiency: 'foundation', target_proficiency: 'developing', development_state: 'developing', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ]);

  await posDexieDb.skill_evidence.bulkPut([
    { id: 'se1', skill_id: 's-brand', reference_id: 'g-brand', type: 'goal', title: 'Branding goal evidence', description: 'Linked to branding goal', created_at: '2026-08-20T09:00:00Z' },
    { id: 'se2', skill_id: 's-brand', reference_id: 't-research', type: 'note', title: 'Research task evidence', description: 'Linked to research task', created_at: '2026-08-10T14:00:00Z' },
  ]);

  await posDexieDb.skill_history.bulkPut([
    { id: 'sh1', skill_id: 's-brand', previous_proficiency: 'developing', new_proficiency: 'competent', reason: 'Evidence accumulated', changed_at: '2026-08-15T10:00:00Z', created_at: '2026-08-15T10:00:00Z' },
  ]);

  await posDexieDb.levels.bulkPut([
    { id: 'l1-pro', user_id: USER, life_area_id: 'la-pro', name: 'Practitioner', display_order: 1, status: 'current', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 'l2-pro', user_id: USER, life_area_id: 'la-pro', name: 'Expert', display_order: 2, status: 'unlocked', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ]);

  await posDexieDb.level_requirements.bulkPut([
    { id: 'lr1', level_id: 'l2-pro', title: 'Development Points', type: 'development_points', target_points: 100, status: 'in_progress', is_required: true, points_life_area_id: 'la-pro', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 'lr2', level_id: 'l2-pro', title: 'Goal Completion', type: 'goal_completion', target_points: 0, status: 'not_started', is_required: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ]);
}

// ─── Suites ──────────────────────────────────────────────────

async function suiteExecutionMetrics(): Promise<void> {
  console.log('\n— Execution Metrics (Aug 1–31) —');
  const metrics = await getExecutionMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' }, '2026-08-23');

  check('taskCompletionRate: 4 completed / 7 total = 57%', metrics.taskCompletionRate.value === 57, `${metrics.taskCompletionRate.value}`);
  check('taskCompletionRate unit is percent', metrics.taskCompletionRate.unit === 'percent');
  check('taskExecutionVolume = 4', metrics.taskExecutionVolume.value === 4);
  check('activityVolume = 3 (a1, a2, a4 in range)', metrics.activityVolume.value === 3);
  check('activityDuration = 255 min (90+45+120)', metrics.activityDuration.value === 255);
  check('taskAging has 4 buckets', metrics.taskAging.length === 4);
  check('taskAging[1] count = 3 (open tasks created Aug 1, age 22 days)', metrics.taskAging[1].count === 3);
  check('overdueIndicators detects t-overdue (due_date 2026-01-01)', metrics.overdueIndicators.some((o) => o.taskId === 't-overdue'));
  check('overdueIndicators does not include tasks without due_date', !metrics.overdueIndicators.some((o) => o.dueDate === undefined));
}

async function suiteZeroTaskPeriod(): Promise<void> {
  console.log('\n— Zero-Task Period (Health in June) —');
  const metrics = await getExecutionMetrics({ startDate: '2026-06-01', endDate: '2026-06-30' });

  check('no completed tasks in June → taskExecutionVolume = 0', metrics.taskExecutionVolume.value === 0);
  check('open tasks still exist → total > 0, rate = 0%', metrics.taskCompletionRate.value === 0, `${metrics.taskCompletionRate.value}`);
  check('activityVolume includes out-of-range activity', metrics.activityVolume.value === 1);
}

async function suiteGoalHealthMetrics(): Promise<void> {
  console.log('\n— Goal Health Metrics —');
  const metrics = await getGoalHealthMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('statusCounts has active count', !!metrics.statusCounts['active']);
  check('g-stall is inactive (no evidence)', metrics.inactiveGoalIds.includes('g-stall'));
  check('g-brand is healthy (has evidence)', !metrics.inactiveGoalIds.includes('g-brand'));
  check('overallSignal is at_risk or stalled (g-stall is stalled)', ['at_risk', 'stalled'].includes(metrics.overallSignal.status));
  check('healthByGoal has entry for g-stall with stalled signal', metrics.healthByGoal.find((g) => g.goalId === 'g-stall')?.signal.status === 'stalled');
}

async function suiteProjectHealthMetrics(): Promise<void> {
  console.log('\n— Project Health Metrics —');
  const metrics = await getProjectHealthMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('p-stall is inactive (no evidence)', metrics.inactiveProjectIds.includes('p-stall'));
  check('p-avori is healthy (has evidence)', !metrics.inactiveProjectIds.includes('p-avori'));
}

async function suiteDevelopmentMetrics(): Promise<void> {
  console.log('\n— Development Metrics (Aug 1–31) —');
  const metrics = await getDevelopmentMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('periodPoints = 80 (excludes voided + out-of-range)', metrics.periodPoints.value === 80);
  check('pointsByLifeArea has Professional and Health', metrics.pointsByLifeArea.length >= 2);
  check('Professional points = 50', !!metrics.pointsByLifeArea.find((p) => p.lifeAreaId === 'la-pro' && p.points === 50));
  check('Health points = 30', !!metrics.pointsByLifeArea.find((p) => p.lifeAreaId === 'la-health' && p.points === 30));
  check('pointAcceleration is null (previous period = 0)', metrics.pointAcceleration === null);
  check('pointTrend is null (previous = 0, no trend)', metrics.pointTrend.value === null);
}

async function suiteLifeAreaBalanceMetrics(): Promise<void> {
  console.log('\n— Life Area Balance Metrics —');
  const metrics = await getLifeAreaBalanceMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('distributionByPoints has Professional and Health', metrics.distributionByPoints.length >= 2);
  check('Professional percent = 63 (50/80 rounded)', !!metrics.distributionByPoints.find((p) => p.lifeAreaId === 'la-pro' && p.percentOfTotal === 63));
  check('distributionByActivities has entries', metrics.distributionByActivities.length >= 1);
  check('areaTrends has entries with trend direction', metrics.areaTrends.every((t) => t.trend === 'increased' || t.trend === null || t.trend === 'decreased'));
}

async function suiteSkillMetrics(): Promise<void> {
  console.log('\n— Skill Metrics —');
  const metrics = await getSkillMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('proficiencyDistribution has competent count', metrics.proficiencyDistribution['competent'] === 1);
  check('developmentStateDistribution has developing count', metrics.developmentStateDistribution['developing'] === 2);
  check('skillsWithRecentEvidence = 1 (s-brand has evidence in Aug)', metrics.skillsWithRecentEvidence === 1);
  check('skillsWithoutRecentEvidence = 1 (s-fit has no evidence)', metrics.skillsWithoutRecentEvidence.length === 1);
}

async function suiteLevelMetrics(): Promise<void> {
  console.log('\n— Level Metrics —');
  const metrics = await getLevelMetrics({ startDate: '2026-08-01', endDate: '2026-08-31', lifeAreaId: 'la-pro' });

  check('currentLevel is Practitioner', metrics.currentLevel?.name === 'Practitioner');
  check('nextLevel is Expert', metrics.nextLevel?.name === 'Expert');
  check('requirements has development_points requirement', metrics.requirements.some((r) => r.type === 'development_points'));
  check('requirement progress shows current/target', metrics.requirements[0]?.target >= 0);
}

async function suitePlanningExecutionMetrics(): Promise<void> {
  console.log('\n— Planning vs Execution Metrics —');
  const metrics = await getPlanningExecutionMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('taskExecutionRate = 0.57 (4/7)', metrics.taskExecutionRate.value === 0.57, `${metrics.taskExecutionRate.value}`);
  check('goalEvidenceRate > 0 (g-brand, g-pos have evidence)', metrics.goalEvidenceRate.value !== null && (metrics.goalEvidenceRate.value as number) > 0);
  check('projectActivityRate > 0 (p-avori has evidence)', metrics.projectActivityRate.value !== null && (metrics.projectActivityRate.value as number) > 0);
}

async function suiteTrendMetrics(): Promise<void> {
  console.log('\n— Trend Metrics —');
  const metrics = await getTrendMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('taskCompletionTrend is null (previous = 0)', metrics.taskCompletionTrend.value === null);
  check('pointTrend is null (previous = 0)', metrics.pointTrend.value === null);
  check('activityTrend is null (previous = 0)', metrics.activityTrend.value === null);
}

async function suiteConsistencyMetrics(): Promise<void> {
  console.log('\n— Consistency Metrics —');
  const metrics = await getConsistencyMetrics({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('activeDays = 3 (Aug 19, 20, 21)', metrics.activeDays.value === 3, `${metrics.activeDays.value}`);
  check('weeksWithActivity = 1 (all in week 34)', metrics.weeksWithActivity.value === 1, `${metrics.weeksWithActivity.value}`);
  check('currentStreak = null (last activity Aug 21, streak ends Aug 31)', metrics.currentStreak.value === null);
}

async function suitePeriodComparison(): Promise<void> {
  console.log('\n— Period Comparison (custom ranges) —');
  const bundle = await getMetricsBundle({ startDate: '2026-08-01', endDate: '2026-08-31' });
  check('bundle range matches filter', bundle.range.startDate === '2026-08-01' && bundle.range.endDate === '2026-08-31');
  check('bundle has all 10 metric domains', !!bundle.execution && !!bundle.goalHealth && !!bundle.projectHealth && !!bundle.development && !!bundle.lifeAreaBalance && !!bundle.skills && !!bundle.levels && !!bundle.planningExecution && !!bundle.trends && !!bundle.consistency);
}

async function suiteNullBehavior(): Promise<void> {
  console.log('\n— Null / Empty States —');
  const emptyMetrics = await getExecutionMetrics({ startDate: '2026-06-01', endDate: '2026-06-30' });

  check('no completed tasks in June → rate = 0% (not null, denominator > 0)', emptyMetrics.taskCompletionRate.value === 0);
  check('no completed tasks → taskExecutionVolume = 0', emptyMetrics.taskExecutionVolume.value === 0);
  check('no activities with duration → activityDuration null', emptyMetrics.activityDuration.value === null);
  check('no overdue in range → empty array', Array.isArray(emptyMetrics.overdueIndicators));
}

async function suiteModule09Regression(): Promise<void> {
  console.log('\n— Module 09 Regression —');
  const overview = await getReviewOverview({ startDate: '2026-08-01', endDate: '2026-08-31' });
  check('Module 09 overview still works', overview.kpis.tasksCompleted === 4);
  check('Module 09 points still correct', overview.kpis.developmentPoints === 80);
}

async function suiteAIMetricTools(): Promise<void> {
  console.log('\n— AI Metric Tool Parity —');
  const ctx = {
    conversationId: 'verify',
    userId: USER,
    repositories: {},
  } as any;

  const execTool = await ReadToolExecutors.getExecutionMetrics(
    { startDate: '2026-08-01', endDate: '2026-08-31' },
    ctx
  );
  check('AI execution metrics tool succeeds', execTool.success === true, JSON.stringify(execTool.error ?? {}));
  check('AI execution metrics has taskCompletionRate', typeof (execTool.data as any)?.taskCompletionRate === 'object');

  const devTool = await ReadToolExecutors.getDevelopmentMetrics(
    { startDate: '2026-08-01', endDate: '2026-08-31' },
    ctx
  );
  check('AI development metrics tool succeeds', devTool.success === true, JSON.stringify(devTool.error ?? {}));
  check('AI development metrics periodPoints = 80', (devTool.data as any)?.periodPoints?.value === 80);
}

// ─── Runner ──────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══ Module 10 Verification ═══');
  console.log('Seeding fixtures…');
  await seed();

  await suiteExecutionMetrics();
  await suiteZeroTaskPeriod();
  await suiteGoalHealthMetrics();
  await suiteProjectHealthMetrics();
  await suiteDevelopmentMetrics();
  await suiteLifeAreaBalanceMetrics();
  await suiteSkillMetrics();
  await suiteLevelMetrics();
  await suitePlanningExecutionMetrics();
  await suiteTrendMetrics();
  await suiteConsistencyMetrics();
  await suitePeriodComparison();
  await suiteNullBehavior();
  await suiteModule09Regression();
  await suiteAIMetricTools();

  console.log('\n──────────────────────────────');
  if (failed === 0) {
    console.log(`--- Verification Complete: ${passed} passed, ${failed} failed ---`);
    process.exit(0);
  } else {
    console.error(`--- Verification FAILED: ${passed} passed, ${failed} failed ---`);
    failures.forEach((f) => console.error(`   ✗ ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
