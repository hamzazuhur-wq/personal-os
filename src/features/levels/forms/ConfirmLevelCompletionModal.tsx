import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { Level } from '../../../types/level.types';
import { ShieldCheck, Sparkles } from 'lucide-react';

export interface ConfirmLevelCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: Level;
  nextLevel?: Level | null;
  onConfirm: (note?: string) => Promise<void>;
}

export const ConfirmLevelCompletionModal: React.FC<ConfirmLevelCompletionModalProps> = ({
  isOpen,
  onClose,
  level,
  nextLevel,
  onConfirm,
}) => {
  const [reflectionNote, setReflectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(reflectionNote.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm level completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Stage Advancement" maxWidth="md">
      <div className="space-y-4 pt-2">
        <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm font-mono uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Advancement Verified</span>
          </div>
          <p className="text-xs text-text-primary leading-relaxed">
            All mandatory verification conditions for <strong className="text-[#fff4ec]">L{level.display_order}: {level.name}</strong> have been fulfilled.
          </p>
        </div>

        {nextLevel ? (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">Unlocking Next Stage:</span>
            <span className="text-[#ff8a4a] font-bold">L{nextLevel.display_order} — {nextLevel.name}</span>
          </div>
        ) : (
          <p className="text-xs text-text-muted font-mono">
            This is currently the terminal defined stage for this Life Area.
          </p>
        )}

        <Textarea
          label="Stage Completion Retrospective Note (Optional)"
          placeholder="Record final reflections on the capabilities demonstrated and habits internalized during this stage..."
          value={reflectionNote}
          onChange={(e) => setReflectionNote(e.target.value)}
          rows={3}
        />

        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Advance to Next Stage
          </Button>
        </div>
      </div>
    </Modal>
  );
};
