import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { CreateMilestoneDTO } from '../../../types/level.types';

export interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: string;
  onSubmit: (dto: CreateMilestoneDTO) => Promise<void>;
}

export const MilestoneFormModal: React.FC<MilestoneFormModalProps> = ({
  isOpen,
  onClose,
  levelId,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Milestone title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        level_id: levelId,
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'pending',
      });
      setTitle('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Stage Milestone" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Milestone Title"
          placeholder="e.g., Publish first industry case study..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          autoFocus
        />

        <Textarea
          label="Description (Optional)"
          placeholder="Significant marker or outcome of this milestone..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Milestone
          </Button>
        </div>
      </form>
    </Modal>
  );
};
