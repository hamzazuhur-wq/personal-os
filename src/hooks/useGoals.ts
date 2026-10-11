import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGoalRepo } from '../app/providers/RepositoryProvider';
import { CreateGoalDTO, Goal, GoalFilter, GoalSortOption, UpdateGoalDTO } from '../types/goal.types';
import { pointService } from '../services/points/pointService';

export function useGoals(initialFilter?: GoalFilter) {
  const repo = useGoalRepo();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<GoalFilter>(initialFilter || { status: 'all' });
  const [sortBy, setSortBy] = useState<GoalSortOption>('target_date_asc');

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await repo.getGoals(filter);
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals:', err);
      setError('Unable to load goals.');
    } finally {
      setLoading(false);
    }
  }, [repo, filter]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const setFilter = (newFilter: Partial<GoalFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  };

  const createGoal = async (dto: CreateGoalDTO): Promise<Goal> => {
    try {
      const created = await repo.createGoal(dto);
      await fetchGoals();
      return created;
    } catch (err) {
      console.error('Failed to create goal:', err);
      throw err;
    }
  };

  const updateGoal = async (id: string, dto: UpdateGoalDTO): Promise<Goal> => {
    try {
      const updated = await repo.updateGoal(id, dto);
      await fetchGoals();
      return updated;
    } catch (err) {
      console.error('Failed to update goal:', err);
      throw err;
    }
  };

  const completeGoal = async (id: string, completionNote?: string): Promise<Goal> => {
    try {
      const updated = await repo.completeGoal(id, completionNote);
      // Module 08 Final: automatic, exactly-once award via the PointService.
      try {
        await pointService.awardOnGoalCompletion(updated);
      } catch (pointErr) {
        console.error('Failed to award goal completion points:', pointErr);
      }
      await fetchGoals();
      return updated;
    } catch (err) {
      console.error('Failed to complete goal:', err);
      throw err;
    }
  };

  const pauseGoal = async (id: string): Promise<Goal> => {
    try {
      const updated = await repo.pauseGoal(id);
      await fetchGoals();
      return updated;
    } catch (err) {
      console.error('Failed to pause goal:', err);
      throw err;
    }
  };

  const resumeGoal = async (id: string): Promise<Goal> => {
    try {
      const updated = await repo.resumeGoal(id);
      // Reopening a goal voids its completion award (append-only ledger).
      try {
        await pointService.revokeGoalCompletion(id);
      } catch (pointErr) {
        console.error('Failed to revoke goal completion points:', pointErr);
      }
      await fetchGoals();
      return updated;
    } catch (err) {
      console.error('Failed to resume goal:', err);
      throw err;
    }
  };

  const archiveGoal = async (id: string): Promise<Goal> => {
    try {
      const updated = await repo.archiveGoal(id);
      await fetchGoals();
      return updated;
    } catch (err) {
      console.error('Failed to archive goal:', err);
      throw err;
    }
  };

  const deleteGoal = async (id: string): Promise<void> => {
    try {
      await repo.deleteGoal(id);
      await fetchGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
      throw err;
    }
  };

  const getGoalById = useCallback(async (id: string): Promise<Goal | null> => {
    return repo.getGoal(id);
  }, [repo]);

  const getChildGoals = useCallback(async (parentId: string): Promise<Goal[]> => {
    return repo.getChildGoals(parentId);
  }, [repo]);

  // Client-side sorted view without modifying underlying store
  const sortedGoals = useMemo(() => {
    const priorityRank = { high: 3, medium: 2, low: 1 };
    const statusRank = { active: 4, draft: 3, paused: 2, completed: 1, cancelled: 0, archived: -1 };

    return [...goals].sort((a, b) => {
      // Default: Active goals first
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
  }, [goals, sortBy, filter.status]);

  // Computed summary metrics
  const stats = useMemo(() => {
    return {
      total: goals.length,
      active: goals.filter((g) => g.status === 'active').length,
      draft: goals.filter((g) => g.status === 'draft').length,
      paused: goals.filter((g) => g.status === 'paused').length,
      completed: goals.filter((g) => g.status === 'completed').length,
      archived: goals.filter((g) => g.status === 'archived').length,
      long_term: goals.filter((g) => g.time_horizon === 'long_term').length,
      annual: goals.filter((g) => g.time_horizon === 'annual').length,
      six_month: goals.filter((g) => g.time_horizon === 'six_month').length,
      monthly: goals.filter((g) => g.time_horizon === 'monthly').length,
      weekly: goals.filter((g) => g.time_horizon === 'weekly').length,
    };
  }, [goals]);

  const moveGoal = async (id: string, newParentGoalId: string | null): Promise<Goal> => {
    try {
      const updated = await repo.moveGoal(id, newParentGoalId);
      await fetchGoals();
      return updated;
    } catch (err) {
      console.error('Failed to move goal:', err);
      throw err;
    }
  };

  const getGoalPath = async (goalId: string): Promise<Goal[]> => {
    return repo.getGoalPath(goalId);
  };

  return {
    goals: sortedGoals,
    rawGoals: goals,
    loading,
    error,
    filter,
    sortBy,
    stats,
    setFilter,
    setSortBy,
    createGoal,
    updateGoal,
    completeGoal,
    pauseGoal,
    resumeGoal,
    archiveGoal,
    deleteGoal,
    getGoalById,
    getChildGoals,
    moveGoal,
    getGoalPath,
    refresh: fetchGoals,
  };
}
