export type TaskStatus =
  | 'not_started'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'waiting'
  | 'completed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskContext =
  | 'computer'
  | 'phone'
  | 'home'
  | 'office'
  | 'deep_work'
  | 'quick'
  | 'anywhere';

export type TaskEffort = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  due_date?: string; // YYYY-MM-DD
  created_at: string; // ISO 8601 string
  completed_at?: string; // ISO 8601 string, preserved indefinitely
  
  // Module 07 Execution Extensions
  is_next_action?: boolean;
  next_action_title?: string;
  context?: TaskContext;
  effort?: TaskEffort;
  estimated_minutes?: number;
  daily_priority_order?: number | null; // 1, 2, 3 for Top Daily Priorities
  started_at?: string; // ISO 8601
  completion_note?: string;

  // Friction & Blockers
  blocked_reason?: string;
  blocked_by_task_id?: string;
  blocked_since?: string; // ISO 8601
  waiting_for?: string;
  waiting_expected_date?: string; // YYYY-MM-DD
  waiting_since?: string; // ISO 8601

  // Dependencies
  depends_on_task_id?: string;

  // Relationships
  related_week?: string; // e.g. 2026-W34
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;

  // Module 08.2 — Optional Development Practice link
  // When set and the task is completed, practice points are awarded exactly once.
  related_practice_id?: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  is_next_action?: boolean;
  next_action_title?: string;
  context?: TaskContext;
  effort?: TaskEffort;
  estimated_minutes?: number;
  daily_priority_order?: number | null;
  blocked_reason?: string;
  blocked_by_task_id?: string;
  waiting_for?: string;
  waiting_expected_date?: string;
  depends_on_task_id?: string;
  related_week?: string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  related_practice_id?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  completed_at?: string;
  is_next_action?: boolean;
  next_action_title?: string;
  context?: TaskContext;
  effort?: TaskEffort;
  estimated_minutes?: number;
  daily_priority_order?: number | null;
  started_at?: string;
  completion_note?: string;
  blocked_reason?: string;
  blocked_by_task_id?: string;
  blocked_since?: string;
  waiting_for?: string;
  waiting_expected_date?: string;
  waiting_since?: string;
  depends_on_task_id?: string;
  related_week?: string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  related_practice_id?: string;
}

export interface ExecutionFilter {
  status?: TaskStatus | 'all';
  context?: TaskContext | 'all';
  priority?: TaskPriority | 'all';
  life_area_id?: string | 'all';
  project_id?: string | 'all';
  goal_id?: string | 'all';
  is_next_action?: boolean;
  searchQuery?: string;
}

export interface TodayExecutionData {
  date: string;
  dailyPriorities: Task[];
  readyNow: Task[];
  inProgress: Task[];
  dueToday: Task[];
  overdue: Task[];
  blocked: Task[];
  waiting: Task[];
  completedToday: Task[];
  totalActiveCount: number;
}

export type ProjectHealthStatus = 'healthy' | 'friction' | 'needs_next_action' | 'stale';

export interface ProjectExecutionHealth {
  projectId: string;
  status: ProjectHealthStatus;
  label: string;
  reason: string;
  readyActionsCount: number;
  blockedCount: number;
  waitingCount: number;
  lastActivityDate?: string;
}

