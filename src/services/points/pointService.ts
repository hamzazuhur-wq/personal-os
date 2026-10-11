import { IPracticeRepository } from '../contracts/IPracticeRepository';
import { IGoalRepository } from '../contracts/IGoalRepository';
import { IProjectRepository } from '../contracts/IProjectRepository';
import { DexiePracticeRepository } from '../adapters/dexie/DexiePracticeRepository';
import { DexieProjectRepository } from '../adapters/dexie/DexieProjectRepository';
import {
  PointLedgerEvent,
  PointLedgerFilter,
  PointSourceType,
  Practice,
  RecordPointEventDTO,
} from '../../types/practice.types';
import { Task } from '../../types/task.types';
import { Activity } from '../../types/activity.types';
import { LevelRequirement } from '../../types/level.types';
import { Goal } from '../../types/goal.types';
import { generateId } from '../../utils/idGenerator';

/** Fixed award granted automatically the first time a Goal reaches `completed`. */
export const GOAL_COMPLETION_POINT_AWARD = 10;

export interface AwardForTaskParams {
  task: Task;
  practice?: Practice | null;
  note?: string;
  occurredAt?: string;
}

export interface AwardForActivityParams {
  activity: Activity;
  practice?: Practice | null;
  note?: string;
  occurredAt?: string;
}

export interface AwardForPracticeLogParams {
  practice: Practice;
  note?: string;
  evidenceUrl?: string;
  goalId?: string;
  skillId?: string;
  lifeAreaId?: string;
  projectId?: string;
  taskId?: string;
  activityId?: string;
  occurredAt?: string;
}

// ─── Module 08 Final Correction — Independent Development Points ──

export type DevelopmentPointSource = 'goal' | 'sub_goal' | 'project' | 'skill' | 'level';

export interface RecordDevelopmentPointParams {
  points: number; // Positive integers only for manual entry
  reason: string; // Required — every manual event is explainable
  sourceType?: DevelopmentPointSource;
  sourceId?: string; // Optional idempotency key (auto-generated when absent)

  // Attribution (Life Area REQUIRED — the system's top-level scope)
  lifeAreaId: string;
  skillId?: string;
  practiceId?: string;
  goalId?: string;
  projectId?: string;
  taskId?: string;
  activityId?: string;
  levelRequirementId?: string;
  levelId?: string;

  note?: string;
  evidenceUrl?: string;
  occurredAt?: string;
}

export interface LifeAreaPointSummary {
  total: number;
  thisWeek: number;
  thisMonth: number;
}

export interface GoalPointsSummary {
  direct: number;
  subtree: number;
}

/**
 * Module 08.2 — Centralized Point Service.
 *
 * Single authority for every point-bearing event in the system. All entry
 * points (Daily Log, Quick Capture activity logging, Task completion, and
 * manual Practice logging) MUST route through this service so that:
 *
 * 1. Points are awarded EXACTLY ONCE per source event (idempotency on
 *    `[source_type + source_id]` enforced by the repository).
 * 2. Non-practice tasks and non-practice activities NEVER award points.
 * 3. Nested Goal / Project relationships are preserved as immutable ledger
 *    snapshots for audit purposes.
 * 4. Revocations (task un-completion) void prior awards without deleting
 *    ledger history.
 *
 * Module 08 Final Correction — Development Points are an INDEPENDENT system
 * with manual point entry as the primary flow. Every newly created ledger
 * event MUST carry a Life Area attribution (enforced in
 * `recordDevelopmentPointEvent`). Read paths are centralized query services
 * backed by bounded indexed queries.
 */
export class PointService {
  constructor(
    private repo: IPracticeRepository = new DexiePracticeRepository(),
    private goalRepo?: IGoalRepository,
    private projectRepo?: IProjectRepository
  ) {}

  // ─── Core Primitive ─────────────────────────────────────────

  /**
   * Records a point event through the idempotent repository primitive.
   * Validates that awards are positive and always keyed to a source event.
   */
  async recordEvent(dto: RecordPointEventDTO): Promise<PointLedgerEvent> {
    if (!dto.source_type) {
      throw new Error('A point event requires a source_type.');
    }
    if (!dto.source_id) {
      throw new Error('A point event requires a source_id (idempotency key).');
    }
    if (!Number.isFinite(dto.points) || dto.points === 0) {
      throw new Error('A point event requires a non-zero finite point value.');
    }
    return this.repo.recordPointEvent(dto);
  }

