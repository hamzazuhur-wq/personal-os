import { SkillDevelopmentState, SkillEvidenceType, SkillProficiency } from '../types/skill.types';

export const PROFICIENCY_LEVELS: {
  value: SkillProficiency;
  label: string;
  description: string;
  order: number;
  badgeClass: string;
  textClass: string;
}[] = [
  {
    value: 'foundation',
    label: 'Foundation',
    description: 'Basic awareness and initial exposure',
    order: 1,
    badgeClass: 'bg-white/[0.06] text-text-muted border border-white/[0.1]',
    textClass: 'text-text-muted',
  },
  {
    value: 'developing',
    label: 'Developing',
    description: 'Actively learning and practicing',
    order: 2,
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    textClass: 'text-amber-400',
  },
  {
    value: 'competent',
    label: 'Competent',
    description: 'Capable of independent application',
    order: 3,
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    textClass: 'text-blue-400',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Deep capability with consistent results',
    order: 4,
    badgeClass: 'bg-violet-500/10 text-violet-400 border border-violet-500/25',
    textClass: 'text-violet-400',
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'Mastery — can teach and lead others',
    order: 5,
    badgeClass: 'bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/35',
    textClass: 'text-[#ff8a4a]',
  },
];

export const PROFICIENCY_ORDER: SkillProficiency[] = [
  'foundation',
  'developing',
  'competent',
  'advanced',
  'expert',
];

export function getProficiencyMeta(value: SkillProficiency) {
  return PROFICIENCY_LEVELS.find((p) => p.value === value) ?? PROFICIENCY_LEVELS[0];
}

export function getProficiencyOrder(value: SkillProficiency): number {
  return PROFICIENCY_ORDER.indexOf(value);
}

export const DEVELOPMENT_STATES: {
  value: SkillDevelopmentState;
  label: string;
  description: string;
  badgeClass: string;
  dotColor: string;
}[] = [
  {
    value: 'not_started',
    label: 'Not Started',
    description: 'No active development',
    badgeClass: 'bg-white/[0.05] text-text-muted border border-white/[0.08]',
    dotColor: '#4b5563',
  },
  {
    value: 'developing',
    label: 'Developing',
    description: 'Actively being improved',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    dotColor: '#f59e0b',
  },
  {
    value: 'maintaining',
    label: 'Maintaining',
    description: 'Strong — currently being maintained',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    dotColor: '#3b82f6',
  },
  {
    value: 'demonstrated',
    label: 'Demonstrated',
    description: 'Proven through accepted evidence',
    badgeClass: 'bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/35',
    dotColor: '#ff8a4a',
  },
];

export function getDevelopmentStateMeta(value: SkillDevelopmentState) {
  return DEVELOPMENT_STATES.find((s) => s.value === value) ?? DEVELOPMENT_STATES[0];
}

export const EVIDENCE_TYPES: { value: SkillEvidenceType; label: string }[] = [
  { value: 'project', label: 'Project' },
  { value: 'goal', label: 'Goal' },
  { value: 'activity', label: 'Activity' },
  { value: 'document', label: 'Document' },
  { value: 'note', label: 'Note' },
  { value: 'manual', label: 'Manual Entry' },
];
