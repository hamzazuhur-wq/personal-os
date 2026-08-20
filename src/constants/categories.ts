import { ActivityCategory } from '../types/activity.types';
import { CaptureType } from '../types/capture.types';

export const ACTIVITY_CATEGORIES: {
  id: ActivityCategory;
  label: string;
  color: string; // Tailwind color class or hex
  description: string;
}[] = [
  {
    id: 'Deep Work',
    label: 'Deep Work',
    color: '#ff6a2a',
    description: 'High-cognitive output, programming, design, deep engineering',
  },
  {
    id: 'Study & Research',
    label: 'Study & Research',
    color: '#ff8a4a',
    description: 'Reading, technical papers, system analysis, research',
  },
  {
    id: 'Physical Training',
    label: 'Physical Training',
    color: '#10b981',
    description: 'Strength training, cardio, mobility, recovery',
  },
  {
    id: 'Skill Acquisition',
    label: 'Skill Acquisition',
    color: '#a855f7',
    description: 'Deliberate practice of novel skills & proficiencies',
  },
  {
    id: 'Writing & Thinking',
    label: 'Writing & Thinking',
    color: '#f59e0b',
    description: 'System documentation, architectural notes, strategic reflection',
  },
  {
    id: 'Operations',
    label: 'Operations',
    color: '#64748b',
    description: 'Administrative maintenance, planning, communications',
  },
  {
    id: 'Rest & Recovery',
    label: 'Rest & Recovery',
    color: '#06b6d4',
    description: 'Deliberate recharging, meditation, sleep optimization',
  },
  {
    id: 'Personal',
    label: 'Personal',
    color: '#f43f5e',
    description: 'Personal commitments and health routines',
  },
  {
    id: 'Other',
    label: 'Other',
    color: '#94a3b8',
    description: 'Uncategorized meaningful activity',
  },
];

export const CAPTURE_TYPES: {
  id: CaptureType;
  label: string;
  badgeColor: string;
}[] = [
  { id: 'unclassified', label: 'Unclassified / Inbox', badgeColor: 'border-white/10 text-slate-400 bg-white/[0.03]' },
  { id: 'idea', label: 'Idea', badgeColor: 'border-[#ff8a4a]/40 text-[#fff4ec] bg-[#ff6a2a]/15' },
  { id: 'task', label: 'Task', badgeColor: 'border-emerald-500/35 text-emerald-300 bg-emerald-500/10' },
  { id: 'note', label: 'Note', badgeColor: 'border-white/15 text-slate-200 bg-white/[0.04]' },
  { id: 'reflection', label: 'Reflection', badgeColor: 'border-amber-500/35 text-amber-300 bg-amber-500/10' },
  { id: 'question', label: 'Question', badgeColor: 'border-purple-500/35 text-purple-300 bg-purple-500/10' },
  { id: 'future_project', label: 'Future Project', badgeColor: 'border-[#ff8a4a]/30 text-[#ffb27a] bg-[#ff6a2a]/10' },
  { id: 'business_idea', label: 'Business Idea', badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  { id: 'personal_thought', label: 'Personal Thought', badgeColor: 'border-rose-500/35 text-rose-300 bg-rose-500/10' },
];
