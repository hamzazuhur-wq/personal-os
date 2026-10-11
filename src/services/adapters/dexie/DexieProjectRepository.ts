import { IProjectRepository } from '../../contracts/IProjectRepository';
import { CreateProjectDTO, Project, ProjectFilter, UpdateProjectDTO } from '../../../types/project.types';
import { Task } from '../../../types/task.types';
import { Activity } from '../../../types/activity.types';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';
import { APP_CONFIG } from '../../../config/app.config';

export class DexieProjectRepository implements IProjectRepository {
  async getProjects(filter?: ProjectFilter): Promise<Project[]> {
    let results = await posDexieDb.projects.toArray();

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        results = results.filter((p) => p.status === filter.status);
      } else if (!filter.status) {
        // Default view: exclude archived
        results = results.filter((p) => p.status !== 'archived');
      }

      if (filter.life_area_id && filter.life_area_id !== 'all') {
        results = results.filter((p) => p.life_area_id === filter.life_area_id);
      }

      if (filter.primary_goal_id && filter.primary_goal_id !== 'all') {
        results = results.filter((p) => p.primary_goal_id === filter.primary_goal_id);
      }

      if (filter.priority && filter.priority !== 'all') {
        results = results.filter((p) => p.priority === filter.priority);
      }

      if (filter.searchQuery && filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        results = results.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.desired_outcome.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
      }
    } else {
      results = results.filter((p) => p.status !== 'archived');
    }

    return results;
  }

  async getProject(id: string): Promise<Project | null> {
    const record = await posDexieDb.projects.get(id);
    return record || null;
  }

  async createProject(dto: CreateProjectDTO): Promise<Project> {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...dto,
      id: generateId(),
      user_id: APP_CONFIG.defaultUserId,
      created_at: now,
      updated_at: now,
    };
    await posDexieDb.projects.add(newProject);
    return newProject;
  }

  async updateProject(id: string, dto: UpdateProjectDTO): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project "${id}" not found.`);

    const updated: Project = {
      ...existing,
      ...dto,
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.projects.put(updated);
    return updated;
  }

  async completeProject(id: string, outcomeNote?: string): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project "${id}" not found.`);

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      status: 'completed',
      completed_at: now,
      completion_note: outcomeNote !== undefined ? outcomeNote : existing.completion_note,
      updated_at: now,
    };
    await posDexieDb.projects.put(updated);
    return updated;
  }

  async pauseProject(id: string): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project "${id}" not found.`);

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      status: 'paused',
      updated_at: now,
    };
    await posDexieDb.projects.put(updated);
    return updated;
  }

  async resumeProject(id: string): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project "${id}" not found.`);

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      status: 'active',
      updated_at: now,
    };
    await posDexieDb.projects.put(updated);
    return updated;
  }

  async archiveProject(id: string): Promise<Project> {
    const existing = await this.getProject(id);
    if (!existing) throw new Error(`Project "${id}" not found.`);

    const now = new Date().toISOString();
    const updated: Project = {
      ...existing,
      status: 'archived',
      archived_at: now,
      updated_at: now,
    };
    await posDexieDb.projects.put(updated);
    return updated;
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    return posDexieDb.tasks
      .where('related_project_id')
      .equals(projectId)
      .toArray();
  }

  async getProjectActivities(projectId: string): Promise<Activity[]> {
    return posDexieDb.activities
      .where('related_project_id')
      .equals(projectId)
      .toArray();
  }
}
