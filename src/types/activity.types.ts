export type ActivityCategory =
  | 'Deep Work'
  | 'Study & Research'
  | 'Physical Training'
  | 'Skill Acquisition'
  | 'Writing & Thinking'
  | 'Operations'
  | 'Rest & Recovery'
  | 'Personal'
  | 'Other';

export type ActivityStatus = 'active' | 'archived';

export interface Activity {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  duration_minutes?: number;
  category?: ActivityCategory | string;
  status: ActivityStatus;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string

  // Future architecture relationship hooks
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
}

export interface CreateActivityDTO {
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  category?: ActivityCategory | string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
}

export interface UpdateActivityDTO {
  date?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  category?: ActivityCategory | string;
  status?: ActivityStatus;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
}

export interface DailyActivitySummary {
  date: string;
  total_duration_minutes: number;
  activity_count: number;
  category_breakdown: Record<string, number>; // Category name -> total minutes
}
