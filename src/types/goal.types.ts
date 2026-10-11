export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'archived';

export type GoalType = 'outcome' | 'development' | 'performance' | 'acquisition' | 'milestone';

export type GoalTimeHorizon = 'long_term' | 'annual' | 'six_month' | 'monthly' | 'weekly';

export type GoalPriority = 'low' | 'medium' | 'high';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  goal_type: GoalType;
  life_area_id?: string;
  vision_id?: string;
  parent_goal_id?: string;
  level_id?: string;
  project_id?: string;
  week_id?: string;
  start_date?: string;
  target_date?: string;
  time_horizon: GoalTimeHorizon;
  priority: GoalPriority;
  completion_note?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  archived_at?: string;
}

export type CreateGoalDTO = Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'archived_at'>;

export type UpdateGoalDTO = Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export interface GoalFilter {
  status?: GoalStatus | 'all';
  life_area_id?: string | 'all';
  time_horizon?: GoalTimeHorizon | 'all';
  priority?: GoalPriority | 'all';
  searchQuery?: string;
}

export type GoalSortOption = 'target_date_asc' | 'target_date_desc' | 'priority_desc' | 'created_at_desc' | 'title_asc';

export interface GoalPathItem {
  id: string;
  title: string;
  level: number;
}
