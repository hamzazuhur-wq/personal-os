import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { TASK_PRIORITIES } from '../../constants/priorities';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskPriority } from '../../types/task.types';
import { getISOWeekString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSave: (dto: CreateTaskDTO | UpdateTaskDTO) => Promise<void>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority || 'medium');
      setDueDate(taskToEdit.due_date || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
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
      });

      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError('Could not save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
