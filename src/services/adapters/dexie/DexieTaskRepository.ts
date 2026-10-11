import { ITaskRepository } from '../../contracts/ITaskRepository';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatus,
  ExecutionFilter,
  TodayExecutionData,
  ProjectExecutionHealth,
  ProjectHealthStatus,
} from '../../../types/task.types';
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
      .anyOf(['not_started', 'ready', 'in_progress', 'blocked', 'waiting'])
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
      is_next_action: dto.is_next_action ?? (dto.status === 'ready'),
      next_action_title: dto.next_action_title?.trim(),
      context: dto.context,
      effort: dto.effort,
      estimated_minutes: dto.estimated_minutes,
      daily_priority_order: dto.daily_priority_order,
      blocked_reason: dto.blocked_reason?.trim(),
      blocked_by_task_id: dto.blocked_by_task_id,
      blocked_since: dto.status === 'blocked' ? now : undefined,
      waiting_for: dto.waiting_for?.trim(),
      waiting_expected_date: dto.waiting_expected_date,
      waiting_since: dto.status === 'waiting' ? now : undefined,
      depends_on_task_id: dto.depends_on_task_id,
      related_week: dto.related_week,
      related_project_id: dto.related_project_id,
      related_goal_id: dto.related_goal_id,
      related_level_id: dto.related_level_id,
      related_practice_id: dto.related_practice_id,
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
      ...(dto.is_next_action !== undefined && { is_next_action: dto.is_next_action }),
      ...(dto.next_action_title !== undefined && { next_action_title: dto.next_action_title?.trim() }),
      ...(dto.context !== undefined && { context: dto.context }),
      ...(dto.effort !== undefined && { effort: dto.effort }),
      ...(dto.estimated_minutes !== undefined && { estimated_minutes: dto.estimated_minutes }),
      ...(dto.daily_priority_order !== undefined && { daily_priority_order: dto.daily_priority_order }),
      ...(dto.started_at !== undefined && { started_at: dto.started_at }),
      ...(dto.completion_note !== undefined && { completion_note: dto.completion_note?.trim() }),
      ...(dto.blocked_reason !== undefined && { blocked_reason: dto.blocked_reason?.trim() }),
      ...(dto.blocked_by_task_id !== undefined && { blocked_by_task_id: dto.blocked_by_task_id }),
      ...(dto.blocked_since !== undefined && { blocked_since: dto.blocked_since }),
      ...(dto.waiting_for !== undefined && { waiting_for: dto.waiting_for?.trim() }),
      ...(dto.waiting_expected_date !== undefined && { waiting_expected_date: dto.waiting_expected_date }),
      ...(dto.waiting_since !== undefined && { waiting_since: dto.waiting_since }),
      ...(dto.depends_on_task_id !== undefined && { depends_on_task_id: dto.depends_on_task_id }),
      ...(dto.related_week !== undefined && { related_week: dto.related_week }),
      ...(dto.related_project_id !== undefined && { related_project_id: dto.related_project_id }),
      ...(dto.related_goal_id !== undefined && { related_goal_id: dto.related_goal_id }),
      ...(dto.related_level_id !== undefined && { related_level_id: dto.related_level_id }),
      ...(dto.related_practice_id !== undefined && { related_practice_id: dto.related_practice_id }),
    };

    await posDexieDb.tasks.put(updated);
    return updated;
  }

  async complete(id: string, completionNote?: string): Promise<Task> {
    const now = new Date().toISOString();
    return this.update(id, {
      status: 'completed',
      completed_at: now,
      completion_note: completionNote,
      daily_priority_order: null,
    });
  }

  async uncomplete(id: string): Promise<Task> {
    return this.update(id, {
      status: 'ready',
      completed_at: undefined,
      completion_note: undefined,
    });
  }

  async delete(id: string): Promise<boolean> {
    await posDexieDb.tasks.delete(id);
    return true;
  }

  async getCounts(): Promise<{ total: number; active: number; completed: number }> {
    const all = await posDexieDb.tasks.toArray();
    const active = all.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;
    const completed = all.filter((t) => t.status === 'completed').length;
    return {
      total: all.length,
      active,
      completed,
    };
  }

  // ─── Module 07 Execution Extensions ─────────────────────────

  async getReadyTasks(filter?: ExecutionFilter): Promise<Task[]> {
    const allTasks = await posDexieDb.tasks.toArray();
    const completedTaskIds = new Set(
      allTasks.filter((t) => t.status === 'completed').map((t) => t.id)
    );

    let readyTasks = allTasks.filter((task) => {
      // Must be explicitly ready or in_progress, or not_started with is_next_action
      const isCandidate =
        task.status === 'ready' ||
        task.status === 'in_progress' ||
        (task.status === 'not_started' && task.is_next_action);

      if (!isCandidate) return false;

      // Check dependency resolution
      if (task.depends_on_task_id && !completedTaskIds.has(task.depends_on_task_id)) {
        return false;
      }

      return true;
    });

    if (filter?.context && filter.context !== 'all') {
      readyTasks = readyTasks.filter((t) => t.context === filter.context);
    }
    if (filter?.priority && filter.priority !== 'all') {
      readyTasks = readyTasks.filter((t) => t.priority === filter.priority);
    }
    if (filter?.project_id && filter.project_id !== 'all') {
      readyTasks = readyTasks.filter((t) => t.related_project_id === filter.project_id);
    }
    if (filter?.goal_id && filter.goal_id !== 'all') {
      const allGoals = await posDexieDb.goals.toArray();
      const childrenMap = new Map<string, string[]>();
      for (const g of allGoals) {
        if (g.parent_goal_id) {
          const list = childrenMap.get(g.parent_goal_id) || [];
          list.push(g.id);
          childrenMap.set(g.parent_goal_id, list);
        }
      }
      const goalSubtreeIds = new Set<string>([filter.goal_id]);
      const queue = [...(childrenMap.get(filter.goal_id) || [])];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (!goalSubtreeIds.has(id)) {
          goalSubtreeIds.add(id);
          const nextKids = childrenMap.get(id) || [];
          queue.push(...nextKids);
        }
      }
      readyTasks = readyTasks.filter((t) => t.related_goal_id && goalSubtreeIds.has(t.related_goal_id));
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      readyTasks = readyTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.next_action_title && t.next_action_title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sort by execution hierarchy
    return this.sortExecutionTasks(readyTasks);
  }

  async getTodayExecution(date?: string): Promise<TodayExecutionData> {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const allTasks = await posDexieDb.tasks.toArray();
    const readyTasks = await this.getReadyTasks();

    const inProgress = allTasks.filter((t) => t.status === 'in_progress');
    const blocked = allTasks.filter((t) => t.status === 'blocked');
    const waiting = allTasks.filter((t) => t.status === 'waiting');
    
    // Daily Priorities (tasks tagged with order 1, 2, 3 and not completed)
    const dailyPriorities = allTasks
      .filter((t) => t.daily_priority_order !== null && t.daily_priority_order !== undefined && t.status !== 'completed')
      .sort((a, b) => (a.daily_priority_order || 99) - (b.daily_priority_order || 99));

    // Due Today
    const dueToday = allTasks.filter(
      (t) => t.due_date === targetDate && t.status !== 'completed' && t.status !== 'cancelled'
    );

    // Overdue
    const overdue = allTasks.filter(
      (t) => t.due_date && t.due_date < targetDate && t.status !== 'completed' && t.status !== 'cancelled'
    );

    // Completed Today
    const completedToday = allTasks.filter(
      (t) => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(targetDate)
    );

    const totalActiveCount = allTasks.filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled'
    ).length;

    return {
      date: targetDate,
      dailyPriorities,
      readyNow: readyTasks,
      inProgress,
      dueToday,
      overdue,
      blocked,
      waiting,
      completedToday,
      totalActiveCount,
    };
  }

  async getInProgressTasks(): Promise<Task[]> {
    return posDexieDb.tasks.where('status').equals('in_progress').toArray();
  }

  async getBlockedTasks(): Promise<Task[]> {
    return posDexieDb.tasks.where('status').equals('blocked').toArray();
  }

  async getWaitingTasks(): Promise<Task[]> {
    return posDexieDb.tasks.where('status').equals('waiting').toArray();
  }

  async getOverdueTasks(referenceDate?: string): Promise<Task[]> {
    const today = referenceDate || new Date().toISOString().slice(0, 10);
    const tasks = await posDexieDb.tasks.toArray();
    return tasks.filter(
      (t) => t.due_date && t.due_date < today && t.status !== 'completed' && t.status !== 'cancelled'
    );
  }

  async startTask(id: string): Promise<Task> {
    const now = new Date().toISOString();
    return this.update(id, {
      status: 'in_progress',
      started_at: now,
      blocked_reason: undefined,
      blocked_since: undefined,
      waiting_for: undefined,
      waiting_since: undefined,
    });
  }

  async blockTask(id: string, reason: string, blockedByTaskId?: string): Promise<Task> {
    const now = new Date().toISOString();
    return this.update(id, {
      status: 'blocked',
      blocked_reason: reason.trim(),
      blocked_by_task_id: blockedByTaskId,
      blocked_since: now,
    });
  }

  async unblockTask(id: string): Promise<Task> {
    return this.update(id, {
      status: 'ready',
      blocked_reason: undefined,
      blocked_by_task_id: undefined,
      blocked_since: undefined,
    });
  }

  async setWaitingTask(id: string, waitingFor: string, expectedDate?: string): Promise<Task> {
    const now = new Date().toISOString();
    return this.update(id, {
      status: 'waiting',
      waiting_for: waitingFor.trim(),
      waiting_expected_date: expectedDate,
      waiting_since: now,
    });
  }

  async markReady(id: string): Promise<Task> {
    return this.update(id, {
      status: 'ready',
      is_next_action: true,
      blocked_reason: undefined,
      blocked_since: undefined,
      waiting_for: undefined,
      waiting_since: undefined,
    });
  }

  async setDailyPriorities(taskIds: string[]): Promise<void> {
    // Clear all existing daily priorities first
    const all = await posDexieDb.tasks.toArray();
    for (const task of all) {
      if (task.daily_priority_order !== null && task.daily_priority_order !== undefined) {
        await posDexieDb.tasks.update(task.id, { daily_priority_order: null });
      }
    }

    // Set order for top 3 IDs
    for (let i = 0; i < taskIds.length && i < 3; i++) {
      await posDexieDb.tasks.update(taskIds[i], {
        daily_priority_order: i + 1,
        status: 'ready',
      });
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return posDexieDb.tasks.where('related_project_id').equals(projectId).toArray();
  }

  async getTasksByGoal(goalId: string, includeDescendants: boolean = false): Promise<Task[]> {
    if (!includeDescendants) {
      return posDexieDb.tasks.where('related_goal_id').equals(goalId).toArray();
    }

    const allGoals = await posDexieDb.goals.toArray();
    const childrenMap = new Map<string, string[]>();
    for (const g of allGoals) {
      if (g.parent_goal_id) {
        const list = childrenMap.get(g.parent_goal_id) || [];
        list.push(g.id);
        childrenMap.set(g.parent_goal_id, list);
      }
    }

    const subtreeGoalIds = new Set<string>([goalId]);
    const queue = [...(childrenMap.get(goalId) || [])];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (!subtreeGoalIds.has(id)) {
        subtreeGoalIds.add(id);
        const nextKids = childrenMap.get(id) || [];
        queue.push(...nextKids);
      }
    }

    const allTasks = await posDexieDb.tasks.toArray();
    return allTasks.filter((t) => t.related_goal_id && subtreeGoalIds.has(t.related_goal_id));
  }

  async moveTask(id: string, newGoalId?: string, newProjectId?: string): Promise<Task> {
    return this.update(id, {
      related_goal_id: newGoalId || undefined,
      related_project_id: newProjectId || undefined,
    });
  }

  async getProjectExecutionHealth(projectId: string): Promise<ProjectExecutionHealth> {
    const projectTasks = await this.getTasksByProject(projectId);
    const activities = await posDexieDb.activities
      .where('related_project_id')
      .equals(projectId)
      .toArray();

    const readyActions = projectTasks.filter(
      (t) => t.status === 'ready' || t.status === 'in_progress'
    );
    const blockedTasks = projectTasks.filter((t) => t.status === 'blocked');
    const waitingTasks = projectTasks.filter((t) => t.status === 'waiting');

    // Sort activities by date descending to find latest activity
    const sortedActivities = activities.sort((a, b) => b.date.localeCompare(a.date));
    const lastActivityDate = sortedActivities[0]?.date;

    const today = new Date().toISOString().slice(0, 10);
    const isStale = lastActivityDate
      ? (new Date(today).getTime() - new Date(lastActivityDate).getTime()) / (1000 * 3600 * 24) > 14
      : projectTasks.length > 0 && readyActions.length === 0;

    let status: ProjectHealthStatus = 'healthy';
    let label = 'Healthy Execution';
    let reason = 'Active next actions available and progressing';

    if (blockedTasks.length > 0) {
      status = 'friction';
      label = 'Blocked / Friction';
      reason = `${blockedTasks.length} task(s) currently blocked by dependencies`;
    } else if (readyActions.length === 0) {
      status = 'needs_next_action';
      label = 'Needs Next Action';
      reason = 'No currently executable next physical action defined';
    } else if (isStale) {
      status = 'stale';
      label = 'Stalled Execution';
      reason = 'No active work logged for over 14 days';
    }

    return {
      projectId,
      status,
      label,
      reason,
      readyActionsCount: readyActions.length,
      blockedCount: blockedTasks.length,
      waitingCount: waitingTasks.length,
      lastActivityDate,
    };
  }

  private sortExecutionTasks(tasks: Task[]): Task[] {
    const today = new Date().toISOString().slice(0, 10);
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...tasks].sort((a, b) => {
      // 1. Daily priority order (1, 2, 3 first)
      if (a.daily_priority_order && !b.daily_priority_order) return -1;
      if (!a.daily_priority_order && b.daily_priority_order) return 1;
      if (a.daily_priority_order && b.daily_priority_order) {
        return a.daily_priority_order - b.daily_priority_order;
      }

      // 2. Overdue first
      const aOverdue = a.due_date && a.due_date < today;
      const bOverdue = b.due_date && b.due_date < today;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 3. Due today
      const aDueToday = a.due_date === today;
      const bDueToday = b.due_date === today;
      if (aDueToday && !bDueToday) return -1;
      if (!aDueToday && bDueToday) return 1;

      // 4. In progress items
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;

      // 5. Explicit priority
      const aPri = priorityWeight[a.priority || 'medium'] || 2;
      const bPri = priorityWeight[b.priority || 'medium'] || 2;
      if (aPri !== bPri) return bPri - aPri;

      // 6. Next action flag
      if (a.is_next_action && !b.is_next_action) return -1;
      if (!a.is_next_action && b.is_next_action) return 1;

      // 7. Creation date (oldest first for FIFO execution)
      return a.created_at.localeCompare(b.created_at);
    });
  }
}
