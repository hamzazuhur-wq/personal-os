import React from 'react';
import { AIActionProposalPayload, ActionStatus } from '../../../types/ai.types';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, XCircle, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface AIActionProposalCardProps {
  proposal: AIActionProposalPayload;
  status?: ActionStatus;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export const AIActionProposalCard: React.FC<AIActionProposalCardProps> = ({
  proposal,
  status = 'pending',
  onApprove,
  onReject,
  isProcessing = false,
}) => {
  const isPending = status === 'pending';

  return (
    <div
      className={cn(
        'mt-3 rounded-2xl border p-4 sm:p-5 backdrop-blur-2xl transition-all select-none space-y-3.5',
        isPending
          ? 'bg-gradient-to-b from-[rgba(255,106,42,0.12)] to-[rgba(16,19,26,0.85)] border-[#ff8a4a]/40 shadow-[0_8px_30px_rgba(255,106,42,0.15)]'
          : status === 'approved'
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : status === 'rejected'
          ? 'bg-white/[0.02] border-white/[0.08] opacity-70'
          : 'bg-rose-500/10 border-rose-500/30'
      )}
    >
      {/* Header with Title & Action Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#ff6a2a]/20 text-[#ff8a4a] border border-[#ff8a4a]/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff8a4a] block font-semibold">
              Action Proposal
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-[#fff4ec]">
              {proposal.title}
            </h4>
          </div>
        </div>

        {/* Status indicator */}
        <div className="shrink-0">
          {status === 'pending' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="w-3 h-3" />
              <span>Awaiting Approval</span>
            </span>
          )}
          {status === 'approved' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>Approved & Executed</span>
            </span>
          )}
          {status === 'rejected' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-text-muted border border-white/[0.08]">
              <XCircle className="w-3 h-3" />
              <span>Cancelled</span>
            </span>
          )}
          {status === 'failed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertCircle className="w-3 h-3" />
              <span>Execution Failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {proposal.description && (
        <p className="text-xs text-text-secondary leading-relaxed">
          {proposal.description}
        </p>
      )}

      {/* Parameters Summary */}
      {proposal.parameters && Object.keys(proposal.parameters).length > 0 && (
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-[11px] font-mono text-text-muted space-y-1">
          {Object.entries(proposal.parameters).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-text-muted/70">{key}:</span>
              <span className="text-[#fff4ec] font-semibold truncate max-w-[200px]">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Approval Buttons */}
      {isPending && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            disabled={isProcessing}
            className="h-9 px-3 text-xs text-text-muted hover:text-text-primary"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onApprove}
            disabled={isProcessing}
            className="h-9 px-3.5 text-xs gap-2 shadow-[0_0_15px_rgba(255,106,42,0.25)] font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Approve & Execute</span>
          </Button>
        </div>
      )}
    </div>
  );
};
