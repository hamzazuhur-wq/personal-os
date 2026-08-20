import React from 'react';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';

export interface StatWidgetProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  accentColor?: 'orange' | 'emerald' | 'amber' | 'purple' | 'slate' | 'cyan';
  className?: string;
}

export const StatWidget: React.FC<StatWidgetProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  accentColor = 'orange',
  className,
}) => {
  const accentClasses = {
    orange: 'text-[#ff8a4a] border-[#ff8a4a]/30 bg-[#ff6a2a]/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    slate: 'text-slate-300 border-white/10 bg-white/[0.04]',
  };

  return (
    <div
      className={cn(
        'relative p-4 sm:p-5 rounded-xl bg-gradient-to-b from-white/[0.05] via-white/[0.025] to-white/[0.01] backdrop-blur-2xl border border-white/[0.08] flex items-center justify-between shadow-[0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden group hover:border-white/15 transition-all',
        className
      )}
    >
      {/* Vertical Ambient Glow originating from the bottom */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity',
          accentColor === 'orange'
            ? 'bg-gradient-to-t from-[#ff6a2a]/20 via-[#ff8a4a]/05 to-transparent'
            : accentColor === 'emerald'
            ? 'bg-gradient-to-t from-emerald-500/20 via-emerald-500/05 to-transparent'
            : 'bg-gradient-to-t from-white/[0.06] to-transparent'
        )}
      />

      <div className="relative z-10">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-1">
          {label}
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-[#fff4ec] tracking-tight font-mono">
          {value}
        </div>
        {subtext && <div className="text-xs text-text-secondary mt-0.5 font-medium">{subtext}</div>}
      </div>

      {Icon && (
        <div
          className={cn(
            'p-3 rounded-xl border shrink-0 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] relative z-10 transition-transform group-hover:scale-105',
            accentClasses[accentColor]
          )}
        >
          <Icon className="w-5 h-5 stroke-[1.6]" />
        </div>
      )}
    </div>
  );
};
