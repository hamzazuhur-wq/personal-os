// ============================================================
// MODULE 10 — IDEA WORKSPACE HOOK
// ============================================================
// Owns the SINGLE canonical Idea entity for one workspace session:
// - canvas editing (manual_save revisions)
// - title editing (title_update revisions)
// - attachments (attachment_change revisions)
// - undo: restores the LATEST revision's snapshot as a NEW 'undo'
//   revision. Revision history is never rewritten or deleted.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useCaptureRepo, useIdeaRevisionRepo } from '../app/providers/RepositoryProvider';
import { Capture, IdeaAttachment, IdeaRevision } from '../types/capture.types';

export function useIdeaWorkspace(ideaId: string | undefined) {
  const captureRepo = useCaptureRepo();
  const revisionRepo = useIdeaRevisionRepo();

  const [idea, setIdea] = useState<Capture | null>(null);
  const [revisions, setRevisions] = useState<IdeaRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!ideaId) {
      setIdea(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [loaded, revs] = await Promise.all([
        captureRepo.getById(ideaId),
        revisionRepo.listForCapture(ideaId, 50),
      ]);
      if (!loaded) {
        setError('This Idea does not exist.');
        setIdea(null);
      } else {
        // Module 11: ANY capture can open the shared workspace. Historical
        // (legacy capture_type) records remain untouched — they are simply
        // editable here like any other idea. New records are always 'idea'.
        setIdea(loaded);
        setRevisions(revs);
      }
    } catch (err) {
      console.error('Failed to load idea workspace:', err);
      setError('Unable to load this Idea.');
    } finally {
      setLoading(false);
    }
  }, [captureRepo, revisionRepo, ideaId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Manual canvas edit → snapshot BEFORE state into a manual_save revision. */
  const saveCanvas = useCallback(async (nextContent: string): Promise<boolean> => {
    if (!idea) return false;
    try {
      setSaving(true);
      await revisionRepo.create({
        capture_id: idea.id,
        editor: 'user',
        operation: 'manual_save',
        before_title: idea.title,
        before_content: idea.content,
      });
      const updated = await captureRepo.update(idea.id, { content: nextContent });
      setIdea(updated);
      setRevisions(await revisionRepo.listForCapture(idea.id, 50));
      return true;
    } catch (err) {
      console.error('Failed to save idea canvas:', err);
      setError('Failed to save changes.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [idea, captureRepo, revisionRepo]);

  const renameIdea = useCallback(async (title: string): Promise<boolean> => {
    if (!idea) return false;
    try {
      setSaving(true);
      await revisionRepo.create({
        capture_id: idea.id,
        editor: 'user',
        operation: 'title_update',
        before_title: idea.title,
        before_content: idea.content,
      });
      const updated = await captureRepo.update(idea.id, { title });
      setIdea(updated);
      setRevisions(await revisionRepo.listForCapture(idea.id, 50));
      return true;
    } catch (err) {
      console.error('Failed to rename idea:', err);
      setError('Failed to rename the Idea.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [idea, captureRepo, revisionRepo]);

  /** Module 11: change the user-defined Idea Category (metadata only). */
  const changeCategory = useCallback(async (categoryId: string | null): Promise<boolean> => {
    if (!idea) return false;
    try {
      const nextMeta: Record<string, unknown> = { ...(idea.metadata as any) };
      if (categoryId) nextMeta.idea_category_id = categoryId;
      else delete nextMeta.idea_category_id;
      const updated = await captureRepo.update(idea.id, { metadata: nextMeta });
      setIdea(updated);
      return true;
    } catch (err) {
      console.error('Failed to change category:', err);
      setError('Failed to change the category.');
      return false;
    }
  }, [idea, captureRepo]);

  const getAttachments = useCallback((): IdeaAttachment[] => {
    if (!idea) return [];
    const meta: any = idea.metadata || {};
    return Array.isArray(meta.attachments) ? meta.attachments : [];
  }, [idea]);

  const addAttachment = useCallback(async (att: Omit<IdeaAttachment, 'id' | 'created_at'>): Promise<boolean> => {
    if (!idea) return false;
    try {
      setSaving(true);
      const current = getAttachments();
      const next: IdeaAttachment[] = [
        ...current,
        { ...att, id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, created_at: new Date().toISOString() },
      ];
      await revisionRepo.create({
        capture_id: idea.id,
        editor: 'user',
        operation: 'attachment_change',
        reason: `Added ${att.type}`,
        before_title: idea.title,
        before_content: idea.content,
      });
      const updated = await captureRepo.update(idea.id, {
        metadata: { ...(idea.metadata as any), attachments: next },
      });
      setIdea(updated);
      return true;
    } catch (err) {
      console.error('Failed to add attachment:', err);
      setError('Failed to add attachment.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [idea, captureRepo, revisionRepo, getAttachments]);

  const removeAttachment = useCallback(async (attachmentId: string): Promise<boolean> => {
    if (!idea) return false;
    try {
      setSaving(true);
      const next = getAttachments().filter((a) => a.id !== attachmentId);
      await revisionRepo.create({
        capture_id: idea.id,
        editor: 'user',
        operation: 'attachment_change',
        reason: 'Removed attachment',
        before_title: idea.title,
        before_content: idea.content,
      });
      const updated = await captureRepo.update(idea.id, {
        metadata: { ...(idea.metadata as any), attachments: next },
      });
      setIdea(updated);
      return true;
    } catch (err) {
      console.error('Failed to remove attachment:', err);
      setError('Failed to remove attachment.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [idea, captureRepo, revisionRepo, getAttachments]);

  /**
   * Undo: restores the latest revision's BEFORE snapshot by creating a NEW
   * 'undo' revision. History itself stays intact.
   */
  const undoLatest = useCallback(async (): Promise<boolean> => {
    if (!idea) return false;
    try {
      setSaving(true);
      const latest = await revisionRepo.getLatestForCapture(idea.id);
      if (!latest) {
        setError('Nothing to undo yet.');
        return false;
      }
      await revisionRepo.create({
        capture_id: idea.id,
        editor: 'user',
        operation: 'undo',
        reason: `Undo of "${latest.operation}"`,
        before_title: idea.title,
        before_content: idea.content,
      });
      // The restored state IS the undone revision's before_* snapshot…
      const restored = await captureRepo.update(idea.id, {
        ...(latest.before_title !== undefined ? { title: latest.before_title ?? null } : {}),
        content: latest.before_content,
      });
      setIdea(restored);
      setRevisions(await revisionRepo.listForCapture(idea.id, 50));
      return true;
    } catch (err) {
      console.error('Failed to undo:', err);
      setError('Failed to undo.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [idea, captureRepo, revisionRepo]);

  return {
    idea,
    revisions,
    loading,
    error,
    saving,
    saveCanvas,
    renameIdea,
    changeCategory,
    getAttachments,
    addAttachment,
    removeAttachment,
    undoLatest,
    refresh: load,
  };
}
