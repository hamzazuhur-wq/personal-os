// ============================================================
// LEVEL STATUS
// ============================================================
export type LevelStatus =
  | 'locked'
  | 'unlocked'
  | 'current'
  | 'completed'
  | 'archived';

// ============================================================
// REQUIREMENT TYPE & STATUS
// ============================================================
export type RequirementType =
  | 'manual'
  | 'goal_completion'
  | 'milestone'
  | 'skill'
  | 'evidence'
  | 'development_points';

export type RequirementStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'waived';

// ============================================================
// MILESTONE STATUS
// ============================================================
export type MilestoneStatus = 'pending' | 'completed';

// ============================================================
// EVIDENCE TYPE
// ============================================================
export type EvidenceType =
  | 'note'
  | 'goal'
  | 'activity'
  | 'project'
  | 'document'
  | 'external_reference'
  | 'manual';

// ============================================================
// PROGRESSION EXCEPTION TYPE
// ============================================================
export type ExceptionType =
  | 'exceptional_achievement'
  | 'major_opportunity'
  | 'life_disruption'
  | 'serious_setback'
  | 'calibration_adjustment'
  | 'other';

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Level {
  id: string;
  user_id: string;
  life_area_id: string;
  name: string;
  description?: string;
  display_order: number;
  status: LevelStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  archived_at?: string;
}

export interface LevelRequirement {
  id: string;
  level_id: string;
  title: string;
  description?: string;
  type: RequirementType;
  status: RequirementStatus;
  is_required: boolean;
  goal_id?: string;
  skill_id?: string;
  target_points?: number; // For development_points type
  points_life_area_id?: string;
  points_skill_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  archived_at?: string;
}

export interface LevelSkill {
  id: string;
  level_id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface LevelMilestone {
  id: string;
  level_id: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  goal_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RequirementEvidence {
  id: string;
  requirement_id: string;
  type: EvidenceType;
  title: string;
  description?: string;
  reference_id?: string;
  created_at: string;
}

export interface LevelHistory {
  id: string;
  life_area_id: string;
  from_level_id?: string;
  to_level_id: string;
  completed_at: string;
  reason?: string;
  note?: string;
  created_at: string;
}

export interface ProgressionException {
  id: string;
  life_area_id: string;
  level_id?: string;
  type: ExceptionType;
  description: string;
  reason: string;
  decision: string;
  created_at: string;
}

// ============================================================
// DTOs
// ============================================================

export type CreateLevelDTO = Omit<Level,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'archived_at'
>;

export type UpdateLevelDTO = Partial<Omit<Level,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>>;

export type CreateRequirementDTO = Omit<LevelRequirement,
  'id' | 'created_at' | 'updated_at' | 'completed_at' | 'archived_at'
>;

export type UpdateRequirementDTO = Partial<Omit<LevelRequirement,
  'id' | 'created_at' | 'updated_at'
>>;

export type CreateSkillDTO = Omit<LevelSkill,
  'id' | 'created_at' | 'updated_at'
>;

export type CreateMilestoneDTO = Omit<LevelMilestone,
  'id' | 'created_at' | 'updated_at' | 'completed_at'
>;

export type UpdateMilestoneDTO = Partial<Omit<LevelMilestone,
  'id' | 'created_at' | 'updated_at'
>>;

export type CreateEvidenceDTO = Omit<RequirementEvidence, 'id' | 'created_at'>;

export type CreateExceptionDTO = Omit<ProgressionException, 'id' | 'created_at'>;

// ============================================================
// ELIGIBILITY
// ============================================================

export interface EligibilityResult {
  eligible: boolean;
  requiredCount: number;
  completedRequiredCount: number;
  missingRequirements: LevelRequirement[];
  status: 'not_ready' | 'ready' | 'already_completed' | 'archived';
}

export interface LevelCompletionResult {
  level: Level;
  history: LevelHistory;
  nextLevel?: Level;
}

// ============================================================
// LIFE AREA LEVEL SUMMARY (for overview page)
// ============================================================

export interface LifeAreaLevelSummaryData {
  lifeAreaId: string;
  lifeAreaName: string;
  levels: Level[];
  currentLevel: Level | null;
  nextLevel: Level | null;
  requirements: LevelRequirement[]; // requirements for current level only
  eligibility: EligibilityResult | null;
}
