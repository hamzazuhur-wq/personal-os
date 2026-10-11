import React from 'react';
import { Goal } from '../../../types/goal.types';
import { GoalStatusBadge } from './GoalStatusBadge';
import { GOAL_TIME_HORIZONS, GOAL_TYPES, GOAL_PRIORITIES } from '../../../constants/goals';
import { LifeArea } from '../../../types/vision.types';
import { formatShortDate } from '../../../utils/dateUtils';
import { Calendar, ChevronRight, CheckCircle2, PauseCircle, PlayCircle, Layers } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface GoalCardProps {
  goal: Goal;
  lifeArea?: LifeArea | null;
  parentGoal?: Goal | null;
  childCount?: number;
  onSelect: (id: string) => void;
  onComplete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  lifeArea,
  parentGoal,
  childCount = 0,
  onSelect,
  onComplete,
  onPause,
  onResume,
}) => {
  const horizonMeta = GOAL_TIME_HORIZONS.find((h) => h.id === goal.time_horizon) || GOAL_TIME_HORIZONS[1];
  const typeMeta = GOAL_TYPES.find((t) => t.id === goal.goal_type) || GOAL_TYPES[0];
  const priorityMeta = GOAL_PRIORITIES.find((p) => p.id === goal.priority) || GOAL_PRIORITIES[1];

  const isActive = goal.status === 'active';
  const isCompleted = goal.status === 'completed';
  const isPaused = goal.status === 'paused';

  return (
    <div
      onClick={() => onSelect(goal.id)}
      className={cn(
        'group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-2xl flex flex-col justify-between min-h-[190px]',
        isActive
          ? 'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.015] border-white/[0.09] hover:border-[#ff8a4a]/40 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_-6px_rgba(255,106,42,0.25)]'
          : isCompleted
          ? 'bg-gradient-to-b from-white/[0.03] to-white/[0.01] border-emerald-500/20 opacity-85'
          : 'bg-white/[0.02] border-white/[0.05] opacity-75'
      )}
    >
      {/* Top Hairline */}
      <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/30 to-transparent" />

      {/* Bottom Ambient Glow for Active Goals */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#ff6a2a]/[0.08] to-transparent pointer-events-none" />
      )}

      {/* Header Badges */}
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <GoalStatusBadge status={goal.status} size="sm" />
          <span className={cn('text-[9px] font-mono px-2 py-0.5 rounded-md border font-semibold', priorityMeta.badgeStyle)}>
            {priorityMeta.label}
          </span>
        </div>

        {/* Title */}
        <h4 className={cn('text-base font-bold text-[#fff4ec] tracking-tight line-clamp-2 leading-snug group-hover:text-white transition-colors', isCompleted && 'line-through text-text-muted')}>
          {goal.title}
        </h4>

        {/* Parent / Area info */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted flex-wrap">
          <span className="text-[#ffb27a] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            {horizonMeta.shortLabel}
          </span>
          <span className="text-text-secondary">
            {typeMeta.label}
          </span>
          {lifeArea && (
            <span className="text-text-muted">
              • {lifeArea.name}
            </span>
          )}
        </div>
      </div>

      {/* Footer / Dates & Quick Actions */}
      <div className="relative z-10 pt-4 mt-2 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
          {goal.target_date ? (
            <div className="flex items-center gap-1 text-text-secondary">
              <Calendar className="w-3 h-3 text-[#ff8a4a]" />
              <span>{formatShortDate(goal.target_date)}</span>
            </div>
          ) : parentGoal ? (
            <div className="flex items-center gap-1 truncate max-w-[120px]">
              <Layers className="w-3 h-3" />
              <span className="truncate">{parentGoal.title}</span>
            </div>
          ) : (
            <span>{childCount > 0 ? `${childCount} sub-goals` : 'No date'}</span>
          )}
        </div>

        {/* Quick state buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isActive && (
            <button
              onClick={() => onComplete(goal.id)}
              className="p-1 rounded-lg text-text-muted hover:text-emerald-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Mark Complete"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isActive && (
            <button
              onClick={() => onPause(goal.id)}
              className="p-1 rounded-lg text-text-muted hover:text-amber-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Pause"
            >
              <PauseCircle className="w-3.5 h-3.5" />
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => onResume(goal.id)}
              className="p-1 rounded-lg text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Resume"
            >
              <PlayCircle className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-[#ff8a4a] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
};
