import React from 'react';
import { ProjectStatus } from '../../../types/project.types';
import { PROJECT_STATUSES } from '../../../constants/projects';
import { cn } from '../../../utils/cn';

export interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({
  status,
  size = 'sm',
}) => {
  const meta = PROJECT_STATUSES.find((s) => s.id === status) || PROJECT_STATUSES[0];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded-lg border font-bold select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        meta.badgeStyle
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: meta.glowColor !== 'transparent' ? meta.glowColor : 'rgba(255,255,255,0.4)' }}
      />
      <span>{meta.label}</span>
    </span>
  );
};
