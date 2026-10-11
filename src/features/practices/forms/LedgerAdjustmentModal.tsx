import React, { useState } from 'react';
import { PointLedgerEvent } from '../../../types/practice.types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export interface LedgerAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PointLedgerEvent | null;
  onConfirm: (originalEventId: string, correctionPoints: number, reason: string) => Promise<void>;
}

export const LedgerAdjustmentModal: React.FC<LedgerAdjustmentModalProps> = ({
  isOpen,
  onClose,
  event,
  onConfirm,
}) => {
  const [correctionPoints, setCorrectionPoints] = useState<number>(event ? -event.points : 0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A justification reason is required for immutable ledger adjustments.');
      return;
    }
    if (correctionPoints === 0) {
      setError('Adjustment points cannot be zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(event.id, correctionPoints, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ledger adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Ledger Correction"
      subtitle="History is immutable. Corrections are logged as new counterbalance entries in the audit trail."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Target Transaction</span>
          </div>
          <div>ID: {event.id}</div>
          <div>Original Points: +{event.points} ({event.source_type})</div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono uppercase text-text-muted">
            Adjustment Offset (Negative to deduct, positive to add) *
          </label>
          <input
            type="number"
            value={correctionPoints}
            onChange={(e) => setCorrectionPoints(parseInt(e.target.value, 10) || 0)}
            className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
            required
          />
        </div>

        <Textarea
          label="Audit Correction Reason *"
          placeholder="e.g. Accidental double log, session did not meet criteria..."
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          autoFocus
        />

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting}
            className="font-bold bg-rose-500 hover:bg-rose-600 border-rose-400"
          >
            Append Adjustment Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
