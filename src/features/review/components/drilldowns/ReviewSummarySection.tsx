import React from 'react';
import { AlertTriangle, Sparkles, History } from 'lucide-react';
import { LifeAreaDashboardData } from '../../../../types/analytics.types';

/**
 * REVIEW SUMMARY (§23) — a concise narrative built ONLY from the
 * dashboard's already-aggregated facts. No recommendations, no invented
 * numbers: highlights, needs-attention and recency are selections over
 * prepared analytics rows.
 */
export const ReviewSummarySection: React.FC<{ dashboard: LifeAreaDashboardData }> = ({ dashboard }) => {
  const topGoal = [...dashboard.goalRows].sort((a, b) => b.points - a.points)[0];
  const topProject = [...dashboard.projectRows].sort((a, b) => b.points - a.points)[0];
  const blockedCount = dashboard.taskDrilldown.remaining.filter((t) => t.status === 'blocked').length;
  const stalledGoals = dashboard.goalRows.filter((g) => g.totalTasks > 0 && g.completedTasks === 0);
  const latest = dashboard.timeline.slice(0, 3);

  const hasHighlights =
    dashboard.kpis.developmentPoints > 0 || dashboard.kpis.tasksCompleted > 0 || !!topGoal?.points;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section
        className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
        aria-label="Progress highlights"
      >
        <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono text-text-muted mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
          Progress Highlights
        </h4>
        {hasHighlights ? (
          <ul className="space-y-2 text-sm text-text-secondary">
            {dashboard.kpis.tasksCompleted > 0 && (
              <li>
                <strong className="text-[#fff4ec] tabular-nums">{dashboard.kpis.tasksCompleted}</strong>{' '}
                {dashboard.kpis.tasksCompleted === 1 ? 'task' : 'tasks'} completed this period.
              </li>
            )}
            {topGoal && topGoal.points > 0 && (
              <li>
                <strong className="text-[#fff4ec]">{topGoal.title}</strong> leads with{' '}
                <span className="text-[#ff8a4a] font-bold tabular-nums">+{topGoal.points}</span> points.
              </li>
            )}
            {topProject && topProject.advancedInPeriod && (
              <li>
                Project <strong className="text-[#fff4ec]">{topProject.title}</strong> advanced with evidence in
                this period.
              </li>
            )}
            {!hasHighlights && <li>No qualifying progress recorded.</li>}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No progress recorded in this period.</p>
        )}
      </section>

      <section
        className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
        aria-label="Needs attention"
      >
        <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono text-text-muted mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Needs Attention
        </h4>
        {blockedCount === 0 && stalledGoals.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing blocked or stalled right now.</p>
        ) : (
          <ul className="space-y-2 text-sm text-text-secondary">
            {blockedCount > 0 && (
              <li>
                <strong className="text-rose-300 tabular-nums">{blockedCount}</strong>{' '}
                {blockedCount === 1 ? 'task is' : 'tasks are'} blocked.
              </li>
            )}
            {stalledGoals.length > 0 && (
              <li>
                <strong className="text-text-primary tabular-nums">{stalledGoals.length}</strong>{' '}
                {stalledGoals.length === 1 ? 'goal has' : 'goals have'} open tasks but no completions this
                period.
              </li>
            )}
          </ul>
        )}
      </section>

      <section
        className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
        aria-label="Recent activity"
      >
        <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono text-text-muted mb-3">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          Recent Activity
        </h4>
        {latest.length === 0 ? (
          <p className="text-sm text-text-muted">No activities logged in this period.</p>
        ) : (
          <ul className="space-y-2">
            {latest.map((t) => (
              <li key={t.id} className="text-sm text-text-secondary truncate">
                <span className="text-text-muted tabular-nums mr-1.5 text-xs">{t.date.slice(5)}</span>
                {t.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
