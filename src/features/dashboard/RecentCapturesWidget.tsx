import React from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { ArrowRight } from 'lucide-react';
import { formatTimeAgo } from '../../utils/dateUtils';
import { CAPTURE_TYPES } from '../../constants/categories';

export interface RecentCapturesWidgetProps {
  onNavigateToCaptures: () => void;
}

export const RecentCapturesWidget: React.FC<RecentCapturesWidgetProps> = ({ onNavigateToCaptures }) => {
  const { captures, loading } = useCaptures('inbox');

  return (
    /* Lightest glass tier — tertiary information layer */
    <div className="relative rounded-2xl overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(14,17,23,0.45)] to-[rgba(10,12,16,0.60)] backdrop-blur-[20px] border border-white/[0.06]" />
      <div className="absolute inset-0 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.40)] transition-shadow" />
      {/* No strong bottom glow — this is a secondary panel */}

      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.20em] text-text-muted">
            Inbox Stream
            {captures.length > 0 && (
              <span className="ml-2 text-[#ffb27a]">({captures.length})</span>
            )}
          </span>
          <button
            onClick={onNavigateToCaptures}
            className="text-[11px] font-mono text-text-muted hover:text-[#ff8a4a] flex items-center gap-1 transition-colors cursor-pointer"
          >
            Open Stream <ArrowRight className="w-3 h-3 inline" />
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-text-muted/40 py-2">Loading stream...</div>
        ) : captures.length === 0 ? (
          <div className="text-xs text-text-muted/30 italic py-2">
            Stream is clear — all captures processed.
          </div>
        ) : (
          /* Horizontal scrollable row on desktop, vertical on mobile */
          <div className="flex flex-col sm:flex-row gap-2.5">
            {captures.slice(0, 4).map((cap) => {
              const cat = CAPTURE_TYPES.find((c) => c.id === cap.capture_type) || CAPTURE_TYPES[0];
              return (
                <div
                  key={cap.id}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/[0.04] hover:border-white/[0.09] transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${cat.badgeColor}`}>
                      {cat.label === 'Unclassified / Inbox' ? 'Inbox' : cat.label}
                    </span>
                    <span className="text-[9px] font-mono text-text-muted">{formatTimeAgo(cap.created_at)}</span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium truncate leading-relaxed">{cap.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
