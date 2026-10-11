import { Task, CreateTaskDTO, UpdateTaskDTO } from '../../../types/task.types';

export interface ExecutionValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ExecutionValidation {
  static validateTask(dto: Partial<CreateTaskDTO | UpdateTaskDTO>): ExecutionValidationResult {
    const errors: Record<string, string> = {};

    if (!dto.title || dto.title.trim().length === 0) {
      errors.title = 'Action title is required.';
    } else if (dto.title.trim().length > 150) {
      errors.title = 'Action title must be 150 characters or fewer.';
    }

    if (dto.status === 'blocked' && (!dto.blocked_reason || dto.blocked_reason.trim().length === 0)) {
      errors.blocked_reason = 'A reason is required when marking an action as blocked.';
    }

    if (dto.status === 'waiting' && (!dto.waiting_for || dto.waiting_for.trim().length === 0)) {
      errors.waiting_for = 'Specify who or what you are waiting for.';
    }

    if (dto.estimated_minutes !== undefined && dto.estimated_minutes < 0) {
      errors.estimated_minutes = 'Estimated minutes cannot be negative.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  static checkCircularDependency(
    taskId: string,
    targetPrerequisiteId: string,
    allTasks: Task[]
  ): boolean {
    if (taskId === targetPrerequisiteId) {
      return true;
    }

    const taskMap = new Map<string, Task>(allTasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    let currentId: string | undefined = targetPrerequisiteId;

    while (currentId) {
      if (currentId === taskId) {
        return true;
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      const nextTask: Task | undefined = taskMap.get(currentId);
      currentId = nextTask?.depends_on_task_id;
    }

    return false;
  }
}
