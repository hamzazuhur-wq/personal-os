import React, { useState, useEffect } from 'react';
import { CreateTaskDTO, TaskContext, TaskPriority } from '../../../types/task.types';
import { Project } from '../../../types/project.types';
import { Goal } from '../../../types/goal.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { X, Plus, Zap } from 'lucide-react';
import { ExecutionValidation } from '../validation/executionValidation';

export interface QuickNextActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreateTaskDTO) => Promise<void>;
  projects: Project[];
  goals: Goal[];
  preselectedProjectId?: string;
  preselectedGoalId?: string;
}

export const QuickNextActionModal: React.FC<QuickNextActionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  goals,
  preselectedProjectId,
  preselectedGoalId,
}) => {
  const [title, setTitle] = useState('');
  const [description] = useState('');
  const [projectId, setProjectId] = useState(preselectedProjectId || '');
  const [goalId, setGoalId] = useState(preselectedGoalId || '');
  const [context, setContext] = useState<TaskContext>('computer');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [effort] = useState<'low' | 'medium' | 'high'>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(30);
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setGoalId(preselectedGoalId || '');
      setProjectId(preselectedProjectId || '');
      setTitle('');
      setErrors({});
    }
  }, [isOpen, preselectedGoalId, preselectedProjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateTaskDTO = {
      title: title.trim(),
      description: description.trim() || undefined,
      status: 'ready',
      is_next_action: true,
      context,
      priority,
      effort,
      estimated_minutes: estimatedMinutes,
      due_date: dueDate || undefined,
      related_project_id: projectId || undefined,
      related_goal_id: goalId || undefined,
    };

    const val = ExecutionValidation.validateTask(dto);
    if (!val.isValid) {
      setErrors(val.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      await onSave(dto);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save action.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goalPathString = goalId ? GoalHierarchy.formatGoalPath(goalId, goals) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-5">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/15 border border-[#ff8a4a]/30 text-[#ff8a4a]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">New Next Physical Action</h2>
              <p className="text-xs text-text-muted">Define a concrete, immediate executable step.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Title */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-text-muted uppercase">
              Action Title (Concrete & Visible) *
            </label>
            <input
              type="text"
              placeholder="e.g. Draft the positioning statement in Google Docs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a]"
              autoFocus
            />
            {errors.title && <p className="text-xs text-rose-400">{errors.title}</p>}
          </div>

          {/* Project & Goal Linkage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-text-muted uppercase">Related Goal</label>
              <Select
                size="sm"
                value={goalId}
                onChange={setGoalId}
                options={[
                  { value: '', label: 'None' },
                  ...goals
                    .filter((g) => g.status !== 'archived')
                    .map((g) => ({
                      value: g.id,
                      label: GoalHierarchy.formatGoalPath(g.id, goals),
                    })),
                ]}
              />
              {goalPathString && (
                <p className="text-[10px] font-mono text-[#ff8a4a] truncate mt-0.5">
                  Path: {goalPathString}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-text-muted uppercase">Related Project</label>
              <Select
                size="sm"
                value={projectId}
                onChange={setProjectId}
                options={[
                  { value: '', label: 'None (Standalone Action)' },
                  ...projects
                    .filter((p) => p.status !== 'archived')
                    .map((p) => ({ value: p.id, label: p.title })),
                ]}
              />
            </div>
          </div>

          {/* Context & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-text-muted uppercase">Context</label>
              <Select
                size="sm"
                value={context}
                onChange={(val) => setContext(val as TaskContext)}
                options={[
                  { value: 'computer', label: '@computer' },
                  { value: 'deep_work', label: '@deep_work' },
                  { value: 'quick', label: '@quick' },
                  { value: 'phone', label: '@phone' },
                  { value: 'office', label: '@office' },
                  { value: 'home', label: '@home' },
                  { value: 'anywhere', label: '@anywhere' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-text-muted uppercase">Priority</label>
              <Select
                size="sm"
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={[
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-text-muted uppercase">Estimated Min</label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value) || undefined)}
                className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Due Date (Optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="px-5 font-bold shadow-[0_0_15px_rgba(255,106,42,0.25)]"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Create Ready Action</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
