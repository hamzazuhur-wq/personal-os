import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '../../utils/cn';

/**
 * Module 09 — the single themed chart surface for the Review module.
 * Every Recharts visualization is embedded in a ChartContainer so it
 * gets explicit responsive dimensions, accessible naming and the
 * Personal OS glass styling. One chart stack, one design language.
 */

export const CHART_COLORS = {
  primary: '#ff6a2a',
  primarySoft: '#ff8a4a',
  completed: '#34d399', // muted green — completed / positive
  problem: '#fb7185', // muted red — blocked / attention
  neutral: '#94a3b8', // secondary data
  grid: 'rgba(255,255,255,0.06)',
  axisText: '#8b93a1',
  tooltipBg: 'rgba(10,12,16,0.95)',
} as const;

export interface ChartContainerProps {
  /** Fixed pixel height — charts never collapse or stretch unpredictably. */
  height?: number;
  ariaLabel?: string;
  className?: string;
  children: React.ReactElement;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  height = 240,
  ariaLabel,
  className,
  children,
}) => (
  <div
    className={cn('w-full', className)}
    style={{ height }}
    role="img"
    aria-label={ariaLabel}
  >
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

// ─── Shared tooltip (adds information, never duplicates labels) ──

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ReviewTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  valueFormatter?: (value: number) => string;
  /** Extra factual context lines sourced from the datum (e.g. event count). */
  detailKey?: string;
}

export const ReviewTooltip: React.FC<ReviewTooltipProps> = ({
  active,
  payload,
  label,
  valueFormatter,
  detailKey,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-white/[0.12] px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
      style={{ backgroundColor: CHART_COLORS.tooltipBg }}
    >
      {label !== undefined && (
        <p className="font-semibold text-[#fff4ec] mb-1">{String(label)}</p>
      )}
      {payload.map((entry, idx) => (
        <p key={idx} className="flex items-center gap-2 text-text-secondary">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color || CHART_COLORS.primary }}
          />
          <span>
            {typeof entry.value === 'number'
              ? valueFormatter
                ? valueFormatter(entry.value)
                : entry.value.toLocaleString()
              : String(entry.value ?? '')}
          </span>
        </p>
      ))}
      {detailKey && payload[0]?.payload && typeof payload[0].payload[detailKey] !== 'undefined' && (
        <p className="mt-1 text-[11px] text-text-muted">
          {String(payload[0].payload[detailKey])}
        </p>
      )}
    </div>
  );
};

/** Shared axis/grid props keeping every chart quiet and readable. */
export const chartAxisProps = {
  tick: { fill: CHART_COLORS.axisText, fontSize: 11 },
  axisLine: { stroke: 'rgba(255,255,255,0.08)' } as React.CSSProperties,
  tickLine: false as const,
};

export const chartGridProps = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '3 3',
  vertical: false as const,
};
