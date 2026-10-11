import { useState, useEffect, useCallback } from 'react';
import { useActivityRepo } from '../app/providers/RepositoryProvider';
import { Activity, CreateActivityDTO, UpdateActivityDTO, DailyActivitySummary } from '../types/activity.types';
import { getTodayDateString } from '../utils/dateUtils';
import { pointService } from '../services/points/pointService';

export function useActivities(initialDate: string = getTodayDateString()) {
  const repo = useActivityRepo();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<DailyActivitySummary>({
    date: initialDate,
    total_duration_minutes: 0,
    activity_count: 0,
    category_breakdown: {},
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDayData = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const [dayActivities, daySummary] = await Promise.all([
        repo.getByDate(date),
        repo.getDailySummary(date),
      ]);
      setActivities(dayActivities);
      setSummary(daySummary);
    } catch (err) {
      console.error('Failed to load activities for date:', date, err);
      setError('Unable to load activities.');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate, fetchDayData]);

  const changeDate = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const createActivity = async (dto: CreateActivityDTO): Promise<Activity> => {
    try {
      const created = await repo.create(dto);
      // Centralized point service: awards practice points exactly once when a
      // practice is linked; plain (non-practice) activities never award points.
      await pointService.awardForActivity({ activity: created });
      if (created.date === selectedDate) {
        await fetchDayData(selectedDate);
      }
      return created;
    } catch (err) {
      console.error('Failed to create activity:', err);
      throw err;
    }
  };

  const updateActivity = async (id: string, dto: UpdateActivityDTO): Promise<Activity> => {
    try {
      const updated = await repo.update(id, dto);
      await fetchDayData(selectedDate);
      return updated;
    } catch (err) {
      console.error('Failed to update activity:', err);
      throw err;
    }
  };

  const archiveActivity = async (id: string): Promise<void> => {
    try {
      await repo.archive(id);
      await fetchDayData(selectedDate);
    } catch (err) {
      console.error('Failed to archive activity:', err);
      throw err;
    }
  };

  const deleteActivity = async (id: string): Promise<void> => {
    try {
      await repo.delete(id);
      await fetchDayData(selectedDate);
    } catch (err) {
      console.error('Failed to delete activity:', err);
      throw err;
    }
  };

  return {
    selectedDate,
    activities,
    summary,
    loading,
    error,
    changeDate,
    createActivity,
    updateActivity,
    archiveActivity,
    deleteActivity,
    refreshActivities: () => fetchDayData(selectedDate),
  };
}
