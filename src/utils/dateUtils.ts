/**
 * Precision date and time utilities for the Personal Operating System.
 * Supports ISO-8601 formatting, timezone-safe localized displays, and ISO week calculation.
 */

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(format: '24h' | '12h' = '24h'): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  if (format === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes}:${seconds} ${period}`;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
}

export function formatHumanDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getISOWeekString(dateInput: Date | string = new Date()): string {
  const date = typeof dateInput === 'string' 
    ? new Date(dateInput + 'T00:00:00') 
    : new Date(dateInput.getTime());
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  
  // Get first day of year
  const yearStart = new Date(date.getFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getWeekDateRange(weekId: string): { startDate: string; endDate: string } {
  const [yearStr, weekPart] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);

  // 4th January is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  // Monday of week 1
  const week1Mon = new Date(year, 0, 4 - jan4Day + 1);

  // Target Monday
  const targetMon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000);
  const targetSun = new Date(targetMon.getTime() + 6 * 86400000);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: formatDate(targetMon),
    endDate: formatDate(targetSun),
  };
}

export function getDaysInWeek(startDateStr: string): { date: string; dayName: string; shortName: string }[] {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const days = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month - 1, day + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    days.push({
      date: `${y}-${m}-${da}`,
      dayName: dayNames[i],
      shortName: shortNames[i],
    });
  }
  return days;
}

export function formatTimeAgo(isoString: string): string {
  if (!isoString) return '';
  const now = new Date().getTime();
  const time = new Date(isoString).getTime();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(isoString.slice(0, 10));
}
