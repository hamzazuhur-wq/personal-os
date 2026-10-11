import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProjectRepo } from '../app/providers/RepositoryProvider';
import {
  CreateProjectDTO,
  Project,
  ProjectFilter,
  ProjectMetrics,
  ProjectSortOption,
  UpdateProjectDTO,
} from '../types/project.types';

export function useProjects(initialFilter?: ProjectFilter) {
  const repo = useProjectRepo();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilterState] = useState<ProjectFilter>(initialFilter || { status: 'all' });
  const [sortBy, setSortBy] = useState<ProjectSortOption>('target_date_asc');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await repo.getProjects(filter);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Unable to load active projects.');
    } finally {
      setLoading(false);
    }
  }, [repo, filter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const setFilter = (newFilter: Partial<ProjectFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  };

  const createProject = async (dto: CreateProjectDTO): Promise<Project> => {
    try {
      const created = await repo.createProject(dto);
      await fetchProjects();
      return created;
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  };

  const updateProject = async (id: string, dto: UpdateProjectDTO): Promise<Project> => {
    try {
      const updated = await repo.updateProject(id, dto);
      await fetchProjects();
      return updated;
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const completeProject = async (id: string, outcomeNote?: string): Promise<Project> => {
    try {
      const updated = await repo.completeProject(id, outcomeNote);
      await fetchProjects();
      return updated;
    } catch (err) {
      console.error('Failed to complete project:', err);
      throw err;
    }
  };

  const pauseProject = async (id: string): Promise<Project> => {
    try {
      const updated = await repo.pauseProject(id);
      await fetchProjects();
      return updated;
    } catch (err) {
      console.error('Failed to pause project:', err);
      throw err;
    }
  };

  const resumeProject = async (id: string): Promise<Project> => {
    try {
      const updated = await repo.resumeProject(id);
      await fetchProjects();
      return updated;
    } catch (err) {
      console.error('Failed to resume project:', err);
      throw err;
    }
  };

  const archiveProject = async (id: string): Promise<Project> => {
    try {
      const updated = await repo.archiveProject(id);
      await fetchProjects();
      return updated;
    } catch (err) {
      console.error('Failed to archive project:', err);
      throw err;
    }
  };

  // Sorted view: Active first, then target date asc, then priority high -> low
  const sortedProjects = useMemo(() => {
    const priorityRank = { high: 3, medium: 2, low: 1 };
    const statusRank = { active: 4, draft: 3, paused: 2, completed: 1, cancelled: 0, archived: -1 };

    return [...projects].sort((a, b) => {
      // Default: Active projects first
      const statusDiff = (statusRank[b.status] || 0) - (statusRank[a.status] || 0);
      if (statusDiff !== 0 && filter.status === 'all') {
        return statusDiff;
      }

      switch (sortBy) {
        case 'target_date_asc':
          if (!a.target_date) return 1;
          if (!b.target_date) return -1;
          return a.target_date.localeCompare(b.target_date);
        case 'target_date_desc':
          if (!a.target_date) return 1;
          if (!b.target_date) return -1;
          return b.target_date.localeCompare(a.target_date);
        case 'priority_desc':
          return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
        case 'created_at_desc':
          return b.created_at.localeCompare(a.created_at);
        case 'title_asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [projects, sortBy, filter.status]);

  const metrics = useMemo<ProjectMetrics>(() => {
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      paused: projects.filter((p) => p.status === 'paused').length,
      draft: projects.filter((p) => p.status === 'draft').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      archived: projects.filter((p) => p.status === 'archived').length,
    };
  }, [projects]);

  return {
    projects: sortedProjects,
    rawProjects: projects,
    loading,
    error,
    filter,
    sortBy,
    metrics,
    setFilter,
    setSortBy,
    createProject,
    updateProject,
    completeProject,
    pauseProject,
    resumeProject,
    archiveProject,
    refresh: fetchProjects,
  };
}
