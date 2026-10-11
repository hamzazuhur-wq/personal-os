import { IIdeaRevisionRepository } from '../../contracts/IIdeaRevisionRepository';
import { IdeaRevision } from '../../../types/capture.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';

export class DexieIdeaRevisionRepository implements IIdeaRevisionRepository {
  async listForCapture(captureId: string, limit = 50): Promise<IdeaRevision[]> {
    const rows = await posDexieDb.idea_revisions
      .where('[capture_id+created_at]')
      .between([captureId, ''], [captureId, '\uffff'])
      .reverse()
      .limit(limit)
      .toArray();
    return rows;
  }

  async getLatestForCapture(captureId: string): Promise<IdeaRevision | null> {
    const rows = await this.listForCapture(captureId, 1);
    return rows[0] ?? null;
  }

  async create(
    revision: Omit<IdeaRevision, 'id' | 'created_at'> & { id?: string }
  ): Promise<IdeaRevision> {
    const record: IdeaRevision = {
      id: revision.id ?? generateId(),
      capture_id: revision.capture_id,
      editor: revision.editor,
      operation: revision.operation,
      reason: revision.reason,
      before_title: revision.before_title,
      before_content: revision.before_content,
      created_at: new Date().toISOString(),
    };
    await posDexieDb.idea_revisions.add(record);
    return record;
  }
}
