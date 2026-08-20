import React from 'react';
import { WeeklyOverviewData } from '../../types/weekly.types';
import { formatDuration } from '../../utils/formatters';
import { formatShortDate, getTodayDateString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

export interface WeeklyTimelineGridProps {
  data: WeeklyOverviewData;
  onSelectDate?: (date: string) => void;
}

export const WeeklyTimelineGrid: React.FC<WeeklyTimelineGridProps> = ({ data, onSelectDate }) => {
  const today = getTodayDateString();

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
          7-Day Execution Matrix (Monday → Sunday)
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {data.daily_breakdown.map((day) => {
          const isToday = day.date === today;
          const hasWork = day.activities.length > 0;

          return (
            <div
              key={day.date}
              onClick={() => onSelectDate && onSelectDate(day.date)}
              className={cn(
                'relative p-3.5 rounded-xl backdrop-blur-2xl border flex flex-col justify-between min-h-[145px] transition-all duration-200 overflow-hidden group',
                isToday
                  ? 'bg-gradient-to-b from-[#ff6a2a]/15 via-white/[0.04] to-white/[0.015] border-[#ff8a4a]/50 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_24px_-6px_rgba(255,106,42,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]'
                  : 'bg-gradient-to-b from-white/[0.05] to-white/[0.015] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07]',
                onSelectDate && 'cursor-pointer hover:-translate-y-0.5'
              )}
            >
              {/* Bottom Illumination on active day */}
              {isToday && (
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#ff6a2a]/25 via-[#ff8a4a]/08 to-transparent pointer-events-none" />
              )}

              {/* Day Header */}
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className={cn('text-xs font-bold uppercase font-mono tracking-wider', isToday ? 'text-[#fff4ec]' : 'text-text-primary')}>
                  {day.day_name.slice(0, 3)}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  {formatShortDate(day.date)}
                </span>
              </div>

              {/* Day Work Content */}
              <div className="flex-1 space-y-1.5 py-1 relative z-10">
                {hasWork ? (
                  day.activities.slice(0, 3).map((act) => (
                    <div
                      key={act.id}
                      className="text-[11px] text-text-secondary truncate bg-black/40 px-2 py-1 rounded-md border border-white/[0.06] font-medium"
                      title={act.title}
                    >
                      {act.title}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-[11px] text-text-muted/40 italic">
                    No output
                  </div>
                )}
                {day.activities.length > 3 && (
                  <div className="text-[10px] font-mono text-[#ff8a4a] text-center font-bold">
                    +{day.activities.length - 3} more
                  </div>
                )}
              </div>

              {/* Day Duration Total Footer */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between relative z-10">
                <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted">Total</span>
                <span
                  className={cn(
                    'text-xs font-mono font-bold',
                    hasWork ? 'text-[#fff4ec]' : 'text-text-muted'
                  )}
                >
                  {formatDuration(day.total_minutes)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
