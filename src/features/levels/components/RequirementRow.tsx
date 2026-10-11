import React, { useEffect, useState } from 'react';
import { LevelRequirement, RequirementEvidence } from '../../../types/level.types';
import { Goal } from '../../../types/goal.types';
import { REQUIREMENT_TYPES } from '../../../constants/levels';
import { pointService } from '../../../services/points/pointService';
import { CheckCircle2, Circle, FileText, Link2, Sparkles } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface RequirementRowProps {
  requirement: LevelRequirement;
  evidence: RequirementEvidence[];
  linkedGoal?: Goal | null;
  onToggleComplete: () => void;
  onSelect: () => void;
  isReadonly?: boolean;
}

export const RequirementRow: React.FC<RequirementRowProps> = ({
  requirement,
  evidence,
  linkedGoal,
  onToggleComplete,
  onSelect,
  isReadonly = false,
}) => {
  const isCompleted = requirement.status === 'completed';
  const isWaived = requirement.status === 'waived';

  // Module 08 Final — live Development Points progress for point requirements.
  const [pointsProgress, setPointsProgress] = useState<{ current: number; target: number } | null>(
    null
  );
  useEffect(() => {
    let cancelled = false;
    if (requirement.type !== 'development_points') return;
    pointService.getLevelRequirementProgress(requirement).then((p) => {
      if (!cancelled) setPointsProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, [
    requirement.id,
    requirement.target_points,
    requirement.points_life_area_id,
    requirement.points_skill_id,
    pointsProgress === null && requirement.status,
  ]);

  const typeMeta = REQUIREMENT_TYPES.find((t) => t.id === requirement.type);
  const isGoalCompleted = linkedGoal?.status === 'completed';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-colors duration-150 cursor-pointer select-none',
        isCompleted
          ? 'bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40'
          : isWaived
          ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
          : 'bg-black/35 border-white/[0.08] hover:border-white/20 hover:bg-black/50'
      )}
    >
      {/* Checkbox Trigger button */}
      <button
        type="button"
        disabled={isReadonly}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className={cn(
          'shrink-0 mt-0.5 rounded-full transition-colors cursor-pointer',
          isReadonly && 'cursor-default pointer-events-none'
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
        ) : (
          <Circle className="w-5 h-5 text-text-muted group-hover:text-text-secondary" />
        )}
      </button>

      {/* Content Area */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              'text-sm font-semibold text-text-primary tracking-tight',
              isCompleted && 'line-through text-text-muted font-normal',
              isWaived && 'italic text-text-muted'
            )}
          >
            {requirement.title}
          </h4>

          {/* Required vs Optional Chip */}
          {requirement.is_required ? (
            <span className="text-[9px] font-mono uppercase bg-[#ff6a2a]/15 text-[#ff8a4a] px-1.5 py-0.5 rounded border border-[#ff8a4a]/30 font-bold">
              REQUIRED
            </span>
          ) : (
            <span className="text-[9px] font-mono uppercase bg-white/[0.04] text-text-muted px-1.5 py-0.5 rounded border border-white/[0.06]">
              OPTIONAL
            </span>
          )}

          {/* Classification Tag */}
          <span className="text-[10px] font-mono text-text-muted">
            [{typeMeta?.label || requirement.type}]
          </span>
        </div>

        {requirement.description && (
          <p className="text-xs text-text-secondary leading-relaxed">
            {requirement.description}
          </p>
        )}

        {/* Linked Goal Contextual Hint (Decision 3) */}
        {linkedGoal && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted pt-1">
            <Link2 className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>Goal: <strong className="text-text-secondary">{linkedGoal.title}</strong></span>
            {isGoalCompleted && !isCompleted && (
              <span className="text-[10px] font-mono text-emerald-300 ml-1.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Goal Complete — Click to verify
              </span>
            )}
          </div>
        )}

        {/* Development Points progress (Module 08 Final) */}
        {requirement.type === 'development_points' && pointsProgress && (
          <div className="pt-1.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
              <Sparkles className="w-3 h-3 text-[#ff8a4a]" />
              <span>
                {pointsProgress.current} / {pointsProgress.target} development points
                {requirement.points_life_area_id ? ' in this Life Area' : ''}
                {pointsProgress.current >= pointsProgress.target && ' — target reached'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-xs">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff6a2a]/70 to-[#ff8a4a] transition-all"
                style={{
                  width: `${
                    pointsProgress.target > 0
                      ? Math.min(100, (pointsProgress.current / pointsProgress.target) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Evidence Pill Count */}
        {evidence.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted pt-0.5">
            <FileText className="w-3 h-3 text-[#ff8a4a]" />
            <span>{evidence.length} evidence record{evidence.length > 1 ? 's' : ''} attached</span>
          </div>
        )}
      </div>
    </div>
  );
};
