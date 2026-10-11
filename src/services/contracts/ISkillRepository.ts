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
} from '../../types/skill.types';

export interface ISkillRepository {
  // ─── Skills ───────────────────────────────────────────────
  getSkills(filter?: SkillFilter): Promise<Skill[]>;
  getSkill(id: string): Promise<Skill | null>;
  createSkill(dto: CreateSkillDTO): Promise<Skill>;
  updateSkill(id: string, dto: UpdateSkillDTO): Promise<Skill>;
  archiveSkill(id: string): Promise<Skill>;
  updateSkillProficiency(
    id: string,
    newProficiency: SkillProficiency,
    reason?: string,
    note?: string
  ): Promise<Skill>;
  checkDuplicate(name: string, lifeAreaId?: string, excludeId?: string): Promise<boolean>;
  getSkillsByLifeArea(lifeAreaId: string): Promise<Skill[]>;

  // ─── Evidence ─────────────────────────────────────────────
  getSkillEvidence(skillId: string): Promise<SkillEvidence[]>;
  addSkillEvidence(dto: CreateSkillEvidenceDTO): Promise<SkillEvidence>;
  removeSkillEvidence(id: string): Promise<void>;

  // ─── History ──────────────────────────────────────────────
  getSkillHistory(skillId: string): Promise<SkillHistory[]>;

  // ─── Goal Relations ───────────────────────────────────────
  getSkillGoals(skillId: string): Promise<SkillGoalRelation[]>;
  linkSkillToGoal(skillId: string, goalId: string): Promise<SkillGoalRelation>;
  unlinkSkillFromGoal(skillId: string, goalId: string): Promise<void>;

  // ─── Level Relations ──────────────────────────────────────
  getSkillLevels(skillId: string): Promise<SkillLevelRelation[]>;
  linkSkillToLevel(skillId: string, levelId: string): Promise<SkillLevelRelation>;
  unlinkSkillFromLevel(skillId: string, levelId: string): Promise<void>;

  // ─── Project Relations ────────────────────────────────────
  getSkillProjects(skillId: string): Promise<SkillProjectRelation[]>;
  linkSkillToProject(skillId: string, projectId: string): Promise<SkillProjectRelation>;
  unlinkSkillFromProject(skillId: string, projectId: string): Promise<void>;
}
