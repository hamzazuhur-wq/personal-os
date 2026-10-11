import React from 'react';
import { Zap, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';

export interface ExecutionHeaderProps {
  date: string;
  readyCount: number;
  blockedCount: number;
  completedTodayCount: number;
  dailyPrioritiesCount: number;
}

export const ExecutionHeader: React.FC<ExecutionHeaderProps> = ({
  date,
  readyCount,
  blockedCount,
  completedTodayCount,
  dailyPrioritiesCount,
}) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isOverloaded = dailyPrioritiesCount > 3 || (readyCount > 10 && dailyPrioritiesCount === 0);

  return (
    <div className="space-y-3 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff8a4a] font-semibold">
              Daily Execution Engine
            </span>
            <div className="h-1 w-1 rounded-full bg-white/30" />
            <span className="text-xs font-mono text-text-muted">{formattedDate}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#fff4ec] tracking-tight">
            Command Center
          </h1>
          <p className="text-xs text-text-secondary max-w-xl">
            Focus strictly on concrete, unblocked next physical actions. Transition states seamlessly from Ready to In Progress to Completed.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#ff6a2a]/15 border border-[#ff8a4a]/30 text-[#fff4ec] font-mono text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>{readyCount} Ready</span>
          </div>

          {blockedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{blockedCount} Blocked</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{completedTodayCount} Done Today</span>
          </div>
        </div>
      </div>

      {/* Overload Warning Banner */}
      {isOverloaded && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            {dailyPrioritiesCount > 3
              ? "You have more than 3 top daily priorities. Consider focusing on 1-3 critical outcomes to prevent execution fatigue."
              : "High volume of ready actions without defined top priorities. Pick 1-3 primary items for today."}
          </span>
        </div>
      )}
    </div>
  );
};
