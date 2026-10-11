import React, { useState, useEffect } from 'react';
import { useAIRepo } from '../../../app/providers/RepositoryProvider';
import { AIAuditEvent } from '../../../types/ai.types';
import { History, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface AIAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAuditLogModal: React.FC<AIAuditLogModalProps> = ({ isOpen, onClose }) => {
  const aiRepo = useAIRepo();
  const [events, setEvents] = useState<AIAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      aiRepo
        .getAuditEvents(undefined, 100)
        .then(setEvents)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, aiRepo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-6">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">AI Action Audit Log</h2>
              <p className="text-xs text-text-muted">
                Immutable chronological record of all AI mutations and approvals
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Event List */}
        <div className="max-h-96 overflow-y-auto space-y-2.5">
          {loading ? (
            <p className="text-xs text-text-muted text-center py-6">Loading audit events...</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No AI mutations recorded yet.</p>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {e.result_status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-[#fff4ec]">{e.tool_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-text-muted uppercase">
                      {e.action_type}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    {new Date(e.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-text-secondary">{e.parameters_summary}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
                  <span>Target: {e.target_type} {e.target_id ? `(${e.target_id})` : ''}</span>
                  <span>•</span>
                  <span>Confirmation: {e.confirmation_status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
