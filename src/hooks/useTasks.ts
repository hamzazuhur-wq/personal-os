import { useState, useEffect, useCallback } from 'react';
import { useTaskRepo } from '../app/providers/RepositoryProvider';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../types/task.types';
import { pointService } from '../services/points/pointService';

export function useTasks(statusFilter?: TaskStatus) {
  const repo = useTaskRepo();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<{ total: number; active: number; completed: number }>({
    total: 0,
    active: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, taskCounts] = await Promise.all([
        repo.getAll(statusFilter ? { status: statusFilter } : undefined),
        repo.getCounts(),
      ]);
      setTasks(data);
      setCounts(taskCounts);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Unable to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [repo, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (dto: CreateTaskDTO): Promise<Task> => {
    try {
      const created = await repo.create(dto);
      await fetchTasks();
      return created;
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, dto: UpdateTaskDTO): Promise<Task> => {
    try {
      const updated = await repo.update(id, dto);
      await fetchTasks();
      return updated;
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    }
  };

  const toggleTaskCompletion = async (id: string, currentlyCompleted: boolean): Promise<Task> => {
    try {
      if (currentlyCompleted) {
        const result = await repo.uncomplete(id);
        // Revoke any award granted when the task was completed.
        await pointService.revokeTaskCompletion(id);
        await fetchTasks();
        return result;
      }

      const completed = await repo.complete(id);
      // Centralized point service: awards exactly once for practice-linked
      // tasks; tasks without a linked practice never award points.
      await pointService.awardForTaskCompletion({ task: completed });
      await fetchTasks();
      return completed;
    } catch (err) {
      console.error('Failed to toggle task completion:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    try {
      await repo.delete(id);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      throw err;
    }
  };

  return {
    tasks,
    counts,
    loading,
    error,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    refreshTasks: fetchTasks,
  };
}
