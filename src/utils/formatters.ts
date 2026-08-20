/**
 * Presentation formatters for numbers, durations, and text.
 */

export function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '0m';
  
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
}

export function formatDurationDecimal(minutes?: number): string {
  if (!minutes || minutes <= 0) return '0.0h';
  const hrs = (minutes / 60).toFixed(1);
  return `${hrs}h`;
}

export function truncateText(text: string, maxLength: number = 80): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
