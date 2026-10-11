import React from 'react';
import { Goal } from '../../../types/goal.types';
import { GoalStatusBadge } from './GoalStatusBadge';
import { GOAL_TIME_HORIZONS, GOAL_TYPES, GOAL_PRIORITIES } from '../../../constants/goals';
import { LifeArea } from '../../../types/vision.types';
import { formatShortDate } from '../../../utils/dateUtils';
import { Calendar, ChevronRight, CheckCircle2, PauseCircle, PlayCircle, Edit3, Archive, Layers } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface GoalRowProps {
  goal: Goal;
  lifeArea?: LifeArea | null;
  parentGoal?: Goal | null;
  childCount?: number;
  onSelect: (id: string) => void;
  onComplete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onEdit: (goal: Goal) => void;
  onArchive: (id: string) => void;
}

export const GoalRow: React.FC<GoalRowProps> = ({
  goal,
  lifeArea,
  parentGoal,
  childCount = 0,
  onSelect,
  onComplete,
  onPause,
  onResume,
  onEdit,
  onArchive,
}) => {
  const horizonMeta = GOAL_TIME_HORIZONS.find((h) => h.id === goal.time_horizon) || GOAL_TIME_HORIZONS[1];
  const typeMeta = GOAL_TYPES.find((t) => t.id === goal.goal_type) || GOAL_TYPES[0];
  const priorityMeta = GOAL_PRIORITIES.find((p) => p.id === goal.priority) || GOAL_PRIORITIES[1];

  const isCompleted = goal.status === 'completed';
  const isPaused = goal.status === 'paused';
  const isActive = goal.status === 'active';

  return (
    <div
      onClick={() => onSelect(goal.id)}
      className={cn(
        'group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        isActive
          ? 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/[0.08] hover:border-[#ff8a4a]/40 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_24px_-8px_rgba(255,106,42,0.2)]'
          : isCompleted
          ? 'bg-gradient-to-b from-white/[0.03] to-white/[0.01] border-emerald-500/20 opacity-80'
          : isPaused
          ? 'bg-gradient-to-b from-white/[0.03] to-white/[0.01] border-amber-500/20 opacity-75'
          : 'bg-white/[0.02] border-white/[0.05] opacity-60'
      )}
    >
      {/* Subtle bottom glow on active goals */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#ff6a2a]/[0.06] to-transparent pointer-events-none" />
      )}

      {/* Main Info */}
      <div className="min-w-0 flex-1 relative z-10 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <GoalStatusBadge status={goal.status} size="sm" />

          {/* Horizon Tag */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[#ffb27a] font-medium">
            {horizonMeta.shortLabel}
          </span>

          {/* Goal Type Tag */}
          <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-md border font-medium uppercase tracking-wider', typeMeta.badgeStyle)}>
            {typeMeta.label}
          </span>

          {/* Priority Pill */}
          <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold', priorityMeta.badgeStyle)}>
            {priorityMeta.label}
          </span>

          {/* Life Area Tag */}
          {lifeArea && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-text-secondary">
              {lifeArea.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className={cn('text-sm sm:text-base font-bold tracking-tight text-[#fff4ec] leading-snug group-hover:text-white transition-colors', isCompleted && 'line-through text-text-muted')}>
          {goal.title}
        </h4>

        {/* Parent / Sub-goals metadata */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted flex-wrap">
          {parentGoal && (
            <span className="flex items-center gap-1 text-[#ffb27a]/80">
              <Layers className="w-3 h-3" />
              <span>Parent: {parentGoal.title}</span>
            </span>
          )}

          {childCount > 0 && (
            <span className="text-text-muted">
              {childCount} {childCount === 1 ? 'sub-goal' : 'sub-goals'}
            </span>
          )}

          {goal.target_date && (
            <span className="flex items-center gap-1 text-text-secondary">
              <Calendar className="w-3 h-3 text-[#ff8a4a]" />
              <span>Target: {formatShortDate(goal.target_date)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Strip */}
      <div
        className="flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] shrink-0 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* State Toggle Buttons */}
        {isActive && (
          <>
            <button
              onClick={() => onComplete(goal.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-1 cursor-pointer"
              title="Mark Goal as Completed"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Complete</span>
            </button>
            <button
              onClick={() => onPause(goal.id)}
              className="p-1.5 rounded-lg text-text-muted hover:text-amber-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Pause Goal"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
          </>
        )}

        {isPaused && (
          <button
            onClick={() => onResume(goal.id)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-[#ff6a2a]/20 text-[#fff4ec] border border-[#ff8a4a]/40 hover:bg-[#ff6a2a]/30 transition-all flex items-center gap-1 cursor-pointer"
            title="Resume Goal"
          >
            <PlayCircle className="w-3 h-3" />
            <span>Resume</span>
          </button>
        )}

        <button
          onClick={() => onEdit(goal)}
          className="p-1.5 rounded-lg text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Edit Goal"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {goal.status !== 'archived' && (
          <button
            onClick={() => onArchive(goal.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Archive Goal"
          >
            <Archive className="w-4 h-4" />
          </button>
        )}

        <div className="pl-1 text-text-muted group-hover:text-[#ff8a4a] transition-colors">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
