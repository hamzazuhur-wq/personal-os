import { CreateSkillDTO, SkillProficiency, SkillDevelopmentState } from '../../../types/skill.types';
import { PROFICIENCY_ORDER } from '../../../constants/skills';

export interface SkillValidationErrors {
  name?: string;
  current_proficiency?: string;
  target_proficiency?: string;
  development_state?: string;
}

const VALID_PROFICIENCY: SkillProficiency[] = ['foundation', 'developing', 'competent', 'advanced', 'expert'];
const VALID_STATES: SkillDevelopmentState[] = ['not_started', 'developing', 'maintaining', 'demonstrated'];

export function validateSkill(dto: Partial<CreateSkillDTO>): SkillValidationErrors {
  const errors: SkillValidationErrors = {};

  if (!dto.name || dto.name.trim().length === 0) {
    errors.name = 'Skill name is required.';
  } else if (dto.name.trim().length > 120) {
    errors.name = 'Skill name must be 120 characters or fewer.';
  }

  if (dto.current_proficiency && !VALID_PROFICIENCY.includes(dto.current_proficiency)) {
    errors.current_proficiency = 'Invalid proficiency level.';
  }

  if (dto.target_proficiency && !VALID_PROFICIENCY.includes(dto.target_proficiency)) {
    errors.target_proficiency = 'Invalid target proficiency.';
  }

  if (dto.development_state && !VALID_STATES.includes(dto.development_state)) {
    errors.development_state = 'Invalid development state.';
  }

  return errors;
}

export function hasSkillValidationErrors(errors: SkillValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getProficiencyOrderIndex(p: SkillProficiency): number {
  return PROFICIENCY_ORDER.indexOf(p);
}
