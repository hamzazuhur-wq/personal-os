import { ITaskRepository } from '../../contracts/ITaskRepository';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../../../types/task.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';

export class DexieTaskRepository implements ITaskRepository {
  async getAll(filter?: { status?: TaskStatus; weekId?: string }): Promise<Task[]> {
    let query = posDexieDb.tasks.toCollection();

    if (filter?.status) {
      query = posDexieDb.tasks.where('status').equals(filter.status);
    }

    const tasks = await query.reverse().sortBy('created_at');

    if (filter?.weekId) {
      return tasks.filter((t) => t.related_week === filter.weekId);
    }
    return tasks;
  }

  async getById(id: string): Promise<Task | null> {
    const record = await posDexieDb.tasks.get(id);
    return record || null;
  }

  async getActive(limit?: number): Promise<Task[]> {
    const activeTasks = await posDexieDb.tasks
      .where('status')
      .anyOf(['not_started', 'in_progress'])
      .reverse()
      .sortBy('created_at');

    if (limit) {
      return activeTasks.slice(0, limit);
    }
    return activeTasks;
  }

  async create(dto: CreateTaskDTO): Promise<Task> {
    const now = new Date().toISOString();
    const newRecord: Task = {
      id: generateId(),
      title: dto.title.trim(),
      description: dto.description?.trim(),
      status: dto.status || 'not_started',
      priority: dto.priority || 'medium',
      due_date: dto.due_date,
      created_at: now,
      related_week: dto.related_week,
      related_project_id: dto.related_project_id,
      related_goal_id: dto.related_goal_id,
      related_level_id: dto.related_level_id,
    };

    await posDexieDb.tasks.add(newRecord);
    return newRecord;
  }

  async update(id: string, dto: UpdateTaskDTO): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Task record with ID "${id}" not found.`);
    }

    const updated: Task = {
      ...existing,
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.description !== undefined && { description: dto.description?.trim() }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.due_date !== undefined && { due_date: dto.due_date }),
      ...(dto.completed_at !== undefined && { completed_at: dto.completed_at }),
      ...(dto.related_week !== undefined && { related_week: dto.related_week }),
      ...(dto.related_project_id !== undefined && { related_project_id: dto.related_project_id }),
      ...(dto.related_goal_id !== undefined && { related_goal_id: dto.related_goal_id }),
      ...(dto.related_level_id !== undefined && { related_level_id: dto.related_level_id }),
    };

    await posDexieDb.tasks.put(updated);
    return updated;
  }

  async complete(id: string): Promise<Task> {
    const now = new Date().toISOString();
    return this.update(id, {
      status: 'completed',
      completed_at: now,
    });
  }

  async uncomplete(id: string): Promise<Task> {
    return this.update(id, {
      status: 'not_started',
      completed_at: undefined,
    });
  }

  async delete(id: string): Promise<boolean> {
    await posDexieDb.tasks.delete(id);
    return true;
  }

  async getCounts(): Promise<{ total: number; active: number; completed: number }> {
    const all = await posDexieDb.tasks.toArray();
    const active = all.filter((t) => t.status === 'not_started' || t.status === 'in_progress').length;
    const completed = all.filter((t) => t.status === 'completed').length;
    return {
      total: all.length,
      active,
      completed,
    };
  }
}
