import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { CreateEvidenceDTO, EvidenceType } from '../../../types/level.types';
import { EVIDENCE_TYPES } from '../../../constants/levels';

export interface EvidenceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  requirementTitle: string;
  onSubmit: (dto: CreateEvidenceDTO) => Promise<void>;
}

export const EvidenceFormModal: React.FC<EvidenceFormModalProps> = ({
  isOpen,
  onClose,
  requirementId,
  requirementTitle,
  onSubmit,
}) => {
  const [type, setType] = useState<EvidenceType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Evidence title or summary is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        requirement_id: requirementId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        reference_id: referenceId.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setReferenceId('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attach Fulfillment Evidence" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <p className="text-xs text-text-secondary">
          Documenting proof for: <strong className="text-[#fff4ec]">"{requirementTitle}"</strong>
        </p>

        <Select
          label="Evidence Classification"
          value={type}
          onChange={(val) => setType(val as EvidenceType)}
          options={EVIDENCE_TYPES.map((t) => ({ value: t.id, label: t.label }))}
        />

        <Input
          label="Evidence Title / Key Finding"
          placeholder="e.g., Q3 Portfolio Project Delivery Link, Certificate ID..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          autoFocus
        />

        <Textarea
          label="Detailed Evidence Description & Notes"
          placeholder="Specific outputs, links, deliverables, or reflection notes proving fulfillment..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <Input
          label="Reference URI / Identifier (Optional)"
          placeholder="https://... or external reference key"
          value={referenceId}
          onChange={(e) => setReferenceId(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Attach Evidence
          </Button>
        </div>
      </form>
    </Modal>
  );
};
