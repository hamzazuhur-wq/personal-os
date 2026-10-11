import { IGoalRepository } from '../../contracts/IGoalRepository';
import { CreateGoalDTO, Goal, GoalFilter, UpdateGoalDTO } from '../../../types/goal.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';
import { APP_CONFIG } from '../../../config/app.config';

export class DexieGoalRepository implements IGoalRepository {
  async getGoals(filter?: GoalFilter): Promise<Goal[]> {
    let collection = posDexieDb.goals.toCollection();

    let results = await collection.toArray();

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        results = results.filter((g) => g.status === filter.status);
      } else if (!filter.status) {
        // Default: exclude archived goals unless specifically asked
        results = results.filter((g) => g.status !== 'archived');
      }

      if (filter.life_area_id && filter.life_area_id !== 'all') {
        results = results.filter((g) => g.life_area_id === filter.life_area_id);
      }

      if (filter.time_horizon && filter.time_horizon !== 'all') {
        results = results.filter((g) => g.time_horizon === filter.time_horizon);
      }

      if (filter.priority && filter.priority !== 'all') {
        results = results.filter((g) => g.priority === filter.priority);
      }

      if (filter.searchQuery && filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        results = results.filter((g) =>
          g.title.toLowerCase().includes(query) ||
          (g.description && g.description.toLowerCase().includes(query))
        );
      }
    } else {
      // Default: exclude archived
      results = results.filter((g) => g.status !== 'archived');
    }

    return results;
  }

  async getGoal(id: string): Promise<Goal | null> {
    const record = await posDexieDb.goals.get(id);
    return record || null;
  }

  async createGoal(dto: CreateGoalDTO): Promise<Goal> {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      ...dto,
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      created_at: now,
      updated_at: now,
    };

    await posDexieDb.goals.add(newGoal);
    return newGoal;
  }

  async updateGoal(id: string, dto: UpdateGoalDTO): Promise<Goal> {
    const existing = await this.getGoal(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const updated: Goal = {
      ...existing,
      ...dto,
      updated_at: new Date().toISOString(),
    };

    await posDexieDb.goals.put(updated);
    return updated;
  }

  async completeGoal(id: string, completionNote?: string): Promise<Goal> {
    const existing = await this.getGoal(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updated: Goal = {
      ...existing,
      status: 'completed',
      completed_at: now,
      completion_note: completionNote !== undefined ? completionNote : existing.completion_note,
      updated_at: now,
    };

    await posDexieDb.goals.put(updated);
    return updated;
  }

  async pauseGoal(id: string): Promise<Goal> {
    const existing = await this.getGoal(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updated: Goal = {
      ...existing,
      status: 'paused',
      updated_at: now,
    };

    await posDexieDb.goals.put(updated);
    return updated;
  }

  async resumeGoal(id: string): Promise<Goal> {
    const existing = await this.getGoal(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updated: Goal = {
      ...existing,
      status: 'active',
      updated_at: now,
    };

    await posDexieDb.goals.put(updated);
    return updated;
  }

  async archiveGoal(id: string): Promise<Goal> {
    const existing = await this.getGoal(id);
    if (!existing) {
      throw new Error(`Goal with id "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updated: Goal = {
      ...existing,
      status: 'archived',
      archived_at: now,
      updated_at: now,
    };

    await posDexieDb.goals.put(updated);
    return updated;
  }

  async deleteGoal(id: string): Promise<void> {
    await posDexieDb.goals.delete(id);
  }

  async getChildGoals(parentGoalId: string): Promise<Goal[]> {
    return posDexieDb.goals.where('parent_goal_id').equals(parentGoalId).toArray();
  }

  async getGoalPath(goalId: string): Promise<Goal[]> {
    const allGoals = await posDexieDb.goals.toArray();
    const goalMap = new Map<string, Goal>(allGoals.map((g) => [g.id, g]));
    const path: Goal[] = [];
    const visited = new Set<string>();

    let current = goalMap.get(goalId);
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current);
      if (current.parent_goal_id) {
        current = goalMap.get(current.parent_goal_id);
      } else {
        break;
      }
    }
    return path;
  }

  async getGoalDescendants(goalId: string): Promise<Goal[]> {
    const allGoals = await posDexieDb.goals.toArray();
    const goalMap = new Map<string, Goal>(allGoals.map((g) => [g.id, g]));
    const childrenMap = new Map<string, string[]>();

    for (const g of allGoals) {
      if (g.parent_goal_id) {
        const list = childrenMap.get(g.parent_goal_id) || [];
        list.push(g.id);
        childrenMap.set(g.parent_goal_id, list);
      }
    }

    const descendants: Goal[] = [];
    const queue = [...(childrenMap.get(goalId) || [])];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const g = goalMap.get(currentId);
        if (g) descendants.push(g);
        const nextChildren = childrenMap.get(currentId) || [];
        queue.push(...nextChildren);
      }
    }

    return descendants;
  }

  async moveGoal(id: string, newParentGoalId: string | null): Promise<Goal> {
    const target = await this.getGoal(id);
    if (!target) throw new Error(`Goal ${id} not found.`);

    if (newParentGoalId) {
      if (newParentGoalId === id) {
        throw new Error('A goal cannot be set as its own parent.');
      }
      const descendants = await this.getGoalDescendants(id);
      const descendantIds = new Set(descendants.map((d) => d.id));
      if (descendantIds.has(newParentGoalId)) {
        throw new Error('Cannot move a goal under one of its own descendant sub-goals.');
      }
    }

    return this.updateGoal(id, {
      parent_goal_id: newParentGoalId || undefined,
    });
  }
}
