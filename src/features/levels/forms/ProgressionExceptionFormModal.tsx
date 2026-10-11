import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CreateExceptionDTO, ExceptionType } from '../../../types/level.types';
import { EXCEPTION_TYPES } from '../../../constants/levels';

export interface ProgressionExceptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lifeAreaId: string;
  levelId?: string;
  onSubmit: (dto: CreateExceptionDTO) => Promise<void>;
}

export const ProgressionExceptionFormModal: React.FC<ProgressionExceptionFormModalProps> = ({
  isOpen,
  onClose,
  lifeAreaId,
  levelId,
  onSubmit,
}) => {
  const [type, setType] = useState<ExceptionType>('exceptional_achievement');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !reason.trim() || !decision.trim()) {
      setError('Description, reason, and explicit decision are all required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        life_area_id: lifeAreaId,
        level_id: levelId,
        type,
        description: description.trim(),
        reason: reason.trim(),
        decision: decision.trim(),
      });
      setDescription('');
      setReason('');
      setDecision('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record exception.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Progression Exception / Calibration" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <p className="text-xs text-text-secondary">
          Record manual overrides, disruptions, accelerated achievements, or structural calibration decisions with a permanent audit record.
        </p>

        <Select
          label="Exception Nature"
          value={type}
          onChange={(val) => setType(val as ExceptionType)}
          options={EXCEPTION_TYPES.map((t) => ({ value: t.id, label: t.label }))}
        />

        <Input
          label="Event Summary"
          placeholder="e.g., Unplanned executive role promotion, 6-month injury recovery..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
        />

        <Textarea
          label="Underlying Rationale & Circumstances"
          placeholder="Explain the real-world conditions that led to this progression event..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />

        <Textarea
          label="Explicit System Decision"
          placeholder="e.g., Waived condition 3 due to real-world equivalence; Advanced to Level 4 directly..."
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          rows={2}
        />

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Record Exception
          </Button>
        </div>
      </form>
    </Modal>
  );
};
