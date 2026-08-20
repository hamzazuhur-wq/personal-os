import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'orange' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'orange',
  size = 'sm',
  ...props
}) => {
  const variantStyles = {
    orange:
      'bg-[#ff6a2a]/15 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_0_12px_-2px_rgba(255,106,42,0.3)]',
    cyan: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_-2px_rgba(6,182,212,0.25)]',
    emerald:
      'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_-2px_rgba(16,185,129,0.25)]',
    amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_-2px_rgba(245,158,11,0.25)]',
    rose: 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_-2px_rgba(244,63,94,0.25)]',
    slate: 'bg-white/[0.05] text-slate-300 border border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_-2px_rgba(168,85,247,0.25)]',
    outline: 'bg-transparent text-text-secondary border border-white/15',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-mono font-bold rounded-md uppercase tracking-wider',
    md: 'text-xs px-2.5 py-1 font-mono font-bold rounded-md uppercase tracking-wider',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 select-none backdrop-blur-md',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
