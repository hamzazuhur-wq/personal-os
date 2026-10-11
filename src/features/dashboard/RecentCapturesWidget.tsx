// ============================================================
// MODULE 11 — RECENT IDEAS WIDGET (Home)
// ============================================================
// Home's view into the single IDEA CAPTURE stream. Each card opens
// the shared Idea Workspace (/ideas/:id). New ideas show their
// user-defined category; historical records keep a subtle LEGACY
// indicator. No records are rewritten here.
// ============================================================

import React from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { useIdeaCategories, categoryLabel } from '../../hooks/useIdeaCategories';
import { ArrowRight, Paperclip, Lightbulb } from 'lucide-react';
import { formatTimeAgo } from '../../utils/dateUtils';

export interface RecentCapturesWidgetProps {
  onNavigateToCaptures: () => void;
  onOpenIdea?: (ideaId: string) => void;
}

export const RecentCapturesWidget: React.FC<RecentCapturesWidgetProps> = ({
  onNavigateToCaptures,
  onOpenIdea,
}) => {
  const { captures, loading } = useCaptures('inbox');
  const { all: categories } = useIdeaCategories();

  const open = (id: string) => {
    if (onOpenIdea) {
      onOpenIdea(id);
    } else {
      onNavigateToCaptures();
    }
  };

  return (
    /* Lightest glass tier — tertiary information layer */
    <div className="relative rounded-2xl overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(14,17,23,0.45)] to-[rgba(10,12,16,0.60)] backdrop-blur-[20px] border border-white/[0.06]" />
      <div className="absolute inset-0 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.40)] transition-shadow" />

      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.20em] text-text-muted">
            Idea Inbox
            {captures.length > 0 && (
              <span className="ml-2 text-[#ffb27a]">({captures.length})</span>
            )}
          </span>
          <button
            onClick={onNavigateToCaptures}
            data-testid="home-open-ideas"
            className="text-[11px] font-mono text-text-muted hover:text-[#ff8a4a] flex items-center gap-1 transition-colors cursor-pointer"
          >
            Open Idea Capture <ArrowRight className="w-3 h-3 inline" />
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-text-muted/40 py-2">Loading stream...</div>
        ) : captures.length === 0 ? (
          <div className="text-xs text-text-muted/30 italic py-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            No ideas in the inbox yet — capture one with “+ Idea Capture”.
          </div>
        ) : (
          /* Horizontal scrollable row on desktop, vertical on mobile */
          <div className="flex flex-col sm:flex-row gap-2.5">
            {captures.slice(0, 4).map((cap) => {
              const userLabel = categoryLabel((cap.metadata as any)?.idea_category_id, categories);
              const attachmentCount = Array.isArray((cap.metadata as any)?.attachments)
                ? (cap.metadata as any).attachments.length
                : 0;
              const title = cap.title || cap.content.split('\n')[0];
              return (
                <button
                  key={cap.id}
                  onClick={() => open(cap.id)}
                  data-testid={`home-idea-card-${cap.id}`}
                  className="flex-1 min-w-0 text-left px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/[0.04] hover:border-[#ff8a4a]/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {userLabel ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-[#ff6a2a]/12 text-[#ffb27a] border border-[#ff8a4a]/25">
                        {userLabel}
                      </span>
                    ) : cap.capture_type !== 'idea' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider bg-white/[0.05] text-text-muted border border-white/[0.08]">
                        Legacy · {cap.capture_type.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-text-muted">
                        <Paperclip className="w-2.5 h-2.5" />
                        {attachmentCount}
                      </span>
                    )}
                    <span className="ml-auto text-[9px] font-mono text-text-muted">
                      {formatTimeAgo(cap.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium truncate leading-relaxed">{title}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
