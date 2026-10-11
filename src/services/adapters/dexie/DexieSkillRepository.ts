import { posDexieDb } from './posDexieDb';
import { APP_CONFIG } from '../../../config/app.config';
import { generateId } from '../../../utils/idGenerator';
import { ISkillRepository } from '../../contracts/ISkillRepository';
import {
  Skill,
  SkillEvidence,
  SkillGoalRelation,
  SkillHistory,
  SkillLevelRelation,
  SkillProficiency,
  SkillProjectRelation,
  CreateSkillDTO,
  UpdateSkillDTO,
  CreateSkillEvidenceDTO,
  SkillFilter,
} from '../../../types/skill.types';
import { normalizeName } from '../../../features/skills/validation/skillValidation';

export class DexieSkillRepository implements ISkillRepository {
  // ─── Skills ───────────────────────────────────────────────

  async getSkills(filter?: SkillFilter): Promise<Skill[]> {
    let query = posDexieDb.skills.toCollection();

    const status = filter?.status ?? 'all';
    if (status !== 'all') {
      query = posDexieDb.skills.where('status').equals(status);
    }

    let results = await query.toArray();

    if (filter?.life_area_id && filter.life_area_id !== 'all') {
      results = results.filter((s) => s.life_area_id === filter.life_area_id);
    }
    if (filter?.current_proficiency && filter.current_proficiency !== 'all') {
      results = results.filter((s) => s.current_proficiency === filter.current_proficiency);
    }
    if (filter?.development_state && filter.development_state !== 'all') {
      results = results.filter((s) => s.development_state === filter.development_state);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q)
      );
    }

    return results;
  }

  async getSkill(id: string): Promise<Skill | null> {
    return (await posDexieDb.skills.get(id)) ?? null;
  }

  async createSkill(dto: CreateSkillDTO): Promise<Skill> {
    const now = new Date().toISOString();
    const skill: Skill = {
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      ...dto,
      name: dto.name.trim(),
      status: dto.status ?? 'active',
      created_at: now,
      updated_at: now,
    };
    await posDexieDb.skills.add(skill);
    return skill;
  }

  async updateSkill(id: string, dto: UpdateSkillDTO): Promise<Skill> {
    const existing = await posDexieDb.skills.get(id);
    if (!existing) throw new Error(`Skill ${id} not found`);
    const updated: Skill = {
      ...existing,
      ...dto,
      ...(dto.name ? { name: dto.name.trim() } : {}),
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.skills.put(updated);
    return updated;
  }

  async archiveSkill(id: string): Promise<Skill> {
    const existing = await posDexieDb.skills.get(id);
    if (!existing) throw new Error(`Skill ${id} not found`);
    const now = new Date().toISOString();
    const updated: Skill = { ...existing, status: 'archived', archived_at: now, updated_at: now };
    await posDexieDb.skills.put(updated);
    return updated;
  }

  async updateSkillProficiency(
    id: string,
    newProficiency: SkillProficiency,
    reason?: string,
    note?: string
  ): Promise<Skill> {
    const existing = await posDexieDb.skills.get(id);
    if (!existing) throw new Error(`Skill ${id} not found`);
    const now = new Date().toISOString();

    // Always create history record
    const historyEntry: SkillHistory = {
      id: generateId(),
      skill_id: id,
      previous_proficiency: existing.current_proficiency,
      new_proficiency: newProficiency,
      reason,
      note,
      changed_at: now,
      created_at: now,
    };
    await posDexieDb.skill_history.add(historyEntry);

    const updated: Skill = { ...existing, current_proficiency: newProficiency, updated_at: now };
    await posDexieDb.skills.put(updated);
    return updated;
  }

  async checkDuplicate(name: string, lifeAreaId?: string, excludeId?: string): Promise<boolean> {
    const normalized = normalizeName(name);
    const candidates = await posDexieDb.skills
      .where('status')
      .equals('active')
      .toArray();
    return candidates.some(
      (s) =>
        s.id !== excludeId &&
        normalizeName(s.name) === normalized &&
        (lifeAreaId ? s.life_area_id === lifeAreaId : true)
    );
  }

  async getSkillsByLifeArea(lifeAreaId: string): Promise<Skill[]> {
    return posDexieDb.skills
      .where('[status+life_area_id]')
      .equals(['active', lifeAreaId])
      .toArray();
  }

  // ─── Evidence ─────────────────────────────────────────────

  async getSkillEvidence(skillId: string): Promise<SkillEvidence[]> {
    return posDexieDb.skill_evidence
      .where('skill_id')
      .equals(skillId)
      .sortBy('created_at')
      .then((arr) => arr.reverse());
  }

  async addSkillEvidence(dto: CreateSkillEvidenceDTO): Promise<SkillEvidence> {
    const evidence: SkillEvidence = {
      id: generateId(),
      ...dto,
      created_at: new Date().toISOString(),
    };
    await posDexieDb.skill_evidence.add(evidence);
    return evidence;
  }

  async removeSkillEvidence(id: string): Promise<void> {
    await posDexieDb.skill_evidence.delete(id);
  }

  // ─── History ──────────────────────────────────────────────

  async getSkillHistory(skillId: string): Promise<SkillHistory[]> {
    return posDexieDb.skill_history
      .where('skill_id')
      .equals(skillId)
      .sortBy('changed_at')
      .then((arr) => arr.reverse());
  }

  // ─── Goal Relations ───────────────────────────────────────

  async getSkillGoals(skillId: string): Promise<SkillGoalRelation[]> {
    return posDexieDb.skill_goal_relations
      .where('skill_id')
      .equals(skillId)
      .toArray();
  }

  async linkSkillToGoal(skillId: string, goalId: string): Promise<SkillGoalRelation> {
    const existing = await posDexieDb.skill_goal_relations
      .where('[skill_id+goal_id]')
      .equals([skillId, goalId])
      .first();
    if (existing) return existing;
    const rel: SkillGoalRelation = {
      id: generateId(),
      skill_id: skillId,
      goal_id: goalId,
      created_at: new Date().toISOString(),
    };
    await posDexieDb.skill_goal_relations.add(rel);
    return rel;
  }

  async unlinkSkillFromGoal(skillId: string, goalId: string): Promise<void> {
    const existing = await posDexieDb.skill_goal_relations
      .where('[skill_id+goal_id]')
      .equals([skillId, goalId])
      .first();
    if (existing) await posDexieDb.skill_goal_relations.delete(existing.id);
  }

  // ─── Level Relations ──────────────────────────────────────

  async getSkillLevels(skillId: string): Promise<SkillLevelRelation[]> {
    return posDexieDb.skill_level_relations
      .where('skill_id')
      .equals(skillId)
      .toArray();
  }

  async linkSkillToLevel(skillId: string, levelId: string): Promise<SkillLevelRelation> {
    const existing = await posDexieDb.skill_level_relations
      .where('[skill_id+level_id]')
      .equals([skillId, levelId])
      .first();
    if (existing) return existing;
    const rel: SkillLevelRelation = {
      id: generateId(),
      skill_id: skillId,
      level_id: levelId,
      created_at: new Date().toISOString(),
    };
    await posDexieDb.skill_level_relations.add(rel);
    return rel;
  }

  async unlinkSkillFromLevel(skillId: string, levelId: string): Promise<void> {
    const existing = await posDexieDb.skill_level_relations
      .where('[skill_id+level_id]')
      .equals([skillId, levelId])
      .first();
    if (existing) await posDexieDb.skill_level_relations.delete(existing.id);
  }

  // ─── Project Relations ────────────────────────────────────

  async getSkillProjects(skillId: string): Promise<SkillProjectRelation[]> {
    return posDexieDb.skill_project_relations
      .where('skill_id')
      .equals(skillId)
      .toArray();
  }

  async linkSkillToProject(skillId: string, projectId: string): Promise<SkillProjectRelation> {
    const existing = await posDexieDb.skill_project_relations
      .where('[skill_id+project_id]')
      .equals([skillId, projectId])
      .first();
    if (existing) return existing;
    const rel: SkillProjectRelation = {
      id: generateId(),
      skill_id: skillId,
      project_id: projectId,
      created_at: new Date().toISOString(),
    };
    await posDexieDb.skill_project_relations.add(rel);
    return rel;
  }

  async unlinkSkillFromProject(skillId: string, projectId: string): Promise<void> {
    const existing = await posDexieDb.skill_project_relations
      .where('[skill_id+project_id]')
      .equals([skillId, projectId])
      .first();
    if (existing) await posDexieDb.skill_project_relations.delete(existing.id);
  }
}
