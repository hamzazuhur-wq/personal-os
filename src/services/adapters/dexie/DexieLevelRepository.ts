import { ILevelRepository } from '../../contracts/ILevelRepository';
import {
  Level,
  LevelRequirement,
  LevelSkill,
  LevelMilestone,
  RequirementEvidence,
  LevelHistory,
  ProgressionException,
  CreateLevelDTO,
  UpdateLevelDTO,
  CreateRequirementDTO,
  UpdateRequirementDTO,
  CreateSkillDTO,
  CreateMilestoneDTO,
  UpdateMilestoneDTO,
  CreateEvidenceDTO,
  CreateExceptionDTO,
  EligibilityResult,
  LevelCompletionResult,
} from '../../../types/level.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';
import { APP_CONFIG } from '../../../config/app.config';

export class DexieLevelRepository implements ILevelRepository {
  // ─── Levels ───────────────────────────────────────────────

  async getLevelsByLifeArea(lifeAreaId: string, includeArchived = false): Promise<Level[]> {
    let levels = await posDexieDb.levels
      .where('life_area_id')
      .equals(lifeAreaId)
      .toArray();

    if (!includeArchived) {
      levels = levels.filter((l) => l.status !== 'archived');
    }

    return levels.sort((a, b) => a.display_order - b.display_order);
  }

  async getLevel(id: string): Promise<Level | null> {
    const record = await posDexieDb.levels.get(id);
    return record || null;
  }

  async createLevel(dto: CreateLevelDTO): Promise<Level> {
    const now = new Date().toISOString();
    const newLevel: Level = {
      ...dto,
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      created_at: now,
      updated_at: now,
    };
    await posDexieDb.levels.add(newLevel);
    return newLevel;
  }

  async updateLevel(id: string, dto: UpdateLevelDTO): Promise<Level> {
    const existing = await this.getLevel(id);
    if (!existing) throw new Error(`Level "${id}" not found.`);
    const updated: Level = { ...existing, ...dto, updated_at: new Date().toISOString() };
    await posDexieDb.levels.put(updated);
    return updated;
  }

  async archiveLevel(id: string): Promise<Level> {
    const existing = await this.getLevel(id);
    if (!existing) throw new Error(`Level "${id}" not found.`);
    if (existing.status === 'current') {
      throw new Error('Cannot archive the current level. Set a different current level first.');
    }
    const now = new Date().toISOString();
    const updated: Level = { ...existing, status: 'archived', archived_at: now, updated_at: now };
    await posDexieDb.levels.put(updated);
    return updated;
  }

  async setCurrentLevel(lifeAreaId: string, levelId: string): Promise<Level> {
    const target = await this.getLevel(levelId);
    if (!target) throw new Error(`Level "${levelId}" not found.`);
    if (target.life_area_id !== lifeAreaId) {
      throw new Error('Level does not belong to this Life Area.');
    }
    if (target.status === 'completed' || target.status === 'archived') {
      throw new Error('Cannot set a completed or archived level as current.');
    }

    // Atomically: demote existing current → unlocked, promote target → current
    await posDexieDb.transaction('rw', [posDexieDb.levels], async () => {
      const existing = await posDexieDb.levels
        .where('life_area_id').equals(lifeAreaId)
        .filter((l) => l.status === 'current')
        .toArray();

      const now = new Date().toISOString();
      for (const prev of existing) {
        if (prev.id !== levelId) {
          await posDexieDb.levels.put({ ...prev, status: 'unlocked', updated_at: now });
        }
      }
      await posDexieDb.levels.put({ ...target, status: 'current', updated_at: now });
    });

    return (await this.getLevel(levelId))!;
  }

  async reorderLevels(lifeAreaId: string, orderedIds: string[]): Promise<Level[]> {
    const levels = await this.getLevelsByLifeArea(lifeAreaId, true);
    const levelMap = new Map(levels.map((l) => [l.id, l]));

    // Guard: completed and current levels cannot be reordered
    const protectedIds = levels
      .filter((l) => l.status === 'completed' || l.status === 'current')
      .map((l) => l.id);

    for (const id of orderedIds) {
      if (protectedIds.includes(id)) {
        throw new Error('Completed and current levels cannot be reordered.');
      }
    }

    const now = new Date().toISOString();
    const updated: Level[] = [];

    // Assign new display_order values starting after last protected level
    const protectedCount = protectedIds.length;
    let orderIndex = protectedCount + 1;

    for (const id of orderedIds) {
      const level = levelMap.get(id);
      if (!level) continue;
      const newLevel: Level = { ...level, display_order: orderIndex, updated_at: now };
      await posDexieDb.levels.put(newLevel);
      updated.push(newLevel);
      orderIndex++;
    }

    return this.getLevelsByLifeArea(lifeAreaId);
  }

  // ─── Requirements ─────────────────────────────────────────

