import React from 'react';
import { DailyActivitySummary } from '../../types/activity.types';
import { ACTIVITY_CATEGORIES } from '../../constants/categories';
import { formatDuration } from '../../utils/formatters';
import { StatWidget } from '../../components/shared/StatWidget';
import { Clock, Activity as ActivityIcon, Layers } from 'lucide-react';

export interface DailyMetricsProps {
  summary: DailyActivitySummary;
}

export const DailyMetrics: React.FC<DailyMetricsProps> = ({ summary }) => {
  const topCategoryEntry = Object.entries(summary.category_breakdown).sort(
    ([, a], [, b]) => b - a
  )[0];

  return (
    <div className="space-y-4">
      {/* 3 Top-level Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatWidget
          label="Total Real Output"
          value={formatDuration(summary.total_duration_minutes)}
          subtext="Actual time logged"
          icon={Clock}
          accentColor="orange"
        />
        <StatWidget
          label="Sessions Logged"
          value={summary.activity_count}
          subtext="Discrete focused blocks"
          icon={ActivityIcon}
          accentColor="emerald"
        />
        <StatWidget
          label="Primary Category"
          value={topCategoryEntry ? topCategoryEntry[0] : 'None'}
          subtext={topCategoryEntry ? formatDuration(topCategoryEntry[1]) : 'No entries'}
          icon={Layers}
          accentColor="purple"
        />
      </div>

      {/* Category Distribution Bar with Vertical Bottom Illumination */}
      {summary.total_duration_minutes > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2.5 flex items-center justify-between">
            <span>Output Distribution Matrix</span>
            <span className="text-[#fff4ec] font-mono">{summary.total_duration_minutes} mins total</span>
          </div>

          {/* Luminous Stacked Bar with Vertical Gradient Bloom */}
          <div className="h-3 rounded-full overflow-hidden flex bg-black/50 border border-white/[0.06] p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
            {Object.entries(summary.category_breakdown).map(([catName, mins]) => {
              const meta = ACTIVITY_CATEGORIES.find((c) => c.id === catName);
              const percent = (mins / summary.total_duration_minutes) * 100;
              return (
                <div
                  key={catName}
                  style={{
                    width: `${percent}%`,
                    backgroundColor: meta?.color || '#ff6a2a',
                    boxShadow: `0 2px 10px -1px ${meta?.color || '#ff6a2a'}80`,
                  }}
                  className="h-full rounded-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  title={`${catName}: ${mins}m (${percent.toFixed(0)}%)`}
                />
              );
            })}
          </div>

          {/* Category Legend */}
          <div className="flex flex-wrap items-center gap-3.5 mt-3 pt-2 border-t border-white/[0.05]">
            {Object.entries(summary.category_breakdown).map(([catName, mins]) => {
              const meta = ACTIVITY_CATEGORIES.find((c) => c.id === catName);
              return (
                <div key={catName} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                    style={{ backgroundColor: meta?.color || '#ff6a2a' }}
                  />
                  <span>{catName}</span>
                  <span className="font-mono text-[11px] text-text-muted font-semibold">({mins}m)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
