import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../../types/task.types';

export interface ITaskRepository {
  getAll(filter?: { status?: TaskStatus; weekId?: string }): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  getActive(limit?: number): Promise<Task[]>;
  create(dto: CreateTaskDTO): Promise<Task>;
  update(id: string, dto: UpdateTaskDTO): Promise<Task>;
  complete(id: string): Promise<Task>;
  uncomplete(id: string): Promise<Task>;
  delete(id: string): Promise<boolean>;
  getCounts(): Promise<{ total: number; active: number; completed: number }>;
}
