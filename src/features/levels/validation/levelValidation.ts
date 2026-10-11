import { CreateLevelDTO, CreateRequirementDTO, Level } from '../../../types/level.types';

export interface LevelValidationErrors {
  name?: string;
  lifeAreaId?: string;
  displayOrder?: string;
}

export interface RequirementValidationErrors {
  title?: string;
  type?: string;
}

export function validateLevelPayload(
  payload: Partial<CreateLevelDTO>,
  existingLevels: Level[],
  currentLevelId?: string
): { isValid: boolean; errors: LevelValidationErrors } {
  const errors: LevelValidationErrors = {};

  if (!payload.name || payload.name.trim().length < 2) {
    errors.name = 'Level name must be at least 2 characters.';
  }

  if (!payload.life_area_id) {
    errors.lifeAreaId = 'Life Area selection is required.';
  }

  if (payload.display_order === undefined || payload.display_order === null || payload.display_order < 1) {
    errors.displayOrder = 'Display order must be a positive integer.';
  } else {
    // Check for duplicate display_order in the same life area among non-archived levels
    const conflict = existingLevels.find(
      (l) =>
        l.id !== currentLevelId &&
        l.life_area_id === payload.life_area_id &&
        l.status !== 'archived' &&
        l.display_order === payload.display_order
    );
    if (conflict) {
      errors.displayOrder = `Display order ${payload.display_order} is already used by "${conflict.name}".`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRequirementPayload(
  payload: Partial<CreateRequirementDTO>
): { isValid: boolean; errors: RequirementValidationErrors } {
  const errors: RequirementValidationErrors = {};

  if (!payload.title || payload.title.trim().length < 3) {
    errors.title = 'Requirement title must be at least 3 characters.';
  }

  if (!payload.type) {
    errors.type = 'Requirement classification is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
