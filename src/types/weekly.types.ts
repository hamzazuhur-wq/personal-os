import { Activity } from './activity.types';
import { Task } from './task.types';
import { Capture } from './capture.types';

export interface WeeklyFocus {
  id: string; // e.g. "2026-W34"
  week_id: string; // "2026-W34"
  start_date: string; // YYYY-MM-DD (e.g. Monday)
  end_date: string; // YYYY-MM-DD (e.g. Sunday)
  primary_focus: string;
  secondary_objectives?: string[];
  reflection_notes?: string;
  updated_at: string; // ISO 8601 string
}

export interface SetWeeklyFocusDTO {
  week_id: string;
  start_date: string;
  end_date: string;
  primary_focus: string;
  secondary_objectives?: string[];
  reflection_notes?: string;
}

export interface WeeklyOverviewData {
  week_id: string;
  start_date: string;
  end_date: string;
  focus: WeeklyFocus | null;
  activities: Activity[];
  tasks: Task[];
  captures: Capture[];
  total_duration_minutes: number;
  completed_tasks_count: number;
  remaining_tasks_count: number;
  daily_breakdown: {
    date: string;
    day_name: string;
    activities: Activity[];
    total_minutes: number;
  }[];
}
