import React from 'react';
import { BarChart3 } from 'lucide-react';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DateRangeBar } from './components/DateRangeBar';
import { KpiStrip } from './components/KpiStrip';
import { LifeAreaCardGrid } from './components/LifeAreaCards';
import { useReviewFilters, useAnalyticsFilter } from './state/reviewFiltersContext';
import { useReviewOverview } from '../../hooks/useReviewAnalytics';

export interface ReviewOverviewPageProps {
  onNavigate: (route: string) => void;
}

/**
 * LEVEL 1 — Life Areas Overview (§4).
 * Global date range → period KPI strip → life area cards → optional
 * cross-area visual. Every number is prepared by reviewAnalyticsService.
 */
export const ReviewOverviewPage: React.FC<ReviewOverviewPageProps> = ({ onNavigate }) => {
  const { preset, range } = useReviewFilters();
  const filter = useAnalyticsFilter();
  const { overview, isLoading, error } = useReviewOverview(filter);

  const areasWithData =
    overview?.byLifeArea.filter((a) => a.points > 0).sort((a, b) => b.points - a.points) || [];
  const maxPoints = Math.max(1, ...areasWithData.map((a) => a.points));

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Review & Analytics"
        subtitle="What happened during this period — execution, development effort and progress by Life Area."
      />

      <DateRangeBar />

      {/* ─── Period Summary (KPI strip) ─── */}
      <section aria-label="Period summary">
        {isLoading && !overview ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <EmptyState icon={BarChart3} title="Could not load the review" description={error} />
        ) : overview ? (
          <KpiStrip
            items={[
              {
                label: 'Tasks Completed',
                value: overview.kpis.tasksCompleted,
                hint: 'Tasks completed within the selected period',
              },
              {
                label: 'Projects Advanced',
                value: overview.kpis.projectsAdvanced,
                hint: 'Distinct projects with completed tasks, logged activities or point events in this period',
              },
              {
                label: 'Goals Progressed',
                value: overview.kpis.goalsProgressed,
                hint: 'Top-level goals with qualifying evidence in this period (not completion %)',
              },
              {
                label: 'Sub-goals Progressed',
                value: overview.kpis.subGoalsProgressed,
                hint: 'Sub-goals with qualifying evidence in this period',
              },
              {
                label: 'Activities Logged',
                value: overview.kpis.activitiesLogged,
                hint: 'Daily-log activities dated within the period',
              },
              {
                label: 'Development Points',
                value: overview.kpis.developmentPoints,
                hint: 'Valid Point Ledger events in this period',
              },
            ]}
          />
        ) : null}
      </section>

      {/* ─── Life Area cards ─── */}
      <section aria-label="Life Areas">
        {isLoading && !overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : overview && overview.byLifeArea.length > 0 ? (
          <>
            <LifeAreaCardGrid areas={overview.byLifeArea} onOpen={(id) => onNavigate(`/review/life-area/${id}`)} />

            {/* Cross-area comparison — only when ≥2 areas carry points */}
            {areasWithData.length >= 2 && (
              <section className="mt-6" aria-label="Development points across Life Areas">
                <h3 className="text-xs uppercase tracking-wider font-mono text-text-muted mb-3">
                  Points across Life Areas · {range.preset === 'custom' ? `${formatRange(range.startDate)}–${formatRange(range.endDate)}` : PRESET_LABELS[preset] || ''}
                </h3>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-3">
                  {areasWithData.map((a) => (
                    <button
                      key={a.lifeAreaId}
                      onClick={() => onNavigate(`/review/life-area/${a.lifeAreaId}`)}
                      className="w-full flex items-center gap-3 group cursor-pointer text-left"
                      aria-label={`${a.name}: ${a.points} points`}
                    >
                      <span className="w-24 sm:w-32 shrink-0 text-xs font-medium text-text-secondary truncate group-hover:text-[#fff4ec] transition-colors">
                        {a.name}
                      </span>
                      <span className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a]"
                          style={{ width: `${Math.max(4, Math.round((a.points / maxPoints) * 100))}%` }}
                        />
                      </span>
                      <span className="w-12 text-right text-xs font-bold text-[#ff8a4a] tabular-nums shrink-0">
                        {a.points.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No Life Areas yet"
            description="Create a Life Area in the Vision module to start tracking review analytics."
            actionLabel="Go to Vision"
            onAction={() => onNavigate('/vision')}
          />
        )}
      </section>
    </div>
  );
};

const PRESET_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: '',
};

function formatRange(d: string): string {
  return d.slice(5).replace('-', '/');
}
