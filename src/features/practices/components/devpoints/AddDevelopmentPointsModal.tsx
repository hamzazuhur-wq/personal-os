import React, { useEffect, useState } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Select, SelectOption } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { PointStepper } from './PointStepper';
import { useDevelopmentPoints } from '../../../../hooks/useDevelopmentPoints';
import { PointLedgerEvent } from '../../../../types/practice.types';
import { DevelopmentPointSource } from '../../../../services/points/pointService';
import { LifeArea } from '../../../../types/vision.types';

export interface DevelopmentPointContext {
  /** REQUIRED target scope. Preset locks the selector; absent shows a picker. */
  lifeAreaId?: string;
  goalId?: string;
  projectId?: string;
  taskId?: string;
  activityId?: string;
  skillId?: string;
  levelId?: string;
  levelRequirementId?: string;
  sourceType?: DevelopmentPointSource;
}

export interface AddDevelopmentPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: DevelopmentPointContext;
  lifeAreas: LifeArea[];
  onSaved?: (event: PointLedgerEvent) => void;
}

/**
 * Module 08 Final — universal manual point-entry modal.
 * Used from Goal Detail, Project Detail, Task Detail, the Practices
 * development page, and Life Area detail. Every entry routes through the
 * centralized PointService with a REQUIRED Life Area attribution.
 */
export const AddDevelopmentPointsModal: React.FC<AddDevelopmentPointsModalProps> = ({
  isOpen,
  onClose,
  context,
  lifeAreas,
  onSaved,
}) => {
  const { addDevelopmentPoints } = useDevelopmentPoints();

  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [lifeAreaId, setLifeAreaId] = useState(context.lifeAreaId || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPoints(1);
      setReason('');
      setNote('');
      setEvidenceUrl('');
      setOccurredAt(new Date().toISOString().slice(0, 10));
      setLifeAreaId(context.lifeAreaId || '');
      setError(null);
    }
  }, [isOpen, context.lifeAreaId]);

  const lifeAreaOptions: SelectOption[] = lifeAreas.map((area) => ({
    value: area.id,
    label: area.name,
  }));

  const canSubmit = Boolean(lifeAreaId) && reason.trim().length > 0 && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const event = await addDevelopmentPoints({
        points,
        reason: reason.trim(),
        note: note.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
        occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
        lifeAreaId,
        goalId: context.goalId,
        projectId: context.projectId,
        taskId: context.taskId,
        activityId: context.activityId,
        skillId: context.skillId,
        levelId: context.levelId,
        levelRequirementId: context.levelRequirementId,
        sourceType: context.sourceType,
      });
      onSaved?.(event);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Development Points"
      subtitle="Manual entry — every point is explainable and attributed to a Life Area."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted select-none">
            Points
          </label>
          <div className="mt-2">
            <PointStepper value={points} onChange={setPoints} disabled={saving} />
          </div>
        </div>

        <Select
          label="Life Area"
          value={lifeAreaId}
          onChange={setLifeAreaId}
          options={lifeAreaOptions}
          placeholder="Attribute to a Life Area..."
          disabled={Boolean(context.lifeAreaId) || saving}
          error={!lifeAreaId && error ? 'Life Area is required.' : undefined}
        />

        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What earned these points?"
          required
          disabled={saving}
        />

        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Extra context for your future self..."
          disabled={saving}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            disabled={saving}
          />
          <Input
            label="Evidence URL (optional)"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://..."
            type="url"
            disabled={saving}
          />
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {saving ? 'Saving' : `+ ${points} Point${points === 1 ? '' : 's'}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
