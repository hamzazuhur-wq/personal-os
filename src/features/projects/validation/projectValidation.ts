import { CreateProjectDTO } from '../../../types/project.types';

export interface ProjectValidationErrors {
  title?: string;
  desiredOutcome?: string;
  dates?: string;
  lifeAreaId?: string;
  primaryGoalId?: string;
}

export function validateProjectPayload(
  payload: Partial<CreateProjectDTO>
): { isValid: boolean; errors: ProjectValidationErrors } {
  const errors: ProjectValidationErrors = {};

  if (!payload.title || payload.title.trim().length < 2) {
    errors.title = 'Project title must be at least 2 characters.';
  }

  if (!payload.desired_outcome || payload.desired_outcome.trim().length < 3) {
    errors.desiredOutcome = 'Desired outcome is required (what will exist when finished).';
  }

  if (payload.start_date && payload.target_date) {
    if (payload.target_date < payload.start_date) {
      errors.dates = 'Target date cannot be earlier than the start date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
