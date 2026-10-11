import { IdeaRevision } from '../../types/capture.types';

/**
 * Module 10 — Idea revision history (undo / audit safety net).
 * Every AI write (and every manual save) snapshots the full before-state.
 * Revisions are append-only: undo writes a NEW revision restoring prior
 * content; history is never deleted.
 */
export interface IIdeaRevisionRepository {
  listForCapture(captureId: string, limit?: number): Promise<IdeaRevision[]>;
  getLatestForCapture(captureId: string): Promise<IdeaRevision | null>;
  create(revision: Omit<IdeaRevision, 'id' | 'created_at'> & { id?: string }): Promise<IdeaRevision>;
}
