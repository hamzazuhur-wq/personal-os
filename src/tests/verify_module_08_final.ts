import { IPracticeRepository } from '../services/contracts/IPracticeRepository';
import { IGoalRepository } from '../services/contracts/IGoalRepository';
import { PointService, GOAL_COMPLETION_POINT_AWARD } from '../services/points/pointService';
import {
  Practice,
  PointLedgerEvent,
  PointLedgerFilter,
  RecordPointEventDTO,
} from '../types/practice.types';
import { Goal } from '../types/goal.types';
import { Activity } from '../types/activity.types';
import { generateId } from '../utils/idGenerator';

// ─── In-memory fakes mirroring Dexie repository semantics ───────────────────

class FakePracticeRepo implements IPracticeRepository {
  practices = new Map<string, Practice>();
  ledger: PointLedgerEvent[] = [];

  async getPractices() {
    return Array.from(this.practices.values());
  }
  async getPractice(id: string) {
    return this.practices.get(id) || null;
  }
  async createPractice(dto: Omit<Practice, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived_at'>) {
    const now = new Date().toISOString();
    const practice: Practice = { ...dto, id: generateId(), user_id: 'test-user', created_at: now, updated_at: now };
    this.practices.set(practice.id, practice);
    return practice;
  }
  async updatePractice(id: string, dto: Partial<Practice>) {
    const existing = this.practices.get(id);
    if (!existing) throw new Error('not found');
    const updated = { ...existing, ...dto, updated_at: new Date().toISOString() };
    this.practices.set(id, updated);
    return updated;
  }
  async archivePractice(id: string) {
    return this.updatePractice(id, { status: 'archived', archived_at: new Date().toISOString() });
  }
  async deletePractice(id: string) {
    return this.practices.delete(id);
  }

  // Mirrors Dexie: dedupe only against VALID events on [source_type+source_id]
  async recordPointEvent(dto: RecordPointEventDTO) {
    if (dto.source_type && dto.source_id) {
      const existing = await this.getLedgerEventBySource(dto.source_type, dto.source_id);
      if (existing && existing.status === 'valid') return existing;
    }
    const now = new Date().toISOString();
    const event: PointLedgerEvent = {
      ...dto,
      id: generateId(),
      user_id: 'test-user',
      occurred_at: dto.occurred_at || now,
      created_at: now,
      status: 'valid',
    };
    this.ledger.push(event);
    return event;
  }
  async createAdjustment(originalEventId: string, correctionPoints: number, reason: string) {
    const original = this.ledger.find((e) => e.id === originalEventId);
    if (!original) throw new Error(`Point event ${originalEventId} not found.`);
    const now = new Date().toISOString();
    const adjustment: PointLedgerEvent = {
      id: generateId(),
      user_id: 'test-user',
      practice_id: original.practice_id,
      points: correctionPoints,
      source_type: 'adjustment',
      source_id: original.id,
      note: reason,
      status: 'valid',
      occurred_at: now,
      created_at: now,
    };
    this.ledger.push(adjustment);
    return adjustment;
  }
  async getLedgerEvents() {
    return [...this.ledger];
  }
  async getLedgerEventBySource(sourceType: PointSourceTypeAlias, sourceId: string) {
    return this.ledger.find((e) => e.source_type === sourceType && e.source_id === sourceId) || null;
  }
  async voidLedgerEventsBySource(sourceType: PointSourceTypeAlias, sourceId: string) {
    let count = 0;
    for (const ev of this.ledger) {
      if (ev.source_type === sourceType && ev.source_id === sourceId && ev.status === 'valid') {
        ev.status = 'voided'; // append-only: row retained
        count += 1;
      }
    }
    return count;
  }
  async getPracticeMetrics() {
    const valid = this.ledger.filter((e) => e.status === 'valid');
    return {
      totalPointsEarned: valid.reduce((s, e) => s + e.points, 0),
      pointsThisWeek: 0,
      pointsThisMonth: 0,
      totalCompletions: valid.length,
      pointsByLifeArea: {},
      pointsBySkill: {},
      pointsByGoal: {},
    };
  }
  async getPointsForCriteria(criteria: { life_area_id?: string; skill_id?: string; goal_id?: string }) {
    return this.ledger
      .filter((e) => e.status === 'valid')
      .filter((e) => (!criteria.life_area_id || e.life_area_id === criteria.life_area_id))
      .filter((e) => (!criteria.skill_id || e.skill_id === criteria.skill_id))
      .filter((e) => (!criteria.goal_id || e.goal_id === criteria.goal_id))
      .reduce((s, e) => s + e.points, 0);
  }

