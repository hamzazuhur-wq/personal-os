import React from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  CHART_COLORS,
  ChartContainer,
} from '../../../../components/charts/ChartContainer';
import { TaskExecutionStats } from '../../../../types/analytics.types';

/**
 * CHART 1 — Task Execution Progress (§9/§39).
 *
 * Strictly "Completed Tasks / Total Tasks". It is NEVER labelled goal
 * completion: completing tasks does not complete a Goal. When the
 * denominator is zero the chart renders a truthful empty state instead
 * of a misleading 0%.
 */
export const TaskExecutionRadial: React.FC<{
  stats: TaskExecutionStats;
  onOpenDetails: () => void;
}> = ({ stats, onOpenDetails }) => {
  const hasDenominator = stats.total > 0;

  return (
    <button
      onClick={onOpenDetails}
      disabled={!hasDenominator}
      aria-label={
        hasDenominator
          ? `Task execution progress: ${stats.completed} of ${stats.total} tasks completed. Click to view task breakdown`
          : 'No task activity in this period'
      }
      className="group relative w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60 cursor-pointer disabled:cursor-default"
    >
      <ChartContainer height={210} ariaLabel="Task execution progress radial chart">
        <RadialBarChart
          data={[{ name: 'execution', value: stats.percent ?? 0, fill: CHART_COLORS.primary }]}
          innerRadius="74%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: 'rgba(255,255,255,0.05)' }}
            cornerRadius={20}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ChartContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
        {hasDenominator ? (
          <>
            <span className="text-3xl font-extrabold text-[#fff4ec] tabular-nums leading-none">
              {stats.percent}%
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted mt-1.5">
              Task Execution
            </span>
            <span className="text-xs text-text-secondary mt-0.5 tabular-nums">
              {stats.completed} / {stats.total}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-text-muted">No task activity</span>
            <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted mt-1">
              this period
            </span>
          </>
        )}
      </div>

      {hasDenominator && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-wider text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none">
          Click to view tasks →
        </span>
      )}
    </button>
  );
};
