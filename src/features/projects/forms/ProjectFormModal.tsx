import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CreateProjectDTO, Project, ProjectPriority, ProjectStatus, UpdateProjectDTO } from '../../../types/project.types';
import { LifeArea, Vision } from '../../../types/vision.types';
import { Goal } from '../../../types/goal.types';
import { Level } from '../../../types/level.types';
import { validateProjectPayload, ProjectValidationErrors } from '../validation/projectValidation';

export interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  lifeAreas: LifeArea[];
  goals: Goal[];
  levels: Level[];
  vision?: Vision | null;
  onSave: (data: CreateProjectDTO | UpdateProjectDTO) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  lifeAreas,
  goals,
  levels,
  onSave,
  onArchive,
}) => {
  const isEditing = Boolean(projectToEdit);

  const [title, setTitle] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [lifeAreaId, setLifeAreaId] = useState<string>('');
  const [primaryGoalId, setPrimaryGoalId] = useState<string>('');
  const [levelId, setLevelId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const [errors, setErrors] = useState<ProjectValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectToEdit) {
      setTitle(projectToEdit.title);
      setDesiredOutcome(projectToEdit.desired_outcome);
      setDescription(projectToEdit.description || '');
      setStatus(projectToEdit.status);
      setPriority(projectToEdit.priority);
      setLifeAreaId(projectToEdit.life_area_id || '');
      setPrimaryGoalId(projectToEdit.primary_goal_id || '');
      setLevelId(projectToEdit.level_id || '');
      setStartDate(projectToEdit.start_date || '');
      setTargetDate(projectToEdit.target_date || '');
    } else {
      setTitle('');
      setDesiredOutcome('');
      setDescription('');
      setStatus('active');
      setPriority('medium');
      setLifeAreaId(lifeAreas[0]?.id || '');
      setPrimaryGoalId('');
      setLevelId('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setTargetDate('');
    }
    setErrors({});
  }, [projectToEdit, lifeAreas, isOpen]);

  // When Life Area changes, filter goals/levels or preselect
  const filteredGoals = lifeAreaId
    ? goals.filter((g) => g.life_area_id === lifeAreaId)
    : goals;

  const filteredLevels = lifeAreaId
    ? levels.filter((l) => l.life_area_id === lifeAreaId)
    : levels;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateProjectDTO = {
      title: title.trim(),
      desired_outcome: desiredOutcome.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      life_area_id: lifeAreaId || undefined,
      primary_goal_id: primaryGoalId || undefined,
      level_id: levelId || undefined,
      start_date: startDate || undefined,
      target_date: targetDate || undefined,
    };

    const validation = validateProjectPayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      setErrors({ title: err?.message || 'Failed to save project.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!projectToEdit || !onArchive) return;
    if (!window.confirm(`Archive "${projectToEdit.title}"? Records will be safely preserved in history.`)) return;

    try {
      setIsSubmitting(true);
      await onArchive(projectToEdit.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Project: ${projectToEdit?.title}` : 'Define Active Project'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Title */}
        <Input
          label="Project Title"
          placeholder="e.g., AVORI Brand Strategy Case Study, Core API Engine Refactor..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
          autoFocus
        />

        {/* Desired Outcome (Most important field) */}
        <Textarea
          label="Desired Outcome (What will exist when complete?)"
          placeholder="e.g., Published presentation-ready Brand Strategy PDF and portfolio case study page..."
          value={desiredOutcome}
          onChange={(e) => {
            setDesiredOutcome(e.target.value);
            if (errors.desiredOutcome) setErrors((prev) => ({ ...prev, desiredOutcome: undefined }));
          }}
          error={errors.desiredOutcome}
          rows={2}
        />

        {/* Scope & Description */}
        <Textarea
          label="Scope & Details (Optional)"
          placeholder="Key deliverables, architectural boundaries, or implementation notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* Priority & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority Level"
            value={priority}
            onChange={(val) => setPriority(val as ProjectPriority)}
            options={[
              { value: 'high', label: 'High Priority' },
              { value: 'medium', label: 'Medium Priority' },
              { value: 'low', label: 'Low Priority' },
            ]}
          />

          <Select
            label="Initial Lifecycle Status"
            value={status}
            onChange={(val) => setStatus(val as ProjectStatus)}
            options={[
              { value: 'active', label: 'Active (Currently in execution)' },
              { value: 'draft', label: 'Draft (Defined but not started)' },
              { value: 'paused', label: 'Paused (Temporarily on hold)' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>

        {/* Relationships: Life Area & Primary Goal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Life Area"
            value={lifeAreaId}
            onChange={(val) => {
              setLifeAreaId(val);
              setPrimaryGoalId('');
              setLevelId('');
            }}
            options={[
              { value: '', label: 'None / General' },
              ...lifeAreas.map((la) => ({ value: la.id, label: la.name })),
            ]}
          />

          <Select
            label="Primary Strategic Goal"
            value={primaryGoalId}
            onChange={(val) => setPrimaryGoalId(val)}
            options={[
              { value: '', label: 'None (Standalone project)' },
              ...filteredGoals.map((g) => ({
                value: g.id,
                label: g.title,
                subtext: `Status: ${g.status.toUpperCase()}`,
              })),
            ]}
          />
        </div>

        {/* Optional Development Stage */}
        {filteredLevels.length > 0 && (
          <Select
            label="Development Stage Link (Optional)"
            value={levelId}
            onChange={(val) => setLevelId(val)}
            options={[
              { value: '', label: 'None' },
              ...filteredLevels.map((l) => ({
                value: l.id,
                label: `L${l.display_order}: ${l.name}`,
              })),
            ]}
          />
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date (Optional)"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            label="Target Completion Date (Optional)"
            value={targetDate}
            onChange={(e) => {
              setTargetDate(e.target.value);
              if (errors.dates) setErrors((prev) => ({ ...prev, dates: undefined }));
            }}
            error={errors.dates}
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          {isEditing && onArchive && projectToEdit?.status !== 'archived' ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleArchive}
            >
              Archive Project
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? 'Save Project' : 'Create Project'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
