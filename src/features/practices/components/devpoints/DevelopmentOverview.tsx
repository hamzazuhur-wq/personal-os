import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { StatWidget } from '../../../../components/shared/StatWidget';
import {
  AddDevelopmentPointsModal,
} from './AddDevelopmentPointsModal';
import { PointHistoryList } from './PointHistoryList';
import { pointService } from '../../../../services/points/pointService';
import type { PointLedgerEvent } from '../../../../types/practice.types';
import type { LifeArea } from '../../../../types/vision.types';

export interface DevelopmentOverviewProps {
  lifeAreas: LifeArea[];
}

/**
 * Module 08 Final — the Development Points home surface.
 * Totals, weekly / monthly momentum, per-Life-Area distribution, bounded
 * recent history, and the primary manual entry button.
 */
export const DevelopmentOverview: React.FC<DevelopmentOverviewProps> = ({ lifeAreas }) => {
  const [totals, setTotals] = useState<{ total: number; week: number; month: number } | null>(null);
  const [byLifeArea, setByLifeArea] = useState<Record<string, number>>({});
  const [recentEvents, setRecentEvents] = useState<PointLedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const areaIds = lifeAreas.map((a) => a.id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
      const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();

      const [allTime, lastWeek, lastMonth] = await Promise.all([
        pointService.getPeriodPointBreakdown(areaIds),
        pointService.getPeriodPointBreakdown(areaIds, weekAgo),
        pointService.getPeriodPointBreakdown(areaIds, monthAgo),
      ]);
      const events = await pointService.getRecentEvents(undefined, 10);

      setTotals({ total: allTime.total, week: lastWeek.total, month: lastMonth.total });
      setByLifeArea(allTime.byLifeArea);
      setRecentEvents(events);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifeAreas.length]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const topAreas = Object.entries(byLifeArea)
    .filter(([, pts]) => pts !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Totals strip */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-text-muted max-w-xl">
          Independent of practices: every recorded point lives here with a reason
          and a Life Area attribution.
        </p>
        <Button size="sm" onClick={() => setIsAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Add Development Points
        </Button>
      </div>

      {loading || !totals ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatWidget icon={Sparkles} label="All-Time Total" value={`${totals.total}`} />
          <StatWidget icon={Sparkles} label="This Week" value={`${totals.week}`} />
          <StatWidget icon={Sparkles} label="Last 30 Days" value={`${totals.month}`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-Life-Area distribution */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight mb-3">
            Points by Life Area
          </h3>
          {topAreas.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">
              No points recorded yet. Start with the button above.
            </p>
          ) : (
            <ul className="space-y-2">
              {topAreas.map(([areaId, pts]) => {
                const area = lifeAreas.find((la) => la.id === areaId);
                const max = topAreas[0][1] || 1;
                return (
                  <li key={areaId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-secondary truncate">{area?.name || 'Unknown Area'}</span>
                      <span className="font-mono font-bold text-[#ffb27a] tabular-nums">{pts}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff6a2a]/70 to-[#ff8a4a]"
                        style={{ width: `${Math.max(6, (pts / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent history */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight mb-3">
            Recent Point Events
          </h3>
          <PointHistoryList events={recentEvents} />
        </section>
      </div>

      <AddDevelopmentPointsModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        context={{}}
        lifeAreas={lifeAreas}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};
