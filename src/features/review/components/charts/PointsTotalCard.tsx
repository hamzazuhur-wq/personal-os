import React from 'react';
import { ChevronRight, Coins } from 'lucide-react';

/**
 * CHART 2 — Development Points metric (§11).
 *
 * A compact clickable metric backed exclusively by the Point Ledger.
 * Clicking opens the point breakdown drill-down (total → groups →
 * individual events → source entity). Never derived from tasks or
 * activities — only ledger facts.
 */
export const PointsTotalCard: React.FC<{
  total: number;
  eventCount: number;
  onOpenBreakdown: () => void;
}> = ({ total, eventCount, onOpenBreakdown }) => {
  return (
    <button
      onClick={onOpenBreakdown}
      aria-label={`${total} development points from ${eventCount} events. Click to view point breakdown`}
      className="group w-full text-left rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl p-5 transition-all duration-200 cursor-pointer hover:border-[#ff8a4a]/40 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-8px_rgba(255,106,42,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="p-1.5 rounded-lg bg-[#ff6a2a]/15 border border-[#ff8a4a]/30">
          <Coins className="w-3.5 h-3.5 text-[#ff8a4a]" />
        </span>
        <h3 className="text-xs uppercase tracking-wider font-mono text-text-muted">
          Development Points
        </h3>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6a2a] to-[#ffb27a] leading-none tabular-nums">
            {total.toLocaleString()}
          </p>
          <p className="text-xs text-text-muted mt-2 tabular-nums">
            {eventCount} {eventCount === 1 ? 'ledger event' : 'ledger events'} in period
          </p>
        </div>
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#ff8a4a] opacity-70 group-hover:opacity-100 transition-opacity shrink-0 pb-1">
          Breakdown
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
};
