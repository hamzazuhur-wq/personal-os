import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  CHART_COLORS,
  ChartContainer,
  ReviewTooltip,
  chartAxisProps,
  chartGridProps,
} from '../../../../components/charts/ChartContainer';
import { TrendMetric, TrendSeriesBundle } from '../../../../types/analytics.types';
import { cn } from '../../../../utils/cn';

const METRICS: { id: TrendMetric; label: string; color: string; formatter: (v: number) => string }[] = [
  { id: 'points', label: 'Points', color: CHART_COLORS.primary, formatter: (v) => `${v} pts` },
  { id: 'activities', label: 'Activities', color: '#94a3b8', formatter: (v) => `${v} logged` },
  { id: 'tasks_completed', label: 'Tasks Completed', color: CHART_COLORS.completed, formatter: (v) => `${v} done` },
];

/**
 * CHART 4 — Time trend (§15).
 *
 * One trend view with a metric selector instead of three separate
 * charts. Daily buckets across the selected range; tooltips show the
 * exact value per day.
 */
export const TrendChart: React.FC<{ trend: TrendSeriesBundle }> = ({ trend }) => {
  const [metric, setMetric] = useState<TrendMetric>('points');
  const active = METRICS.find((m) => m.id === metric) || METRICS[0];
  const data = trend[metric];
  const hasAnyData = data.some((d) => d.value > 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.08]" role="tablist" aria-label="Trend metric">
          {METRICS.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                metric === m.id
                  ? 'bg-white/[0.10] text-[#fff4ec] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {hasAnyData ? (
        <ChartContainer height={220} ariaLabel={`${active.label} per day over the selected period`}>
          <AreaChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={`trendFill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={active.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={active.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" tick={chartAxisProps.tick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tick={chartAxisProps.tick} axisLine={false} tickLine={false} width={44} />
            <ReviewTooltip valueFormatter={active.formatter} />
            <Area
              type="monotone"
              dataKey="value"
              name={active.label}
              stroke={active.color}
              strokeWidth={2}
              fill={`url(#trendFill-${metric})`}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-text-muted py-16 text-center">No activity recorded in this period.</p>
      )}
    </div>
  );
};