  private applyLedgerFilters(filter?: PointLedgerFilter) {
    return this.ledger
      .filter((e) => e.status === 'valid')
      .filter((e) => !filter?.life_area_id || e.life_area_id === filter.life_area_id)
      .filter((e) => !filter?.skill_id || e.skill_id === filter.skill_id)
      .filter((e) => !filter?.goal_id || e.goal_id === filter.goal_id)
      .filter((e) => !filter?.project_id || e.project_id === filter.project_id)
      .filter((e) => !filter?.task_id || e.task_id === filter.task_id)
      .filter((e) => !filter?.activity_id || e.activity_id === filter.activity_id)
      .filter((e) => !filter?.practice_id || e.practice_id === filter.practice_id)
      .filter(
        (e) =>
          !filter?.source_type ||
          (Array.isArray(filter.source_type)
            ? filter.source_type.includes(e.source_type)
            : filter.source_type === e.source_type)
      )
      .filter((e) => {
        if (filter?.startDate && e.occurred_at < filter.startDate) return false;
        if (filter?.endDate) {
          const end = new Date(new Date(filter.endDate).setHours(23, 59, 59, 999));
          if (new Date(e.occurred_at) > end) return false;
        }
        return true;
      });
  }

  async sumValidPoints(filter?: PointLedgerFilter) {
    return this.applyLedgerFilters(filter).reduce((s, e) => s + e.points, 0);
  }

  async getRecentPointEvents(filter?: PointLedgerFilter, limit: number = 20) {
    return this.applyLedgerFilters(filter)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, limit);
  }
}

type PointSourceTypeAlias = PointLedgerEvent['source_type'];

class FakeGoalRepo implements Pick<IGoalRepository, 'getGoal' | 'getGoalDescendants'> {
  goals = new Map<string, Goal>();

  async getGoal(id: string) {
    return this.goals.get(id) || null;
  }
  async getGoalDescendants(goalId: string): Promise<Goal[]> {
    const out: Goal[] = [];
    const walk = (parentId: string) => {
      for (const g of this.goals.values()) {
        if (g.parent_goal_id === parentId) {
          out.push(g);
          walk(g.id);
        }
      }
    };
    walk(goalId);
    return out;
  }
}

const asGoalRepo = (fake: FakeGoalRepo) => fake as unknown as IGoalRepository;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date();
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 3600 * 1000).toISOString();

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: generateId(),
  user_id: 'test-user',
  title: 'Test goal',
  status: 'completed',
  goal_type: 'development',
  time_horizon: 'monthly',
  priority: 'medium',
  life_area_id: 'la-fitness',
  completed_at: NOW.toISOString(),
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
  ...overrides,
});

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: generateId(),
  date: '2026-08-22',
  title: 'Test activity',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ─── Assertions ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const assert = (label: string, condition: boolean) => {
  if (condition) {
    passed += 1;
    console.log(`✓ PASS: ${label}`);
  } else {
    failed += 1;
    console.error(`✗ FAIL: ${label}`);
  }
};

