export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'archived';

export type ProjectPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  desired_outcome: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  life_area_id?: string;
  primary_goal_id?: string;
  level_id?: string;
  vision_id?: string;
  start_date?: string; // YYYY-MM-DD
  target_date?: string; // YYYY-MM-DD
  completion_note?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  completed_at?: string; // ISO 8601
  archived_at?: string; // ISO 8601
}

export type CreateProjectDTO = Omit<
  Project,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'archived_at'
>;

export type UpdateProjectDTO = Partial<
  Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export interface ProjectFilter {
  status?: ProjectStatus | 'all';
  life_area_id?: string | 'all';
  primary_goal_id?: string | 'all';
  priority?: ProjectPriority | 'all';
  searchQuery?: string;
}

export type ProjectSortOption =
  | 'target_date_asc'
  | 'target_date_desc'
  | 'priority_desc'
  | 'created_at_desc'
  | 'title_asc';

export interface ProjectMetrics {
  total: number;
  active: number;
  paused: number;
  draft: number;
  completed: number;
  archived: number;
}
