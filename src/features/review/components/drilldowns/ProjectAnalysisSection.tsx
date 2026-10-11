import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { ProjectExecutionRow } from '../../../../types/analytics.types';

/**
 * PROJECT ANALYSIS (§21) — factual per-project execution rows with
 * navigation into Project Detail. Shows status, completed / total
 * tasks, activities and ledger points plus the owning goal path.
 */

const STATUS_BADGE: Record<string, 'emerald' | 'cyan' | 'amber' | 'slate'> = {
  active: 'cyan',
  paused: 'amber',
  draft: 'slate',
  completed: 'emerald',
};

export const ProjectAnalysisSection: React.FC<{
  rows: ProjectExecutionRow[];
  onOpenProject: (projectId: string) => void;
}> = ({ rows, onOpenProject }) => {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-text-muted py-6 text-center">
        No projects are linked to this Life Area.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((p) => (
        <li key={p.projectId}>
          <button
            onClick={() => onOpenProject(p.projectId)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-[#ff8a4a]/40 hover:bg-white/[0.06] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60"
            aria-label={`Open project ${p.title}`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 min-w-0">
                {p.advancedInPeriod && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#34d399] shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.7)]"
                    title="Advanced in this period (task, activity or point evidence)"
                  />
                )}
                <span className="text-sm font-semibold text-text-primary truncate">{p.title}</span>
                <Badge variant={STATUS_BADGE[p.status] || 'slate'}>{p.status}</Badge>
              </span>
              <span className="block text-[11px] text-text-muted mt-1 truncate">
                {p.goalPathLabel || p.areaName || 'Unlinked'} ·{' '}
                {p.totalTasks > 0 ? `${p.completedTasks} / ${p.totalTasks} tasks` : 'no tasks yet'}
                {p.activities ? ` · ${p.activities} ${p.activities === 1 ? 'activity' : 'activities'}` : ''}
                {p.points !== 0 ? ` · ${p.points.toLocaleString()} pts` : ''}
              </span>
              {p.totalTasks > 0 && (
                <span className="block mt-1.5 h-1 rounded-full bg-white/[0.05] overflow-hidden max-w-[220px]">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-[#34d399] to-[#10b981]"
                    style={{ width: `${Math.round((p.completedTasks / p.totalTasks) * 100)}%` }}
                  />
                </span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  );
};