  async getRequirements(levelId: string, includeArchived = false): Promise<LevelRequirement[]> {
    let reqs = await posDexieDb.level_requirements
      .where('level_id').equals(levelId)
      .toArray();

    if (!includeArchived) {
      reqs = reqs.filter((r) => !r.archived_at);
    }

    return reqs.sort((a, b) => {
      // Required first, then by created_at
      if (a.is_required !== b.is_required) return a.is_required ? -1 : 1;
      return a.created_at.localeCompare(b.created_at);
    });
  }

  async getRequirement(id: string): Promise<LevelRequirement | null> {
    const record = await posDexieDb.level_requirements.get(id);
    return record || null;
  }

  async createRequirement(dto: CreateRequirementDTO): Promise<LevelRequirement> {
    const now = new Date().toISOString();
    const req: LevelRequirement = { ...dto, id: generateId(), created_at: now, updated_at: now };
    await posDexieDb.level_requirements.add(req);
    return req;
  }

  async updateRequirement(id: string, dto: UpdateRequirementDTO): Promise<LevelRequirement> {
    const existing = await this.getRequirement(id);
    if (!existing) throw new Error(`Requirement "${id}" not found.`);
    const updated: LevelRequirement = { ...existing, ...dto, updated_at: new Date().toISOString() };
    await posDexieDb.level_requirements.put(updated);
    return updated;
  }

  async completeRequirement(id: string): Promise<LevelRequirement> {
    const existing = await this.getRequirement(id);
    if (!existing) throw new Error(`Requirement "${id}" not found.`);
    const now = new Date().toISOString();
    const updated: LevelRequirement = { ...existing, status: 'completed', completed_at: now, updated_at: now };
    await posDexieDb.level_requirements.put(updated);
    return updated;
  }

