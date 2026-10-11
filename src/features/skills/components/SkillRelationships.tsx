import React from 'react';
import { Goal } from '../../../types/goal.types';
import { Level } from '../../../types/level.types';
import { Project } from '../../../types/project.types';
import { Button } from '../../../components/ui/Button';
import { Target, Layers, FolderKanban, Plus, X, ExternalLink } from 'lucide-react';

export interface SkillRelationshipsProps {
  linkedGoals: Goal[];
  linkedLevels: Level[];
  linkedProjects: Project[];
  onNavigate: (route: string) => void;
  onLinkGoal: () => void;
  onUnlinkGoal: (id: string) => void;
  onLinkLevel: () => void;
  onUnlinkLevel: (id: string) => void;
  onLinkProject: () => void;
  onUnlinkProject: (id: string) => void;
}

export const SkillRelationships: React.FC<SkillRelationshipsProps> = ({
  linkedGoals,
  linkedLevels,
  linkedProjects,
  onNavigate,
  onLinkGoal,
  onUnlinkGoal,
  onLinkLevel,
  onUnlinkLevel,
  onLinkProject,
  onUnlinkProject,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Linked Levels */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
            <Layers className="w-4 h-4 text-[#ff8a4a]" />
            <span>Required in Development Levels ({linkedLevels.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLinkLevel} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Link Level</span>
          </Button>
        </div>

        {linkedLevels.length === 0 ? (
          <p className="text-xs text-text-muted">No Development Levels linked to this skill.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {linkedLevels.map((lvl) => (
              <div
                key={lvl.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#ff8a4a]/40 transition-colors"
              >
                <div
                  onClick={() => onNavigate(`/levels/${lvl.life_area_id}/${lvl.id}`)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-[#fff4ec] group-hover:text-[#ff8a4a] transition-colors truncate block">
                    {lvl.name}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    Order {lvl.display_order} • {lvl.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onNavigate(`/levels/${lvl.life_area_id}/${lvl.id}`)}
                    className="p-1 text-text-muted hover:text-text-primary"
                    title="Open Level"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onUnlinkLevel(lvl.id)}
                    className="p-1 text-text-muted hover:text-rose-400"
                    title="Unlink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Linked Strategic Goals */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
            <Target className="w-4 h-4 text-[#ff8a4a]" />
            <span>Strategic Goals ({linkedGoals.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLinkGoal} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Link Goal</span>
          </Button>
        </div>

        {linkedGoals.length === 0 ? (
          <p className="text-xs text-text-muted">No Strategic Goals linked to this skill.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {linkedGoals.map((goal) => (
              <div
                key={goal.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#ff8a4a]/40 transition-colors"
              >
                <div
                  onClick={() => onNavigate(`/goals/${goal.id}`)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-[#fff4ec] group-hover:text-[#ff8a4a] transition-colors truncate block">
                    {goal.title}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {goal.goal_type} • {goal.priority} priority
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onNavigate(`/goals/${goal.id}`)}
                    className="p-1 text-text-muted hover:text-text-primary"
                    title="Open Goal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onUnlinkGoal(goal.id)}
                    className="p-1 text-text-muted hover:text-rose-400"
                    title="Unlink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Linked Active Projects */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
            <FolderKanban className="w-4 h-4 text-[#ff8a4a]" />
            <span>Active Projects ({linkedProjects.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLinkProject} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Link Project</span>
          </Button>
        </div>

        {linkedProjects.length === 0 ? (
          <p className="text-xs text-text-muted">No Projects linked to this skill.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {linkedProjects.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#ff8a4a]/40 transition-colors"
              >
                <div
                  onClick={() => onNavigate(`/projects/${p.id}`)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <span className="text-xs font-semibold text-[#fff4ec] group-hover:text-[#ff8a4a] transition-colors truncate block">
                    {p.title}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {p.status} • {p.priority} priority
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onNavigate(`/projects/${p.id}`)}
                    className="p-1 text-text-muted hover:text-text-primary"
                    title="Open Project"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onUnlinkProject(p.id)}
                    className="p-1 text-text-muted hover:text-rose-400"
                    title="Unlink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
