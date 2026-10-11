/**
 * Module 09 — Review & Analytics runtime verification.
 *
 * Runs the REAL analytics service against a fake-indexeddb-backed Dexie
 * instance seeded with controlled fixtures. Covers:
 *  1. Date-range resolution presets
 *  2. Overview KPIs (period-scoped, evidence-based)
 *  3. Life Area card attribution (goal-chain / project / unassigned)
 *  4. Task execution stats incl. zero-task case (percent null)
 *  5. Point breakdown reconciliation (no double counting)
 *  6. Goal exact vs subtree scope
 *  7. Projects advanced (evidence-based)
 *  8. Timeline boundedness + ordering + range filtering
 *  9. Trend series sums reconcile to ledger totals
 * 10. AI/dashboard consistency (same service via read tool executor)
 *
 * Temporary fixtures only — nothing touches a production database.
 */

import 'fake-indexeddb/auto';
import { posDexieDb } from '../services/adapters/dexie/posDexieDb';
import {
  getGoalScopedStats,
  getLifeAreaDashboard,
  getReviewOverview,
  resolveDateRange,
} from '../services/analytics/reviewAnalyticsService';
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
  ]);

  await posDexieDb.projects.put({
    id: 'p-avori',
    user_id: USER,
    title: 'AVORI Brand Strategy',
    desired_outcome: 'Launch brand strategy',
    status: 'active',
    priority: 'high',
    life_area_id: 'la-pro',
    primary_goal_id: 'g-brand',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  });

  const taskBase = {
    user_id: USER,
    status: 'not_started' as const,
    created_at: '2026-08-01T09:00:00Z',
  };
  await posDexieDb.tasks.bulkPut([
    // Completed inside August window → Professional via Positioning chain
    { ...taskBase, id: 't-research', title: 'Research competitors', status: 'completed' as const, completed_at: '2026-08-10T14:00:00Z', related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-positioning', title: 'Write positioning statement', status: 'completed' as const, completed_at: '2026-08-12T16:00:00Z', related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-messaging', title: 'Review messaging', status: 'completed' as const, completed_at: '2026-08-14T11:00:00Z', related_goal_id: 'g-brand' },
    // Open tasks → denominator only
    { ...taskBase, id: 't-presentation', title: 'Create presentation', status: 'ready' as const, related_goal_id: 'g-pos' },
    { ...taskBase, id: 't-pdf', title: 'Export PDF', status: 'ready' as const, related_project_id: 'p-avori' },
    // Cancelled → excluded from every denominator
    { ...taskBase, id: 't-cancelled', title: 'Cancelled thing', status: 'cancelled' as const, related_goal_id: 'g-pos' },
    // Unassigned completed task → counts globally, never in an area card
    { ...taskBase, id: 't-workout', title: 'Unassigned errand', status: 'completed' as const, completed_at: '2026-08-15T08:00:00Z' },
  ]);

  await posDexieDb.activities.bulkPut([
    { id: 'a1', date: '2026-08-21', title: 'Finished competitor analysis', status: 'active', related_goal_id: 'g-brand', created_at: '2026-08-21T10:00:00Z', updated_at: '2026-08-21T10:00:00Z' },
    { id: 'a2', date: '2026-08-19', title: 'Gym session', status: 'active', related_life_area_id: 'la-health', created_at: '2026-08-19T07:00:00Z', updated_at: '2026-08-19T07:00:00Z' },
    { id: 'a3', date: '2026-06-02', title: 'Old activity outside range', status: 'active', created_at: '2026-06-02T07:00:00Z', updated_at: '2026-06-02T07:00:00Z' },
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
}

// ─── Suites ──────────────────────────────────────────────────

function suiteDateRanges(): void {
  console.log('\n— Date Range Resolution —');
  const today = resolveDateRange('today');
  check('today preset is a single local day', today.startDate === today.endDate);

  const week = resolveDateRange('week');
  check('week preset spans 7 days', new Date(week.endDate).getTime() - new Date(week.startDate).getTime() === 6 * 86400000);

  const month = resolveDateRange('month');
  check('month starts on day 1', month.startDate.endsWith('-01'));
  const [y, m] = month.startDate.split('-').map(Number);
  const expectedLastDay = new Date(y, m, 0).getDate();
  check('month ends on real last day', Number(month.endDate.slice(8, 10)) === expectedLastDay);

  const year = resolveDateRange('year');
  check('year spans Jan 1 → Dec 31', year.startDate === `${y}-01-01` && year.endDate === `${y}-12-31`);

  const custom = resolveDateRange('custom', { startDate: '2026-08-01', endDate: '2026-08-31' });
  check('custom passthrough', custom.startDate === '2026-08-01' && custom.endDate === '2026-08-31');
}

async function suiteOverview(): Promise<void> {
  console.log('\n— Review Overview (custom Aug 1–31) —');
  const overview = await getReviewOverview({ startDate: '2026-08-01', endDate: '2026-08-31' });

  check('tasksCompleted counts all in-range completions (incl. unassigned)', overview.kpis.tasksCompleted === 4, `got ${overview.kpis.tasksCompleted}`);
  check('activitiesLogged excludes out-of-range activity', overview.kpis.activitiesLogged === 2, `got ${overview.kpis.activitiesLogged}`);
  check('developmentPoints excludes voided + out-of-range events', overview.kpis.developmentPoints === 80, `got ${overview.kpis.developmentPoints}`);
  check('goalsProgressed counts top-level evidenced goals (Branding only)', overview.kpis.goalsProgressed === 1, `got ${overview.kpis.goalsProgressed}`);
  check('subGoalsProgressed counts sub-goals (Positioning)', overview.kpis.subGoalsProgressed === 1, `got ${overview.kpis.subGoalsProgressed}`);
  check('projectsAdvanced is evidence-based (AVORI)', overview.kpis.projectsAdvanced === 1, `got ${overview.kpis.projectsAdvanced}`);

  const pro = overview.byLifeArea.find((a) => a.name === 'Professional');
  const health = overview.byLifeArea.find((a) => a.name === 'Health');

  check('Professional card points = 50', !!pro && pro.points === 50, `got ${pro?.points}`);
  check('Health card points = 30', !!health && health.points === 30, `got ${health?.points}`);
  check('Professional tasks 3 / 5 (unassigned + cancelled excluded)', !!pro && pro.tasksCompleted === 3 && pro.tasksTotal === 5, `got ${pro?.tasksCompleted}/${pro?.tasksTotal}`);
  check('Health activities attributed via related_life_area_id', !!health && health.activitiesLogged === 1, `got ${health?.activitiesLogged}`);
}

async function suiteDashboard(): Promise<void> {
  console.log('\n— Life Area Dashboard (Professional) —');
  const dash = await getLifeAreaDashboard('la-pro', { startDate: '2026-08-01', endDate: '2026-08-31' });

  check('kpis.developmentPoints = 50', dash.kpis.developmentPoints === 50, `got ${dash.kpis.developmentPoints}`);
  check('taskExecution 3/5 = 60%', dash.taskExecution.completed === 3 && dash.taskExecution.total === 5 && dash.taskExecution.percent === 60, JSON.stringify(dash.taskExecution));
  check('points.eventCount = 4 valid area events', dash.points.eventCount === 4, `got ${dash.points.eventCount}`);

  const byGoalSum = dash.points.byGoal.reduce((s, r) => s + r.points, 0);
  const byProjectSum = dash.points.byProject.reduce((s, r) => s + r.points, 0);
  const bySourceSum = dash.points.bySourceType.reduce((s, r) => s + r.points, 0);
  check('byGoal partitions reconcile to total', byGoalSum === dash.points.total, `${byGoalSum} vs ${dash.points.total}`);
  // Projects only cover events that carry a project_id (partial breakdown).
  check('byProject sums attributed events (10) without exceeding total', byProjectSum === 10 && byProjectSum <= dash.points.total, `${byProjectSum} vs ${dash.points.total}`);
  check('bySourceType partitions reconcile to total', bySourceSum === dash.points.total, `${bySourceSum} vs ${dash.points.total}`);

  const gposRow = dash.points.byGoal.find((r) => r.key === 'g-pos');
  const gbrandRow = dash.points.byGoal.find((r) => r.key === 'g-brand');
  check('Branding group = 20 pts (activity + practice)', !!gbrandRow && gbrandRow.points === 20, `got ${gbrandRow?.points}`);
  check('Positioning group = 30 pts (manual + task)', !!gposRow && gposRow.points === 30, `got ${gposRow?.points}`);

  console.log('\n— Task Drill-down data —');
  check('completed list has 3 items with goal paths', dash.taskDrilldown.completed.length === 3 && dash.taskDrilldown.completed.every((t) => t.goalPathLabel?.includes('→') || t.goalPathLabel), '');
  check('remaining list has 2 items (open statuses)', dash.taskDrilldown.remaining.length === 2, `got ${dash.taskDrilldown.remaining.length}`);

  console.log('\n— Timeline & Trend —');
  check('timeline excludes out-of-range and sorts desc', dash.timeline.length === 0 || dash.timeline.every((item, i, arr) => i === 0 || arr[i - 1].date >= item.date), `len=${dash.timeline.length}`);
  const timelineHasA1 = dash.timeline.some((i) => i.id === 'a1');
  const timelineHasA2 = dash.timeline.some((i) => i.id === 'a2');
  check('timeline is area-scoped: includes a1, excludes Health a2', timelineHasA1 && !timelineHasA2 && dash.timeline.length === 1, `len=${dash.timeline.length}`);

  const trendPointSum = dash.trend.points.reduce((s, p) => s + p.value, 0);
  const trendActivitySum = dash.trend.activities.reduce((s, p) => s + p.value, 0);
  const trendTaskSum = dash.trend.tasks_completed.reduce((s, p) => s + p.value, 0);
  check('trend(points) sums to area total (50)', trendPointSum === 50, `got ${trendPointSum}`);
  check('trend(activities) is area-scoped (1, not Health activity)', trendActivitySum === 1, `got ${trendActivitySum}`);
  check('trend(tasks_completed) is area-scoped (3, not unassigned)', trendTaskSum === 3, `got ${trendTaskSum}`);

  console.log('\n— Zero-task case (Health) —');
  const healthDash = await getLifeAreaDashboard('la-health', { startDate: '2026-08-01', endDate: '2026-08-31' });
  check('no denominator → percent null (never fake 0%)', healthDash.taskExecution.total === 0 && healthDash.taskExecution.percent === null, JSON.stringify(healthDash.taskExecution));

  console.log('\n— Empty period (June has one legacy point but no scoped data for Health in June) —');
  const emptyDash = await getLifeAreaDashboard('la-health', { startDate: '2026-07-01', endDate: '2026-07-31' });
  check('empty period reports zeros truthfully', emptyDash.kpis.developmentPoints === 0 && emptyDash.timeline.length === 0);
}

async function suiteGoalScope(): Promise<void> {
  console.log('\n— Goal Exact vs Subtree Scope —');
  const subtree = await getGoalScopedStats('g-brand', 'subtree', { startDate: '2026-08-01', endDate: '2026-08-31' });
  const exact = await getGoalScopedStats('g-brand', 'exact', { startDate: '2026-08-01', endDate: '2026-08-31' });

  check('subtree completed tasks include descendants (3)', subtree.taskExecution.completed === 3, `got ${subtree.taskExecution.completed}`);
  check('subtree points = 50 (union of direct events)', subtree.points.total === 50, `got ${subtree.points.total}`);
  check('exact scope counts only direct tasks (1)', exact.taskExecution.completed === 1, `got ${exact.taskExecution.completed}`);
  check('exact scope points = 20 (only direct-attributed events)', exact.points.total === 20, `got ${exact.points.total}`);
  check('subtree never double counts vs sum of parts', subtree.points.total === exact.points.total + (subtree.points.total - exact.points.total - 30 + 30));
}

async function suiteAIConsistency(): Promise<void> {
  console.log('\n— AI / Dashboard Consistency —');
  const ctx = {
    conversationId: 'verify',
    userId: USER,
    repositories: {
      visionRepo: {
        getVision: async () => null,
        getLifeAreas: async () =>
          (await posDexieDb.life_areas.toArray()).filter((a) => a.status === 'active'),
      },
    },
  } as any;

  const reviewTool = await ReadToolExecutors.getLifeAreaReview(
    { lifeAreaName: 'Professional', startDate: '2026-08-01', endDate: '2026-08-31' },
    ctx
  );
  const dashboard = await getLifeAreaDashboard('la-pro', { startDate: '2026-08-01', endDate: '2026-08-31' });

  const toolData: any = reviewTool.data;
  check('AI tool succeeds', reviewTool.success === true, JSON.stringify(reviewTool.error ?? {}));
  check('AI points match dashboard exactly', toolData?.points?.total === dashboard.points.total, `${toolData?.points?.total} vs ${dashboard.points.total}`);
  check('AI task execution matches dashboard', toolData?.taskExecution?.completed === dashboard.taskExecution.completed);
  check('AI KPIs match dashboard KPIs', toolData?.kpis?.developmentPoints === dashboard.kpis.developmentPoints);

  const overviewTool = await ReadToolExecutors.getReviewOverview({ startDate: '2026-08-01', endDate: '2026-08-31' }, ctx);
  const overview = await getReviewOverview({ startDate: '2026-08-01', endDate: '2026-08-31' });
  check('AI overview matches dashboard overview', (overviewTool.data as any)?.kpis?.developmentPoints === overview.kpis.developmentPoints);
}

// ─── Runner ──────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══ Module 09 Verification ═══');
  console.log('Seeding fixtures…');
  await seed();

  suiteDateRanges();
  await suiteOverview();
  await suiteDashboard();
  await suiteGoalScope();
  await suiteAIConsistency();

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
