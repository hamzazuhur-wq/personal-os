import { useCallback, useEffect, useState } from 'react';
import {
  PointLedgerEvent,
  PointLedgerFilter,
} from '../types/practice.types';
import { LevelRequirement } from '../types/level.types';
import { pointService } from '../services/points/pointService';
import { getTodayDateString } from '../utils/dateUtils';

export interface LifeAreaPointSummaryState {
  total: number;
  thisWeek: number;
  thisMonth: number;
}

export interface GoalPointsSummaryState {
  direct: number;
  subtree: number;
}

/**
 * Module 08 Final — single React entry point for the independent
 * Development Points system. Wraps the centralized PointService query
 * services (bounded indexed queries) and its manual-entry primitive.
 */
export function useDevelopmentPoints() {
  const [recentEvents, setRecentEvents] = useState<PointLedgerEvent[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const refreshRecent = useCallback(
    async (filter?: PointLedgerFilter, limit: number = 20) => {
      setLoadingRecent(true);
      try {
        const events = await pointService.getRecentEvents(filter, limit);
        setRecentEvents(events);
        return events;
      } finally {
        setLoadingRecent(false);
      }
    },
    []
  );

  const addDevelopmentPoints = useCallback(
    async (
      params: Parameters<typeof pointService.recordDevelopmentPointEvent>[0]
    ) => {
      const event = await pointService.recordDevelopmentPointEvent(params);
      // Keep any loaded history consistent after a successful write.
      setRecentEvents((prev) => [event, ...prev].slice(0, Math.max(prev.length, 20)));
      return event;
    },
    []
  );

  return {
    recentEvents,
    loadingRecent,
    refreshRecent,

    // Write path (manual point entry)
    addDevelopmentPoints,

    // Read paths (centralized query services)
    getLifeAreaPointSummary: pointService.getLifeAreaPointSummary.bind(pointService),
    getGoalPointsSummary: pointService.getGoalPointsSummary.bind(pointService),
    getProjectPoints: pointService.getProjectPoints.bind(pointService),
    getTaskPoints: pointService.getTaskPoints.bind(pointService),
    getActivityPoints: pointService.getActivityPoints.bind(pointService),
    getSkillPoints: pointService.getSkillPoints.bind(pointService),
    getLevelRequirementProgress: pointService.getLevelRequirementProgress.bind(pointService),
    getPeriodPointBreakdown: pointService.getPeriodPointBreakdown.bind(pointService),
  };
}

/** Loads a Life Area's point summary (id-stable) with manual reload. */
export function useLifeAreaPointSummary(lifeAreaId?: string | null) {
  const [summary, setSummary] = useState<LifeAreaPointSummaryState | null>(null);

  const reload = useCallback(async () => {
    if (!lifeAreaId) return;
    const s = await pointService.getLifeAreaPointSummary(lifeAreaId);
    setSummary(s);
  }, [lifeAreaId]);

  useEffect(() => {
    if (!lifeAreaId) {
      setSummary(null);
      return;
    }
    reload().catch(() => undefined);
  }, [lifeAreaId, reload]);

  return { summary, reload };
}

/** Loads direct + subtree totals for one goal. */
export function useGoalPointsSummary(goalId?: string | null) {
  const [summary, setSummary] = useState<GoalPointsSummaryState | null>(null);

  const reload = useCallback(async () => {
    if (!goalId) return;
    const s = await pointService.getGoalPointsSummary(goalId);
    setSummary(s);
  }, [goalId]);

  useEffect(() => {
    if (!goalId) {
      setSummary(null);
      return;
    }
    reload().catch(() => undefined);
  }, [goalId, reload]);

  return { summary, reload };
}

/** Loads progress toward one development_points level requirement. */
export function useRequirementProgress(requirement?: LevelRequirement | null) {
  const [progress, setProgress] = useState<{ current: number; target: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!requirement || requirement.type !== 'development_points') {
      setProgress(null);
      return;
    }
    pointService.getLevelRequirementProgress(requirement).then((p) => {
      if (!cancelled) setProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, [requirement?.id, requirement?.target_points, requirement?.points_life_area_id, requirement?.points_skill_id]);

  return progress;
}

/** Today's date string helper shared by entry forms (YYYY-MM-DD). */
export function todayDateString(): string {
  return getTodayDateString();
}
