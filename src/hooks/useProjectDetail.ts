import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProjectRepo, useTaskRepo, useActivityRepo } from '../app/providers/RepositoryProvider';
import { useGoals } from './useGoals';
import { useVision } from './useVision';
import { useLevels } from './useLevels';
import { Project, UpdateProjectDTO } from '../types/project.types';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../types/task.types';
import { Activity, CreateActivityDTO } from '../types/activity.types';

export function useProjectDetail(projectId: string) {
  const projectRepo = useProjectRepo();
  const taskRepo = useTaskRepo();
  const activityRepo = useActivityRepo();

  const { goals } = useGoals();
  const { lifeAreas, vision } = useVision();
  const { levels } = useLevels();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const proj = await projectRepo.getProject(projectId);
      if (!proj) {
        setError('Project not found.');
        return;
      }
      setProject(proj);

      const [projTasks, projActivities] = await Promise.all([
        projectRepo.getProjectTasks(projectId),
        projectRepo.getProjectActivities(projectId),
      ]);

      setTasks(projTasks);
      setActivities(projActivities);
    } catch (err) {
      console.error('Failed to load project details:', err);
      setError('Unable to load project workspace.');
    } finally {
      setLoading(false);
    }
  }, [projectId, projectRepo]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Project mutations
  const updateProject = async (dto: UpdateProjectDTO): Promise<Project> => {
    const updated = await projectRepo.updateProject(projectId, dto);
    await fetchProjectData();
    return updated;
  };

  const completeProject = async (outcomeNote?: string): Promise<Project> => {
    const updated = await projectRepo.completeProject(projectId, outcomeNote);
    await fetchProjectData();
    return updated;
  };

  const pauseProject = async (): Promise<Project> => {
    const updated = await projectRepo.pauseProject(projectId);
    await fetchProjectData();
    return updated;
  };

  const resumeProject = async (): Promise<Project> => {
    const updated = await projectRepo.resumeProject(projectId);
    await fetchProjectData();
    return updated;
  };

  const archiveProject = async (): Promise<Project> => {
    const updated = await projectRepo.archiveProject(projectId);
    await fetchProjectData();
    return updated;
  };

  // Task actions directly from Project workspace
  const createTask = async (dto: CreateTaskDTO): Promise<Task> => {
    const created = await taskRepo.create({
      ...dto,
      related_project_id: projectId,
      related_goal_id: dto.related_goal_id || project?.primary_goal_id,
      related_level_id: dto.related_level_id || project?.level_id,
    });
    await fetchProjectData();
    return created;
  };

  const updateTask = async (id: string, dto: UpdateTaskDTO): Promise<Task> => {
    const updated = await taskRepo.update(id, dto);
    await fetchProjectData();
    return updated;
  };

  const toggleCompleteTask = async (id: string, currentStatus: string): Promise<Task> => {
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    const updated = await taskRepo.update(id, {
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    await fetchProjectData();
    return updated;
  };

  // Activity actions from Project workspace
  const logActivity = async (dto: CreateActivityDTO): Promise<Activity> => {
    const created = await activityRepo.create({
      ...dto,
      related_project_id: projectId,
      related_goal_id: dto.related_goal_id || project?.primary_goal_id,
      related_level_id: dto.related_level_id || project?.level_id,
    });
    await fetchProjectData();
    return created;
  };

  // Relationship entities
  const primaryGoal = useMemo(() => {
    if (!project?.primary_goal_id) return null;
    return goals.find((g) => g.id === project.primary_goal_id) || null;
  }, [project?.primary_goal_id, goals]);

  const lifeArea = useMemo(() => {
    if (!project?.life_area_id) return null;
    return lifeAreas.find((la) => la.id === project.life_area_id) || null;
  }, [project?.life_area_id, lifeAreas]);

  const level = useMemo(() => {
    if (!project?.level_id) return null;
    return levels.find((l) => l.id === project.level_id) || null;
  }, [project?.level_id, levels]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const totalDurationMinutes = activities.reduce((acc, a) => acc + (a.duration_minutes || 0), 0);

    return {
      totalTasks,
      completedTasks,
      totalDurationMinutes,
    };
  }, [tasks, activities]);

  return {
    project,
    tasks,
    activities,
    primaryGoal,
    lifeArea,
    level,
    vision,
    stats,
    loading,
    error,
    updateProject,
    completeProject,
    pauseProject,
    resumeProject,
    archiveProject,
    createTask,
    updateTask,
    toggleCompleteTask,
    logActivity,
    refresh: fetchProjectData,
  };
}
