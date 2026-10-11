import { LevelStatus, RequirementType, RequirementStatus, ExceptionType, EvidenceType } from '../types/level.types';

// ============================================================
// LEVEL STATUS META
// ============================================================

export interface LevelStatusMeta {
  id: LevelStatus;
  label: string;
  color: string;
  glowColor: string;
}

export const LEVEL_STATUSES: LevelStatusMeta[] = [
  {
    id: 'locked',
    label: 'Locked',
    color: 'text-text-muted/50',
    glowColor: 'transparent',
  },
  {
    id: 'unlocked',
    label: 'Unlocked',
    color: 'text-text-secondary',
    glowColor: 'rgba(255, 178, 122, 0.15)',
  },
  {
    id: 'current',
    label: 'Current',
    color: 'text-[#fff4ec]',
    glowColor: 'rgba(255, 106, 42, 0.3)',
  },
  {
    id: 'completed',
    label: 'Completed',
    color: 'text-emerald-300',
    glowColor: 'rgba(16, 185, 129, 0.2)',
  },
  {
    id: 'archived',
    label: 'Archived',
    color: 'text-text-muted/40',
    glowColor: 'transparent',
  },
];

// ============================================================
// REQUIREMENT TYPE META
// ============================================================

export interface RequirementTypeMeta {
  id: RequirementType;
  label: string;
  description: string;
}

export const REQUIREMENT_TYPES: RequirementTypeMeta[] = [
  {
    id: 'manual',
    label: 'Manual Verification',
    description: 'User manually marks as complete after self-assessment.',
  },
  {
    id: 'goal_completion',
    label: 'Goal Completion',
    description: 'Linked to a specific Goal. Complete when the goal is achieved.',
  },
  {
    id: 'milestone',
    label: 'Milestone',
    description: 'Represents a defined milestone achievement.',
  },
  {
    id: 'skill',
    label: 'Skill Acquisition',
    description: 'Represents a capability or skill to be developed.',
  },
  {
    id: 'evidence',
    label: 'Evidence Required',
    description: 'Requires documented evidence or external reference.',
  },
];

// ============================================================
// REQUIREMENT STATUS META
// ============================================================

export interface RequirementStatusMeta {
  id: RequirementStatus;
  label: string;
  color: string;
}

export const REQUIREMENT_STATUSES: RequirementStatusMeta[] = [
  { id: 'not_started', label: 'Not Started', color: 'text-text-muted' },
  { id: 'in_progress', label: 'In Progress', color: 'text-[#ffb27a]' },
  { id: 'completed', label: 'Completed', color: 'text-emerald-300' },
  { id: 'waived', label: 'Waived', color: 'text-text-muted/60' },
];

// ============================================================
// EVIDENCE TYPE META
// ============================================================

export const EVIDENCE_TYPES: { id: EvidenceType; label: string }[] = [
  { id: 'note', label: 'Note' },
  { id: 'goal', label: 'Goal Reference' },
  { id: 'activity', label: 'Activity Record' },
  { id: 'project', label: 'Project' },
  { id: 'document', label: 'Document / File' },
  { id: 'external_reference', label: 'External Reference' },
  { id: 'manual', label: 'Manual Entry' },
];

// ============================================================
// EXCEPTION TYPE META
// ============================================================

export const EXCEPTION_TYPES: { id: ExceptionType; label: string }[] = [
  { id: 'exceptional_achievement', label: 'Exceptional Achievement' },
  { id: 'major_opportunity', label: 'Major Unexpected Opportunity' },
  { id: 'life_disruption', label: 'Major Life Disruption' },
  { id: 'serious_setback', label: 'Serious Setback' },
  { id: 'calibration_adjustment', label: 'Calibration Adjustment' },
  { id: 'other', label: 'Other' },
];

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_LEVEL_DISPLAY_ORDER_START = 1;
export const MAX_LEVELS_PER_AREA = 20;
