import React from 'react';
import { LevelMilestone } from '../../../types/level.types';
import { Button } from '../../../components/ui/Button';
import { formatHumanDate } from '../../../utils/dateUtils';
import { CheckCircle2, Circle, Flag, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface LevelMilestonesProps {
  milestones: LevelMilestone[];
  onToggleMilestone: (id: string, currentStatus: string) => Promise<void>;
  onAddMilestone: () => void;
  isReadonly?: boolean;
}

export const LevelMilestones: React.FC<LevelMilestonesProps> = ({
  milestones,
  onToggleMilestone,
  onAddMilestone,
  isReadonly = false,
}) => {
  return (
    <section className="p-5 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight">
            Stage Milestones
          </h3>
        </div>

        {!isReadonly && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddMilestone}
            leftIcon={<Plus className="w-3 h-3" />}
          >
            <span>Add Milestone</span>
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No milestones defined for this stage yet.
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => {
            const isCompleted = m.status === 'completed';
            return (
              <div
                key={m.id}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors',
                  isCompleted
                    ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-300'
                    : 'bg-white/[0.02] border-white/[0.06] text-text-primary'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={isReadonly}
                    onClick={() => onToggleMilestone(m.id, m.status)}
                    className="shrink-0 cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-muted hover:text-text-secondary" />
                    )}
                  </button>

                  <div className="truncate">
                    <span className={cn('text-xs font-semibold truncate block', isCompleted && 'line-through text-text-muted')}>
                      {m.title}
                    </span>
                    {m.description && (
                      <span className="text-[11px] text-text-muted truncate block">
                        {m.description}
                      </span>
                    )}
                  </div>
                </div>

                {m.completed_at && (
                  <span className="text-[10px] font-mono text-emerald-400/80 shrink-0">
                    {formatHumanDate(m.completed_at.slice(0, 10))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