  async reopenRequirement(id: string): Promise<LevelRequirement> {
    const existing = await this.getRequirement(id);
    if (!existing) throw new Error(`Requirement "${id}" not found.`);
    const updated: LevelRequirement = {
      ...existing,
      status: 'in_progress',
      completed_at: undefined,
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.level_requirements.put(updated);
    return updated;
  }

  async waiverRequirement(id: string): Promise<LevelRequirement> {
    const existing = await this.getRequirement(id);
    if (!existing) throw new Error(`Requirement "${id}" not found.`);
    const updated: LevelRequirement = { ...existing, status: 'waived', updated_at: new Date().toISOString() };
    await posDexieDb.level_requirements.put(updated);
    return updated;
  }

  async archiveRequirement(id: string): Promise<LevelRequirement> {
    const existing = await this.getRequirement(id);
    if (!existing) throw new Error(`Requirement "${id}" not found.`);
    const now = new Date().toISOString();
    const updated: LevelRequirement = { ...existing, archived_at: now, updated_at: now };
    await posDexieDb.level_requirements.put(updated);
    return updated;
  }

  // ─── Skills ───────────────────────────────────────────────

  async getLevelSkills(levelId: string): Promise<LevelSkill[]> {
    return posDexieDb.level_skills
      .where('level_id').equals(levelId)
      .filter((s) => s.status === 'active')
      .toArray();
  }

  async createSkill(dto: CreateSkillDTO): Promise<LevelSkill> {
    const now = new Date().toISOString();
    const skill: LevelSkill = { ...dto, id: generateId(), created_at: now, updated_at: now };
    await posDexieDb.level_skills.add(skill);
    return skill;
  }

  async updateSkill(id: string, name: string): Promise<LevelSkill> {
    const existing = await posDexieDb.level_skills.get(id);
    if (!existing) throw new Error(`Skill "${id}" not found.`);
    const updated: LevelSkill = { ...existing, name, updated_at: new Date().toISOString() };
    await posDexieDb.level_skills.put(updated);
    return updated;
  }

  async deleteSkill(id: string): Promise<void> {
    await posDexieDb.level_skills.delete(id);
  }

  // ─── Milestones ───────────────────────────────────────────

  async getMilestones(levelId: string): Promise<LevelMilestone[]> {
    return posDexieDb.level_milestones
      .where('level_id').equals(levelId)
      .toArray();
  }

  async createMilestone(dto: CreateMilestoneDTO): Promise<LevelMilestone> {
    const now = new Date().toISOString();
    const milestone: LevelMilestone = { ...dto, id: generateId(), created_at: now, updated_at: now };
    await posDexieDb.level_milestones.add(milestone);
    return milestone;
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDTO): Promise<LevelMilestone> {
    const existing = await posDexieDb.level_milestones.get(id);
    if (!existing) throw new Error(`Milestone "${id}" not found.`);
    const updated: LevelMilestone = { ...existing, ...dto, updated_at: new Date().toISOString() };
    await posDexieDb.level_milestones.put(updated);
    return updated;
  }

  async completeMilestone(id: string): Promise<LevelMilestone> {
    const existing = await posDexieDb.level_milestones.get(id);
    if (!existing) throw new Error(`Milestone "${id}" not found.`);
    const now = new Date().toISOString();
    const updated: LevelMilestone = { ...existing, status: 'completed', completed_at: now, updated_at: now };
    await posDexieDb.level_milestones.put(updated);
    return updated;
  }

  async reopenMilestone(id: string): Promise<LevelMilestone> {
    const existing = await posDexieDb.level_milestones.get(id);
    if (!existing) throw new Error(`Milestone "${id}" not found.`);
    const updated: LevelMilestone = {
      ...existing,
      status: 'pending',
      completed_at: undefined,
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.level_milestones.put(updated);
    return updated;
  }

  // ─── Evidence ─────────────────────────────────────────────

  async getEvidence(requirementId: string): Promise<RequirementEvidence[]> {
    return posDexieDb.requirement_evidence
      .where('requirement_id').equals(requirementId)
      .sortBy('created_at');
  }

  async createEvidence(dto: CreateEvidenceDTO): Promise<RequirementEvidence> {
    const evidence: RequirementEvidence = { ...dto, id: generateId(), created_at: new Date().toISOString() };
    await posDexieDb.requirement_evidence.add(evidence);
    return evidence;
  }

  async deleteEvidence(id: string): Promise<void> {
    await posDexieDb.requirement_evidence.delete(id);
  }

  // ─── History & Exceptions ─────────────────────────────────

  async getLevelHistory(lifeAreaId: string): Promise<LevelHistory[]> {
    const records = await posDexieDb.level_history
      .where('life_area_id').equals(lifeAreaId)
      .toArray();
    return records.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getProgressionExceptions(lifeAreaId: string): Promise<ProgressionException[]> {
    const records = await posDexieDb.progression_exceptions
      .where('life_area_id').equals(lifeAreaId)
      .toArray();
    return records.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createProgressionException(dto: CreateExceptionDTO): Promise<ProgressionException> {
    const exception: ProgressionException = { ...dto, id: generateId(), created_at: new Date().toISOString() };
    await posDexieDb.progression_exceptions.add(exception);
    return exception;
  }

  // ─── Business Logic ───────────────────────────────────────

  async checkLevelEligibility(levelId: string): Promise<EligibilityResult> {
    const level = await this.getLevel(levelId);
    if (!level) throw new Error(`Level "${levelId}" not found.`);

    if (level.status === 'completed') {
      return {
        eligible: false,
        requiredCount: 0,
        completedRequiredCount: 0,
        missingRequirements: [],
        status: 'already_completed',
      };
    }

    if (level.status === 'archived') {
      return {
        eligible: false,
        requiredCount: 0,
        completedRequiredCount: 0,
        missingRequirements: [],
        status: 'archived',
      };
    }

    const reqs = await this.getRequirements(levelId);
    const required = reqs.filter((r) => r.is_required);
    const completedRequired = required.filter(
      (r) => r.status === 'completed' || r.status === 'waived'
    );
    const missing = required.filter(
      (r) => r.status !== 'completed' && r.status !== 'waived'
    );

    const eligible = missing.length === 0 && required.length > 0;

    return {
      eligible,
      requiredCount: required.length,
      completedRequiredCount: completedRequired.length,
      missingRequirements: missing,
      status: eligible ? 'ready' : 'not_ready',
    };
  }

  async confirmLevelCompletion(levelId: string, note?: string): Promise<LevelCompletionResult> {
    const eligibility = await this.checkLevelEligibility(levelId);

    if (!eligibility.eligible) {
      if (eligibility.status === 'already_completed') {
        throw new Error('This level has already been completed.');
      }
      throw new Error(
        `Level is not yet eligible for completion. ${eligibility.missingRequirements.length} required requirement(s) remain.`
      );
    }

    const level = (await this.getLevel(levelId))!;
    const now = new Date().toISOString();

    // Complete the level and write history
    let completedLevel!: Level;
    let historyRecord!: LevelHistory;
    let nextLevel: Level | undefined;

    await posDexieDb.transaction('rw', [posDexieDb.levels, posDexieDb.level_history], async () => {
      completedLevel = {
        ...level,
        status: 'completed',
        completed_at: now,
        updated_at: now,
      };
      await posDexieDb.levels.put(completedLevel);

      historyRecord = {
        id: generateId(),
        life_area_id: level.life_area_id,
        from_level_id: level.id,
        to_level_id: level.id,
        completed_at: now,
        reason: 'User confirmed level completion.',
        note,
        created_at: now,
      };
      await posDexieDb.level_history.add(historyRecord);
    });

    // Unlock or activate next level
    const allLevels = await this.getLevelsByLifeArea(level.life_area_id);
    const nextCandidate = allLevels.find(
      (l) => l.display_order === level.display_order + 1 && l.status === 'locked'
    );

    if (nextCandidate) {
      nextLevel = await this.updateLevel(nextCandidate.id, { status: 'unlocked' });
    }

    return { level: completedLevel, history: historyRecord, nextLevel };
  }
}
