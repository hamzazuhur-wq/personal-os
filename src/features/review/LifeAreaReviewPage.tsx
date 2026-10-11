import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DateRangeBar } from './components/DateRangeBar';
import { KpiStrip } from './components/KpiStrip';
import { TaskExecutionRadial } from './components/charts/TaskExecutionRadial';
import { PointsTotalCard } from './components/charts/PointsTotalCard';
import { GoalExecutionBars } from './components/charts/GoalExecutionBars';
import { TrendChart } from './components/charts/TrendChart';
import { PointBreakdownPanel } from './components/drilldowns/PointBreakdownPanel';
import { TaskDrilldownPanel } from './components/drilldowns/TaskDrilldownPanel';
import { ProjectAnalysisSection } from './components/drilldowns/ProjectAnalysisSection';
import { WhatHappenedTimeline } from './components/drilldowns/WhatHappenedTimeline';
import { ReviewSummarySection } from './components/drilldowns/ReviewSummarySection';
import { useAnalyticsFilter } from './state/reviewFiltersContext';
import { useLifeAreaDashboard } from '../../hooks/useReviewAnalytics';

export interface LifeAreaReviewPageProps {
  lifeAreaId: string;
  onNavigate: (route: string) => void;
}

/**
 * LEVEL 2/3 — Life Area Dashboard (§8).
 * Top summary → a restrained set of primary visuals → drill-down panels →
 * evidence timeline. All figures come from one analytics bundle so every
 * widget agrees; drill-downs preserve the shared date range.
 */
export const LifeAreaReviewPage: React.FC<LifeAreaReviewPageProps> = ({ lifeAreaId, onNavigate }) => {
  const filter = useAnalyticsFilter(lifeAreaId);
  const { dashboard, isLoading, error } = useLifeAreaDashboard(lifeAreaId, filter);
  const [isTaskDrillOpen, setIsTaskDrillOpen] = useState(false);
  const [isPointsDrillOpen, setIsPointsDrillOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* ─── Breadcrumb context (§42) ─── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => onNavigate('/review')}
          className="text-text-muted hover:text-[#fff4ec] transition-colors cursor-pointer focus:outline-none focus-visible:text-[#ff8a4a]"
        >
          Review
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-text-primary font-semibold">
          {dashboard?.name || isLoading || 'Life Area'}
        </span>
      </nav>

      <SectionHeader
        title={dashboard ? `${dashboard.name} — Dashboard` : 'Life Area Dashboard'}
        subtitle="Period execution, development effort and progress for this Life Area."
      />

      <DateRangeBar />

      {isLoading && !dashboard ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : error ? (
        <EmptyState title="Could not load this dashboard" description={error} />
      ) : !dashboard ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* ─── Top summary ─── */}
          <KpiStrip
            items={[
              { label: 'Dev Points', value: dashboard.kpis.developmentPoints, hint: 'Valid Point Ledger events in this period' },
              { label: 'Tasks', value: `${dashboard.kpis.tasksCompleted} / ${dashboard.kpis.tasksTotal}`, hint: 'Completed in period / completed-in-period plus currently open' },
              { label: 'Projects Advanced', value: dashboard.kpis.projectsAdvanced, hint: 'Projects with task, activity or point evidence in this period' },
              { label: 'Goals Progressed', value: dashboard.kpis.goalsProgressed, hint: 'Top-level goals with qualifying evidence (not completion %)' },
              { label: 'Sub-goals Progressed', value: dashboard.kpis.subGoalsProgressed, hint: 'Sub-goals with qualifying evidence' },
              { label: 'Activities', value: dashboard.kpis.activitiesLogged, hint: 'Activities dated within this period' },
            ]}
          />

          {/* ─── Primary visuals row 1: execution + points ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-xs uppercase tracking-wider font-mono text-text-muted mb-1">
                Task Execution Progress
              </h3>
              <p className="text-[11px] text-text-muted mb-3">
                Completed tasks ÷ total scoped tasks — not goal completion.
              </p>
              <TaskExecutionRadial stats={dashboard.taskExecution} onOpenDetails={() => setIsTaskDrillOpen(true)} />
            </Card>

            <Card className="flex flex-col">
              <h3 className="text-xs uppercase tracking-wider font-mono text-text-muted mb-3">
                Development Effort
              </h3>
              <PointsTotalCard
                total={dashboard.points.total}
                eventCount={dashboard.points.eventCount}
                onOpenBreakdown={() => setIsPointsDrillOpen(true)}
              />
              <div className="mt-4 space-y-1.5 text-[11px] text-text-muted leading-relaxed">
                <p className="font-semibold uppercase tracking-wider font-mono">Top point sources</p>
                {dashboard.points.bySourceType.slice(0, 3).map((row) => (
                  <p key={row.key} className="flex items-center justify-between gap-2 tabular-nums">
                    <span className="truncate">{row.label}</span>
                    <span className="text-text-secondary font-semibold shrink-0">
                      {row.points >= 0 ? '+' : ''}
                      {row.points.toLocaleString()}
                    </span>
                  </p>
                ))}
                {dashboard.points.bySourceType.length === 0 && (
                  <p>No Development Points recorded.</p>
                )}
              </div>
            </Card>
          </div>

          {/* ─── Primary visual row 2: goal execution comparison ─── */}
          <Card>
            <h3 className="text-xs uppercase tracking-wider font-mono text-text-muted mb-1">
              Goal Execution — Completed vs Remaining Tasks
            </h3>
            <p className="text-[11px] text-text-muted mb-3">
              Factual task counts per top-level goal. Click a bar to open the goal.
            </p>
            <GoalExecutionBars rows={dashboard.goalRows} onOpenGoal={(id) => onNavigate(`/goals/${id}`)} />
          </Card>

          {/* ─── Primary visual row 3: trend ─── */}
          <Card>
            <h3 className="text-xs uppercase tracking-wider font-mono text-text-muted mb-1">
              Time Trend
            </h3>
            <p className="text-[11px] text-text-muted mb-3">Daily values across the selected period.</p>
            <TrendChart trend={dashboard.trend} />
          </Card>

          {/* ─── Secondary analysis: projects ─── */}
          <section aria-label="Project analysis">
            <h3 className="text-base font-bold text-[#fff4ec] tracking-tight mb-3">Projects</h3>
            <ProjectAnalysisSection rows={dashboard.projectRows} onOpenProject={(id) => onNavigate(`/projects/${id}`)} />
          </section>

          {/* ─── Evidence timeline + narrative summary ─── */}
          <section aria-label="What happened">
            <h3 className="text-base font-bold text-[#fff4ec] tracking-tight mb-3">What Happened</h3>
            <Card>
              <WhatHappenedTimeline items={dashboard.timeline} />
            </Card>
          </section>

          <ReviewSummarySection dashboard={dashboard} />

          {/* ─── Drill-down modals (context-preserving, §41/§43) ─── */}
          <TaskDrilldownPanel
            isOpen={isTaskDrillOpen}
            onClose={() => setIsTaskDrillOpen(false)}
            stats={dashboard.taskExecution}
            tasks={dashboard.taskDrilldown}
            onNavigateToGoal={(goalId) => onNavigate(`/goals/${goalId}`)}
          />
          <PointBreakdownPanel
            isOpen={isPointsDrillOpen}
            onClose={() => setIsPointsDrillOpen(false)}
            areaName={dashboard.name}
            points={dashboard.points}
            onNavigate={onNavigate}
          />
        </>
      )}
    </div>
  );
};
