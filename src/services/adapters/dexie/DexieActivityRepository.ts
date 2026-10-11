import { IActivityRepository } from '../../contracts/IActivityRepository';
import { Activity, CreateActivityDTO, UpdateActivityDTO, DailyActivitySummary } from '../../../types/activity.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';

export class DexieActivityRepository implements IActivityRepository {
  async getByDate(date: string): Promise<Activity[]> {
    return await posDexieDb.activities
      .where('date')
      .equals(date)
      .and((act) => act.status === 'active')
      .reverse()
      .sortBy('created_at');
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Activity[]> {
    return await posDexieDb.activities
      .where('date')
      .between(startDate, endDate, true, true)
      .and((act) => act.status === 'active')
      .reverse()
      .sortBy('date');
  }

  async getById(id: string): Promise<Activity | null> {
    const record = await posDexieDb.activities.get(id);
    return record || null;
  }

  async create(dto: CreateActivityDTO): Promise<Activity> {
    const now = new Date().toISOString();
    const newRecord: Activity = {
      id: generateId(),
      date: dto.date,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      start_time: dto.start_time,
      end_time: dto.end_time,
      duration_minutes: dto.duration_minutes || 0,
      category: dto.category || 'Deep Work',
      status: 'active',
      created_at: now,
      updated_at: now,
      related_project_id: dto.related_project_id,
      related_goal_id: dto.related_goal_id,
      related_level_id: dto.related_level_id,
      related_task_id: dto.related_task_id,
      related_life_area_id: dto.related_life_area_id,
      related_practice_id: dto.related_practice_id,
    };

    await posDexieDb.activities.add(newRecord);
    return newRecord;
  }

  async update(id: string, dto: UpdateActivityDTO): Promise<Activity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Activity record with ID "${id}" not found.`);
    }

    const updated: Activity = {
      ...existing,
      ...(dto.date !== undefined && { date: dto.date }),
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() }),
      ...(dto.start_time !== undefined && { start_time: dto.start_time }),
      ...(dto.end_time !== undefined && { end_time: dto.end_time }),
      ...(dto.duration_minutes !== undefined && { duration_minutes: dto.duration_minutes }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.related_project_id !== undefined && { related_project_id: dto.related_project_id }),
      ...(dto.related_goal_id !== undefined && { related_goal_id: dto.related_goal_id }),
      ...(dto.related_level_id !== undefined && { related_level_id: dto.related_level_id }),
      ...(dto.related_task_id !== undefined && { related_task_id: dto.related_task_id }),
      ...(dto.related_life_area_id !== undefined && { related_life_area_id: dto.related_life_area_id }),
      ...(dto.related_practice_id !== undefined && { related_practice_id: dto.related_practice_id }),
      updated_at: new Date().toISOString(),
    };

    await posDexieDb.activities.put(updated);
    return updated;
  }

  async archive(id: string): Promise<Activity> {
    return this.update(id, { status: 'archived' });
  }

  async delete(id: string): Promise<boolean> {
    await posDexieDb.activities.delete(id);
    return true;
  }

  async getDailySummary(date: string): Promise<DailyActivitySummary> {
    const activities = await this.getByDate(date);
    let totalMinutes = 0;
    const categoryBreakdown: Record<string, number> = {};

    for (const act of activities) {
      const duration = act.duration_minutes || 0;
      totalMinutes += duration;
      const cat = act.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + duration;
    }

    return {
      date,
      total_duration_minutes: totalMinutes,
      activity_count: activities.length,
      category_breakdown: categoryBreakdown,
    };
  }

  async getWeeklyDurationTotal(startDate: string, endDate: string): Promise<number> {
    const activities = await this.getByDateRange(startDate, endDate);
    return activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0);
  }
}
