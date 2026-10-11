import { IPracticeRepository } from '../../contracts/IPracticeRepository';
import Dexie, { type Collection } from 'dexie';
import {
  Practice,
  CreatePracticeDTO,
  UpdatePracticeDTO,
  PracticeFilter,
  PointLedgerEvent,
  PointSourceType,
  RecordPointEventDTO,
  PointLedgerFilter,
  PracticeMetrics,
} from '../../../types/practice.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';
import { APP_CONFIG } from '../../../config/app.config';

export class DexiePracticeRepository implements IPracticeRepository {
  // ─── Practice Definitions ──────────────────────────────────

  async getPractices(filter?: PracticeFilter): Promise<Practice[]> {
    let collection = posDexieDb.practices.toCollection();
    let results = await collection.toArray();

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        results = results.filter((p) => p.status === filter.status);
      } else if (!filter.status) {
        // Default: exclude archived
        results = results.filter((p) => p.status !== 'archived');
      }

      if (filter.life_area_id && filter.life_area_id !== 'all') {
        results = results.filter((p) => p.life_area_id === filter.life_area_id);
      }

      if (filter.skill_id && filter.skill_id !== 'all') {
        results = results.filter((p) => p.skill_id === filter.skill_id);
      }

      if (filter.goal_id && filter.goal_id !== 'all') {
        results = results.filter((p) => p.goal_id === filter.goal_id);
      }