async function main() {
  console.log('--- Module 08 Final Runtime Verification: Independent Development Points ---');

  // ═══ Flow A: Manual entry primitive ═══
  {
    const repo = new FakePracticeRepo();
    const service = new PointService(repo);

    // A1: Life Area attribution is mandatory.
    let threwNoArea = false;
    try {
      await service.recordDevelopmentPointEvent({ points: 5, reason: 'no area', lifeAreaId: '' });
    } catch {
      threwNoArea = true;
    }
    assert('A1: Missing Life Area rejected', threwNoArea);

    // A2: Points must be positive whole numbers.
    for (const bad of [0, -3, 2.5, Number.NaN]) {
      let threw = false;
      try {
        await service.recordDevelopmentPointEvent({ points: bad, reason: 'bad points', lifeAreaId: 'la-a' });
      } catch {
        threw = true;
      }
      assert(`A2: points=${bad} rejected`, threw);
    }

    // A3: A human-readable reason is required.
    let threwNoReason = false;
    try {
      await service.recordDevelopmentPointEvent({ points: 5, reason: '   ', lifeAreaId: 'la-a' });
    } catch {
      threwNoReason = true;
    }
    assert('A3: Blank reason rejected', threwNoReason);
    assert('A3b: Ledger untouched by invalid calls', repo.ledger.length === 0);

    // A4: Valid entry records exactly what was entered with full attribution.
    const ev = await service.recordDevelopmentPointEvent({
      points: 7,
      reason: '  Deep focus session  ',
      lifeAreaId: 'la-career',
      skillId: 'skill-ts',
      projectId: 'proj-1',
      taskId: 'task-1',
      activityId: 'act-1',
      levelId: 'level-2',
      note: 'note-x',
      evidenceUrl: 'https://evidence.test/x',
      occurredAt: daysAgo(40), // old on purpose — window tests below
    });
    assert('A4: Event stored as manual_award', ev.source_type === 'manual_award');
    assert('A4b: Reason trimmed and persisted', ev.reason === 'Deep focus session');
    assert('A4c: Life Area snapshot present', ev.life_area_id === 'la-career');
    assert('A4d: occurredAt honored (not overwritten)', ev.occurred_at === daysAgo(40));
    assert('A4e: All attribution ids snapshotted', ev.project_id === 'proj-1' && ev.task_id === 'task-1' && ev.activity_id === 'act-1' && ev.level_id === 'level-2');

    // A5: Explicit sourceId dedupes; absent sourceId creates distinct events.
    const dup = await service.recordDevelopmentPointEvent({
      points: 7,
      reason: 'same key retry',
      lifeAreaId: 'la-career',
      sourceId: ev.source_id,
    });
    assert('A5: Same explicit sourceId returns SAME event', dup.id === ev.id);
    const unique1 = await service.recordDevelopmentPointEvent({ points: 1, reason: 'auto key', lifeAreaId: 'la-career' });
    const unique2 = await service.recordDevelopmentPointEvent({ points: 1, reason: 'auto key', lifeAreaId: 'la-career' });
    assert('A5b: Auto-keyed entries are DISTINCT events', unique1.id !== unique2.id);
  }

  // ═══ Flow B: Goal completion awards (exactly once, voidable) ═══
  {
    const repo = new FakePracticeRepo();
    const goalRepo = new FakeGoalRepo();
    const service = new PointService(repo, asGoalRepo(goalRepo));

    // B1: Non-completed goal never awards.
    const draft = makeGoal({ status: 'active' });
    assert('B1: Active goal → null award', (await service.awardOnGoalCompletion(draft)) === null);
    assert('B1b: Ledger unchanged', repo.ledger.length === 0);

    // B2: Goal WITHOUT Life Area never awards.
    const noArea = makeGoal({ life_area_id: undefined });
    assert('B2: Goal without life_area_id → null award', (await service.awardOnGoalCompletion(noArea)) === null);
    assert('B2b: Ledger still empty', repo.ledger.length === 0);

    // B3: Parent completion awards GOAL_COMPLETION_POINT_AWARD exactly once.
    const parent = makeGoal({ project_id: 'proj-p', level_id: 'lvl-1' });
    const first = await service.awardOnGoalCompletion(parent);
    assert('B3: Completion awards event', first !== null);
    assert('B3b: Award equals GOAL_COMPLETION_POINT_AWARD', first?.points === GOAL_COMPLETION_POINT_AWARD && GOAL_COMPLETION_POINT_AWARD === 10);
    assert('B3c: Keyed (goal, goalId)', first?.source_type === 'goal' && first?.source_id === parent.id);
    assert('B3d: Project + level snapshots preserved', first?.project_id === 'proj-p' && first?.level_id === 'lvl-1');
    const repeat = await service.awardOnGoalCompletion(parent);
    assert('B3e: Repeat completion returns SAME event', repeat?.id === first?.id);
    assert('B3f: Exactly one valid event', repo.ledger.filter((e) => e.status === 'valid').length === 1);

    // B4: Sub-goal pays under its own key alongside the parent.
    const sub = makeGoal({ parent_goal_id: parent.id, life_area_id: 'la-fitness' });
    const subAward = await service.awardOnGoalCompletion(sub);
    assert('B4: Sub-goal keyed (sub_goal, subId)', subAward?.source_type === 'sub_goal' && subAward?.source_id === sub.id);
    assert('B4b: Parent + sub both valid (2 events)', repo.ledger.filter((e) => e.status === 'valid').length === 2);

    // B5: Revoke (reopen) voids BOTH keys; rows retained; re-complete re-awards.
    const revoked = await service.revokeGoalCompletion(sub.id);
    assert('B5: Revoke voids exactly one event', revoked === 1);
    assert('B5b: Sub event retained as voided row', repo.ledger.some((e) => e.source_type === 'sub_goal' && e.source_id === sub.id && e.status === 'voided'));
    assert('B5c: Revoke is idempotent (second call → 0)', (await service.revokeGoalCompletion(sub.id)) === 0);
    const reAward = await service.awardOnGoalCompletion(sub);
    assert('B5d: Re-completion creates FRESH valid award', reAward !== null && reAward.status === 'valid' && reAward.id !== subAward?.id);
  }

  // ═══ Flow C: Query services & attribution scoping ═══
  {
    const repo = new FakePracticeRepo();
    const goalRepo = new FakeGoalRepo();
    const parent = makeGoal({ title: 'Parent', life_area_id: 'la-fitness' });
    const childA = makeGoal({ title: 'Child A', parent_goal_id: parent.id, life_area_id: 'la-fitness' });
    const grandchild = makeGoal({ title: 'Grandchild', parent_goal_id: childA.id, life_area_id: 'la-fitness' });
    goalRepo.goals.set(parent.id, parent);
    goalRepo.goals.set(childA.id, childA);
    goalRepo.goals.set(grandchild.id, grandchild);
    const service = new PointService(repo, asGoalRepo(goalRepo));

    // Seed: parent direct=5, child direct=7, grandchild direct=3, other-area=9.
    await service.recordDevelopmentPointEvent({ points: 5, reason: 'parent work', lifeAreaId: 'la-fitness', goalId: parent.id });
    await service.recordDevelopmentPointEvent({ points: 7, reason: 'child work', lifeAreaId: 'la-fitness', goalId: childA.id });
    await service.recordDevelopmentPointEvent({
      points: 3, reason: 'old grandchild work', lifeAreaId: 'la-fitness', goalId: grandchild.id,
      occurredAt: daysAgo(45),
    });
    await service.recordDevelopmentPointEvent({ points: 9, reason: 'unrelated', lifeAreaId: 'la-mind' });

    // C1: Life Area summary totals + rolling windows.
    const fitSummary = await service.getLifeAreaPointSummary('la-fitness');
    assert('C1: Area total sums only its own events', fitSummary.total === 15);
    assert('C1b: thisWeek includes recent events', fitSummary.thisWeek === 12); // 5 + 7 (grandchild event is 45d old)
    assert('C1c: thisMonth excludes 45-day-old event', fitSummary.thisMonth === 12);
    const mindSummary = await service.getLifeAreaPointSummary('la-mind');
    assert('C1d: Other area isolated (total 9)', mindSummary.total === 9 && mindSummary.thisWeek === 9);

    // C2: Goal summary — direct vs descendant subtree.
    const parentSummary = await service.getGoalPointsSummary(parent.id);
    assert('C2: Direct = own events only', parentSummary.direct === 5);
    assert('C2b: Subtree includes child + grandchild across depth', parentSummary.subtree === 15);
    const leafSummary = await service.getGoalPointsSummary(grandchild.id);
    assert('C2c: Leaf subtree equals its direct', leafSummary.direct === 3 && leafSummary.subtree === 3);

    // C3: Entity-scoped queries never leak across dimensions.
    await service.recordDevelopmentPointEvent({ points: 4, reason: 'proj task act skill', lifeAreaId: 'la-fitness', projectId: 'proj-q', taskId: 'task-q', activityId: 'act-q', skillId: 'skill-q' });
    assert('C3a: getProjectPoints scoped', (await service.getProjectPoints('proj-q')) === 4);
    assert('C3b: getTaskPoints scoped', (await service.getTaskPoints('task-q')) === 4);
    assert('C3c: getActivityPoints scoped', (await service.getActivityPoints('act-q')) === 4);
    assert('C3d: getSkillPoints scoped', (await service.getSkillPoints('skill-q')) === 4);
    assert('C3e: Unknown entity → 0', (await service.getProjectPoints('proj-none')) === 0);

    // C4: Level requirement progress respects its scope filters.
    const progress = await service.getLevelRequirementProgress({
      id: 'req-1', level_id: 'lvl-1', type: 'development_points', target_points: 100,
      points_life_area_id: 'la-fitness', created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
    } as any);
    assert('C4: Scoped requirement progress counts only its area', progress.current === 19 && progress.target === 100);
    const wrongArea = await service.getLevelRequirementProgress({
      id: 'req-2', level_id: 'lvl-1', type: 'development_points', target_points: 10,
      points_life_area_id: 'la-nowhere', created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
    } as any);
    assert('C4b: Empty scope yields current=0', wrongArea.current === 0);

    // C5: Period breakdown splits per Life Area within a window.
    const weekBreakdown = await service.getPeriodPointBreakdown(['la-fitness', 'la-mind'], daysAgo(7));
    assert('C5: Breakdown totals per area in window', weekBreakdown.byLifeArea['la-fitness'] === 16 && weekBreakdown.byLifeArea['la-mind'] === 9);
    assert('C5b: Window total = 25', weekBreakdown.total === 25);
    const allTime = await service.getPeriodPointBreakdown(['la-fitness']);
    assert('C5c: Unbounded window reaches all history', allTime.total === 19);

    // C6: Recent events feed is bounded and newest-first, honoring filters.
    const recentAll = await service.getRecentEvents(undefined, 3);
    assert('C6a: Limit respected', recentAll.length === 3);
    const times = recentAll.map((e) => e.occurred_at);
    assert('C6b: Newest first ordering', times.every((t, i) => i === 0 || t <= times[i - 1]));
    const recentGoalOnly = await service.getRecentEvents({ goal_id: childA.id }, 20);
    assert('C6c: goal_id filter isolates subtree member events', recentGoalOnly.length >= 1 && recentGoalOnly.every((e) => e.goal_id === childA.id));
    const manualOnly = await service.getRecentEvents({ source_type: ['manual_award', 'goal', 'sub_goal'] }, 50);
    assert('C6d: source_type array filter works', manualOnly.length > 0 && manualOnly.every((e) => ['manual_award', 'goal', 'sub_goal'].includes(e.source_type)));
  }

  // ═══ Flow D: Activity award stamps Life Area (Daily Log tie-in) ═══
  {
    const repo = new FakePracticeRepo();
    const service = new PointService(repo);
    const barePractice = await repo.createPractice({
      title: 'Practice without area default',
      point_value: 6,
      status: 'active',
      repeatable: true,
      evidence_required: false,
    });

    // D1: Activity's related_life_area_id wins over a practice without a default.
    const tagged = makeActivity({
      related_practice_id: barePractice.id,
      related_life_area_id: 'la-explicit',
      related_task_id: 'task-linked',
    });
    const award1 = await service.awardForActivity({ activity: tagged });
    assert('D1: Activity area snapshot wins', award1?.life_area_id === 'la-explicit');
    assert('D1b: related_task_id passthrough', award1?.task_id === 'task-linked');

    // D2: Falls back to practice.life_area_id when the activity has none.
    const fallbackPractice = await repo.createPractice({
      title: 'Practice WITH area default',
      point_value: 6,
      status: 'active',
      repeatable: true,
      evidence_required: false,
      life_area_id: 'la-practice-default',
    });
    const plainActivity = makeActivity({ related_practice_id: fallbackPractice.id });
    const award2 = await service.awardForActivity({ activity: plainActivity });
    assert('D2: Falls back to practice default area', award2?.life_area_id === 'la-practice-default');

    // D3: Manual development entry on an activity does not collide with its practice award.
    await service.recordDevelopmentPointEvent({
      points: 2, reason: 'extra effort bonus', lifeAreaId: 'la-explicit',
      activityId: tagged.id,
    });
    assert('D3: Practice award unaffected by later manual entry', (await service.getActivityPoints(tagged.id)) === 8); // 6 practice + 2 manual
  }

  console.log(`--- Verification Complete: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
