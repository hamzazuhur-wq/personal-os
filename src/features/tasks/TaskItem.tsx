import React, { useState } from 'react';
import { Task } from '../../types/task.types';
import { TASK_PRIORITIES } from '../../constants/priorities';
import { formatShortDate } from '../../utils/dateUtils';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Check, Calendar, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string, isCompleted: boolean) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => Promise<void>;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isCompleted = task.status === 'completed';
  const priorityMeta = TASK_PRIORITIES.find((p) => p.id === (task.priority || 'medium')) || TASK_PRIORITIES[2];

  const handleToggle = async () => {
    try {
      setIsProcessing(true);
      await onToggleComplete(task.id, isCompleted);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      await onDelete(task.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'p-4 rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border transition-all duration-200 flex items-start justify-between gap-3.5 group relative overflow-hidden',
          isCompleted
            ? 'border-white/[0.04] bg-white/[0.01] opacity-70'
            : 'border-white/[0.08] hover:border-[#ff8a4a]/40 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_20px_-8px_rgba(255,106,42,0.2)]'
        )}
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Luminous Precision Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={isCompleted}
            onClick={handleToggle}
            disabled={isProcessing}
            className={cn(
              'w-5 h-5 rounded-lg border flex items-center justify-center transition-all mt-0.5 shrink-0 cursor-pointer',
              isCompleted
                ? 'bg-gradient-to-br from-[#ff6a2a] to-[#ff8a4a] border-[#ff8a4a] text-[#090b0e] shadow-[0_0_12px_rgba(255,106,42,0.5)]'
                : 'border-white/20 bg-black/40 hover:border-[#ff8a4a]/70 hover:shadow-[0_0_8px_rgba(255,106,42,0.2)]'
            )}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={cn(
                  'text-sm font-bold tracking-tight transition-all',
                  isCompleted ? 'line-through text-text-muted font-normal' : 'text-[#fff4ec]'
                )}
              >
                {task.title}
              </span>

              {task.priority && (
                <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider border select-none', priorityMeta.badgeStyle)}>
                  {priorityMeta.label}
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted mt-1.5 flex-wrap">
              {task.due_date && (
                <div className="flex items-center gap-1 text-[#ff8a4a]">
                  <Calendar className="w-3 h-3" />
                  <span>Due {formatShortDate(task.due_date)}</span>
                </div>
              )}
              {isCompleted && task.completed_at && (
                <span className="text-emerald-400">
                  Completed {formatShortDate(task.completed_at.slice(0, 10))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(task)}
            title="Edit Task"
            className="text-text-muted hover:text-[#fff4ec] p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete Task"
            className="text-text-muted hover:text-rose-400 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isProcessing}
      />
    </>
  );
};