  async hasValidAward(sourceType: PointSourceType, sourceId: string): Promise<boolean> {
    const existing = await this.repo.getLedgerEventBySource(sourceType, sourceId);
    return Boolean(existing && existing.status === 'valid');
  }

  // ─── Task Completion Entry Point ────────────────────────────

  /**
   * Awards points when a task linked to a development practice is completed.
   * - Tasks WITHOUT a practice never award points (returns null).
   * - Completing the same task repeatedly cannot duplicate the award.
   */
  async awardForTaskCompletion(params: AwardForTaskParams): Promise<PointLedgerEvent | null> {
    const { task } = params;

    if (!task.related_practice_id || task.status !== 'completed') {
      return null;
    }

    const practice = params.practice ?? (await this.repo.getPractice(task.related_practice_id));
    if (!practice) {
      return null;
    }

    const linkedGoalId = task.related_goal_id || practice.goal_id;
    const linkedProjectId = task.related_project_id || practice.project_id;
    const [linkedGoal, linkedProject] = await Promise.all([
      !practice.life_area_id && linkedGoalId && this.goalRepo
        ? this.goalRepo.getGoal(linkedGoalId)
        : Promise.resolve(null),
      !practice.life_area_id && linkedProjectId && this.projectRepo
        ? this.projectRepo.getProject(linkedProjectId)
        : Promise.resolve(null),
    ]);

    return this.recordEvent({
      practice_id: practice.id,
      points: practice.point_value,
      source_type: 'task_completion',
      source_id: task.id,
      // Snapshot relationships: task links win over practice defaults,
      // preserving the nested Goal / Project context of the execution.
      life_area_id: practice.life_area_id || linkedGoal?.life_area_id || linkedProject?.life_area_id,
      skill_id: practice.skill_id,
      goal_id: task.related_goal_id || practice.goal_id,
      project_id: task.related_project_id || practice.project_id,
      task_id: task.id,
      note: params.note,
      occurred_at: params.occurredAt || task.completed_at || new Date().toISOString(),
    });
  }

  /**
   * Voids the award previously granted for completing a task (used on
   * un-completion). Idempotent: voiding twice is a no-op. Ledger rows are
   * retained for the audit trail.
   */
  async revokeTaskCompletion(taskId: string): Promise<number> {
    return this.repo.voidLedgerEventsBySource('task_completion', taskId);
  }

  // ─── Activity Logging Entry Point ───────────────────────────

  /**
   * Awards points when a Daily Log / Quick Capture activity is linked to a
   * practice at creation time. Activities WITHOUT a linked practice never
   * award points (returns null). Duplicate calls are collapsed by the
   * repository's idempotency guard.
   */
  async awardForActivity(params: AwardForActivityParams): Promise<PointLedgerEvent | null> {
    const { activity } = params;

    if (!activity.related_practice_id) {
      return null;
    }

    const practice = params.practice ?? (await this.repo.getPractice(activity.related_practice_id));
    if (!practice) {
      return null;
    }

    // An activity linked to a task is another description of that same real
    // completion. Reuse the task's ledger key so either entry order collapses
    // to one award.
    const isTaskCompletion = Boolean(activity.related_task_id);

    return this.recordEvent({
      practice_id: practice.id,
      points: practice.point_value,
      source_type: isTaskCompletion ? 'task_completion' : 'activity_completion',
      source_id: activity.related_task_id || activity.id,
      // Snapshot relationships: explicit activity links win over practice defaults.
      life_area_id: activity.related_life_area_id || practice.life_area_id,
      skill_id: practice.skill_id,
      goal_id: activity.related_goal_id || practice.goal_id,
      project_id: activity.related_project_id || practice.project_id,
      task_id: activity.related_task_id,
      activity_id: activity.id,
      note: params.note,
      occurred_at: params.occurredAt || new Date().toISOString(),
    });
  }

  // ─── Manual Practice Log Entry Point ────────────────────────

