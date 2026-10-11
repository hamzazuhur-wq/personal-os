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
} from '../../types/level.types';

export interface ILevelRepository {
  // ─── Levels ───────────────────────────────────────────────
  getLevelsByLifeArea(lifeAreaId: string, includeArchived?: boolean): Promise<Level[]>;
  getLevel(id: string): Promise<Level | null>;
  createLevel(dto: CreateLevelDTO): Promise<Level>;
  updateLevel(id: string, dto: UpdateLevelDTO): Promise<Level>;
  archiveLevel(id: string): Promise<Level>;
  setCurrentLevel(lifeAreaId: string, levelId: string): Promise<Level>;
  reorderLevels(lifeAreaId: string, orderedIds: string[]): Promise<Level[]>;

  // ─── Requirements ─────────────────────────────────────────
  getRequirements(levelId: string, includeArchived?: boolean): Promise<LevelRequirement[]>;
  getRequirement(id: string): Promise<LevelRequirement | null>;
  createRequirement(dto: CreateRequirementDTO): Promise<LevelRequirement>;
  updateRequirement(id: string, dto: UpdateRequirementDTO): Promise<LevelRequirement>;
  completeRequirement(id: string): Promise<LevelRequirement>;
  reopenRequirement(id: string): Promise<LevelRequirement>;
  waiverRequirement(id: string): Promise<LevelRequirement>;
  archiveRequirement(id: string): Promise<LevelRequirement>;

  // ─── Skills ───────────────────────────────────────────────
  getLevelSkills(levelId: string): Promise<LevelSkill[]>;
  createSkill(dto: CreateSkillDTO): Promise<LevelSkill>;
  updateSkill(id: string, name: string): Promise<LevelSkill>;
  deleteSkill(id: string): Promise<void>;

  // ─── Milestones ───────────────────────────────────────────
  getMilestones(levelId: string): Promise<LevelMilestone[]>;
  createMilestone(dto: CreateMilestoneDTO): Promise<LevelMilestone>;
  updateMilestone(id: string, dto: UpdateMilestoneDTO): Promise<LevelMilestone>;
  completeMilestone(id: string): Promise<LevelMilestone>;
  reopenMilestone(id: string): Promise<LevelMilestone>;

  // ─── Evidence ─────────────────────────────────────────────
  getEvidence(requirementId: string): Promise<RequirementEvidence[]>;
  createEvidence(dto: CreateEvidenceDTO): Promise<RequirementEvidence>;
  deleteEvidence(id: string): Promise<void>;

  // ─── History & Exceptions ─────────────────────────────────
  getLevelHistory(lifeAreaId: string): Promise<LevelHistory[]>;
  getProgressionExceptions(lifeAreaId: string): Promise<ProgressionException[]>;
  createProgressionException(dto: CreateExceptionDTO): Promise<ProgressionException>;

  // ─── Business Logic ───────────────────────────────────────
  checkLevelEligibility(levelId: string): Promise<EligibilityResult>;
  confirmLevelCompletion(levelId: string, note?: string): Promise<LevelCompletionResult>;
}
