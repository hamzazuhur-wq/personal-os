import { Activity, CreateActivityDTO, UpdateActivityDTO, DailyActivitySummary } from '../../types/activity.types';

export interface IActivityRepository {
  getByDate(date: string): Promise<Activity[]>;
  getByDateRange(startDate: string, endDate: string): Promise<Activity[]>;
  getById(id: string): Promise<Activity | null>;
  create(dto: CreateActivityDTO): Promise<Activity>;
  update(id: string, dto: UpdateActivityDTO): Promise<Activity>;
  archive(id: string): Promise<Activity>;
  delete(id: string): Promise<boolean>;
  getDailySummary(date: string): Promise<DailyActivitySummary>;
  getWeeklyDurationTotal(startDate: string, endDate: string): Promise<number>;
}
