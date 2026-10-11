import React from 'react';
import { SkillDevelopmentState } from '../../../types/skill.types';
import { getDevelopmentStateMeta } from '../../../constants/skills';
import { cn } from '../../../utils/cn';

export interface SkillDevelopmentBadgeProps {
  state: SkillDevelopmentState;
  size?: 'sm' | 'md';
  className?: string;
}

export const SkillDevelopmentBadge: React.FC<SkillDevelopmentBadgeProps> = ({
  state,
  size = 'md',
  className,
}) => {
  const meta = getDevelopmentStateMeta(state);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xl font-medium tracking-wide border backdrop-blur-md select-none',
        meta.badgeClass,
        sizeClasses[size],
        className
      )}
      title={meta.description}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
        style={{ backgroundColor: meta.dotColor }}
      />
      <span>{meta.label}</span>
    </span>
  );
};
