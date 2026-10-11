import React from 'react';
import { Goal } from '../../../types/goal.types';
import { GoalStatusBadge } from '../../goals/components/GoalStatusBadge';
import { formatHumanDate } from '../../../utils/dateUtils';
import { ArrowUpRight, Calendar, Target } from 'lucide-react';

export interface LevelLinkedGoalsProps {
  goals: Goal[];
  onNavigateToGoal: (goalId: string) => void;
}

export const LevelLinkedGoals: React.FC<LevelLinkedGoalsProps> = ({
  goals,
  onNavigateToGoal,
}) => {
  return (
    <section className="p-5 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight">
            Supporting Strategic Goals
          </h3>
        </div>
        <span className="text-xs font-mono text-text-muted">
          {goals.length} Goal{goals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {goals.length === 0 ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No Strategic Goals linked to this stage yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {goals.map((g) => (
            <div
              key={g.id}
              onClick={() => onNavigateToGoal(g.id)}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-text-primary group-hover:text-[#fff4ec] truncate">
                    {g.title}
                  </span>
                  <GoalStatusBadge status={g.status} />
                  <span className="text-[10px] font-mono text-text-muted">
                    [{g.time_horizon.toUpperCase()}]
                  </span>
                </div>

                {g.target_date && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                    <Calendar className="w-3 h-3 text-[#ff8a4a]" />
                    <span>Target: {formatHumanDate(g.target_date)}</span>
                  </div>
                )}
              </div>

              <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-[#ff8a4a] transition-colors shrink-0" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
