import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { TASK_PRIORITIES } from '../../constants/priorities';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskPriority } from '../../types/task.types';
import { Practice } from '../../types/practice.types';
import { getISOWeekString } from '../../utils/dateUtils';
import { Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  practices?: Practice[];
  onSave: (dto: CreateTaskDTO | UpdateTaskDTO) => Promise<void>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  practices = [],
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [relatedPracticeId, setRelatedPracticeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority || 'medium');
      setDueDate(taskToEdit.due_date || '');
      setRelatedPracticeId(taskToEdit.related_practice_id || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setRelatedPracticeId('');
    }
    setError(null);
  }, [taskToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
        related_week: getISOWeekString(),
        related_practice_id: relatedPracticeId || undefined,
      });

      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError('Could not save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePractices = practices.filter((p) => p.status !== 'archived');
  const linkedPractice = activePractices.find((p) => p.id === relatedPracticeId);

  const practiceOptions = [
    { value: '', label: 'No Practice (No Points)' },
    ...activePractices.map((p) => ({
      value: p.id,
      label: p.title,
      subtext: `+${p.point_value} pts on completion${p.repeatable === false ? ' · one-time' : ''}`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'Edit Action Item' : 'New Action Item'}
      subtitle="Define actionable execution items with precision priority."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Action Title"
          placeholder="e.g. Deploy POS Module 01 verification test suite"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        {/* Priority Selection */}
        <div>
          <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-2">
            Priority Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TASK_PRIORITIES.map((p) => {
              const isSelected = priority === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    'p-2.5 rounded-xl border text-center text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer',
                    isSelected
                      ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/60 text-[#fff4ec] shadow-[0_0_14px_-2px_rgba(255,106,42,0.3)]'
                      : 'bg-black/35 border-white/[0.08] text-text-secondary hover:border-white/20 hover:text-text-primary'
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          type="date"
          label="Due Date (Optional)"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <Textarea
          label="Execution Notes & Acceptance Criteria"
          placeholder="Requirements, reference links, or context..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Module 08.2: Optional practice link — points awarded exactly once
            via the central PointService when the task is completed */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-2">
            Linked Practice (Optional)
          </label>
          <Select
            size="sm"
            value={relatedPracticeId}
            onChange={(v) => setRelatedPracticeId(v)}
            options={practiceOptions}
            placeholder="Link a practice to earn points on completion..."
            aria-label="Linked Practice"
          />
          {linkedPractice ? (
            <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 pt-1">
              <Zap className="w-3 h-3 shrink-0" />
              +{linkedPractice.point_value} pts awarded once when this task is completed.
            </p>
          ) : (
            <p className="text-[11px] text-text-muted pt-1">
              Tasks without a linked practice never award points.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
            {taskToEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
