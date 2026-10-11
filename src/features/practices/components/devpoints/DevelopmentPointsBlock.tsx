import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, GitBranch } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useGoalPointsSummary } from '../../../../hooks/useDevelopmentPoints';

export interface DevelopmentPointsBlockProps {
  /** Goal mode: shows direct + descendant-subtree totals. */
  goalId?: string;
  /** Generic mode: caller supplies the total loader (project/task/area/skill). */
  fetchTotal?: () => Promise<number>;
  /** Bump to re-read totals after a successful manual entry elsewhere. */
  refreshKey?: number;
  onAddPoints?: () => void;
  addDisabled?: boolean;
  title?: string;
}

/**
 * Read-only display of Development Point totals with an optional entry-point
 * button. Used by Goal Detail (direct + subtree), Project Detail, Task Detail,
 * and Life Area detail.
 */
export const DevelopmentPointsBlock: React.FC<DevelopmentPointsBlockProps> = ({
  goalId,
  fetchTotal,
  refreshKey = 0,
  onAddPoints,
  addDisabled = false,
  title = 'Development Points',
}) => {
  const goalSummary = useGoalPointsSummary(goalId);
  const [genericTotal, setGenericTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goalId) return;
    if (refreshKey > 0) goalSummary.reload().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (!fetchTotal) return;
    let cancelled = false;
    setLoading(true);
    fetchTotal()
      .then((total) => {
        if (!cancelled) setGenericTotal(total);
      })
      .catch(() => {
        if (!cancelled) setGenericTotal(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchTotal, refreshKey]);

  const isGoalMode = Boolean(goalId);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#ff8a4a] shrink-0" />
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight truncate">{title}</h3>
        </div>
        {onAddPoints && (
          <Button size="sm" variant="secondary" onClick={onAddPoints} disabled={addDisabled}>
            + Add Points
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-text-muted">Counting points…</p>
      ) : isGoalMode ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">
              <TrendingUp className="w-3 h-3" /> Direct
            </div>
            <p className="mt-1.5 text-2xl font-bold font-mono text-[#ffb27a] tabular-nums">
              {goalSummary.summary?.direct ?? 0}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">points on this goal</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">
              <GitBranch className="w-3 h-3" /> Subtree
            </div>
            <p className="mt-1.5 text-2xl font-bold font-mono text-[#fff4ec] tabular-nums">
              {goalSummary.summary?.subtree ?? 0}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">incl. sub-goals</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/30 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted">
            <TrendingUp className="w-3 h-3" /> Total
          </div>
          <p className="mt-1.5 text-2xl font-bold font-mono text-[#ffb27a] tabular-nums">
            {genericTotal ?? 0}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">valid development points</p>
        </div>
      )}
    </section>
  );
};
