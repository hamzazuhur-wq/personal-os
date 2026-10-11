import React, { useState } from 'react';
import { PointLedgerEvent } from '../../../types/practice.types';
import { Practice } from '../../../types/practice.types';
import { LifeArea } from '../../../types/vision.types';
import { Skill } from '../../../types/skill.types';
import { Goal } from '../../../types/goal.types';
import { Project } from '../../../types/project.types';
import { formatHumanDate, formatTimeAgo } from '../../../utils/dateUtils';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface PointLedgerTableProps {
  events: PointLedgerEvent[];
  practiceMap: Record<string, Practice>;
  lifeAreas: LifeArea[];
  skills: Skill[];
  goals: Goal[];
  projects: Project[];
  onOpenAdjustment: (event: PointLedgerEvent) => void;
}

export const PointLedgerTable: React.FC<PointLedgerTableProps> = ({
  events,
  practiceMap,
  lifeAreas,
  skills,
  goals,
  projects,
  onOpenAdjustment,
}) => {
  const [filterSource, setFilterSource] = useState<string>('all');

  const areaMap = Object.fromEntries(lifeAreas.map((a) => [a.id, a.name]));
  const skillMap = Object.fromEntries(skills.map((s) => [s.id, s.name]));
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g.title]));
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.title]));

  const filteredEvents = events.filter((e) => {
    if (filterSource === 'all') return true;
    return e.source_type === filterSource;
  });

  return (
    <div className="space-y-4">
      {/* Table Sub-header with Source Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-[0.20em] text-[#fff4ec] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Immutable Point Ledger ({events.length})</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Append-only audit trail of all verified development points.
          </p>
        </div>

        {/* Source Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-text-muted self-start sm:self-auto">
          {['all', 'practice_completion', 'task_completion', 'manual_award', 'adjustment'].map(
            (source) => (
              <button
                key={source}
                onClick={() => setFilterSource(source)}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all capitalize',
                  filterSource === source
                    ? 'bg-white/[0.08] text-[#fff4ec] font-bold border border-white/15'
                    : 'hover:text-text-primary'
                )}
              >
                {source.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Ledger Table Container */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 rounded-2xl bg-black/25 backdrop-blur-xl border border-dashed border-white/[0.08] text-center">
          <p className="text-xs font-mono text-text-muted">
            No point transactions recorded yet for this filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/30 backdrop-blur-xl">
          <table className="w-full text-left text-xs font-mono text-text-secondary">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-wider text-text-muted">
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Practice / Reason</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Domain Association</th>
                <th className="py-3 px-4 text-right">Points</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredEvents.map((event) => {
                const practice = event.practice_id ? practiceMap[event.practice_id] : null;
                const isPositive = event.points > 0;
                const isAdjustment = event.source_type === 'adjustment';

                return (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-text-muted text-[11px]">
                      <div>{formatHumanDate(event.occurred_at.slice(0, 10))}</div>
                      <div className="text-[9px] text-text-muted/60">
                        {formatTimeAgo(event.occurred_at)}
                      </div>
                    </td>

                    {/* Practice Title & Note */}
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="font-bold text-[#fff4ec] truncate">
                        {practice?.title || event.note || 'Manual Award'}
                      </div>
                      {event.note && practice && (
                        <div className="text-[10px] text-text-secondary truncate mt-0.5">
                          "{event.note}"
                        </div>
                      )}
                      {event.evidence_url && (
                        <a
                          href={event.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[#ff8a4a] hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>Evidence Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase',
                          isAdjustment
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                            : event.source_type === 'task_completion'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                        )}
                      >
                        {event.source_type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Domain Association */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="space-y-0.5 text-[10px]">
                        {event.life_area_id && areaMap[event.life_area_id] && (
                          <div className="text-text-secondary truncate">
                            Area: {areaMap[event.life_area_id]}
                          </div>
                        )}
                        {event.skill_id && skillMap[event.skill_id] && (
                          <div className="text-amber-300 truncate">
                            Skill: {skillMap[event.skill_id]}
                          </div>
                        )}
                        {event.goal_id && goalMap[event.goal_id] && (
                          <div className="text-[#ffb27a] truncate">
                            Goal: {goalMap[event.goal_id]}
                          </div>
                        )}
                        {event.project_id && projectMap[event.project_id] && (
                          <div className="text-blue-300 truncate">
                            Project: {projectMap[event.project_id]}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Points Award Badge */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-extrabold text-sm">
                      <span
                        className={cn(
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isPositive ? `+${event.points}` : event.points}
                      </span>
                    </td>

                    {/* Action: Correction Adjustment */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!isAdjustment && (
                        <button
                          onClick={() => onOpenAdjustment(event)}
                          className="text-[10px] text-text-muted hover:text-rose-400 hover:underline transition-colors"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
