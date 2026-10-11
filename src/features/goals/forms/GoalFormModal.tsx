import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CreateGoalDTO, Goal, GoalPriority, GoalStatus, GoalTimeHorizon, GoalType, UpdateGoalDTO } from '../../../types/goal.types';
import { GOAL_PRIORITIES, GOAL_TIME_HORIZONS, GOAL_TYPES } from '../../../constants/goals';
import { LifeArea, Vision } from '../../../types/vision.types';
import { validateGoalPayload, GoalValidationErrors } from '../validation/goalValidation';
import { Target, Layers, Sparkles } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
  initialParentId?: string;
  initialLifeAreaId?: string;
  allGoals: Goal[];
  lifeAreas: LifeArea[];
  vision?: Vision | null;
  onSave: (dto: CreateGoalDTO | UpdateGoalDTO) => Promise<void>;
}

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
  initialParentId,
  initialLifeAreaId,
  allGoals,
  lifeAreas,
  vision,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('outcome');
  const [timeHorizon, setTimeHorizon] = useState<GoalTimeHorizon>('annual');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [lifeAreaId, setLifeAreaId] = useState<string>('');
  const [parentGoalId, setParentGoalId] = useState<string>('');
  const [linkVision, setLinkVision] = useState<boolean>(false);

  const [errors, setErrors] = useState<GoalValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description || '');
      setGoalType(goalToEdit.goal_type);
      setTimeHorizon(goalToEdit.time_horizon);
      setPriority(goalToEdit.priority);
      setStatus(goalToEdit.status);
      setStartDate(goalToEdit.start_date || '');
      setTargetDate(goalToEdit.target_date || '');
      setLifeAreaId(goalToEdit.life_area_id || '');
      setParentGoalId(goalToEdit.parent_goal_id || '');
      setLinkVision(Boolean(goalToEdit.vision_id));
    } else {
      setTitle('');
      setDescription('');
      setGoalType('outcome');
      setTimeHorizon('annual');
      setPriority('medium');
      setStatus('active');
      setStartDate('');
      setTargetDate('');
      setLifeAreaId(initialLifeAreaId || '');
      setParentGoalId(initialParentId || '');
      setLinkVision(false);
    }
    setErrors({});
    setSubmitError(null);
  }, [goalToEdit, isOpen, initialParentId, initialLifeAreaId]);

  const candidateParents = allGoals.filter((g) => {
    if (goalToEdit && g.id === goalToEdit.id) return false;
    return g.status !== 'archived';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateGoalPayload(
      {
        title,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        parent_goal_id: parentGoalId || undefined,
      },
      goalToEdit?.id,
      allGoals
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload: CreateGoalDTO | UpdateGoalDTO = {
        title: title.trim(),
        description: description.trim() || undefined,
        goal_type: goalType,
        time_horizon: timeHorizon,
        priority,
        status,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        life_area_id: lifeAreaId || undefined,
        parent_goal_id: parentGoalId || undefined,
        vision_id: linkVision && vision ? vision.id : undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save goal:', err);
      setSubmitError('Unable to save this goal. Please review your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={goalToEdit ? 'Edit Strategic Objective' : 'Define Strategic Goal'}
      subtitle="Define a concrete desired outcome connected to your vision."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {submitError}
          </div>
        )}

        {/* Goal Title */}
        <div>
          <Input
            label="Goal Objective Title"
            placeholder="e.g. Reach 68kg while maintaining strength standards"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            required
            autoFocus
          />
          {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title}</p>}
        </div>

        {/* Goal Type & Time Horizon Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Goal Type */}
          <Select
            label="Goal Classification"
            value={goalType}
            onChange={(val) => setGoalType(val as GoalType)}
            options={GOAL_TYPES.map((t) => ({
              value: t.id,
              label: t.label,
              subtext: t.description,
            }))}
          />

          {/* Time Horizon */}
          <Select
            label="Planning Horizon"
            value={timeHorizon}
            onChange={(val) => setTimeHorizon(val as GoalTimeHorizon)}
            options={GOAL_TIME_HORIZONS.map((h) => ({
              value: h.id,
              label: h.label,
              subtext: h.description,
            }))}
          />
        </div>

        {/* Priority & Status (if editing) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-1.5 select-none">
              Priority Weight
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={cn(
                      'py-2.5 px-2 rounded-xl border text-center text-xs font-mono font-bold uppercase transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/60 text-[#fff4ec] shadow-[0_0_12px_rgba(255,106,42,0.25)]'
                        : 'bg-black/35 border-white/[0.08] text-text-secondary hover:border-white/20 hover:text-text-primary'
                    )}
                  >
                    {p.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status (Editable) */}
          <Select
            label="Goal State"
            value={status}
            onChange={(val) => setStatus(val as GoalStatus)}
            options={[
              { value: 'active', label: 'Active (In Progress)' },
              { value: 'draft', label: 'Draft (Planning)' },
              { value: 'paused', label: 'Paused' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date (Optional)"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (errors.dateRange) setErrors((prev) => ({ ...prev, dateRange: undefined }));
            }}
          />
          <Input
            type="date"
            label="Target Completion Date (Optional)"
            value={targetDate}
            onChange={(e) => {
              setTargetDate(e.target.value);
              if (errors.dateRange) setErrors((prev) => ({ ...prev, dateRange: undefined }));
            }}
          />
        </div>
        {errors.dateRange && <p className="text-xs text-rose-400">{errors.dateRange}</p>}

        {/* Relationships: Life Area & Parent Goal */}
        <div className="p-4 rounded-xl bg-black/35 border border-white/[0.07] space-y-3.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#ff8a4a] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Contextual Alignment (Optional)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Life Area Selector */}
            <Select
              label="Life Area"
              value={lifeAreaId}
              onChange={(val) => setLifeAreaId(val)}
              options={[
                { value: '', label: 'No specific Life Area' },
                ...lifeAreas.map((area) => ({ value: area.id, label: area.name })),
              ]}
            />

            {/* Parent Goal Selector */}
            <Select
              label="Parent Goal Hierarchy"
              value={parentGoalId}
              error={errors.parentGoal}
              onChange={(val) => {
                setParentGoalId(val);
                if (errors.parentGoal) setErrors((prev) => ({ ...prev, parentGoal: undefined }));
              }}
              options={[
                { value: '', label: 'Root Goal (No parent)' },
                ...candidateParents.map((p) => ({
                  value: p.id,
                  label: p.title,
                  subtext: `Horizon: ${p.time_horizon.toUpperCase()}`,
                })),
              ]}
            />
          </div>

          {/* Vision Link Checkbox */}
          {vision && (
            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={linkVision}
                onChange={(e) => setLinkVision(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#ff6a2a] focus:ring-[#ff8a4a]"
              />
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
                Directly align with Main Vision statement
              </span>
            </label>
          )}
        </div>

        {/* Notes & Description */}
        <Textarea
          label="Outcome Criteria & Description"
          placeholder="Define what success specifically looks like, key milestones, and constraints..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting} leftIcon={<Target className="w-4 h-4" />}>
            {goalToEdit ? 'Save Objective' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
