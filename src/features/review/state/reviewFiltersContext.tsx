import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  AnalyticsDateRange,
  DateRangePreset,
} from '../../../types/analytics.types';
import { resolveDateRange } from '../../../services/analytics/reviewAnalyticsService';

/**
 * Module 09 — shared Review filter state.
 *
 * One global date range drives every period-based widget on the active
 * review view (§3). The selection is persisted to sessionStorage so
 * drill-down navigation and going back restore the analytical context
 * instead of resetting it (§43).
 */

const STORAGE_KEY = 'pos-review-filters';

export interface ReviewFilterContextValue {
  preset: DateRangePreset;
  customStart: string;
  customEnd: string;
  range: AnalyticsDateRange;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (startDate: string, endDate: string) => void;
}

const ReviewFilterContext = createContext<ReviewFilterContextValue | null>(null);

function loadPersisted(): { preset: DateRangePreset; customStart: string; customEnd: string } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.preset === 'string') {
        return {
          preset: parsed.preset,
          customStart: parsed.customStart || '',
          customEnd: parsed.customEnd || '',
        };
      }
    }
  } catch {
    // Corrupt session storage falls back to defaults.
  }
  return { preset: 'month', customStart: '', customEnd: '' };
}

export const ReviewFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(loadPersisted);

  const value = useMemo<ReviewFilterContextValue>(() => {
    const range = resolveDateRange(state.preset, {
      startDate: state.customStart,
      endDate: state.customEnd,
    });
    return {
      ...state,
      range,
      setPreset: (preset) => setState((s) => ({ ...s, preset })),
      setCustomRange: (startDate, endDate) =>
        setState({ preset: 'custom', customStart: startDate, customEnd: endDate }),
    };
  }, [state]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Storage unavailable — filters simply reset on reload.
    }
  }, [value]);

  return (
    <ReviewFilterContext.Provider value={value}>
      {children}
    </ReviewFilterContext.Provider>
  );
};

export function useReviewFilters(): ReviewFilterContextValue {
  const ctx = useContext(ReviewFilterContext);
  if (!ctx) throw new Error('useReviewFilters must be used within ReviewFilterProvider');
  return ctx;
}

/** Convenience: the current filter as an AnalyticsFilter payload. */
export function useAnalyticsFilter(lifeAreaId?: string): import('../../../types/analytics.types').AnalyticsFilter {
  const { range } = useReviewFilters();
  return useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      lifeAreaId,
    }),
    [range.startDate, range.endDate, lifeAreaId]
  );
}
