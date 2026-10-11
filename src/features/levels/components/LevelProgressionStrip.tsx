import React from 'react';
import { Level } from '../../../types/level.types';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface LevelProgressionStripProps {
  levels: Level[];
  activeLevelId?: string;
  onSelectLevel: (levelId: string) => void;
}

export const LevelProgressionStrip: React.FC<LevelProgressionStripProps> = ({
  levels,
  activeLevelId,
  onSelectLevel,
}) => {
  if (levels.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-3 pt-1 scrollbar-none">
      <div className="flex items-center gap-2.5 min-w-max">
        {levels.map((lvl, index) => {
          const isSelected = activeLevelId === lvl.id;
          const isCurrent = lvl.status === 'current';
          const isCompleted = lvl.status === 'completed';
          const isLocked = lvl.status === 'locked';

          return (
            <React.Fragment key={lvl.id}>
              {/* Connector line between steps */}
              {index > 0 && (
                <div
                  className={cn(
                    'h-[1.5px] w-6 shrink-0 transition-colors',
                    isCompleted
                      ? 'bg-emerald-500/40'
                      : isCurrent
                      ? 'bg-gradient-to-r from-emerald-500/40 to-[#ff8a4a]/60'
                      : 'bg-white/[0.08]'
                  )}
                />
              )}

              {/* Progression Node */}
              <button
                type="button"
                onClick={() => onSelectLevel(lvl.id)}
                className={cn(
                  'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors duration-150 cursor-pointer min-w-[150px]',
                  isCurrent
                    ? 'bg-gradient-to-b from-[#ff6a2a]/20 via-[#ff8a4a]/10 to-transparent border-[#ff8a4a]/60 shadow-[0_0_20px_-3px_rgba(255,106,42,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] text-[#fff4ec]'
                    : isCompleted
                    ? 'bg-emerald-500/[0.08] border-emerald-500/30 text-text-primary hover:border-emerald-500/50 hover:bg-emerald-500/[0.12]'
                    : isLocked
                    ? 'bg-black/30 border-white/[0.05] text-text-muted/60 hover:border-white/[0.12] hover:text-text-secondary opacity-75'
                    : 'bg-black/40 border-white/[0.09] text-text-secondary hover:border-white/20 hover:text-text-primary',
                  isSelected && !isCurrent && 'ring-1 ring-white/30 border-white/30'
                )}
              >
                {/* Status Indicator Icon */}
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <div className="relative flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#ff8a4a]" />
                      <span className="absolute -inset-1 rounded-full bg-[#ff6a2a]/30 blur-sm -z-10 animate-pulse" />
                    </div>
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-text-muted/50" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                  )}
                </div>

                {/* Level Title & Display Order */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                      L{lvl.display_order < 10 ? `0${lvl.display_order}` : lvl.display_order}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-mono uppercase bg-[#ff6a2a]/20 text-[#ff8a4a] px-1 rounded border border-[#ff8a4a]/40 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold truncate text-[#fff4ec] mt-0.5">
                    {lvl.name}
                  </div>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
