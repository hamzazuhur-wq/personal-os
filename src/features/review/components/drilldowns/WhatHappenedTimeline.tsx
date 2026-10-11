import React from 'react';
import { Badge } from '../../../../components/ui/Badge';
import { ActivityEvidenceItem } from '../../../../types/analytics.types';
import { formatShortDate } from '../../../../utils/dateUtils';

/**
 * WHAT HAPPENED (§22) — compact chronological evidence section backed
 * by bounded period queries. This is evidence, not a second analytics
 * engine: each row shows the activity, its goal path / project context
 * and the ledger points attributed to it.
 */
export const WhatHappenedTimeline: React.FC<{ items: ActivityEvidenceItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <p className="text-sm text-text-muted py-6 text-center">
        No activities were logged in this period.
      </p>
    );
  }

  return (
    <ul className="space-y-1" aria-label="Chronological activity evidence">
      {items.map((item, idx) => (
        <li
          key={item.id}
          className="relative flex gap-3 px-1 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
        >
          {/* Timeline rail */}
          <div className="flex flex-col items-center pt-1 shrink-0 w-14">
            <span className="text-[11px] font-semibold text-text-secondary tabular-nums">
              {formatShortDate(item.date)}
            </span>
          </div>
          <div
            className="absolute left-[68px] top-0 bottom-0 w-px bg-white/[0.06]"
            aria-hidden="true"
            style={{
              top: idx === 0 ? 12 : 0,
              bottom: idx === items.length - 1 ? 'auto' : 0,
              height: idx === items.length - 1 ? 16 : undefined,
            }}
          />
          <div className="w-2 flex justify-center pt-1.5 shrink-0 ml-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff8a4a]/80 shadow-[0_0_5px_rgba(255,138,74,0.5)]" />
          </div>

          <span className="min-w-0 flex-1 pb-1">
            <span className="block text-sm text-text-primary leading-snug">{item.title}</span>
            <span className="block text-[11px] text-text-muted mt-0.5 truncate">
              {[item.goalPathLabel, item.projectTitle].filter(Boolean).join(' · ') ||
                item.category ||
                'Unlinked'}
              {item.durationMinutes ? ` · ${item.durationMinutes}m` : ''}
            </span>
          </span>

          {!!item.points && item.points !== 0 && (
            <Badge variant={item.points > 0 ? 'orange' : 'rose'} className="shrink-0 self-center">
              {item.points > 0 ? '+' : ''}
              {item.points}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
};
