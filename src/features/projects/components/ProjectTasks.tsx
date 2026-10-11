import React, { useState } from 'react';
import { Task, CreateTaskDTO } from '../../../types/task.types';
import { Button } from '../../../components/ui/Button';
import { CheckSquare, CheckCircle2, Circle, Plus } from 'lucide-react';
import { formatHumanDate } from '../../../utils/dateUtils';
import { cn } from '../../../utils/cn';

export interface ProjectTasksProps {
  tasks: Task[];
  onToggleComplete: (id: string, currentStatus: string) => Promise<void>;
  onAddTask: (dto: CreateTaskDTO) => Promise<void>;
}

export const ProjectTasks: React.FC<ProjectTasksProps> = ({
  tasks,
  onToggleComplete,
  onAddTask,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddTask({
        title: title.trim(),
        priority,
        due_date: dueDate || undefined,
        status: 'not_started',
      });
      setTitle('');
      setDueDate('');
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-sm font-bold text-[#fff4ec] tracking-tight uppercase font-mono">
            Executable Actions & Tasks ({completedCount}/{tasks.length})
          </h3>
        </div>

        {!isAdding && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            <span>Add Task</span>
          </Button>
        )}
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
          <input
            type="text"
            placeholder="Action / Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/50 border border-[#ff8a4a]/40 text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
            autoFocus
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted font-mono">Priority:</span>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border cursor-pointer',
                    priority === p
                      ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/50 text-[#fff4ec]'
                      : 'bg-black/30 border-white/[0.06] text-text-muted hover:text-text-secondary'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-black/40 border border-white/[0.08] text-xs text-text-primary rounded-lg px-2 py-1 outline-none font-mono"
              />
              <Button size="sm" variant="primary" type="submit" isLoading={isSubmitting}>
                Add
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Task List */}
      {tasks.length === 0 && !isAdding ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No actions attached to this project yet. Add executable steps to begin.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const isCompleted = t.status === 'completed';
            return (
              <div
                key={t.id}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors',
                  isCompleted
                    ? 'bg-emerald-500/[0.03] border-emerald-500/20 text-text-muted'
                    : 'bg-white/[0.02] border-white/[0.06] text-text-primary hover:border-white/15'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(t.id, t.status)}
                    className="shrink-0 cursor-pointer text-text-muted hover:text-text-primary"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <span
                    className={cn(
                      'text-xs font-medium truncate',
                      isCompleted && 'line-through text-text-muted/60'
                    )}
                  >
                    {t.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-text-muted">
                  {t.priority && (
                    <span className="uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">
                      {t.priority}
                    </span>
                  )}
                  {t.due_date && <span>Due: {formatHumanDate(t.due_date)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
