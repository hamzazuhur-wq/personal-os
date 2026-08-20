import React from 'react';
import { useActivities } from '../../hooks/useActivities';
import { formatDuration } from '../../utils/formatters';
import { Plus, ArrowRight } from 'lucide-react';
import { ACTIVITY_CATEGORIES } from '../../constants/categories';

export interface TodayActivitySummaryProps {
  onNavigateToDaily: () => void;
  onOpenAddActivity: () => void;
}

export const TodayActivitySummary: React.FC<TodayActivitySummaryProps> = ({
  onNavigateToDaily,
  onOpenAddActivity,
}) => {
  const { activities, summary, loading } = useActivities();

  return (
    <div className="relative h-full rounded-2xl overflow-hidden group">
      {/* Strong elevated glass surface */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,24,33,0.70)] via-[rgba(14,17,24,0.78)] to-[rgba(10,12,17,0.88)] backdrop-blur-[30px] border border-white/[0.09]" />
      {/* Top hairline */}
      <div className="absolute top-0 left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {/* Bottom warm bloom — strong at base */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#ff6a2a]/[0.10] via-[#ff6a2a]/[0.03] to-transparent pointer-events-none" />
      {/* Outer shadow */}
      <div className="absolute inset-0 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)] group-hover:shadow-[0_20px_56px_rgba(0,0,0,0.55),0_0_30px_-8px_rgba(255,106,42,0.12)] transition-shadow duration-400" />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full min-h-[260px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.20em] text-text-muted">
            Today's Execution
          </span>
          <button
            onClick={onNavigateToDaily}
            className="text-[11px] font-mono text-text-muted hover:text-[#ff8a4a] flex items-center gap-1 transition-colors cursor-pointer"
          >
            Daily Log <ArrowRight className="w-3 h-3 inline" />
          </button>
        </div>

        {/* Hero metric */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-5xl sm:text-6xl font-extrabold font-mono text-[#fff4ec] tracking-tight leading-none tabular-nums">
              {formatDuration(summary.total_duration_minutes)}
            </div>
            <div className="text-xs text-text-muted mt-2 font-medium">
              {summary.activity_count} {summary.activity_count === 1 ? 'session' : 'sessions'} logged today
            </div>
          </div>

          <button
            onClick={onOpenAddActivity}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff6a2a]/18 text-[#fff4ec] border border-[#ff8a4a]/35 text-xs font-semibold hover:bg-[#ff6a2a]/28 hover:-translate-y-0.5 transition-all cursor-pointer shadow-[0_2px_14px_rgba(255,106,42,0.18)] backdrop-blur-md mb-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Log Output
          </button>
        </div>

        {/* Activity rows */}
        <div className="space-y-2 flex-1">
          {loading ? (
            <div className="text-xs text-text-muted/50 py-2">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="py-5 text-center">
              <div className="text-xs text-text-muted/40 italic">No work recorded yet today.</div>
            </div>
          ) : (
            activities.slice(0, 4).map((act) => {
              const cat = ACTIVITY_CATEGORIES.find((c) => c.id === act.category);
              return (
                <div
                  key={act.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/[0.045]"
                >
                  {/* Category dot */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: cat?.color || '#ff6a2a',
                      boxShadow: `0 0 6px ${cat?.color || '#ff6a2a'}88`,
                    }}
                  />
                  <span className="text-xs text-text-primary font-medium truncate flex-1">{act.title}</span>
                  <span className="font-mono text-[11px] text-[#fff4ec] font-bold shrink-0 tabular-nums">
                    {formatDuration(act.duration_minutes)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
