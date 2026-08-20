import Dexie, { type Table } from 'dexie';
import { Capture } from '../../../types/capture.types';
import { Activity } from '../../../types/activity.types';
import { Task } from '../../../types/task.types';
import { WeeklyFocus } from '../../../types/weekly.types';
import { UserSettings } from '../../../types/settings.types';

export class POSDexieDB extends Dexie {
  captures!: Table<Capture, string>;
  activities!: Table<Activity, string>;
  tasks!: Table<Task, string>;
  weekly_focus!: Table<WeeklyFocus, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('PersonalOperatingSystemDB');

    // Define table schemas and indexes for fast queries
    this.version(1).stores({
      captures: 'id, user_id, capture_type, status, created_at, source',
      activities: 'id, date, status, category, created_at, [date+status]',
      tasks: 'id, status, priority, due_date, created_at, completed_at, related_week',
      weekly_focus: 'id, week_id, start_date, end_date',
      settings: 'id',
    });
  }
}

export const posDexieDb = new POSDexieDB();
