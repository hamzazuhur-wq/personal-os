// ============================================================
// SKILL PROFICIENCY SCALE
// ============================================================
export type SkillProficiency =
  | 'foundation'
  | 'developing'
  | 'competent'
  | 'advanced'
  | 'expert';

// ============================================================
// SKILL DEVELOPMENT STATE
// ============================================================
export type SkillDevelopmentState =
  | 'not_started'
  | 'developing'
  | 'maintaining'
  | 'demonstrated';

// ============================================================
// SKILL STATUS
// ============================================================
export type SkillStatus = 'active' | 'archived';

// ============================================================
// SKILL EVIDENCE TYPE
// ============================================================
export type SkillEvidenceType =
  | 'project'
  | 'goal'
  | 'activity'
  | 'document'
  | 'note'
  | 'manual';

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  life_area_id?: string;
  current_proficiency: SkillProficiency;
  target_proficiency: SkillProficiency;
  development_state: SkillDevelopmentState;
  status: SkillStatus;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface SkillHistory {
  id: string;
  skill_id: string;
  previous_proficiency: SkillProficiency;
  new_proficiency: SkillProficiency;
  reason?: string;
  note?: string;
  changed_at: string;
  created_at: string;
}

export interface SkillEvidence {
  id: string;
  skill_id: string;
  type: SkillEvidenceType;
  title: string;
  description?: string;
  reference_id?: string;
  created_at: string;
}

// ============================================================
// RELATIONSHIP JUNCTION TABLES
// ============================================================

export interface SkillGoalRelation {
  id: string;
  skill_id: string;
  goal_id: string;
  created_at: string;
}

export interface SkillProjectRelation {
  id: string;
  skill_id: string;
  project_id: string;
  created_at: string;
}

export interface SkillLevelRelation {
  id: string;
  skill_id: string;
  level_id: string;
  created_at: string;
}

// ============================================================
// DTOs
// ============================================================

export type CreateSkillDTO = Omit<
  Skill,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived_at'
>;

export type UpdateSkillDTO = Partial<
  Omit<Skill, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export type CreateSkillEvidenceDTO = Omit<SkillEvidence, 'id' | 'created_at'>;

// ============================================================
// FILTERS + SORT
// ============================================================

export interface SkillFilter {
  status?: SkillStatus | 'all';
  life_area_id?: string | 'all';
  current_proficiency?: SkillProficiency | 'all';
  development_state?: SkillDevelopmentState | 'all';
  searchQuery?: string;
}

export type SkillSortOption =
  | 'name_asc'
  | 'development_state'
  | 'created_at_desc'
  | 'proficiency_asc';

// ============================================================
// METRICS
// ============================================================

export interface SkillMetrics {
  total: number;
  active: number;
  archived: number;
  byDevelopmentState: Record<SkillDevelopmentState, number>;
  byProficiency: Record<SkillProficiency, number>;
}

// ============================================================
// DETAIL VIEW
// ============================================================

export interface SkillDetailData {
  skill: Skill;
  history: SkillHistory[];
  evidence: SkillEvidence[];
  goalRelations: SkillGoalRelation[];
  levelRelations: SkillLevelRelation[];
  projectRelations: SkillProjectRelation[];
}
