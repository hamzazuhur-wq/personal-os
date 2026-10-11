import React from 'react';
import {
  Target,
  GitBranch,
  FolderKanban,
  CheckSquare,
  CalendarCheck,
  Zap,
  GraduationCap,
  Award,
  PenLine,
  ArrowLeftRight,
} from 'lucide-react';
import { PointLedgerEvent, PointSourceType } from '../../../../types/practice.types';
import { formatShortDate } from '../../../../utils/dateUtils';
import { cn } from '../../../../utils/cn';

const SOURCE_META: Record<PointSourceType, { label: string; Icon: React.ElementType }> = {
  goal: { label: 'Goal completed', Icon: Target },
  sub_goal: { label: 'Sub-goal completed', Icon: GitBranch },
  project: { label: 'Project', Icon: FolderKanban },
  skill: { label: 'Skill', Icon: GraduationCap },
  level: { label: 'Level', Icon: Award },
  manual_award: { label: 'Manual entry', Icon: PenLine },
  practice_completion: { label: 'Practice', Icon: Zap },
  task_completion: { label: 'Task', Icon: CheckSquare },
  activity_completion: { label: 'Activity', Icon: CalendarCheck },
  adjustment: { label: 'Adjustment', Icon: ArrowLeftRight },
};

export interface PointHistoryListProps {
  events: PointLedgerEvent[];
  loading?: boolean;
  emptyMessage?: string;
  limit?: number;
}

/**
 * Bounded, newest-first ledger feed with human-readable source labels.
 */
export const PointHistoryList: React.FC<PointHistoryListProps> = ({
  events,
  loading = false,
  emptyMessage = 'No point events yet.',
}) => {
  if (loading) {
    return <p className="text-xs text-text-muted py-4 text-center">Loading history…</p>;
  }

  if (events.length === 0) {
    return <p className="text-xs text-text-muted py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {events.map((event) => {
        const meta = SOURCE_META[event.source_type] || SOURCE_META.manual_award;
        const Icon = meta.Icon;

        return (
          <li
            key={event.id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-2.5"
          >
            <span className="shrink-0 w-7 h-7 rounded-lg bg-[#ff6a2a]/10 border border-[#ff8a4a]/20 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-[#ffb27a]" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text-primary truncate">
                {event.reason || meta.label}
              </p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">
                {meta.label} · {formatShortDate(event.occurred_at.slice(0, 10))}
                {event.status === 'voided' && (
                  <span className="ml-1.5 text-rose-300/80 uppercase">voided</span>
                )}
              </p>
            </div>

            <span
              className={cn(
                'shrink-0 text-sm font-bold font-mono tabular-nums',
                event.points > 0 ? 'text-emerald-300' : 'text-rose-300'
              )}
            >
              {event.points > 0 ? `+${event.points}` : event.points}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
