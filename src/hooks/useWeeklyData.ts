import { useState, useEffect, useCallback } from 'react';
import { useWeeklyFocusRepo, useActivityRepo, useTaskRepo, useCaptureRepo } from '../app/providers/RepositoryProvider';
import { WeeklyFocus, SetWeeklyFocusDTO, WeeklyOverviewData } from '../types/weekly.types';
import { getISOWeekString, getWeekDateRange, getDaysInWeek } from '../utils/dateUtils';

export function useWeeklyData(initialWeekId?: string) {
  const weeklyFocusRepo = useWeeklyFocusRepo();
  const activityRepo = useActivityRepo();
  const taskRepo = useTaskRepo();
  const captureRepo = useCaptureRepo();

  const [currentWeekId, setCurrentWeekId] = useState<string>(initialWeekId || getISOWeekString());
  const [data, setData] = useState<WeeklyOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyData = useCallback(async (weekId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getWeekDateRange(weekId);
      const [focus, activities, tasks, captures] = await Promise.all([
        weeklyFocusRepo.getByWeekId(weekId),
        activityRepo.getByDateRange(startDate, endDate),
        taskRepo.getAll({ weekId }),
        captureRepo.getAll({ status: 'inbox' }),
      ]);

      const totalDuration = activities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0);
      const completedTasks = tasks.filter((t) => t.status === 'completed').length;
      const remainingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

      // Group activities day by day
      const days = getDaysInWeek(startDate);
      const dailyBreakdown = days.map((day) => {
        const dayActivities = activities.filter((act) => act.date === day.date);
        const dayTotal = dayActivities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0);
        return {
          date: day.date,
          day_name: day.dayName,
          activities: dayActivities,
          total_minutes: dayTotal,
        };
      });

      setData({
        week_id: weekId,
        start_date: startDate,
        end_date: endDate,
        focus,
        activities,
        tasks,
        captures,
        total_duration_minutes: totalDuration,
        completed_tasks_count: completedTasks,
        remaining_tasks_count: remainingTasks,
        daily_breakdown: dailyBreakdown,
      });
    } catch (err) {
      console.error('Failed to load weekly overview:', err);
      setError('Unable to load weekly data.');
    } finally {
      setLoading(false);
    }
  }, [weeklyFocusRepo, activityRepo, taskRepo, captureRepo]);

  useEffect(() => {
    fetchWeeklyData(currentWeekId);
  }, [currentWeekId, fetchWeeklyData]);

  const changeWeek = (weekId: string) => {
    setCurrentWeekId(weekId);
  };

  const saveWeeklyFocus = async (dto: SetWeeklyFocusDTO): Promise<WeeklyFocus> => {
    try {
      const saved = await weeklyFocusRepo.setFocus(dto);
      await fetchWeeklyData(currentWeekId);
      return saved;
    } catch (err) {
      console.error('Failed to save weekly focus:', err);
      throw err;
    }
  };

  return {
    currentWeekId,
    data,
    loading,
    error,
    changeWeek,
    saveWeeklyFocus,
    refreshWeeklyData: () => fetchWeeklyData(currentWeekId),
  };
}
