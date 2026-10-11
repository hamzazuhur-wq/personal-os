import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CreateRequirementDTO, LevelRequirement, RequirementStatus, RequirementType, UpdateRequirementDTO } from '../../../types/level.types';
import { Goal } from '../../../types/goal.types';
import { REQUIREMENT_STATUSES, REQUIREMENT_TYPES } from '../../../constants/levels';
import { validateRequirementPayload, RequirementValidationErrors } from '../validation/levelValidation';

export interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementToEdit?: LevelRequirement | null;
  levelId: string;
  allGoals: Goal[];
  onSubmit: (data: CreateRequirementDTO | UpdateRequirementDTO) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onWaiver?: (id: string) => Promise<void>;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  requirementToEdit,
  levelId,
  allGoals,
  onSubmit,
  onArchive,
  onWaiver,
}) => {
  const isEditing = Boolean(requirementToEdit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequirementType>('manual');
  const [status, setStatus] = useState<RequirementStatus>('not_started');
  const [isRequired, setIsRequired] = useState(true);
  const [goalId, setGoalId] = useState<string>('');

  const [errors, setErrors] = useState<RequirementValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (requirementToEdit) {
      setTitle(requirementToEdit.title);
      setDescription(requirementToEdit.description || '');
      setType(requirementToEdit.type);
      setStatus(requirementToEdit.status);
      setIsRequired(requirementToEdit.is_required);
      setGoalId(requirementToEdit.goal_id || '');
    } else {
      setTitle('');
      setDescription('');
      setType('manual');
      setStatus('not_started');
      setIsRequired(true);
      setGoalId('');
    }
    setErrors({});
  }, [requirementToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateRequirementDTO = {
      level_id: levelId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      status,
      is_required: isRequired,
      goal_id: type === 'goal_completion' && goalId ? goalId : undefined,
    };

    const validation = validateRequirementPayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save requirement:', err);
      setErrors({ title: err?.message || 'Failed to save condition.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!requirementToEdit || !onArchive) return;
    if (!window.confirm(`Archive requirement "${requirementToEdit.title}"?`)) return;
    try {
      setIsSubmitting(true);
      await onArchive(requirementToEdit.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaiver = async () => {
    if (!requirementToEdit || !onWaiver) return;
    if (!window.confirm(`Waive this requirement? It will be marked waived and not block advancement.`)) return;
    try {
      setIsSubmitting(true);
      await onWaiver(requirementToEdit.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Stage Requirement' : 'Add Completion Condition'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Title */}
        <Input
          label="Condition / Requirement Title"
          placeholder="e.g., Complete 3 portfolio case studies, Acquire AWS Certification..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
          autoFocus
        />

        {/* Classification & Is Required Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Condition Classification"
            value={type}
            onChange={(val) => setType(val as RequirementType)}
            options={REQUIREMENT_TYPES.map((t) => ({
              value: t.id,
              label: t.label,
              subtext: t.description,
            }))}
            error={errors.type}
          />

          <div className="flex flex-col justify-center pt-5">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#ff6a2a] focus:ring-[#ff8a4a]"
              />
              <span className="text-xs text-text-primary font-medium">
                Mandatory for Stage Advancement
              </span>
            </label>
          </div>
        </div>

        {/* Linked Goal Selector (if type is goal_completion) */}
        {type === 'goal_completion' && (
          <Select
            label="Linked Strategic Goal"
            value={goalId}
            onChange={(val) => setGoalId(val)}
            options={[
              { value: '', label: 'Select a Strategic Goal...' },
              ...allGoals.map((g) => ({
                value: g.id,
                label: g.title,
                subtext: `Status: ${g.status.toUpperCase()} | Horizon: ${g.time_horizon}`,
              })),
            ]}
          />
        )}

        {/* Description */}
        <Textarea
          label="Verification Scope & Standards (Optional)"
          placeholder="Describe how fulfillment of this condition is evaluated..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* Status (if editing) */}
        {isEditing && (
          <Select
            label="Verification State"
            value={status}
            onChange={(val) => setStatus(val as RequirementStatus)}
            options={REQUIREMENT_STATUSES.map((s) => ({
              value: s.id,
              label: s.label,
            }))}
          />
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            {isEditing && onArchive && (
              <Button type="button" variant="danger" size="sm" onClick={handleArchive}>
                Archive
              </Button>
            )}
            {isEditing && onWaiver && status !== 'waived' && (
              <Button type="button" variant="ghost" size="sm" onClick={handleWaiver}>
                Waive
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? 'Save Condition' : 'Add Condition'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
