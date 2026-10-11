import React from 'react';
import { ChevronRight } from 'lucide-react';
import { LifeAreaOverviewCardData } from '../../../types/analytics.types';
import { Card } from '../../../components/ui/Card';

/**
 * Level 1 Life Area card (§6) — understandable in seconds, a navigation
 * entry point rather than a chart host. All numbers come from the shared
 * analytics overview; the card itself performs zero calculations.
 */
export const LifeAreaCard: React.FC<{
  area: LifeAreaOverviewCardData;
  onOpen: (lifeAreaId: string) => void;
}> = ({ area, onOpen }) => {
  const hasActivity =
    area.points !== 0 || area.tasksCompleted > 0 || area.activitiesLogged > 0 || area.goalsProgressed > 0;

  return (
    <Card
      variant="interactive"
      role="button"
      tabIndex={0}
      aria-label={`Open ${area.name} review dashboard`}
      onClick={() => onOpen(area.lifeAreaId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(area.lifeAreaId);
        }
      }}
      className="group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-bold text-[#fff4ec] tracking-tight truncate">{area.name}</h3>
        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-[#ff8a4a] transition-colors shrink-0 mt-0.5" />
      </div>

      {hasActivity ? (
        <>
          <p className="text-2xl font-extrabold text-[#ff8a4a] leading-none mb-1 tabular-nums">
            {area.points.toLocaleString()}
          </p>
          <p className="text-[10px] uppercase tracking-wider font-mono text-text-muted mb-4">
            Development Points
          </p>

          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Tasks</dt>
              <dd className="text-text-secondary font-semibold tabular-nums">
                {area.tasksCompleted} / {area.tasksTotal}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Projects advanced</dt>
              <dd className="text-text-secondary font-semibold tabular-nums">{area.projectsAdvanced}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Goals progressed</dt>
              <dd className="text-text-secondary font-semibold tabular-nums">{area.goalsProgressed}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-text-muted">Activities</dt>
              <dd className="text-text-secondary font-semibold tabular-nums">{area.activitiesLogged}</dd>
            </div>
          </dl>

          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ff8a4a] opacity-80 group-hover:opacity-100 transition-opacity">
            View Details
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </>
      ) : (
        <div className="py-6">
          <p className="text-sm text-text-muted">No activity recorded for this period.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#ff8a4a] opacity-80 group-hover:opacity-100 transition-opacity">
            View Details
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}
    </Card>
  );
};

export const LifeAreaCardGrid: React.FC<{
  areas: LifeAreaOverviewCardData[];
  onOpen: (lifeAreaId: string) => void;
}> = ({ areas, onOpen }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {areas.map((area) => (
      <LifeAreaCard key={area.lifeAreaId} area={area} onOpen={onOpen} />
    ))}
  </div>
);
