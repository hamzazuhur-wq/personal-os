import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useVision } from '../../hooks/useVision';
import { pointService } from '../../services/points/pointService';

export interface WeeklyDevelopmentPointsProps {
  startDate: string; // ISO
  endDate: string; // ISO
}

/**
 * Module 08 Final — Development Points earned inside the reviewed week,
 * with a per-Life-Area breakdown.
 */
export const WeeklyDevelopmentPoints: React.FC<WeeklyDevelopmentPointsProps> = ({
  startDate,
  endDate,
}) => {
  const { lifeAreas } = useVision();
  const [total, setTotal] = useState<number | null>(null);
  const [byArea, setByArea] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    pointService
      .getPeriodPointBreakdown(
        lifeAreas.map((a) => a.id),
        startDate,
        endDate
      )
      .then((result) => {
        if (cancelled) return;
        setTotal(result.total);
        setByArea(result.byLifeArea);
      })
      .catch(() => {
        if (!cancelled) setTotal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, lifeAreas.length]);

  const activeAreas = lifeAreas.filter((area) => (byArea[area.id] || 0) !== 0);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[.18em] text-text-muted flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#ff8a4a]" />
            Development Points This Week
          </p>
          <p className="mt-1.5 text-3xl font-semibold font-mono text-[#ffb27a] tabular-nums">
            {total ?? '…'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap max-w-md justify-end">
          {total !== null && activeAreas.length === 0 ? (
            <span className="text-xs text-text-muted">No points recorded this week.</span>
          ) : (
            activeAreas.map((area) => (
              <span
                key={area.id}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-black/35 border border-white/[0.08] text-text-secondary"
              >
                {area.name}: <strong className="text-[#ffb27a]">{byArea[area.id]}</strong>
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
