import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { getTodayDateString, formatHumanDate } from '../../utils/dateUtils';
import { Button } from '../ui/Button';

export interface DatePickerBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const DatePickerBar: React.FC<DatePickerBarProps> = ({ selectedDate, onDateChange }) => {
  const today = getTodayDateString();
  const isToday = selectedDate === today;

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const newY = prev.getFullYear();
    const newM = String(prev.getMonth() + 1).padStart(2, '0');
    const newD = String(prev.getDate()).padStart(2, '0');
    onDateChange(`${newY}-${newM}-${newD}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const newY = next.getFullYear();
    const newM = String(next.getMonth() + 1).padStart(2, '0');
    const newD = String(next.getDate()).padStart(2, '0');
    onDateChange(`${newY}-${newM}-${newD}`);
  };

  const handleSetToday = () => {
    onDateChange(today);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrevDay}
          aria-label="Previous day"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNextDay}
          aria-label="Next day"
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSetToday}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Today
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3">
        <div className="text-left sm:text-right">
          <div className="text-[10px] text-text-muted font-mono uppercase tracking-[0.18em]">
            {isToday ? 'Active Operational Log' : 'Historical Archive'}
          </div>
          <div className="text-sm font-bold text-[#fff4ec] tracking-tight">
            {formatHumanDate(selectedDate)}
          </div>
        </div>

        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Select custom date"
          />
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-[#ff8a4a] hover:bg-white/[0.08] transition-colors pointer-events-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
