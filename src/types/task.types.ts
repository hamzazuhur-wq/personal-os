export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  due_date?: string; // YYYY-MM-DD
  created_at: string; // ISO 8601 string
  completed_at?: string; // ISO 8601 string, preserved indefinitely
  
  // Future architecture relationship hooks
  related_week?: string; // e.g. 2026-W34
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  related_week?: string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  completed_at?: string;
  related_week?: string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
}
