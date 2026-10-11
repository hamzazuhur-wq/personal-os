import React from 'react';
import { DateRangePreset } from '../../../types/analytics.types';
import { formatShortDate } from '../../../utils/dateUtils';
import { useReviewFilters } from '../state/reviewFiltersContext';
import { cn } from '../../../utils/cn';

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

/**
 * The single global date-range control (§3). Every period-based metric on
 * the current review view derives from this selection, and the resolved
 * range is always visible next to it.
 */
export const DateRangeBar: React.FC<{ className?: string }> = ({ className }) => {
  const { preset, customStart, customEnd, range, setPreset, setCustomRange } = useReviewFilters();

  const rangeLabel =
    preset === 'today'
      ? formatShortDate(range.startDate)
      : `${formatShortDate(range.startDate)} – ${formatShortDate(range.endDate)}`;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap',
        className
      )}
      role="group"
      aria-label="Review date range"
    >
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-x-auto">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            aria-pressed={preset === p.id}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              preset === p.id && preset !== 'custom'
                ? 'bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a] text-[#0a0c10] shadow-[0_2px_12px_rgba(255,106,42,0.4)]'
                : 'text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.06]'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => {
            if (preset !== 'custom') {
              setCustomRange(range.startDate, range.endDate);
            }
          }}
          aria-pressed={preset === 'custom'}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
            preset === 'custom'
              ? 'bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a] text-[#0a0c10] shadow-[0_2px_12px_rgba(255,106,42,0.4)]'
              : 'text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.06]'
          )}
        >
          Custom
        </button>
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomRange(e.target.value || range.startDate, customEnd || range.endDate)}
            aria-label="Custom range start"
            className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-text-primary [color-scheme:dark] focus:outline-none focus:border-[#ff8a4a]/50"
          />
          <span>→</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(e) => setCustomRange(customStart || range.startDate, e.target.value || range.endDate)}
            aria-label="Custom range end"
            className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-text-primary [color-scheme:dark] focus:outline-none focus:border-[#ff8a4a]/50"
          />
        </div>
      )}

      <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_6px_rgba(255,138,74,0.7)]" />
        Period: <span className="text-text-secondary font-medium">{rangeLabel}</span>
      </span>
    </div>
  );
};
