export type CaptureType =
  | 'unclassified'
  | 'idea'
  | 'task'
  | 'note'
  | 'reflection'
  | 'question'
  | 'future_project'
  | 'business_idea'
  | 'personal_thought';

export type CaptureStatus = 'inbox' | 'organized' | 'archived';

export type CaptureSource = 'manual' | 'voice_placeholder' | 'quick_dock';

export interface Capture {
  id: string;
  user_id: string;
  content: string;
  capture_type: CaptureType;
  status: CaptureStatus;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
  source: CaptureSource;
  
  // Future architecture relationship hooks
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCaptureDTO {
  content: string;
  capture_type?: CaptureType;
  source?: CaptureSource;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCaptureDTO {
  content?: string;
  capture_type?: CaptureType;
  status?: CaptureStatus;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  metadata?: Record<string, unknown>;
}
