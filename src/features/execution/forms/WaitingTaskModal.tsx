import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Clock, X } from 'lucide-react';

export interface WaitingTaskModalProps {
  isOpen: boolean;
  taskTitle?: string;
  onClose: () => void;
  onConfirm: (waitingFor: string, expectedDate?: string) => Promise<void>;
}

export const WaitingTaskModal: React.FC<WaitingTaskModalProps> = ({
  isOpen,
  taskTitle,
  onClose,
  onConfirm,
}) => {
  const [waitingFor, setWaitingFor] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitingFor.trim()) {
      setError('Specify who or what you are waiting for.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(waitingFor.trim(), expectedDate || undefined);
      setWaitingFor('');
      setExpectedDate('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#181c26] to-[#0a0c11] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#fff4ec]">Set Waiting Status</h2>
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
              Waiting for whom or what? *
            </label>
            <input
              type="text"
              placeholder="e.g. John to send the final budget approval"
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 placeholder:text-text-muted/60"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wide">
              Expected Date (Optional)
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-amber-500"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-white/[0.08]">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              disabled={isSubmitting || !waitingFor.trim()}
              className="px-5 text-amber-300 border-amber-500/30 hover:border-amber-500/60"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              <span>Set Waiting</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
