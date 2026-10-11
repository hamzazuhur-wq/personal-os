import { CreateProjectDTO, Project, ProjectFilter, UpdateProjectDTO } from '../../types/project.types';
import { Task } from '../../types/task.types';
import { Activity } from '../../types/activity.types';

export interface IProjectRepository {
  getProjects(filter?: ProjectFilter): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(dto: CreateProjectDTO): Promise<Project>;
  updateProject(id: string, dto: UpdateProjectDTO): Promise<Project>;
  completeProject(id: string, outcomeNote?: string): Promise<Project>;
  pauseProject(id: string): Promise<Project>;
  resumeProject(id: string): Promise<Project>;
  archiveProject(id: string): Promise<Project>;
  getProjectTasks(projectId: string): Promise<Task[]>;
  getProjectActivities(projectId: string): Promise<Activity[]>;
}
