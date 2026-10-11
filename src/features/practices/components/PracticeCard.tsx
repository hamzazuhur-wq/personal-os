import React from 'react';
import { Practice } from '../../../types/practice.types';
import { LifeArea } from '../../../types/vision.types';
import { Skill } from '../../../types/skill.types';
import { Goal } from '../../../types/goal.types';
import { Project } from '../../../types/project.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Award, Zap, Edit2, Archive, Target, FolderKanban, Sparkles } from 'lucide-react';

export interface PracticeCardProps {
  practice: Practice;
  lifeAreas: LifeArea[];
  skills: Skill[];
  goals: Goal[];
  projects: Project[];
  onLogPractice: (practice: Practice) => void;
  onEdit: (practice: Practice) => void;
  onArchive: (id: string) => void;
}

export const PracticeCard: React.FC<PracticeCardProps> = ({
  practice,
  lifeAreas,
  skills,
  goals,
  projects,
  onLogPractice,
  onEdit,
  onArchive,
}) => {
  const area = practice.life_area_id ? lifeAreas.find((a) => a.id === practice.life_area_id) : null;
  const skill = practice.skill_id ? skills.find((s) => s.id === practice.skill_id) : null;
  const goal = practice.goal_id ? goals.find((g) => g.id === practice.goal_id) : null;
  const project = practice.project_id ? projects.find((p) => p.id === practice.project_id) : null;

  const goalPath = goal ? GoalHierarchy.formatGoalPath(goal.id, goals) : null;

  return (
    <div className="group relative flex flex-col justify-between p-5 rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl hover:border-white/20 transition-all shadow-lg space-y-4">
      {/* Top Strip: Title, Points Badge, Edit/Archive Actions */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-[#fff4ec] tracking-tight truncate group-hover:text-[#ff8a4a] transition-colors">
              {practice.title}
            </h3>
            {practice.description && (
              <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                {practice.description}
              </p>
            )}
          </div>

          {/* Points Badge */}
          <div className="px-3 py-1 rounded-xl bg-[#ff6a2a]/15 border border-[#ff8a4a]/30 text-[#ff8a4a] font-mono font-extrabold text-xs shrink-0 flex items-center gap-1 shadow-[0_0_10px_rgba(255,106,42,0.15)]">
            <Award className="w-3.5 h-3.5" />
            <span>+{practice.point_value} pts</span>
          </div>
        </div>

        {/* Association Metadata Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 text-[11px] font-mono text-text-muted">
          {area && (
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-text-secondary">
              {area.name}
            </span>
          )}

          {skill && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{skill.name}</span>
            </span>
          )}

          {goal && (
            <span
              className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[#ffb27a] flex items-center gap-1 truncate max-w-[200px]"
              title={goalPath || goal.title}
            >
              <Target className="w-3 h-3 shrink-0" />
              <span className="truncate">{goal.title}</span>
            </span>
          )}

          {project && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1 truncate max-w-[160px]">
              <FolderKanban className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate">{project.title}</span>
            </span>
          )}

          {practice.evidence_required && (
            <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[9px] uppercase font-bold">
              Evidence Required
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(practice)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
            title="Edit Practice Definition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onArchive(practice.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Archive Practice"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Log Practice Button */}
        <button
          onClick={() => onLogPractice(practice)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-[#ff6a2a]/20 border border-white/[0.1] hover:border-[#ff8a4a]/40 text-[#fff4ec] hover:text-[#ff8a4a] text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 text-[#ff8a4a]" />
          <span>Log Practice</span>
        </button>
      </div>
    </div>
  );
};
