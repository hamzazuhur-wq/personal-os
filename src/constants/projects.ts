import { ProjectPriority, ProjectStatus } from '../types/project.types';

export interface ProjectStatusMeta {
  id: ProjectStatus;
  label: string;
  badgeStyle: string;
  glowColor: string;
}

export const PROJECT_STATUSES: ProjectStatusMeta[] = [
  {
    id: 'active',
    label: 'Active',
    badgeStyle: 'bg-[#ff6a2a]/15 text-[#fff4ec] border-[#ff8a4a]/50',
    glowColor: 'rgba(255, 106, 42, 0.3)',
  },
  {
    id: 'paused',
    label: 'Paused',
    badgeStyle: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    glowColor: 'rgba(245, 158, 11, 0.2)',
  },
  {
    id: 'draft',
    label: 'Draft',
    badgeStyle: 'bg-white/[0.04] text-text-muted border-white/[0.08]',
    glowColor: 'transparent',
  },
  {
    id: 'completed',
    label: 'Completed',
    badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    glowColor: 'rgba(16, 185, 129, 0.2)',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    badgeStyle: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    glowColor: 'rgba(244, 63, 94, 0.15)',
  },
  {
    id: 'archived',
    label: 'Archived',
    badgeStyle: 'bg-white/[0.02] text-text-muted/50 border-white/[0.05]',
    glowColor: 'transparent',
  },
];

export interface ProjectPriorityMeta {
  id: ProjectPriority;
  label: string;
  badgeStyle: string;
}

export const PROJECT_PRIORITIES: ProjectPriorityMeta[] = [
  {
    id: 'high',
    label: 'High',
    badgeStyle: 'bg-[#ff6a2a]/15 text-[#ff8a4a] border-[#ff8a4a]/30',
  },
  {
    id: 'medium',
    label: 'Medium',
    badgeStyle: 'bg-white/[0.06] text-text-secondary border-white/[0.1]',
  },
  {
    id: 'low',
    label: 'Low',
    badgeStyle: 'bg-white/[0.03] text-text-muted border-white/[0.06]',
  },
];
