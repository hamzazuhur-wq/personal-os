import React from 'react';
import { Target, ArrowRight, ChevronRight } from 'lucide-react';
import { useWeeklyData } from '../../hooks/useWeeklyData';

export interface DashboardFocusCardProps {
  onNavigateToWeekly?: () => void;
}

export const DashboardFocusCard: React.FC<DashboardFocusCardProps> = ({ onNavigateToWeekly }) => {
  const { data } = useWeeklyData();
  const focus = data?.focus;

  return (
    <div className="relative rounded-3xl overflow-hidden group">
      {/* Deep layered glass surface */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-br from-[rgba(22,26,36,0.72)] via-[rgba(14,17,24,0.80)] to-[rgba(10,12,17,0.88)]
          backdrop-blur-[36px]
          border border-white/[0.09]
        "
      />
      {/* Top edge luminous line */}
      <div className="absolute top-0 left-[8%] right-[8%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent" />
      {/* Bottom ambient warmth */}
      <div className="absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-t from-[#ff6a2a]/[0.09] via-[#ff6a2a]/[0.03] to-transparent pointer-events-none" />
      {/* Right side subtle glow bloom */}
      <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-[#ff6a2a]/[0.05] to-transparent pointer-events-none" />
      {/* Outer glow on hover */}
      <div className="absolute inset-0 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)] group-hover:shadow-[0_24px_70px_rgba(0,0,0,0.6),0_0_40px_-10px_rgba(255,106,42,0.18)] transition-shadow duration-500" />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* Top label row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/25 shadow-[0_0_16px_rgba(255,106,42,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Target className="w-4 h-4 stroke-[1.8]" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#ff8a4a]">
              Weekly Strategic Directive
            </span>
          </div>

          {onNavigateToWeekly && (
            <button
              onClick={onNavigateToWeekly}
              className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-[#ff8a4a] transition-colors cursor-pointer group/link"
            >
              <span>Weekly Overview</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* Hero content area */}
        {focus ? (
          <div className="space-y-4">
            {/* Primary focus — large editorial typography */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#fff4ec] tracking-tight leading-[1.15] max-w-3xl">
              {focus.primary_focus}
            </h2>

            {/* Secondary objectives as inline chips */}
            {focus.secondary_objectives && focus.secondary_objectives.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {focus.secondary_objectives.slice(0, 3).map((obj, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-text-secondary font-medium backdrop-blur-md"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#ff8a4a]/60 shrink-0" />
                    {obj}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl border border-dashed border-white/[0.1] flex items-center justify-center">
              <Target className="w-5 h-5 text-white/15" />
            </div>
            <div>
              <p className="text-sm text-text-secondary font-medium">No focus directive set for this week</p>
              <button
                onClick={onNavigateToWeekly}
                className="text-xs text-[#ff8a4a] hover:text-[#ffb27a] mt-1 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Define weekly focus</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
