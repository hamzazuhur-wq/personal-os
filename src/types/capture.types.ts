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

// Module 10: Idea Capture — attachment metadata (links/images).
// Binary files are NEVER stored or transmitted to AI providers; the agent
// receives metadata only.
export interface IdeaAttachment {
  id: string;
  type: 'link' | 'image';
  url: string;
  label?: string;
  created_at: string;
}

export interface Capture {
  id: string;
  user_id: string;
  content: string;
  capture_type: CaptureType;
  status: CaptureStatus;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
  source: CaptureSource;

  // Module 10: optional display title. Legacy captures have no title —
  // the UI falls back to a content preview. Never mass-migrated.
  title?: string;

  // Future architecture relationship hooks
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// MODULE 10: IDEA REVISIONS (undo / history)
// ============================================================

export type IdeaRevisionOperation =
  | 'manual_save'
  | 'title_update'
  | 'attachment_change'
  | 'ai_append'
  | 'ai_insert'
  | 'ai_replace'
  | 'ai_remove'
  | 'ai_reorder'
  | 'ai_rename'
  | 'ai_title'
  | 'ai_rewrite'
  | 'undo';

export interface IdeaRevision {
  id: string;
  capture_id: string;
  editor: 'user' | 'ai';
  operation: IdeaRevisionOperation;
  reason?: string;
  /** Full before-state snapshot — enough to reconstruct the prior content. */
  before_title?: string;
  before_content: string;
  created_at: string;
}

export interface CreateCaptureDTO {
  content: string;
  capture_type?: CaptureType;
  source?: CaptureSource;
  title?: string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCaptureDTO {
  content?: string;
  capture_type?: CaptureType;
  status?: CaptureStatus;
  title?: string;
  related_project_id?: string;
  related_goal_id?: string;
  related_level_id?: string;
  metadata?: Record<string, unknown>;
}
