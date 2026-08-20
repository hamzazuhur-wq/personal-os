import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { ACTIVITY_CATEGORIES } from '../../constants/categories';
import { Activity, CreateActivityDTO, UpdateActivityDTO, ActivityCategory } from '../../types/activity.types';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DailyActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  activityToEdit?: Activity | null;
  onSave: (dto: CreateActivityDTO | UpdateActivityDTO) => Promise<void>;
}

export const DailyActivityFormModal: React.FC<DailyActivityFormModalProps> = ({
  isOpen,
  onClose,
  date,
  activityToEdit,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Deep Work');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activityToEdit) {
      setTitle(activityToEdit.title);
      setDescription(activityToEdit.description || '');
      setDurationMinutes(activityToEdit.duration_minutes || 0);
      setStartTime(activityToEdit.start_time || '');
      setEndTime(activityToEdit.end_time || '');
      setCategory((activityToEdit.category as ActivityCategory) || 'Deep Work');
    } else {
      setTitle('');
      setDescription('');
      setDurationMinutes(60);
      setStartTime('');
      setEndTime('');
      setCategory('Deep Work');
    }
    setError(null);
  }, [activityToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const parsedDuration = typeof durationMinutes === 'number' ? durationMinutes : parseInt(durationMinutes, 10) || 0;

      await onSave({
        date,
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: parsedDuration,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        category,
      });

      onClose();
    } catch (err) {
      console.error('Failed to save activity:', err);
      setError('Could not save activity. Please check input.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDurations = [15, 30, 45, 60, 90, 120, 180];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activityToEdit ? 'Edit Activity Record' : 'Record Actual Activity'}
      subtitle={`Logging for date: ${date}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Activity Title"
          placeholder="e.g. Architecting POS core database schema"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        {/* Category Selector Grid */}
        <div>
          <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-2">
            Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ACTIVITY_CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between',
                    isSelected
                      ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 border-[#ff8a4a]/50 text-[#fff4ec] font-bold shadow-[0_2px_12px_rgba(255,106,42,0.25)]'
                      : 'bg-black/35 border-white/[0.08] text-text-secondary hover:border-white/20 hover:text-text-primary'
                  )}
                >
                  <span className="truncate">{cat.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a4a]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Input & Quick Presets */}
        <div>
          <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-1.5">
            Duration (Minutes)
          </label>
          <div className="flex items-center gap-2 mb-2.5">
            <Input
              type="number"
              min="0"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              leftIcon={<Clock className="w-4 h-4 text-[#ff8a4a]" />}
              className="font-mono text-sm"
              placeholder="e.g. 60"
            />
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] font-mono text-text-muted mr-1 uppercase tracking-wider">Presets:</span>
            {quickDurations.map((mins) => (
              <button
                type="button"
                key={mins}
                onClick={() => setDurationMinutes(mins)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border',
                  durationMinutes === mins
                    ? 'bg-[#ff6a2a]/25 text-[#fff4ec] border-[#ff8a4a]/60 font-bold shadow-[0_0_10px_rgba(255,106,42,0.3)]'
                    : 'bg-black/35 text-text-muted border-white/[0.07] hover:text-text-primary hover:border-white/20'
                )}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Optional Time Stamps */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Input
            type="time"
            label="Start Time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            type="time"
            label="End Time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <Textarea
          label="Detailed Execution Notes"
          placeholder="Details on output, blockers, accomplishments..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
            {activityToEdit ? 'Save Changes' : 'Record Activity'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
