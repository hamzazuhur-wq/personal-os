import React from 'react';
import { SkillProficiency } from '../../../types/skill.types';
import { getProficiencyMeta, getProficiencyOrder } from '../../../constants/skills';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface SkillProficiencyIndicatorProps {
  current: SkillProficiency;
  target: SkillProficiency;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SkillProficiencyIndicator: React.FC<SkillProficiencyIndicatorProps> = ({
  current,
  target,
  size = 'md',
  className,
}) => {
  const currentMeta = getProficiencyMeta(current);
  const targetMeta = getProficiencyMeta(target);

  const currentOrder = getProficiencyOrder(current);
  const targetOrder = getProficiencyOrder(target);
  const isTargetMet = currentOrder >= targetOrder;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 rounded-lg',
    md: 'text-xs px-2.5 py-1 rounded-xl',
    lg: 'text-sm px-3.5 py-1.5 rounded-xl',
  };

  const arrowSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('inline-flex items-center gap-2 font-mono select-none', className)}>
      {/* Current Proficiency Badge */}
      <span
        className={cn(
          'font-semibold tracking-wide border backdrop-blur-md transition-colors',
          currentMeta.badgeClass,
          sizeClasses[size]
        )}
        title={`Current: ${currentMeta.label} — ${currentMeta.description}`}
      >
        {currentMeta.label}
      </span>

      {/* Direction Arrow */}
      <ArrowRight className={cn('text-text-muted/60 shrink-0', arrowSizes[size])} />

      {/* Target Proficiency Badge */}
      <span
        className={cn(
          'font-semibold tracking-wide border backdrop-blur-md transition-colors inline-flex items-center gap-1.5',
          isTargetMet
            ? 'bg-[#ff6a2a]/20 text-[#ff8a4a] border-[#ff8a4a]/40 shadow-[0_0_12px_rgba(255,106,42,0.2)]'
            : targetMeta.badgeClass,
          sizeClasses[size]
        )}
        title={`Target: ${targetMeta.label} — ${targetMeta.description}`}
      >
        <span>{targetMeta.label}</span>
        {isTargetMet && (
          <CheckCircle2 className="w-3 h-3 text-[#ff8a4a] shrink-0" />
        )}
      </span>
    </div>
  );
};
