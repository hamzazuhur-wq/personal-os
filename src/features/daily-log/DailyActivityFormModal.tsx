import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { GoalProjectSelects } from '../../components/shared/GoalProjectSelects';
import { PointStepper } from '../practices/components/devpoints/PointStepper';
import { useDevelopmentPoints } from '../../hooks/useDevelopmentPoints';
import { ACTIVITY_CATEGORIES } from '../../constants/categories';
import {
  Activity,
  CreateActivityDTO,
  UpdateActivityDTO,
  ActivityCategory,
} from '../../types/activity.types';
import { Goal } from '../../types/goal.types';
import { Project } from '../../types/project.types';
import { Task } from '../../types/task.types';
import { Practice } from '../../types/practice.types';
import { LifeArea } from '../../types/vision.types';
import { Clock, Zap, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DailyActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  activityToEdit?: Activity | null;
  goals: Goal[];
  projects: Project[];
  practices: Practice[];
  lifeAreas: LifeArea[];
  tasks?: Task[];
  /** Quick Capture prefill (capture is preserved — nothing is deleted). */
  initialTitle?: string;
  initialNotes?: string;
  initialLifeAreaId?: string;
  initialGoalId?: string;
  initialProjectId?: string;
  initialTaskId?: string;
  initialPracticeId?: string;
  onSave: (dto: CreateActivityDTO | UpdateActivityDTO) => Promise<Activity | void>;
}

