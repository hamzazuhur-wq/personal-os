import { IPracticeRepository } from '../services/contracts/IPracticeRepository';
import { PointService } from '../services/points/pointService';
import {
  Practice,
  PointLedgerEvent,
  PointLedgerFilter,
  PointSourceType,
  RecordPointEventDTO,
} from '../types/practice.types';
import { Task } from '../types/task.types';
import { Activity } from '../types/activity.types';
import { generateId } from '../utils/idGenerator';

// ─── In-memory fake mirroring DexiePracticeRepository ledger semantics ──────

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
  async getLedgerEventBySource(sourceType: PointSourceType, sourceId: string) {
    return this.ledger.find((e) => e.source_type === sourceType && e.source_id === sourceId) || null;
  }
  async voidLedgerEventsBySource(sourceType: PointSourceType, sourceId: string) {
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: generateId(),
  title: 'Test task',
  status: 'completed',
  created_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
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
  console.log('--- Module 08.2 Runtime Verification: Centralized Point Service ---');

  // ═══ Flow A: Task completion awards ─══
  {
    const repo = new FakePracticeRepo();
    const service = new PointService(repo);
    const practice = await repo.createPractice({
      title: 'Deep Work Practice',
      point_value: 10,
      status: 'active',
      repeatable: true,
      evidence_required: false,
      life_area_id: 'la-career',
      skill_id: 'skill-coding',
      goal_id: 'goal-practice-default',
      project_id: 'proj-practice-default',
    });

    // A1: Task WITHOUT a linked practice never awards points.
    const plainTask = makeTask({ related_practice_id: undefined });
    const noAward = await service.awardForTaskCompletion({ task: plainTask });
    assert('A1: Task without practice → null award', noAward === null);
    assert('A1b: Ledger unchanged for non-practice task', repo.ledger.length === 0);

    // A2: Task WITH a linked practice awards exactly once, task links override defaults.
    const linkedTask = makeTask({
      related_practice_id: practice.id,
      related_goal_id: 'goal-nested-leaf',
      related_project_id: 'proj-execution',
    });
    const first = await service.awardForTaskCompletion({ task: linkedTask });
    assert('A2: First completion awards event', first !== null);
    assert('A2b: Points equal practice.point_value', first?.points === 10);
    assert('A2c: Source key is (task_completion, taskId)', first?.source_type === 'task_completion' && first?.source_id === linkedTask.id);
    assert('A2d: Snapshot uses TASK goal over practice default', first?.goal_id === 'goal-nested-leaf');
    assert('A2e: Snapshot uses TASK project over practice default', first?.project_id === 'proj-execution');
    assert('A2f: life_area snapshot from practice', first?.life_area_id === 'la-career');

    // A3: Repeated completion of the same task cannot duplicate the award.
    const second = await service.awardForTaskCompletion({ task: linkedTask });
    assert('A3: Repeat completion returns SAME event', second?.id === first?.id);
    assert('A3b: Still exactly ONE valid event in ledger', repo.ledger.filter((e) => e.status === 'valid').length === 1);
    assert('A3c: hasValidAward confirms single award', (await service.hasValidAward('task_completion', linkedTask.id)) === true);

    // A4: Un-completion revokes the award (voided row preserved).
    const voidedCount = await service.revokeTaskCompletion(linkedTask.id);
    assert('A4: Revoke voids exactly one event', voidedCount === 1);
    assert('A4b: Zero valid events after revoke', repo.ledger.filter((e) => e.status === 'valid').length === 0);
    assert('A4c: Voided audit row still present', repo.ledger.some((e) => e.source_type === 'task_completion' && e.source_id === linkedTask.id && e.status === 'voided'));

    // A5: Re-completion creates a fresh valid award.
    const reAward = await service.awardForTaskCompletion({ task: linkedTask });
    assert('A5: Re-completion awards fresh valid event', reAward !== null && reAward.status === 'valid');
    assert('A5b: Exactly one valid event again', repo.ledger.filter((e) => e.status === 'valid').length === 1);
  }

  // ═══ Flow B: Activity logging awards ─══
  {
    const repo = new FakePracticeRepo();
    const service = new PointService(repo);
    const practice = await repo.createPractice({
      title: 'Daily Reading',
      point_value: 5,
      status: 'active',
      repeatable: true,
      evidence_required: false,
      goal_id: 'goal-default',
    });

    // B1: Activity WITHOUT a linked practice never awards points.
    const plainActivity = makeActivity();
    const noAward = await service.awardForActivity({ activity: plainActivity });
    assert('B1: Activity without practice → null award', noAward === null);
    assert('B1b: Ledger unchanged for non-practice activity', repo.ledger.length === 0);

    // B2: Activity WITH a practice awards once; duplicates collapse to same event.
    const linkedActivity = makeActivity({
      related_practice_id: practice.id,
      related_goal_id: 'goal-activity-override',
    });
    const first = await service.awardForActivity({ activity: linkedActivity });
    assert('B2: First log awards event', first !== null);
    assert('B2b: Points equal practice.point_value', first?.points === 5);
    assert('B2c: Source key is (activity_completion, activityId)', first?.source_type === 'activity_completion' && first?.source_id === linkedActivity.id);
    assert('B2d: ACTIVITY goal override wins in snapshot', first?.goal_id === 'goal-activity-override');
    const dup = await service.awardForActivity({ activity: linkedActivity });
    assert('B2e: Duplicate log returns SAME event', dup?.id === first?.id);
    assert('B2f: Exactly one valid event', repo.ledger.filter((e) => e.status === 'valid').length === 1);

    // Task-linked activity and task completion describe the same real-world
    // event, regardless of which entry point records it first.
    const sharedTask = makeTask({ related_practice_id: practice.id });
    const taskActivity = makeActivity({
      related_practice_id: practice.id,
      related_task_id: sharedTask.id,
    });
    const activityFirst = await service.awardForActivity({ activity: taskActivity });
    const taskSecond = await service.awardForTaskCompletion({ task: sharedTask });
    assert('B3: Activity-first shares task completion idempotency key', activityFirst?.id === taskSecond?.id);
    assert('B3b: Activity-first + task completion award only once', repo.ledger.filter((e) => e.status === 'valid').length === 2);

    const reverseTask = makeTask({ related_practice_id: practice.id });
    const reverseActivity = makeActivity({ related_practice_id: practice.id, related_task_id: reverseTask.id });
    const taskFirst = await service.awardForTaskCompletion({ task: reverseTask });
    const activitySecond = await service.awardForActivity({ activity: reverseActivity });
    assert('B4: Task-first shares activity idempotency key', taskFirst?.id === activitySecond?.id);
    assert('B4b: Both event orders leave one award per task', repo.ledger.filter((e) => e.status === 'valid').length === 3);
  }

  // ═══ Flow C: Manual practice logging rules ─══
  {
    const repo = new FakePracticeRepo();
    const service = new PointService(repo);
    const repeatable = await repo.createPractice({
      title: 'Meditation',
      point_value: 3,
      status: 'active',
      repeatable: true,
      evidence_required: false,
    });
    const oneTime = await repo.createPractice({
      title: 'Complete Certification',
      point_value: 50,
      status: 'active',
      repeatable: false,
      evidence_required: false,
    });

    // C1: Repeatable standalone logs each create their own unique award.
    const log1 = await service.awardForPracticeLog({ practice: repeatable });
    const log2 = await service.awardForPracticeLog({ practice: repeatable });
    assert('C1: Two repeatable logs → distinct events', log1.id !== log2.id);
    assert('C1b: Both valid, two events total', repo.ledger.filter((e) => e.status === 'valid').length === 2);

    // C2: Non-repeatable standalone practice can never be logged twice.
    const once1 = await service.awardForPracticeLog({ practice: oneTime });
    const once2 = await service.awardForPracticeLog({ practice: oneTime });
    assert('C2: Second non-repeatable log returns ORIGINAL event', once2.id === once1.id);
    assert('C2b: Only ONE valid event for the practice', repo.ledger.filter((e) => e.practice_id === oneTime.id && e.status === 'valid').length === 1);
    assert('C2c: Keyed to practice itself', once1.source_type === 'practice_completion' && once1.source_id === oneTime.id);

    // C3: Manual log referencing a task dedupes against the automatic award.
    const repoD = new FakePracticeRepo();
    const serviceD = new PointService(repoD);
    const practiceD = await repoD.createPractice({
      title: 'Linked Practice',
      point_value: 8,
      status: 'active',
      repeatable: true,
      evidence_required: false,
    });
    const task = makeTask({ related_practice_id: practiceD.id });
    const autoAward = await serviceD.awardForTaskCompletion({ task });
    const manualAttempt = await serviceD.awardForPracticeLog({ practice: practiceD, taskId: task.id });
    assert('C3: Manual log keyed to task returns AUTO award (no double pay)', manualAttempt.id === autoAward?.id);
    assert('C3b: Single valid event across both entry points', repoD.ledger.filter((e) => e.status === 'valid').length === 1);
  }

  // ═══ Flow D: Validation guards ─══
  {
    const repo = new FakePracticeRepo();
    const service = new PointService(repo);
    let threwZero = false;
    try {
      await service.recordEvent({
        practice_id: 'p',
        points: 0,
        source_type: 'manual_award',
        source_id: 'x',
      } as RecordPointEventDTO);
    } catch {
      threwZero = true;
    }
    assert('D1: Zero-point event rejected', threwZero);

    let threwNoKey = false;
    try {
      await service.recordEvent({
        practice_id: 'p',
        points: 5,
        source_type: 'manual_award',
        source_id: '',
      } as RecordPointEventDTO);
    } catch {
      threwNoKey = true;
    }
    assert('D2: Missing source_id rejected', threwNoKey);
    assert('D3: Ledger untouched by invalid calls', repo.ledger.length === 0);
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
