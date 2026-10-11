import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatus,
  ExecutionFilter,
  TodayExecutionData,
  ProjectExecutionHealth,
} from '../../types/task.types';

export interface ITaskRepository {
  getAll(filter?: { status?: TaskStatus; weekId?: string }): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  getActive(limit?: number): Promise<Task[]>;
  create(dto: CreateTaskDTO): Promise<Task>;
  update(id: string, dto: UpdateTaskDTO): Promise<Task>;
  complete(id: string, completionNote?: string): Promise<Task>;
  uncomplete(id: string): Promise<Task>;
  delete(id: string): Promise<boolean>;
  getCounts(): Promise<{ total: number; active: number; completed: number }>;

  // ─── Module 07 Execution Extensions ─────────────────────────
  getReadyTasks(filter?: ExecutionFilter): Promise<Task[]>;
  getTodayExecution(date?: string): Promise<TodayExecutionData>;
  getInProgressTasks(): Promise<Task[]>;
  getBlockedTasks(): Promise<Task[]>;
  getWaitingTasks(): Promise<Task[]>;
  getOverdueTasks(referenceDate?: string): Promise<Task[]>;
  startTask(id: string): Promise<Task>;
  blockTask(id: string, reason: string, blockedByTaskId?: string): Promise<Task>;
  unblockTask(id: string): Promise<Task>;
  setWaitingTask(id: string, waitingFor: string, expectedDate?: string): Promise<Task>;
  markReady(id: string): Promise<Task>;
  setDailyPriorities(taskIds: string[]): Promise<void>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTasksByGoal(goalId: string, includeDescendants?: boolean): Promise<Task[]>;
  moveTask(id: string, newGoalId?: string, newProjectId?: string): Promise<Task>;
  getProjectExecutionHealth(projectId: string): Promise<ProjectExecutionHealth>;
}

