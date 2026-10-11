import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Coins } from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import { Badge } from '../../../../components/ui/Badge';
import {
  DevelopmentPointStats,
  PointBreakdownRow,
  PointEventView,
} from '../../../../types/analytics.types';
import { SOURCE_TYPE_LABELS } from '../../../../services/analytics/reviewAnalyticsService';
import { formatShortDate } from '../../../../utils/dateUtils';
import { cn } from '../../../../utils/cn';

/**
 * MANDATORY POINT DRILL-DOWN FLOW (§12):
 *
 *   "{Area} — 150 points"
 *     → click
 *   Breakdown groups (Branding +50 / Marketing +50 / Project +50)
 *     → click a group
 *   Underlying point events (+20 Positioning Goal / +10 Research Task …)
 *     → click an event
 *   Navigate to the real source entity (Goal / Project)
 *
 * Every stage renders partitions of ONE ledger event set, so displayed
 * totals always reconcile — aggregation never duplicates points (§13).
 */

type GroupMode = 'goal' | 'project' | 'source';

interface ActiveGroup {
  mode: GroupMode;
  key: string;
  label: string;
}

export interface PointBreakdownPanelProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  points: DevelopmentPointStats;
  onNavigate: (route: string) => void;
}

function eventTargetRoute(e: PointEventView): string | null {
  if (e.goal_id) return `/goals/${e.goal_id}`;
  if (e.project_id) return `/projects/${e.project_id}`;
  return null;
}

function matchesGroup(e: PointEventView, group: ActiveGroup): boolean {
  switch (group.mode) {
    case 'goal':
      return e.goal_id === group.key;
    case 'project':
      return e.project_id === group.key;
    case 'source':
      return e.source_type === group.key;
  }
}

export const PointBreakdownPanel: React.FC<PointBreakdownPanelProps> = ({
  isOpen,
  onClose,
  areaName,
  points,
  onNavigate,
}) => {
  const [groupMode, setGroupMode] = useState<GroupMode>('goal');
  const [activeGroup, setActiveGroup] = useState<ActiveGroup | null>(null);

  const rowsByMode: Record<GroupMode, PointBreakdownRow[]> = {
    goal: points.byGoal,
    project: points.byProject,
    source: points.bySourceType,
  };

  const groupedEvents = useMemo(() => {
    if (!activeGroup) return [];
    return points.events.filter((e) => matchesGroup(e, activeGroup));
  }, [activeGroup, points.events]);

  const groupSum = useMemo(() => {
    if (!activeGroup) return 0;
    return groupedEvents.reduce((sum, e) => sum + e.points, 0);
  }, [activeGroup, groupedEvents]);

  const handleClose = () => {
    setActiveGroup(null);
    setGroupMode('goal');
    onClose();
  };

  const handleBack = () => setActiveGroup(null);

  const modeTabs: { id: GroupMode; label: string }[] = [
    { id: 'goal', label: 'By Goal' },
    { id: 'project', label: 'By Project' },
    { id: 'source', label: 'By Source' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={activeGroup ? activeGroup.label : `${areaName} — Points`}
      subtitle={
        activeGroup
          ? `${groupSum >= 0 ? '+' : ''}${groupSum} points · ${groupedEvents.length} ${groupedEvents.length === 1 ? 'event' : 'events'}`
          : `${points.total.toLocaleString()} total points · ${points.eventCount} ledger events`
      }
      maxWidth="xl"
    >
      {!activeGroup ? (
        <div>
          {/* Group-mode selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.08] mb-4 w-fit" role="tablist" aria-label="Break down points by">
            {modeTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={groupMode === t.id}
                onClick={() => setGroupMode(t.id)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                  groupMode === t.id
                    ? 'bg-white/[0.10] text-[#fff4ec]'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {rowsByMode[groupMode].length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No point events in this period.</p>
          ) : (
            <ul className="space-y-2" aria-label="Point breakdown">
              {rowsByMode[groupMode].map((row) => (
                <li key={row.key}>
                  <button
                    onClick={() =>
                      setActiveGroup({
                        mode: groupMode,
                        key: row.key,
                        label:
                          groupMode === 'source'
                            ? SOURCE_TYPE_LABELS[row.label] || row.label
                            : row.label,
                      })
                    }
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-[#ff8a4a]/40 hover:bg-white/[0.06] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60"
                    aria-label={`${row.label}: ${row.points} points from ${row.eventCount} events. View underlying events`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary truncate">{row.label}</span>
                      <span className="block text-[11px] text-text-muted mt-0.5 tabular-nums">
                        {row.eventCount} {row.eventCount === 1 ? 'event' : 'events'}
                        {row.lastOccurredAt ? ` · latest ${formatShortDate(row.lastOccurredAt)}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-[#ff8a4a] tabular-nums">
                        +{row.points.toLocaleString()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[11px] text-text-muted leading-relaxed flex items-start gap-1.5">
            <Coins className="w-3 h-3 mt-0.5 shrink-0 text-[#ff8a4a]/70" />
            All figures aggregate the same Point Ledger events — breakdowns partition the period total without duplication.
          </p>
        </div>
      ) : (
        <div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-[#fff4ec] transition-colors cursor-pointer mb-3 focus:outline-none focus-visible:text-[#ff8a4a]"
            aria-label="Back to point breakdown"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to breakdown
          </button>

          {groupedEvents.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No events found.</p>
          ) : (
            <ul className="space-y-2 max-h-[46vh] overflow-y-auto pr-1" aria-label={`Point events for ${activeGroup.label}`}>
              {groupedEvents.map((event) => {
                const route = eventTargetRoute(event);
                const content = (
                  <>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Badge variant={event.points >= 0 ? 'orange' : 'rose'}>
                        {event.points >= 0 ? '+' : ''}
                        {event.points}
                      </Badge>
                      <span className="min-w-0">
                        <span className="block text-sm text-text-primary truncate">
                          {event.reason || event.note || SOURCE_TYPE_LABELS[event.source_type] || event.source_type}
                        </span>
                        <span className="block text-[11px] text-text-muted mt-0.5">
                          {SOURCE_TYPE_LABELS[event.source_type] || event.source_type} · {formatShortDate(event.occurred_at)}
                        </span>
                      </span>
                    </span>
                    {route && <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
                  </>
                );

                return (
                  <li key={event.id}>
                    {route ? (
                      <button
                        onClick={() => {
                          handleClose();
                          onNavigate(route);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-[#ff8a4a]/40 hover:bg-white/[0.06] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a4a]/60"
                        aria-label={`Open source: ${event.reason || SOURCE_TYPE_LABELS[event.source_type]}`}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-white/[0.05] bg-transparent text-left">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
};