  /**
   * Awards points for a manually logged practice completion (Practices page).
   * - Linked to a task  → keyed ('task_completion', taskId): dedupes against
   *   the automatic task-completion award, so the same event can never pay twice.
   * - Linked to an activity → keyed ('activity_completion', activityId).
   * - Standalone & repeatable → each log is its own unique event.
   * - Standalone & NON-repeatable → keyed to the practice itself; repeated logs
   *   return the original award instead of duplicating it.
   */
  async awardForPracticeLog(params: AwardForPracticeLogParams): Promise<PointLedgerEvent> {
    const { practice } = params;

    let sourceType: PointSourceType = 'practice_completion';
    if (params.taskId) {
      sourceType = 'task_completion';
    } else if (params.activityId) {
      sourceType = 'activity_completion';
    }

    let sourceId =
      params.taskId ||
      params.activityId ||
      (practice.repeatable === false ? practice.id : generateId());

    // Non-repeatable practices may only ever be awarded once in total.
    if (sourceType === 'practice_completion' && practice.repeatable === false) {
      const existing = await this.repo.getLedgerEventBySource(sourceType, sourceId);
      if (existing && existing.status === 'valid') {
        return existing;
      }
    }

    return this.recordEvent({
      practice_id: practice.id,
      points: practice.point_value,
      source_type: sourceType,
      source_id: sourceId,
      life_area_id: params.lifeAreaId || practice.life_area_id,
      skill_id: params.skillId || practice.skill_id,
      goal_id: params.goalId || practice.goal_id,
      project_id: params.projectId || practice.project_id,
      task_id: params.taskId,
      activity_id: params.activityId,
      note: params.note,
      evidence_url: params.evidenceUrl,
      occurred_at: params.occurredAt || new Date().toISOString(),
    });
  }

  // ─── Development Point Entry Point (Module 08 Final) ────────

  /**
   * The single entry point for independent Development Point entries.
   *
   * Rules enforced here (Module 08 Final Correction):
   * - `lifeAreaId` is REQUIRED — Life Area is the system's top-level scope.
   * - Points must be positive, finite integers for manual entry.
   * - A human-readable `reason` is required.
   * - Each manual submission is its own ledger event; when a caller supplies
   *   `sourceId`, the repository's idempotency guard collapses duplicates.
   * - No automatic double counting: this method NEVER derives points from a
   *   practice or task completion — it records exactly what was entered.
   */
  async recordDevelopmentPointEvent(
    params: RecordDevelopmentPointParams
  ): Promise<PointLedgerEvent> {
    if (!params.lifeAreaId) {
      throw new Error('Development points require a Life Area attribution.');
    }
    const points = Number(params.points);
    if (!Number.isFinite(points) || points <= 0 || !Number.isInteger(points)) {
      throw new Error('Development points must be positive whole numbers.');
    }
    if (!params.reason || !params.reason.trim()) {
      throw new Error('A reason is required when adding development points.');
    }

    return this.recordEvent({
      points,
      source_type: params.sourceType || 'manual_award',
      source_id: params.sourceId || generateId(),
      life_area_id: params.lifeAreaId,
      skill_id: params.skillId,
      practice_id: params.practiceId,
      goal_id: params.goalId,
      project_id: params.projectId,
      task_id: params.taskId,
      activity_id: params.activityId,
      level_requirement_id: params.levelRequirementId,
      level_id: params.levelId,
      reason: params.reason.trim(),
      note: params.note,
      evidence_url: params.evidenceUrl,
      occurred_at: params.occurredAt || new Date().toISOString(),
    });
  }

  // ─── Development Point Query Services (Module 08 Final) ────

  /**
   * Automatic award when a Goal reaches `completed` — exactly once per goal
   * (idempotency on the goal id). Sub-goals are keyed separately from parent
   * goals so both can pay without double counting the same event.
   * Goals WITHOUT a Life Area never award (no scope → no points).
   */
  async awardOnGoalCompletion(goal: Goal): Promise<PointLedgerEvent | null> {
    if (goal.status !== 'completed' || !goal.life_area_id) return null;

    return this.recordEvent({
      points: GOAL_COMPLETION_POINT_AWARD,
      source_type: goal.parent_goal_id ? 'sub_goal' : 'goal',
      source_id: goal.id,
      life_area_id: goal.life_area_id,
      goal_id: goal.id,
      project_id: goal.project_id,
      level_id: goal.level_id,
      reason: `Goal completed: ${goal.title}`,
      occurred_at: goal.completed_at || new Date().toISOString(),
    });
  }

