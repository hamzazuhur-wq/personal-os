import { Goal } from '../../../types/goal.types';

export interface GoalValidationErrors {
  title?: string;
  dateRange?: string;
  parentGoal?: string;
  general?: string;
}

export function validateGoalTitle(title: string): string | null {
  if (!title || !title.trim()) {
    return 'Goal title is required.';
  }
  if (title.trim().length < 3) {
    return 'Goal title must be at least 3 characters.';
  }
  return null;
}

export function validateGoalDates(startDate?: string, targetDate?: string): string | null {
  if (startDate && targetDate) {
    if (startDate > targetDate) {
      return 'Target date cannot be earlier than start date.';
    }
  }
  return null;
}

export function validateParentRelationship(
  currentGoalId: string | undefined,
  selectedParentId: string | undefined,
  allGoals: Goal[]
): string | null {
  if (!selectedParentId) {
    return null;
  }

  if (currentGoalId && selectedParentId === currentGoalId) {
    return 'A goal cannot be its own parent.';
  }

  // Check for cyclic dependency
  if (currentGoalId) {
    let parentCursor: string | undefined = selectedParentId;
    const visited = new Set<string>([currentGoalId]);

    while (parentCursor) {
      if (visited.has(parentCursor)) {
        return 'Cyclic parent goal relationship detected.';
      }
      visited.add(parentCursor);

      const parentGoal = allGoals.find((g) => g.id === parentCursor);
      parentCursor = parentGoal?.parent_goal_id;
    }
  }

  return null;
}

export function validateGoalPayload(
  payload: {
    title: string;
    start_date?: string;
    target_date?: string;
    parent_goal_id?: string;
  },
  currentGoalId: string | undefined,
  allGoals: Goal[]
): { isValid: boolean; errors: GoalValidationErrors } {
  const errors: GoalValidationErrors = {};

  const titleError = validateGoalTitle(payload.title);
  if (titleError) errors.title = titleError;

  const dateError = validateGoalDates(payload.start_date, payload.target_date);
  if (dateError) errors.dateRange = dateError;

  const parentError = validateParentRelationship(currentGoalId, payload.parent_goal_id, allGoals);
  if (parentError) errors.parentGoal = parentError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
