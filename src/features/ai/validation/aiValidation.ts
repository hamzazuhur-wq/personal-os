export interface AIMemoryValidationErrors {
  content?: string;
  type?: string;
}

export function validateAIMemory(content: string, type: string): AIMemoryValidationErrors {
  const errors: AIMemoryValidationErrors = {};
  if (!content || content.trim().length === 0) {
    errors.content = 'Memory content is required.';
  } else if (content.trim().length > 500) {
    errors.content = 'Memory content must be 500 characters or fewer.';
  }

  const validTypes = ['preference', 'constraint', 'decision', 'context', 'interaction_preference'];
  if (!validTypes.includes(type)) {
    errors.type = 'Invalid memory type.';
  }

  return errors;
}

export function hasAIMemoryValidationErrors(errors: AIMemoryValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
