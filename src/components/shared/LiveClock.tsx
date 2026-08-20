import React from 'react';
import { useLiveDateTime } from '../../hooks/useLiveDateTime';
import { Clock, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LiveClockProps {
  compact?: boolean;
  className?: string;
}

export const LiveClock: React.FC<LiveClockProps> = ({ compact = false, className }) => {
  const { currentTime, weekdayName, dayNumber, monthName, yearNumber, isoWeek } = useLiveDateTime();

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 font-mono text-xs text-text-secondary', className)}>
        <div className="flex items-center gap-1.5 text-[#fff4ec] font-semibold">
          <Clock className="w-3.5 h-3.5 text-[#ff8a4a]" />
          <span>{currentTime}</span>
        </div>
        <span className="text-white/20 font-light">|</span>
        <span className="tracking-wider">{weekdayName.slice(0, 3)}, {dayNumber} {monthName.slice(0, 3)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.015] backdrop-blur-2xl border border-white/[0.09] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden luminous-bottom-glow',
        className
      )}
    >
      {/* Top subtle highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

      {/* Date Information */}
      <div className="flex items-start sm:items-center gap-4 relative z-10">
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 text-[#ff8a4a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] shrink-0">
          <Calendar className="w-5 h-5 stroke-[1.6]" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#ff8a4a]">
              {isoWeek}
            </span>
            <span className="text-white/20">•</span>
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              {weekdayName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#fff4ec] tracking-tight">
            {dayNumber} {monthName} {yearNumber}
          </h2>
        </div>
      </div>

      {/* Time Display with Bottom-Lit Glass Pill */}
      <div className="flex items-center gap-3 font-mono bg-black/45 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-white/[0.1] shrink-0 self-start sm:self-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_0_20px_-5px_rgba(255,106,42,0.2)] relative z-10">
        <Clock className="w-4 h-4 text-[#ff8a4a] animate-pulse" />
        <span className="text-lg sm:text-xl font-bold text-[#fff4ec] tracking-widest">
          {currentTime}
        </span>
      </div>
    </div>
  );
};
