import { useState, useEffect } from 'react';
import { getCurrentTimeString, getTodayDateString, getISOWeekString } from '../utils/dateUtils';
import { useSettings } from '../app/providers/SettingsProvider';

export interface LiveDateTimeState {
  currentDate: string; // YYYY-MM-DD
  currentTime: string;
  weekdayName: string;
  dayNumber: number;
  monthName: string;
  yearNumber: number;
  isoWeek: string;
  rawDate: Date;
}

export function useLiveDateTime(): LiveDateTimeState {
  const { settings } = useSettings();
  const timeFormat = settings?.time_format || '24h';

  const [dateObj, setDateObj] = useState<Date>(new Date());

  useEffect(() => {
    // Tick every 1000ms for precision live time
    const interval = setInterval(() => {
      setDateObj(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const weekdayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(dateObj);
  const dayNumber = dateObj.getDate();
  const yearNumber = dateObj.getFullYear();

  return {
    currentDate: getTodayDateString(),
    currentTime: getCurrentTimeString(timeFormat),
    weekdayName,
    dayNumber,
    monthName,
    yearNumber,
    isoWeek: getISOWeekString(dateObj),
    rawDate: dateObj,
  };
}
