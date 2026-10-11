// ============================================================
// PRACTICE STATUS & TYPES
// ============================================================
export type PracticeStatus = 'active' | 'archived';

export interface Practice {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  point_value: number; // e.g. 5, 10, 20
  status: PracticeStatus;

  // Optional Domain Associations
  life_area_id?: string;
  skill_id?: string;
  goal_id?: string;
  project_id?: string;

  // Execution Rules
  repeatable: boolean;
  evidence_required: boolean;

  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  archived_at?: string;
}

export type CreatePracticeDTO = Omit<
  Practice,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'archived_at'
>;

export type UpdatePracticeDTO = Partial<CreatePracticeDTO>;

// ============================================================
// POINT LEDGER EVENT
// ============================================================
export type PointSourceType =
  // Legacy Module 08 sources (preserved for historical data + idempotency keys)
  | 'practice_completion'
  | 'task_completion'
  | 'activity_completion'
  | 'manual_award'
  | 'adjustment'
  // Module 08 Final Correction: independent Development Point attribution
  | 'goal'
  | 'sub_goal'
  | 'project'
  | 'skill'
  | 'level';

export type PointLedgerStatus = 'valid' | 'voided';

export interface PointLedgerEvent {
  id: string;
  user_id: string;
  practice_id?: string;
  points: number; // Positive for awards, negative for adjustments

  // Module 08 Final: life_area_id is REQUIRED on every newly created event
  // (enforced by the centralized PointService). Optional in this stored type
  // because legacy rows may predate the rule.
  life_area_id?: string;
  skill_id?: string;
  goal_id?: string;
  project_id?: string;
  task_id?: string;
  activity_id?: string;
  level_requirement_id?: string;
  level_id?: string;

  source_type: PointSourceType;
  source_id?: string; // Idempotency key (e.g. task ID, activity ID, goal ID)

  reason?: string; // Required for explicit adjustments (negative values)
  note?: string;
  evidence_url?: string;
  status: PointLedgerStatus;

  occurred_at: string; // ISO 8601
  created_at: string; // ISO 8601
}

export type RecordPointEventDTO = Omit<
  PointLedgerEvent,
  'id' | 'user_id' | 'created_at' | 'status'
>;

// ============================================================
// FILTERS & METRICS
// ============================================================
export interface PracticeFilter {
  status?: PracticeStatus | 'all';
  life_area_id?: string | 'all';
  skill_id?: string | 'all';
  goal_id?: string | 'all';
  searchQuery?: string;
}

export interface PointLedgerFilter {
  practice_id?: string;
  life_area_id?: string;
  skill_id?: string;
  goal_id?: string;
  project_id?: string;
  task_id?: string;
  activity_id?: string;
  source_type?: PointSourceType | PointSourceType[];
  startDate?: string;
  endDate?: string;
}

export interface PracticeMetrics {
  totalPointsEarned: number;
  pointsThisWeek: number;
  pointsThisMonth: number;
  totalCompletions: number;
  pointsByLifeArea: Record<string, number>;
  pointsBySkill: Record<string, number>;
  pointsByGoal: Record<string, number>;
}
