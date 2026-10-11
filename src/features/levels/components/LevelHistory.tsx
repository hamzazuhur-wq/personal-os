import React from 'react';
import { LevelHistory } from '../../../types/level.types';
import { formatHumanDate, formatTimeAgo } from '../../../utils/dateUtils';
import { History, Milestone } from 'lucide-react';

export interface LevelHistoryListProps {
  history: LevelHistory[];
}

export const LevelHistoryList: React.FC<LevelHistoryListProps> = ({ history }) => {
  return (
    <section className="p-5 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-[#ff8a4a]" />
        <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight">
          Progression Audit & Advancement History
        </h3>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No historical stage completions recorded yet.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h.id}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono space-y-1.5"
            >
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5" />
                  Stage Completed
                </span>
                <span>{formatHumanDate(h.completed_at.slice(0, 10))} ({formatTimeAgo(h.completed_at)})</span>
              </div>

              {h.reason && (
                <p className="text-text-secondary font-sans leading-relaxed">
                  {h.reason}
                </p>
              )}

              {h.note && (
                <p className="text-[11px] text-text-muted italic border-l-2 border-[#ff8a4a]/40 pl-2.5 my-1">
                  "{h.note}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
