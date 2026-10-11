import { GoalPriority, GoalTimeHorizon, GoalType } from '../types/goal.types';

export const GOAL_TYPES: {
  id: GoalType;
  label: string;
  description: string;
  badgeStyle: string;
}[] = [
  {
    id: 'outcome',
    label: 'Outcome',
    description: 'Specific tangible state or target outcome (e.g. Reach 68kg weight)',
    badgeStyle: 'bg-[#ff6a2a]/15 text-[#fff4ec] border-[#ff8a4a]/40',
  },
  {
    id: 'development',
    label: 'Development',
    description: 'Internal capability or strategic thinking growth',
    badgeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Consistent execution standard or benchmark',
    badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  },
  {
    id: 'acquisition',
    label: 'Acquisition',
    description: 'Obtaining a skill, certificate, tool, or strategic resource',
    badgeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
  },
  {
    id: 'milestone',
    label: 'Milestone',
    description: 'Significant checkpoint in a larger overarching objective',
    badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  },
];

export const GOAL_TIME_HORIZONS: {
  id: GoalTimeHorizon;
  label: string;
  shortLabel: string;
  description: string;
  order: number;
}[] = [
  { id: 'long_term', label: 'Long-Term (3-5+ Yrs)', shortLabel: 'Long-Term', description: 'Multi-year strategic vision horizon', order: 1 },
  { id: 'annual', label: 'Annual (1 Year)', shortLabel: 'Annual', description: 'Current year primary objective', order: 2 },
  { id: 'six_month', label: '6-Month Horizon', shortLabel: '6-Month', description: 'Mid-term momentum milestone', order: 3 },
  { id: 'monthly', label: 'Monthly Horizon', shortLabel: 'Monthly', description: 'Focused monthly objective', order: 4 },
  { id: 'weekly', label: 'Weekly Objective', shortLabel: 'Weekly', description: 'Direct tactical commitment', order: 5 },
];

export const GOAL_PRIORITIES: {
  id: GoalPriority;
  label: string;
  color: string;
  badgeStyle: string;
}[] = [
  { id: 'high', label: 'High Priority', color: '#ff6a2a', badgeStyle: 'bg-[#ff6a2a]/20 text-[#fff4ec] border-[#ff8a4a]/50' },
  { id: 'medium', label: 'Medium Priority', color: '#ffb27a', badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'low', label: 'Low Priority', color: '#94a3b8', badgeStyle: 'bg-white/[0.04] text-slate-300 border-white/[0.08]' },
];