      if (filter.searchQuery && filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase();
        results = results.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
      }
    } else {
      results = results.filter((p) => p.status !== 'archived');
    }

    return results.sort((a, b) => a.title.localeCompare(b.title));
  }

  async getPractice(id: string): Promise<Practice | null> {
    const record = await posDexieDb.practices.get(id);
    return record || null;
  }

  async createPractice(dto: CreatePracticeDTO): Promise<Practice> {
    const now = new Date().toISOString();
    const newPractice: Practice = {
      ...dto,
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      status: dto.status || 'active',
      repeatable: dto.repeatable !== false,
      evidence_required: Boolean(dto.evidence_required),
      created_at: now,
      updated_at: now,
    };

    await posDexieDb.practices.add(newPractice);
    return newPractice;
  }

  async updatePractice(id: string, dto: UpdatePracticeDTO): Promise<Practice> {
    const existing = await this.getPractice(id);
    if (!existing) throw new Error(`Practice with ID ${id} not found.`);

    const now = new Date().toISOString();
    const updated: Practice = {
      ...existing,
      ...dto,
      updated_at: now,
    };

    await posDexieDb.practices.put(updated);
    return updated;
  }

  async archivePractice(id: string): Promise<Practice> {
    const existing = await this.getPractice(id);
    if (!existing) throw new Error(`Practice with ID ${id} not found.`);

    const now = new Date().toISOString();
    const updated: Practice = {
      ...existing,
      status: 'archived',
      archived_at: now,
      updated_at: now,
    };

    await posDexieDb.practices.put(updated);
    return updated;
  }

  async deletePractice(id: string): Promise<boolean> {
    await posDexieDb.practices.delete(id);
    return true;
  }

  // ─── Point Ledger Operations ────────────────────────────────

  async recordPointEvent(dto: RecordPointEventDTO): Promise<PointLedgerEvent> {
    // Keep lookup and insert in one IndexedDB transaction so two entry points
    // racing on the same stable source key cannot both award points.
    return posDexieDb.transaction('rw', posDexieDb.point_ledger, async () => {
      if (dto.source_type && dto.source_id) {
        const existing = await posDexieDb.point_ledger
          .where('[source_type+source_id]')
          .equals([dto.source_type, dto.source_id])
          .first();

        if (existing && existing.status === 'valid') return existing;
      }

      const now = new Date().toISOString();
      const event: PointLedgerEvent = {
        ...dto,
        id: generateId(),
        user_id: APP_CONFIG.defaultUserId,
        occurred_at: dto.occurred_at || now,
        created_at: now,
        status: 'valid',
      };

      await posDexieDb.point_ledger.add(event);
      return event;
    });
  }

  async getLedgerEventBySource(
    sourceType: PointSourceType,
    sourceId: string
  ): Promise<PointLedgerEvent | null> {
    const record = await posDexieDb.point_ledger
      .where('[source_type+source_id]')
      .equals([sourceType, sourceId])
      .first();
    return record || null;
  }

  async voidLedgerEventsBySource(
    sourceType: PointSourceType,
    sourceId: string
  ): Promise<number> {
    const events = await posDexieDb.point_ledger
      .where('[source_type+source_id]')
      .equals([sourceType, sourceId])
      .toArray();

    let voidedCount = 0;
    for (const ev of events) {
      if (ev.status === 'valid') {
        // Append-only semantics preserved: the row remains as an audit trail.
        await posDexieDb.point_ledger.put({ ...ev, status: 'voided' });
        voidedCount += 1;
      }
    }
    return voidedCount;
  }

  async createAdjustment(
    originalEventId: string,
    correctionPoints: number,
    reason: string
  ): Promise<PointLedgerEvent> {
    const original = await posDexieDb.point_ledger.get(originalEventId);
    if (!original) throw new Error(`Point event ${originalEventId} not found.`);

    const now = new Date().toISOString();
    const adjustmentEvent: PointLedgerEvent = {
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      practice_id: original.practice_id,
      points: correctionPoints, // e.g. -10
      source_type: 'adjustment',
      source_id: original.id,
      life_area_id: original.life_area_id,
      skill_id: original.skill_id,
      goal_id: original.goal_id,
      project_id: original.project_id,
      task_id: original.task_id,
      activity_id: original.activity_id,
      note: `Adjustment for event ${original.id}: ${reason}`,
      status: 'valid',
      occurred_at: now,
      created_at: now,
    };

    await posDexieDb.point_ledger.add(adjustmentEvent);
    return adjustmentEvent;
  }

  async getLedgerEvents(filter?: PointLedgerFilter): Promise<PointLedgerEvent[]> {
    let events = await posDexieDb.point_ledger.toArray();

    if (filter) {
      if (filter.practice_id) {
        events = events.filter((e) => e.practice_id === filter.practice_id);
      }
      if (filter.life_area_id) {
        events = events.filter((e) => e.life_area_id === filter.life_area_id);
      }
      if (filter.skill_id) {
        events = events.filter((e) => e.skill_id === filter.skill_id);
      }
      if (filter.goal_id) {
        events = events.filter((e) => e.goal_id === filter.goal_id);
      }
      if (filter.project_id) {
        events = events.filter((e) => e.project_id === filter.project_id);
      }
      if (filter.task_id) {
        events = events.filter((e) => e.task_id === filter.task_id);
      }
      if (filter.activity_id) {
        events = events.filter((e) => e.activity_id === filter.activity_id);
      }
      if (filter.source_type) {
        events = events.filter((e) =>
          Array.isArray(filter.source_type)
            ? filter.source_type.includes(e.source_type)
            : e.source_type === filter.source_type
        );
      }
      if (filter.startDate) {
        events = events.filter((e) => e.occurred_at >= filter.startDate!);
      }
      if (filter.endDate) {
        events = events.filter((e) => e.occurred_at <= filter.endDate!);
      }
    }

    // Sort by occurrence date descending (chronological audit trail)
    return events.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }

  async sumValidPoints(filter?: PointLedgerFilter): Promise<number> {
    let collection: Collection<PointLedgerEvent, string>;
    const f: PointLedgerFilter = filter || {};

    // Pick the most selective compound index available, then refine in-memory.
    if (f.life_area_id) {
      collection = posDexieDb.point_ledger
        .where('[life_area_id+status]')
        .equals([f.life_area_id, 'valid']);
    } else if (f.goal_id) {
      collection = posDexieDb.point_ledger.where('[goal_id+status]').equals([f.goal_id, 'valid']);
    } else if (f.project_id) {
      collection = posDexieDb.point_ledger
        .where('[project_id+status]')
        .equals([f.project_id, 'valid']);
    } else if (f.task_id) {
      collection = posDexieDb.point_ledger.where('[task_id+status]').equals([f.task_id, 'valid']);
    } else if (f.activity_id) {
      collection = posDexieDb.point_ledger
        .where('[activity_id+status]')
        .equals([f.activity_id, 'valid']);
    } else if (f.skill_id) {
      collection = posDexieDb.point_ledger.where('[skill_id+status]').equals([f.skill_id, 'valid']);
    } else if (f.practice_id) {
      collection = posDexieDb.point_ledger
        .where('[practice_id+status]')
        .equals([f.practice_id, 'valid']);
    } else {
      collection = posDexieDb.point_ledger.where('status').equals('valid');
    }

    const events = await collection.filter((e) => e.status === 'valid').toArray();

    return events
      .filter(
        (e) =>
          (!f.skill_id || e.skill_id === f.skill_id) &&
          (!f.practice_id || e.practice_id === f.practice_id) &&
          (!f.project_id || e.project_id === f.project_id) &&
          (!f.task_id || e.task_id === f.task_id) &&
          (!f.activity_id || e.activity_id === f.activity_id) &&
          (!f.source_type ||
            (Array.isArray(f.source_type)
              ? f.source_type.includes(e.source_type)
              : e.source_type === f.source_type)) &&
          (!f.startDate || e.occurred_at >= f.startDate) &&
          (!f.endDate || e.occurred_at <= f.endDate)
      )
      .reduce((sum, e) => sum + e.points, 0);
  }

  async getRecentPointEvents(
    filter?: PointLedgerFilter,
    limit: number = 20
  ): Promise<PointLedgerEvent[]> {
    const start = filter?.startDate ?? Dexie.minKey;
    const end = filter?.endDate ?? Dexie.maxKey;

    let collection: Collection<PointLedgerEvent, string> = posDexieDb.point_ledger
      .where('[status+occurred_at]')
      .between(['valid', start], ['valid', end], true, true)
      .reverse();

    if (filter) {
      const f = filter;
      collection = collection.filter(
        (e) =>
          e.status === 'valid' &&
          (!f.practice_id || e.practice_id === f.practice_id) &&
          (!f.life_area_id || e.life_area_id === f.life_area_id) &&
          (!f.skill_id || e.skill_id === f.skill_id) &&
          (!f.goal_id || e.goal_id === f.goal_id) &&
          (!f.project_id || e.project_id === f.project_id) &&
          (!f.task_id || e.task_id === f.task_id) &&
          (!f.activity_id || e.activity_id === f.activity_id) &&
          (!f.source_type ||
            (Array.isArray(f.source_type)
              ? f.source_type.includes(e.source_type)
              : e.source_type === f.source_type))
      );
    }

    // Streaming cursor: stops after `limit` matches — never scans the full ledger.
    return await collection.limit(limit).toArray();
  }

  async getPracticeMetrics(timeRange?: { start: string; end: string }): Promise<PracticeMetrics> {
    let events = await posDexieDb.point_ledger.where('status').equals('valid').toArray();

    if (timeRange) {
      events = events.filter(
        (e) => e.occurred_at >= timeRange.start && e.occurred_at <= timeRange.end
      );
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    let totalPoints = 0;
    let pointsThisWeek = 0;
    let pointsThisMonth = 0;
    const pointsByArea: Record<string, number> = {};
    const pointsBySkill: Record<string, number> = {};
    const pointsByGoal: Record<string, number> = {};

    for (const ev of events) {
      totalPoints += ev.points;

      if (ev.occurred_at >= weekAgo) {
        pointsThisWeek += ev.points;
      }
      if (ev.occurred_at >= monthAgo) {
        pointsThisMonth += ev.points;
      }

      if (ev.life_area_id) {
        pointsByArea[ev.life_area_id] = (pointsByArea[ev.life_area_id] || 0) + ev.points;
      }
      if (ev.skill_id) {
        pointsBySkill[ev.skill_id] = (pointsBySkill[ev.skill_id] || 0) + ev.points;
      }
      if (ev.goal_id) {
        pointsByGoal[ev.goal_id] = (pointsByGoal[ev.goal_id] || 0) + ev.points;
      }
    }

    return {
      totalPointsEarned: Math.max(0, totalPoints),
      pointsThisWeek: Math.max(0, pointsThisWeek),
      pointsThisMonth: Math.max(0, pointsThisMonth),
      totalCompletions: events.filter((e) => e.source_type !== 'adjustment').length,
      pointsByLifeArea: pointsByArea,
      pointsBySkill: pointsBySkill,
      pointsByGoal: pointsByGoal,
    };
  }

  async getPointsForCriteria(criteria: {
    life_area_id?: string;
    skill_id?: string;
    goal_id?: string;
    startDate?: string;
  }): Promise<number> {
    let events = await posDexieDb.point_ledger.where('status').equals('valid').toArray();

    if (criteria.life_area_id) {
      events = events.filter((e) => e.life_area_id === criteria.life_area_id);
    }
    if (criteria.skill_id) {
      events = events.filter((e) => e.skill_id === criteria.skill_id);
    }
    if (criteria.goal_id) {
      events = events.filter((e) => e.goal_id === criteria.goal_id);
    }
    if (criteria.startDate) {
      events = events.filter((e) => e.occurred_at >= criteria.startDate!);
    }

    return events.reduce((sum, e) => sum + e.points, 0);
  }
}
