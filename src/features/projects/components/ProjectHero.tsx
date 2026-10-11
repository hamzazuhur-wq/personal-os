import React from 'react';
import { Project } from '../../../types/project.types';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Button } from '../../../components/ui/Button';
import { formatHumanDate } from '../../../utils/dateUtils';
import { Archive, Calendar, CheckCircle2, Edit3, PauseCircle, PlayCircle, Sparkles } from 'lucide-react';

export interface ProjectHeroProps {
  project: Project;
  onEdit: () => void;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  onArchive: () => void;
}

export const ProjectHero: React.FC<ProjectHeroProps> = ({
  project,
  onEdit,
  onComplete,
  onPause,
  onResume,
  onArchive,
}) => {
  const isActive = project.status === 'active';
  const isPaused = project.status === 'paused';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[rgba(24,28,38,0.85)] via-[rgba(16,19,26,0.9)] to-[rgba(10,12,17,0.95)] p-6 sm:p-8 backdrop-blur-3xl shadow-[0_24px_64px_rgba(0,0,0,0.65)] space-y-6">
      {/* Bottom atmospheric glow */}
      {isActive && (
        <div className="pointer-events-none absolute -bottom-16 left-1/4 right-1/4 h-36 rounded-full bg-gradient-to-t from-[#ff6a2a]/20 to-transparent blur-3xl" />
      )}

      <div className="relative z-10 space-y-5">
        {/* Status and Priority Strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <ProjectStatusBadge status={project.status} size="md" />
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-muted font-bold">
              Priority: {project.priority}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {isActive && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onComplete}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  <span>Mark Complete</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onPause}
                  leftIcon={<PauseCircle className="w-3.5 h-3.5" />}
                >
                  <span>Pause</span>
                </Button>
              </>
            )}

            {isPaused && (
              <Button
                size="sm"
                variant="primary"
                onClick={onResume}
                leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
              >
                <span>Resume Project</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={onEdit}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              <span>Edit</span>
            </Button>

            {project.status !== 'archived' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onArchive}
                leftIcon={<Archive className="w-3.5 h-3.5" />}
              >
                <span>Archive</span>
              </Button>
            )}
          </div>
        </div>

        {/* Project Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#fff4ec] tracking-tight leading-tight">
          {project.title}
        </h1>

        {/* Desired Outcome Dominant Callout */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-[#ff8a4a]/30 backdrop-blur-xl space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Desired Outcome / Tangible Result</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-[#fff4ec] leading-relaxed">
            {project.desired_outcome}
          </p>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-3xl whitespace-pre-wrap">
            {project.description}
          </p>
        )}

        {/* Completion Record */}
        {project.completion_note && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block mb-1">
              Final Outcome & Retrospective Note
            </span>
            {project.completion_note}
          </div>
        )}

        {/* Dates Ribbon */}
        <div className="flex items-center gap-6 text-xs font-mono text-text-muted pt-2 flex-wrap border-t border-white/[0.06]">
          {project.start_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span>Started: <strong className="text-text-primary">{formatHumanDate(project.start_date)}</strong></span>
            </div>
          )}
          {project.target_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ff8a4a]" />
              <span>Target: <strong className="text-[#fff4ec]">{formatHumanDate(project.target_date)}</strong></span>
            </div>
          )}
          {project.completed_at && (
            <div className="flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed: {formatHumanDate(project.completed_at.slice(0, 10))}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
