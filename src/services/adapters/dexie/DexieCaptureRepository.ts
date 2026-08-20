import { ICaptureRepository } from '../../contracts/ICaptureRepository';
import { Capture, CreateCaptureDTO, UpdateCaptureDTO, CaptureStatus } from '../../../types/capture.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';
import { APP_CONFIG } from '../../../config/app.config';

export class DexieCaptureRepository implements ICaptureRepository {
  async getAll(filter?: { status?: CaptureStatus }): Promise<Capture[]> {
    if (filter?.status) {
      return await posDexieDb.captures
        .where('status')
        .equals(filter.status)
        .reverse()
        .sortBy('created_at');
    }
    return await posDexieDb.captures.orderBy('created_at').reverse().toArray();
  }

  async getById(id: string): Promise<Capture | null> {
    const record = await posDexieDb.captures.get(id);
    return record || null;
  }

  async getRecent(limit: number = 5): Promise<Capture[]> {
    return await posDexieDb.captures
      .where('status')
      .notEqual('archived')
      .reverse()
      .sortBy('created_at')
      .then((records) => records.slice(0, limit));
  }

  async create(dto: CreateCaptureDTO): Promise<Capture> {
    const now = new Date().toISOString();
    const newRecord: Capture = {
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      content: dto.content.trim(),
      capture_type: dto.capture_type || 'unclassified',
      status: 'inbox',
      source: dto.source || 'manual',
      created_at: now,
      updated_at: now,
      related_project_id: dto.related_project_id,
      related_goal_id: dto.related_goal_id,
      related_level_id: dto.related_level_id,
      metadata: dto.metadata,
    };

    await posDexieDb.captures.add(newRecord);
    return newRecord;
  }

  async update(id: string, dto: UpdateCaptureDTO): Promise<Capture> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Capture record with ID "${id}" not found.`);
    }

    const updated: Capture = {
      ...existing,
      ...(dto.content !== undefined && { content: dto.content.trim() }),
      ...(dto.capture_type !== undefined && { capture_type: dto.capture_type }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.related_project_id !== undefined && { related_project_id: dto.related_project_id }),
      ...(dto.related_goal_id !== undefined && { related_goal_id: dto.related_goal_id }),
      ...(dto.related_level_id !== undefined && { related_level_id: dto.related_level_id }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updated_at: new Date().toISOString(),
    };

    await posDexieDb.captures.put(updated);
    return updated;
  }

  async archive(id: string): Promise<Capture> {
    return this.update(id, { status: 'archived' });
  }

  async delete(id: string): Promise<boolean> {
    await posDexieDb.captures.delete(id);
    return true;
  }

  async getInboxCount(): Promise<number> {
    return await posDexieDb.captures.where('status').equals('inbox').count();
  }
}
