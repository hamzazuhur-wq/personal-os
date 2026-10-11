import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, Sparkles } from 'lucide-react';

export interface CompleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  onConfirm: (outcomeNote?: string) => Promise<void>;
}

export const CompleteProjectModal: React.FC<CompleteProjectModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
  onConfirm,
}) => {
  const [outcomeNote, setOutcomeNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirm(outcomeNote.trim() || undefined);
      setOutcomeNote('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Project as Complete"
      subtitle={`Outcome achieved for "${projectTitle}".`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 flex items-center gap-3 text-xs font-mono text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>This concrete body of work is finished. Historical records and logged work will remain permanently preserved.</span>
        </div>

        <Textarea
          label="Final Outcome / Retrospective Note (Optional)"
          placeholder="Record final deliverables, links, key insights, or retrospective observations..."
          value={outcomeNote}
          onChange={(e) => setOutcomeNote(e.target.value)}
          rows={4}
          autoFocus
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Complete Project
          </Button>
        </div>
      </form>
    </Modal>
  );
};
