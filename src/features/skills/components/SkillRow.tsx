import React from 'react';
import { Skill } from '../../../types/skill.types';
import { LifeArea } from '../../../types/vision.types';
import { SkillProficiencyIndicator } from './SkillProficiencyIndicator';
import { SkillDevelopmentBadge } from './SkillDevelopmentBadge';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface SkillRowProps {
  skill: Skill;
  lifeArea?: LifeArea | null;
  evidenceCount?: number;
  levelCount?: number;
  onClick: () => void;
}

export const SkillRow: React.FC<SkillRowProps> = ({
  skill,
  lifeArea,
  evidenceCount = 0,
  levelCount = 0,
  onClick,
}) => {
  const isDeveloping = skill.development_state === 'developing';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl border p-4 sm:p-5 transition-all duration-150 cursor-pointer select-none',
        'bg-gradient-to-b from-[rgba(20,24,33,0.7)] via-[rgba(16,19,26,0.8)] to-[rgba(12,14,20,0.9)]',
        'backdrop-blur-2xl border-white/[0.08] hover:border-[#ff8a4a]/40',
        'shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(255,106,42,0.15)]',
        isDeveloping && 'border-amber-500/20'
      )}
    >
      {/* Top subtle glow bar for actively developing skills */}
      {isDeveloping && (
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Identity & Scope */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-[#fff4ec] tracking-wide group-hover:text-[#ff8a4a] transition-colors truncate">
              {skill.name}
            </h3>
            {lifeArea && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-text-muted border border-white/[0.06] shrink-0">
                {lifeArea.name}
              </span>
            )}
          </div>

          {skill.description && (
            <p className="text-xs text-text-secondary line-clamp-1">
              {skill.description}
            </p>
          )}
        </div>

        {/* Center/Right: Proficiency Transition + Development State */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap">
          {/* Proficiency Scale Indicator */}
          <SkillProficiencyIndicator
            current={skill.current_proficiency}
            target={skill.target_proficiency}
            size="sm"
          />

          {/* Development State Badge */}
          <SkillDevelopmentBadge state={skill.development_state} size="sm" />

          {/* Evidence Counter & Arrow */}
          <div className="flex items-center gap-2 text-text-muted text-xs font-mono shrink-0 pl-1">
            {evidenceCount > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-text-muted">
                <Sparkles className="w-3 h-3 text-[#ff8a4a]/70" />
                <span>{evidenceCount}</span>
              </span>
            )}
            {levelCount > 0 && (
              <span className="hidden lg:inline-block text-[11px] px-1.5 py-0.5 rounded bg-white/[0.03] text-text-muted border border-white/[0.06]">
                {levelCount} {levelCount === 1 ? 'Lvl' : 'Lvls'}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-[#ff8a4a] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};