  /** Voids the completion award(s) for a goal (reopen / undo). Idempotent. */
  async revokeGoalCompletion(goalId: string): Promise<number> {
    const parent = await this.repo.voidLedgerEventsBySource('goal', goalId);
    const sub = await this.repo.voidLedgerEventsBySource('sub_goal', goalId);
    return parent + sub;
  }

  /** Total valid points attributed to a Life Area (+ weekly / monthly windows). */
  async getLifeAreaPointSummary(lifeAreaId: string): Promise<LifeAreaPointSummary> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const [total, thisWeek, thisMonth] = await Promise.all([
      this.repo.sumValidPoints({ life_area_id: lifeAreaId }),
      this.repo.sumValidPoints({ life_area_id: lifeAreaId, startDate: weekAgo }),
      this.repo.sumValidPoints({ life_area_id: lifeAreaId, startDate: monthAgo }),
    ]);

    return { total, thisWeek, thisMonth };
  }

  /** Direct points on one goal + the full descendant-subtree total. */
  async getGoalPointsSummary(goalId: string): Promise<GoalPointsSummary> {
    const direct = await this.repo.sumValidPoints({ goal_id: goalId });

    let subtree = direct;
    if (this.goalRepo) {
      const descendants = await this.goalRepo.getGoalDescendants(goalId);
      const childSums = await Promise.all(
        descendants.map((g) => this.repo.sumValidPoints({ goal_id: g.id }))
      );
      subtree += childSums.reduce((sum, n) => sum + n, 0);
    }

    return { direct, subtree };
  }

  async getProjectPoints(projectId: string): Promise<number> {
    return this.repo.sumValidPoints({ project_id: projectId });
  }

  async getTaskPoints(taskId: string): Promise<number> {
    return this.repo.sumValidPoints({ task_id: taskId });
  }

  async getActivityPoints(activityId: string): Promise<number> {
    return this.repo.sumValidPoints({ activity_id: activityId });
  }

  async getSkillPoints(skillId: string): Promise<number> {
    return this.repo.sumValidPoints({ skill_id: skillId });
  }

  /**
   * Progress toward a `development_points` level requirement. The requirement's
   * scope (Life Area and/or Skill) filters the ledger — points earned anywhere
   * else never count toward it.
   */
  async getLevelRequirementProgress(requirement: LevelRequirement): Promise<{
    current: number;
    target: number;
  }> {
    const target = requirement.target_points || 0;
    if (requirement.type !== 'development_points' || target <= 0) {
      return { current: 0, target };
    }

    const current =
      await this.repo.getPointsForCriteria({
        life_area_id: requirement.points_life_area_id,
        skill_id: requirement.points_skill_id,
        goal_id: requirement.goal_id,
      });

    return { current: Math.min(current, Number.MAX_SAFE_INTEGER), target };
  }

  /**
   * Weekly Review panel data: total points in a date window plus a per-Life-Area
   * breakdown (bounded indexed query per area).
   */
  async getPeriodPointBreakdown(
    lifeAreaIds: string[],
    startDate?: string,
    endDate?: string
  ): Promise<{ total: number; byLifeArea: Record<string, number> }> {
    const perArea = await Promise.all(
      lifeAreaIds.map((id) =>
        this.repo
          .sumValidPoints({ life_area_id: id, startDate, endDate })
          .then((points) => [id, points] as const)
      )
    );

    const byLifeArea: Record<string, number> = {};
    let total = 0;
    for (const [id, points] of perArea) {
      byLifeArea[id] = points;
      total += points;
    }
    return { total, byLifeArea };
  }

  /** Bounded, newest-first feed of point events (history lists). */
  async getRecentEvents(filter?: PointLedgerFilter, limit: number = 20): Promise<PointLedgerEvent[]> {
    return this.repo.getRecentPointEvents(filter, limit);
  }
}

// Shared singleton — Dexie repositories are stateless adapters over the same
// underlying IndexedDB database, so a single instance serves the whole app.
// The goal repository powers descendant-subtree aggregation.
import { DexieGoalRepository } from '../adapters/dexie/DexieGoalRepository';
export const pointService = new PointService(
  new DexiePracticeRepository(),
  new DexieGoalRepository(),
  new DexieProjectRepository()
);
