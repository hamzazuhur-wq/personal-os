import { useCallback, useEffect, useState } from 'react';
import {
  AnalyticsFilter,
  LifeAreaDashboardData,
  ReviewOverview,
} from '../types/analytics.types';
import { MetricsBundle } from '../types/metrics.types';
import {
  getGoalScopedStats,
  getLifeAreaDashboard,
  getReviewOverview,
} from '../services/analytics/reviewAnalyticsService';
import { getMetricsBundle } from '../services/analytics/metricsService';

/**
 * Thin data hooks over the centralized review analytics services.
 * Requests are keyed by the serialized filter so changing the date
 * range / scope refetches exactly once. UI components only render
 * these prepared results — no business logic lives here.
 */

function serialize(filter: AnalyticsFilter | null): string {
  return filter ? JSON.stringify(filter) : '';
}

export function useReviewOverview(filter: AnalyticsFilter | null) {
  const [overview, setOverview] = useState<ReviewOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const key = serialize(filter);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getReviewOverview(JSON.parse(key) as AnalyticsFilter)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load review overview.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, refreshKey]);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);
  return { overview, isLoading, error, reload };
}

export function useLifeAreaDashboard(lifeAreaId: string | null, filter: AnalyticsFilter | null) {
  const [dashboard, setDashboard] = useState<LifeAreaDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const key = lifeAreaId && filter ? JSON.stringify({ lifeAreaId, filter }) : '';

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const parsed = JSON.parse(key) as { lifeAreaId: string; filter: AnalyticsFilter };
    getLifeAreaDashboard(parsed.lifeAreaId, parsed.filter)
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load area dashboard.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, refreshKey]);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);
  return { dashboard, isLoading, error, reload };
}

export function useGoalScopedStats(
  goalId: string | null,
  scope: 'exact' | 'subtree',
  filter: AnalyticsFilter | null
) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getGoalScopedStats>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = goalId && filter ? JSON.stringify({ goalId, scope, filter }) : '';

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const parsed = JSON.parse(key) as { goalId: string; scope: 'exact' | 'subtree'; filter: AnalyticsFilter };
    getGoalScopedStats(parsed.goalId, parsed.scope, parsed.filter)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load goal stats.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { stats, isLoading, error };
}

export function useMetrics(filter: AnalyticsFilter | null) {
  const [bundle, setBundle] = useState<MetricsBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const key = filter ? JSON.stringify(filter) : '';

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const parsed = JSON.parse(key) as AnalyticsFilter;
    getMetricsBundle(parsed)
      .then((data) => {
        if (!cancelled) setBundle(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load metrics.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, refreshKey]);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);
  return { bundle, isLoading, error, reload };
}
