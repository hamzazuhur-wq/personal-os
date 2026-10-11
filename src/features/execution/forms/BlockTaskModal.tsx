import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { AlertOctagon, X } from 'lucide-react';

export interface BlockTaskModalProps {
  isOpen: boolean;
  taskTitle?: string;
  onClose: () => void;
  onConfirm: (reason: string, blockedByTaskId?: string) => Promise<void>;
}

export const BlockTaskModal: React.FC<BlockTaskModalProps> = ({
  isOpen,
  taskTitle,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A blocker reason is required to identify the obstacle clearly.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-gradient-to-b from-[#181c26] to-[#0a0c11] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#fff4ec]">Mark as Blocked</h2>
              {taskTitle && (
                <p className="text-xs text-text-muted truncate max-w-64">{taskTitle}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wide">
              What is blocking this action? *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Waiting on client approval before proceeding with design revisions"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-500 resize-none placeholder:text-text-muted/60"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-white/[0.08]">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 text-rose-300 border-rose-500/30 hover:border-rose-500/60"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 mr-1.5" />
              <span>Mark Blocked</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
