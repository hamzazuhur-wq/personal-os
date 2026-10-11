import React from 'react';
import { Project } from '../../../types/project.types';
import { LifeArea } from '../../../types/vision.types';
import { Goal } from '../../../types/goal.types';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { formatHumanDate } from '../../../utils/dateUtils';
import { ArrowRight, Calendar, Layers, Target } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ProjectRowProps {
  project: Project;
  lifeArea?: LifeArea | null;
  primaryGoal?: Goal | null;
  onSelect: (id: string) => void;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({
  project,
  lifeArea,
  primaryGoal,
  onSelect,
}) => {
  const isActive = project.status === 'active';
  const isCompleted = project.status === 'completed';

  return (
    <article
      onClick={() => onSelect(project.id)}
      className={cn(
        'group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-colors duration-150 cursor-pointer select-none',
        isActive
          ? 'bg-gradient-to-r from-[rgba(25,29,38,0.7)] via-[rgba(16,19,26,0.8)] to-[rgba(10,12,17,0.9)] border-white/[0.1] hover:border-white/25 hover:shadow-[0_8px_30px_-10px_rgba(255,106,42,0.2)]'
          : isCompleted
          ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/35'
          : 'bg-black/35 border-white/[0.07] hover:border-white/20'
      )}
    >
      {/* Left: Project Title & Desired Outcome */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-sm sm:text-base font-bold text-[#fff4ec] group-hover:text-[#ff8a4a] transition-colors truncate">
            {project.title}
          </h3>
          <ProjectStatusBadge status={project.status} />
          <span className="text-[10px] font-mono text-text-muted uppercase">
            [{project.priority}]
          </span>
        </div>

        {/* Desired Outcome Callout */}
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
          <span className="text-[#ffb27a] font-mono uppercase font-bold tracking-wider text-[10px]">
            OUTCOME:
          </span>{' '}
          {project.desired_outcome}
        </p>
      </div>

      {/* Center: Relationships (Life Area & Primary Goal) */}
      <div className="flex items-center gap-3 text-xs font-mono text-text-muted flex-wrap md:max-w-xs shrink-0">
        {lifeArea && (
          <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06] truncate">
            <Layers className="w-3 h-3 text-[#ff8a4a]" />
            <span className="truncate">{lifeArea.name}</span>
          </span>
        )}

        {primaryGoal && (
          <span className="inline-flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06] truncate">
            <Target className="w-3 h-3 text-[#ff8a4a]" />
            <span className="truncate">{primaryGoal.title}</span>
          </span>
        )}
      </div>

      {/* Right: Target Date & Navigation Arrow */}
      <div className="flex items-center justify-between md:justify-end gap-3 text-xs font-mono shrink-0 border-t md:border-t-0 border-white/[0.06] pt-2 md:pt-0">
        {project.target_date && (
          <div className="flex items-center gap-1.5 text-text-muted">
            <Calendar className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>Target: <strong className="text-text-primary">{formatHumanDate(project.target_date)}</strong></span>
          </div>
        )}

        <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-muted group-hover:text-[#fff4ec] group-hover:border-white/20 transition-all">
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </article>
  );
};
