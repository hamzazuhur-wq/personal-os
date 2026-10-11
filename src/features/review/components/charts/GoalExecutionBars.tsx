import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  CHART_COLORS,
  ChartContainer,
  ReviewTooltip,
  chartAxisProps,
  chartGridProps,
} from '../../../../components/charts/ChartContainer';
import { GoalExecutionRow } from '../../../../types/analytics.types';

interface BarDatum {
  goalId: string;
  label: string;
  completed: number;
  remaining: number;
  total: number;
  detail: string;
}

/**
 * CHART 3 — Goal / Project execution comparison (§14).
 *
 * Horizontal stacked bars showing Completed vs Remaining tasks per
 * top-level goal — a factual execution metric (completed / total),
 * never a fabricated goal completion percentage. Clicking a bar opens
 * that goal's detail page.
 */
export const GoalExecutionBars: React.FC<{
  rows: GoalExecutionRow[];
  onOpenGoal: (goalId: string) => void;
}> = ({ rows, onOpenGoal }) => {
  const topLevel = rows
    .filter((r) => r.depth === 0)
    .map((r): BarDatum => ({
      goalId: r.goalId,
      label: r.title.length > 16 ? `${r.title.slice(0, 15)}…` : r.title,
      completed: r.completedTasks,
      remaining: Math.max(0, r.totalTasks - r.completedTasks),
      total: r.totalTasks,
      detail: `${r.pathLabel} · ${r.completedTasks} of ${r.totalTasks} tasks${r.points ? ` · ${r.points} pts` : ''}`,
    }))
    .filter((d) => d.total > 0);

  if (topLevel.length === 0) {
    return (
      <p className="text-sm text-text-muted py-8 text-center">
        No task activity linked to goals in this period.
      </p>
    );
  }

  return (
    <ChartContainer
      height={Math.max(170, topLevel.length * 42 + 40)}
      ariaLabel="Completed versus remaining tasks per goal"
    >
      <BarChart data={topLevel} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid {...chartGridProps} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={chartAxisProps.tick} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ ...chartAxisProps.tick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <ReviewTooltip detailKey="detail" />
        <Bar
          dataKey="completed"
          name="Completed"
          stackId="tasks"
          fill={CHART_COLORS.completed}
          radius={[0, 3, 3, 0]}
          cursor="pointer"
          isAnimationActive={false}
          onClick={(data: unknown) => {
            const datum = data as { payload?: BarDatum };
            if (datum?.payload?.goalId) onOpenGoal(datum.payload.goalId);
          }}
        />
        <Bar
          dataKey="remaining"
          name="Remaining"
          stackId="tasks"
          fill="rgba(255,255,255,0.10)"
          radius={[0, 3, 3, 0]}
          cursor="pointer"
          isAnimationActive={false}
          onClick={(data: unknown) => {
            const datum = data as { payload?: BarDatum };
            if (datum?.payload?.goalId) onOpenGoal(datum.payload.goalId);
          }}
        />
      </BarChart>
    </ChartContainer>
  );
};