export const DailyActivityFormModal: React.FC<DailyActivityFormModalProps> = ({
  isOpen,
  onClose,
  date,
  activityToEdit,
  goals,
  projects,
  practices,
  lifeAreas,
  tasks = [],
  initialTitle,
  initialNotes,
  initialLifeAreaId,
  initialGoalId,
  initialProjectId,
  initialTaskId,
  initialPracticeId,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Deep Work');
  const [relatedGoalId, setRelatedGoalId] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState('');
  const [relatedTaskId, setRelatedTaskId] = useState('');
  const [relatedLifeAreaId, setRelatedLifeAreaId] = useState('');
  const [relatedPracticeId, setRelatedPracticeId] = useState('');
  // Module 08 Final — optional inline manual Development Points entry
  const [devPoints, setDevPoints] = useState(0);
  const [devPointReason, setDevPointReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addDevelopmentPoints } = useDevelopmentPoints();

  useEffect(() => {
    if (activityToEdit) {
      setTitle(activityToEdit.title);
      setDescription(activityToEdit.description || '');
      setDurationMinutes(activityToEdit.duration_minutes || 0);
      setStartTime(activityToEdit.start_time || '');
      setEndTime(activityToEdit.end_time || '');
      setCategory((activityToEdit.category as ActivityCategory) || 'Deep Work');
      setRelatedGoalId(activityToEdit.related_goal_id || '');
      setRelatedProjectId(activityToEdit.related_project_id || '');
      setRelatedTaskId(activityToEdit.related_task_id || '');
      setRelatedLifeAreaId(activityToEdit.related_life_area_id || '');
      setRelatedPracticeId(activityToEdit.related_practice_id || '');
    } else {
      setTitle(initialTitle || '');
      setDescription(initialNotes || '');
      setDurationMinutes(60);
      setStartTime('');
      setEndTime('');
      setCategory('Deep Work');
      setRelatedGoalId(initialGoalId || '');
      setRelatedProjectId(initialProjectId || '');
      setRelatedTaskId(initialTaskId || '');
      setRelatedLifeAreaId(initialLifeAreaId || '');
      setRelatedPracticeId(initialPracticeId || '');
    }
    setDevPoints(0);
    setDevPointReason('');
    setError(null);
  }, [activityToEdit, isOpen, initialTitle, initialNotes, initialGoalId, initialProjectId, initialTaskId, initialPracticeId, initialLifeAreaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }

    // Module 08 Final: Life Area is the required top-level scope. A linked
    // goal's area wins; otherwise the practice's default; otherwise explicit.
    const selectedGoal = goals.find((g) => g.id === relatedGoalId);
    const selectedProject = projects.find((p) => p.id === relatedProjectId);
    const selectedTask = tasks.find((t) => t.id === relatedTaskId);
    const linkedPractice = practices.find((p) => p.id === relatedPracticeId);
    const effectiveLifeAreaId =
      selectedGoal?.life_area_id ||
      goals.find((g) => g.id === selectedTask?.related_goal_id)?.life_area_id ||
      selectedProject?.life_area_id ||
      linkedPractice?.life_area_id ||
      relatedLifeAreaId ||
      undefined;

    if (!effectiveLifeAreaId) {
      setError('A Life Area is required for every logged activity.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const parsedDuration =
        typeof durationMinutes === 'number' ? durationMinutes : parseInt(durationMinutes, 10) || 0;

      const savedActivity = await onSave({
        date,
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: parsedDuration,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        category,
        related_goal_id: relatedGoalId || undefined,
        related_project_id: relatedProjectId || undefined,
        related_task_id: relatedTaskId || undefined,
        related_life_area_id: effectiveLifeAreaId,
        related_practice_id: relatedPracticeId || undefined,
      });

      // Optional manual Development Points entry — routed through the
      // centralized PointService with full attribution to this activity.
      if (devPoints > 0 && savedActivity && 'id' in savedActivity) {
        try {
          await addDevelopmentPoints({
            points: devPoints,
            reason:
              devPointReason.trim() ||
              `Logged via Daily Log: ${title.trim()}`,
            lifeAreaId: effectiveLifeAreaId,
            goalId: relatedGoalId || undefined,
            projectId: relatedProjectId || undefined,
            taskId: relatedTaskId || undefined,
            activityId: savedActivity.id,
            skillId: linkedPractice?.skill_id || undefined,
            practiceId: linkedPractice?.id || undefined,
          });
        } catch (pointErr) {
          console.error('Failed to record development points:', pointErr);
          window.alert(
            'The activity was saved, but adding the development points failed. You can add them manually.'
          );
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save activity:', err);
      setError('Could not save activity. Please check input.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDurations = [15, 30, 45, 60, 90, 120, 180];

  const activePractices = practices.filter((p) => p.status !== 'archived');
  const linkedPractice = activePractices.find((p) => p.id === relatedPracticeId);

  const practiceOptions = [
    { value: '', label: 'No Practice (No Practice Points)' },
    ...activePractices.map((p) => ({
      value: p.id,
      label: p.title,
      subtext: `+${p.point_value} pts${p.repeatable === false ? ' · one-time' : ''}`,
    })),
  ];

  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const taskOptions = [
    { value: '', label: 'No Task Link' },
    ...tasks
      .filter((t) => openTasks.some((openTask) => openTask.id === t.id) || t.id === relatedTaskId)
      .map((t) => ({ value: t.id, label: t.title })),
  ];

  const handleTaskChange = (taskId: string) => {
    setRelatedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    setRelatedGoalId(task?.related_goal_id || '');
    setRelatedProjectId(task?.related_project_id || '');
    setRelatedPracticeId(task?.related_practice_id || '');
    const goal = goals.find((g) => g.id === task?.related_goal_id);
    const project = projects.find((p) => p.id === task?.related_project_id);
    if (goal?.life_area_id || project?.life_area_id) {
      setRelatedLifeAreaId(goal?.life_area_id || project?.life_area_id || '');
    }
  };

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

        {/* Life Area — REQUIRED top-level scope (Module 08 Final) */}
        <Select
          label="Life Area"
          size="sm"
          value={
          goals.find((g) => g.id === relatedGoalId)?.life_area_id ||
            projects.find((p) => p.id === relatedProjectId)?.life_area_id ||
            relatedLifeAreaId ||
            ''
          }
          onChange={setRelatedLifeAreaId}
          options={[
            { value: '', label: 'Select a Life Area...' },
            ...lifeAreas.map((area) => ({ value: area.id, label: area.name })),
          ]}
          disabled={Boolean(goals.find((g) => g.id === relatedGoalId)?.life_area_id)}
        />

        {/* Nested Goal / Project / Task Linking */}
        <GoalProjectSelects
          goals={goals}
          projects={projects}
          goalId={relatedGoalId}
          projectId={relatedProjectId}
          onGoalChange={setRelatedGoalId}
          onProjectChange={setRelatedProjectId}
          size="sm"
        />

        <Select
          size="sm"
          value={relatedTaskId}
          onChange={handleTaskChange}
          options={taskOptions}
          placeholder="Link an open task (optional)"
          aria-label="Linked Task"
        />

        {/* Module 08 Final — Manual Development Points entry */}
        {!activityToEdit && (
          <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
                Add Development Points (optional)
              </span>
            </div>
            <PointStepper value={devPoints} onChange={setDevPoints} min={0} />
            {devPoints > 0 && (
              <Input
                label="Reason for these points"
                value={devPointReason}
                onChange={(e) => setDevPointReason(e.target.value)}
                placeholder={`Defaults to "Logged via Daily Log: ${title.trim() || 'this activity'}"`}
              />
            )}
            <p className="text-[11px] text-text-muted">
              Independent of practice points — entered manually and attributed to the Life Area above.
            </p>
          </div>
        )}

        {/* Practice Linking — practice points awarded exactly once via central PointService */}
        {!activityToEdit && (
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-2">
              Linked Practice
            </label>
            <Select
              size="sm"
              value={relatedPracticeId}
              onChange={(v) => {
                setRelatedPracticeId(v);
                const p = activePractices.find((x) => x.id === v);
                if (p?.life_area_id && !relatedLifeAreaId) setRelatedLifeAreaId(p.life_area_id);
              }}
              options={practiceOptions}
              placeholder="Link a practice to earn practice points..."
              aria-label="Linked Practice"
            />
            {linkedPractice ? (
              <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 pt-1">
                <Zap className="w-3 h-3 shrink-0" />
                +{linkedPractice.point_value} practice pts will be awarded once for this activity.
              </p>
            ) : (
              <p className="text-[11px] text-text-muted pt-1">
                Activities without a linked practice are recorded without practice points.
              </p>
            )}
          </div>
        )}

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
