import React from 'react';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import { Badge } from '../../../../components/ui/Badge';
import { LifeAreaDashboardData } from '../../../../types/analytics.types';
import { formatShortDate } from '../../../../utils/dateUtils';

/**
 * TASK DRILL-DOWN (§10) — completed vs remaining evidence with full Goal
 * Path context ("Professional → Branding → Positioning"), navigable to
 * the owning goal. Never presented as "goal completion".
 */

const OPEN_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  ready: 'Ready',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  waiting: 'Waiting',
};

export interface TaskDrilldownPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: { completed: number; total: number; remaining: number; percent: number | null };
  tasks: LifeAreaDashboardData['taskDrilldown'];
  onNavigateToGoal: (goalId: string) => void;
}

export const TaskDrilldownPanel: React.FC<TaskDrilldownPanelProps> = ({
  isOpen,
  onClose,
  stats,
  tasks,
  onNavigateToGoal,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Execution Progress"
      subtitle={`${stats.completed} of ${stats.total} tasks completed in this period · ${stats.remaining} remaining`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        <section aria-label="Completed tasks">
          <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono text-text-muted mb-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
            Completed · {tasks.completed.length}
          </h4>
          {tasks.completed.length === 0 ? (
            <p className="text-sm text-text-muted px-1">No tasks were completed in this period.</p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.completed.map((t) => {
                const row = (
                  <>
                    <span className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#34d399]/80" />
                      <span className="min-w-0">
                        <span className="block text-sm text-text-primary leading-snug">{t.title}</span>
                        <span className="block text-[11px] text-text-muted mt-0.5 truncate">
                          {t.goalPathLabel || t.projectName || 'Unlinked'}
                          {t.completedAt ? ` · ${formatShortDate(t.completedAt)}` : ''}
                        </span>
                      </span>
                    </span>
                    {!!t.points && t.points > 0 && (
                      <Badge variant="orange">+{t.points}</Badge>
                    )}
                  </>
                );
                return (
                  <li key={t.id}>
                    {t.goalId ? (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToGoal(t.goalId!);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-[#ff8a4a]/40 hover:bg-white/[0.05] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60"
                        aria-label={`Open goal path for task ${t.title}`}
                      >
                        {row}
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/[0.04] text-left">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Remaining tasks">
          <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono text-text-muted mb-2.5">
            <Circle className="w-3.5 h-3.5 text-text-muted" />
            Remaining · {tasks.remaining.length}
          </h4>
          {tasks.remaining.length === 0 ? (
            <p className="text-sm text-text-muted px-1">
              Nothing open — every scoped task is completed or cancelled.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.remaining.map((t) => {
                const row = (
                  <>
                    <span className="flex items-start gap-2 min-w-0">
                      <Circle className="w-4 h-4 mt-0.5 shrink-0 text-text-muted/70" />
                      <span className="min-w-0">
                        <span className="block text-sm text-text-secondary leading-snug">{t.title}</span>
                        <span className="block text-[11px] text-text-muted mt-0.5 truncate">
                          {t.goalPathLabel || t.projectName || 'Unlinked'}
                        </span>
                      </span>
                    </span>
                    <Badge
                      variant={t.status === 'blocked' ? 'rose' : t.status === 'in_progress' ? 'cyan' : 'slate'}
                    >
                      {OPEN_STATUS_LABELS[t.status] || t.status}
                    </Badge>
                  </>
                );
                return (
                  <li key={t.id}>
                    {t.goalId ? (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToGoal(t.goalId!);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-[#ff8a4a]/40 hover:bg-white/[0.05] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60"
                        aria-label={`Open goal path for task ${t.title}`}
                      >
                        {row}
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/[0.04] text-left">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="flex items-center gap-1.5 text-[11px] text-text-muted leading-relaxed">
          <ArrowLeft className="w-3 h-3" />
          Click any task to open its full Goal Path. Task execution does not imply goal completion.
        </p>
      </div>
    </Modal>
  );
};
