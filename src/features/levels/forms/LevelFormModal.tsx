import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CreateLevelDTO, Level, LevelStatus, UpdateLevelDTO } from '../../../types/level.types';
import { LifeArea } from '../../../types/vision.types';
import { validateLevelPayload, LevelValidationErrors } from '../validation/levelValidation';

export interface LevelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelToEdit?: Level | null;
  initialLifeAreaId?: string;
  lifeAreas: LifeArea[];
  allLevels: Level[];
  onSubmit: (data: CreateLevelDTO | UpdateLevelDTO) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
}

export const LevelFormModal: React.FC<LevelFormModalProps> = ({
  isOpen,
  onClose,
  levelToEdit,
  initialLifeAreaId,
  lifeAreas,
  allLevels,
  onSubmit,
  onArchive,
}) => {
  const isEditing = Boolean(levelToEdit);

  const [lifeAreaId, setLifeAreaId] = useState<string>(
    levelToEdit?.life_area_id || initialLifeAreaId || lifeAreas[0]?.id || ''
  );
  const [name, setName] = useState<string>(levelToEdit?.name || '');
  const [description, setDescription] = useState<string>(levelToEdit?.description || '');
  const [displayOrder, setDisplayOrder] = useState<number>(levelToEdit?.display_order || 1);
  const [status, setStatus] = useState<LevelStatus>(levelToEdit?.status || 'unlocked');

  const [errors, setErrors] = useState<LevelValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (levelToEdit) {
      setLifeAreaId(levelToEdit.life_area_id);
      setName(levelToEdit.name);
      setDescription(levelToEdit.description || '');
      setDisplayOrder(levelToEdit.display_order);
      setStatus(levelToEdit.status);
    } else {
      const areaId = initialLifeAreaId || lifeAreas[0]?.id || '';
      setLifeAreaId(areaId);
      setName('');
      setDescription('');
      // Compute next available display order in this life area
      const existingInArea = allLevels.filter((l) => l.life_area_id === areaId && l.status !== 'archived');
      const maxOrder = existingInArea.reduce((max, l) => Math.max(max, l.display_order), 0);
      setDisplayOrder(maxOrder + 1);
      setStatus('unlocked');
    }
    setErrors({});
  }, [levelToEdit, initialLifeAreaId, lifeAreas, allLevels, isOpen]);

  const handleLifeAreaChange = (newAreaId: string) => {
    setLifeAreaId(newAreaId);
    if (!isEditing) {
      const existingInArea = allLevels.filter((l) => l.life_area_id === newAreaId && l.status !== 'archived');
      const maxOrder = existingInArea.reduce((max, l) => Math.max(max, l.display_order), 0);
      setDisplayOrder(maxOrder + 1);
    }
    if (errors.lifeAreaId) setErrors((prev) => ({ ...prev, lifeAreaId: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateLevelDTO = {
      life_area_id: lifeAreaId,
      name: name.trim(),
      description: description.trim() || undefined,
      display_order: Number(displayOrder),
      status,
    };

    const validation = validateLevelPayload(payload, allLevels, levelToEdit?.id);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save level:', err);
      setErrors({ name: err?.message || 'Failed to save stage definition.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!levelToEdit || !onArchive) return;
    if (!window.confirm(`Are you sure you want to archive "${levelToEdit.name}"? Historical advancement records will be preserved.`)) return;

    try {
      setIsArchiving(true);
      await onArchive(levelToEdit.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to archive level:', err);
      setErrors({ name: err?.message || 'Failed to archive stage.' });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Stage L${levelToEdit?.display_order}: ${levelToEdit?.name}` : 'Define New Development Stage'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Life Area & Order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Life Area"
            value={lifeAreaId}
            disabled={isEditing}
            onChange={handleLifeAreaChange}
            options={lifeAreas.map((la) => ({ value: la.id, label: la.name }))}
            error={errors.lifeAreaId}
          />

          <Input
            type="number"
            label="Stage Number / Order"
            min={1}
            value={displayOrder}
            onChange={(e) => {
              setDisplayOrder(Number(e.target.value));
              if (errors.displayOrder) setErrors((prev) => ({ ...prev, displayOrder: undefined }));
            }}
            error={errors.displayOrder}
          />
        </div>

        {/* Level Name */}
        <Input
          label="Stage / Level Name"
          placeholder="e.g., Independent Capability, System Architect, Consistency..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          autoFocus
        />

        {/* Description */}
        <Textarea
          label="Stage Description & Scope (Optional)"
          placeholder="Describe what characterizes this stage of development and the capabilities demonstrated..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* Status (if editing) */}
        {isEditing && (
          <Select
            label="Stage Lifecycle Status"
            value={status}
            onChange={(val) => setStatus(val as LevelStatus)}
            options={[
              { value: 'unlocked', label: 'Unlocked (Available to work on)' },
              { value: 'current', label: 'Current (Active Stage)' },
              { value: 'completed', label: 'Completed' },
              { value: 'locked', label: 'Locked (Future)' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          {isEditing && onArchive && levelToEdit?.status !== 'current' ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleArchive}
              isLoading={isArchiving}
            >
              Archive Stage
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditing ? 'Save Stage' : 'Create Stage'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
