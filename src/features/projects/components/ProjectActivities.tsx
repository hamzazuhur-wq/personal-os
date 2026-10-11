import React from 'react';
import { Activity } from '../../../types/activity.types';
import { Clock, Timer } from 'lucide-react';
import { formatHumanDate } from '../../../utils/dateUtils';

export interface ProjectActivitiesProps {
  activities: Activity[];
}

export const ProjectActivities: React.FC<ProjectActivitiesProps> = ({ activities }) => {
  const totalDurationMinutes = activities.reduce((acc, a) => acc + (a.duration_minutes || 0), 0);
  const hours = Math.floor(totalDurationMinutes / 60);
  const mins = totalDurationMinutes % 60;
  const formattedDuration = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-sm font-bold text-[#fff4ec] tracking-tight uppercase font-mono">
            Recorded Work History ({activities.length})
          </h3>
        </div>

        {totalDurationMinutes > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff6a2a]/15 text-[#ff8a4a] text-xs font-mono font-bold border border-[#ff8a4a]/30">
            <Timer className="w-3.5 h-3.5" />
            <span>{formattedDuration} Total Logged</span>
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No work sessions recorded against this project yet. Log activities from the Daily Activity Log to track actual time invested.
        </p>
      ) : (
        <div className="space-y-2.5">
          {activities.map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="font-semibold text-text-primary truncate">{a.title}</h4>
                {a.description && (
                  <p className="text-[11px] text-text-secondary line-clamp-1">{a.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-text-muted">
                {a.duration_minutes && (
                  <span className="text-[#ffb27a] font-bold">
                    {a.duration_minutes}m
                  </span>
                )}
                <span>{formatHumanDate(a.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
