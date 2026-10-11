import React from 'react';
import { GoalStatus } from '../../../types/goal.types';
import { cn } from '../../../utils/cn';
import { CheckCircle2, PauseCircle, PlayCircle, FileEdit, XCircle, Archive } from 'lucide-react';

export interface GoalStatusBadgeProps {
  status: GoalStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const GOAL_STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; style: string }
> = {
  active: {
    label: 'Active',
    icon: PlayCircle,
    style: 'bg-[#ff6a2a]/15 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_0_12px_rgba(255,106,42,0.25)]',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
  },
  paused: {
    label: 'Paused',
    icon: PauseCircle,
    style: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  },
  draft: {
    label: 'Draft',
    icon: FileEdit,
    style: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    style: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    style: 'bg-white/[0.04] text-text-muted border-white/[0.08]',
  },
};

export const GoalStatusBadge: React.FC<GoalStatusBadgeProps> = ({
  status,
  size = 'sm',
  className,
}) => {
  const config = GOAL_STATUS_CONFIG[status] || GOAL_STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase font-bold tracking-wider rounded-lg border select-none transition-all',
        size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1',
        config.style,
        className
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span>{config.label}</span>
    </span>
  );
};
