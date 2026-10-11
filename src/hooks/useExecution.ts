import { useState, useEffect, useCallback } from 'react';
import { useTaskRepo, useProjectRepo, useGoalRepo } from '../app/providers/RepositoryProvider';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  ExecutionFilter,
  TodayExecutionData,
  ProjectExecutionHealth,
} from '../types/task.types';
import { Project } from '../types/project.types';
import { Goal } from '../types/goal.types';
import { GoalHierarchy } from '../utils/goalHierarchy';
import { pointService } from '../services/points/pointService';

export function useExecution(filter?: ExecutionFilter) {
  const taskRepo = useTaskRepo();
  const projectRepo = useProjectRepo();
  const goalRepo = useGoalRepo();

  const [todayData, setTodayData] = useState<TodayExecutionData | null>(null);
  const [readyActions, setReadyActions] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [projectHealthMap, setProjectHealthMap] = useState<Record<string, ProjectExecutionHealth>>({});

  const loadExecutionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [today, ready, allProjects, allGoals] = await Promise.all([
        taskRepo.getTodayExecution(),
        taskRepo.getReadyTasks(filter),
        projectRepo.getProjects(),
        goalRepo.getGoals(),
      ]);

      setTodayData(today);
      setReadyActions(ready);
      setProjects(allProjects);
      setGoals(allGoals);

      // Load project health for active projects
      const activeProjects = allProjects.filter((p) => p.status === 'active');
      const healthEntries = await Promise.all(
        activeProjects.map(async (p) => {
          const health = await taskRepo.getProjectExecutionHealth(p.id);
          return [p.id, health] as const;
        })
      );
      setProjectHealthMap(Object.fromEntries(healthEntries));
    } catch (err: any) {
      console.error('Failed to load execution system data:', err);
      setError('Unable to load execution data.');
    } finally {
      setLoading(false);
    }
  }, [taskRepo, projectRepo, goalRepo, filter]);

  useEffect(() => {
    loadExecutionData();
  }, [loadExecutionData]);

  const startTask = async (id: string): Promise<Task> => {
    try {
      setIsMutating(true);
      const updated = await taskRepo.startTask(id);
      await loadExecutionData();
      return updated;
    } finally {
      setIsMutating(false);
    }
  };

  const completeTask = async (id: string, completionNote?: string): Promise<Task> => {
    try {
      setIsMutating(true);
      const completed = await taskRepo.complete(id, completionNote);
      // Centralized point service: awards exactly once for practice-linked
      // tasks; tasks without a linked practice never award points.
      await pointService.awardForTaskCompletion({ task: completed });
      await loadExecutionData();
      return completed;
    } finally {
      setIsMutating(false);
    }
  };

  const blockTask = async (id: string, reason: string, blockedByTaskId?: string): Promise<Task> => {
    try {
      setIsMutating(true);
      const updated = await taskRepo.blockTask(id, reason, blockedByTaskId);
      await loadExecutionData();
      return updated;
    } finally {
      setIsMutating(false);
    }
  };

  const unblockTask = async (id: string): Promise<Task> => {
    try {
      setIsMutating(true);
      const updated = await taskRepo.unblockTask(id);
      await loadExecutionData();
      return updated;
    } finally {
      setIsMutating(false);
    }
  };

  const setWaitingTask = async (id: string, waitingFor: string, expectedDate?: string): Promise<Task> => {
    try {
      setIsMutating(true);
      const updated = await taskRepo.setWaitingTask(id, waitingFor, expectedDate);
      await loadExecutionData();
      return updated;
    } finally {
      setIsMutating(false);
    }
  };

  const markReady = async (id: string): Promise<Task> => {
    try {
      setIsMutating(true);
      const updated = await taskRepo.markReady(id);
      await pointService.revokeTaskCompletion(id);
      await loadExecutionData();
      return updated;
    } finally {
      setIsMutating(false);
    }
  };

  const setDailyPriorities = async (taskIds: string[]): Promise<void> => {
    try {
      setIsMutating(true);
      await taskRepo.setDailyPriorities(taskIds);
      await loadExecutionData();
    } finally {
      setIsMutating(false);
    }
  };

  const createTask = async (dto: CreateTaskDTO): Promise<Task> => {
    try {
      setIsMutating(true);
      const created = await taskRepo.create(dto);
      await loadExecutionData();
      return created;
    } finally {
      setIsMutating(false);
    }
  };

  const updateTask = async (id: string, dto: UpdateTaskDTO): Promise<Task> => {
    try {
      setIsMutating(true);
      const updated = await taskRepo.update(id, dto);
      await loadExecutionData();
      return updated;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      setIsMutating(true);
      const deleted = await taskRepo.delete(id);
      await loadExecutionData();
      return deleted;
    } finally {
      setIsMutating(false);
    }
  };

  // Computed lookup maps for rendering
  const projectMap: Record<string, string> = Object.fromEntries(
    projects.map((p) => [p.id, p.title])
  );

  const goalMap: Record<string, string> = Object.fromEntries(
    goals.map((g) => [g.id, GoalHierarchy.formatGoalPath(g.id, goals)])
  );

  return {
    todayData,
    readyActions,
    projects,
    goals,
    projectMap,
    goalMap,
    loading,
    error,
    isMutating,
    projectHealthMap,
    startTask,
    completeTask,
    blockTask,
    unblockTask,
    setWaitingTask,
    markReady,
    setDailyPriorities,
    createTask,
    updateTask,
    deleteTask,
    reloadExecution: loadExecutionData,
  };
}
