import React from 'react';
import { LifeArea, Vision } from '../../../types/vision.types';
import { Goal } from '../../../types/goal.types';
import { Level } from '../../../types/level.types';
import { ExternalLink, Layers, Sparkles, Target, Award } from 'lucide-react';

export interface ProjectRelationshipsProps {
  lifeArea?: LifeArea | null;
  primaryGoal?: Goal | null;
  level?: Level | null;
  vision?: Vision | null;
  onNavigate: (route: string) => void;
}

export const ProjectRelationships: React.FC<ProjectRelationshipsProps> = ({
  lifeArea,
  primaryGoal,
  level,
  vision,
  onNavigate,
}) => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Life Area */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2 flex items-center justify-between">
            <span>Life Area</span>
            <Layers className="w-3.5 h-3.5 text-[#ff8a4a]" />
          </div>
          {lifeArea ? (
            <div>
              <h4 className="text-sm font-bold text-[#fff4ec]">{lifeArea.name}</h4>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                {lifeArea.short_direction || 'Persistent domain of focus'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-muted/60 italic py-1">No Life Area assigned</p>
          )}
        </div>

        {lifeArea && (
          <button
            onClick={() => onNavigate(`/vision/life-areas/${lifeArea.id}`)}
            className="mt-4 text-xs font-mono text-[#ff8a4a] hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Life Area</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Primary Strategic Goal */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2 flex items-center justify-between">
            <span>Primary Strategic Goal</span>
            <Target className="w-3.5 h-3.5 text-[#ff8a4a]" />
          </div>
          {primaryGoal ? (
            <div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-[#ffb27a]">
                {primaryGoal.time_horizon}
              </span>
              <h4 className="text-sm font-bold text-[#fff4ec] mt-1 line-clamp-2">
                {primaryGoal.title}
              </h4>
            </div>
          ) : (
            <p className="text-xs text-text-muted/60 italic py-1">Independent execution project</p>
          )}
        </div>

        {primaryGoal && (
          <button
            onClick={() => onNavigate(`/goals/${primaryGoal.id}`)}
            className="mt-4 text-xs font-mono text-[#ff8a4a] hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Strategic Goal</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 3. Level or Vision Alignment */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2 flex items-center justify-between">
            <span>Stage / Vision Anchor</span>
            {level ? <Award className="w-3.5 h-3.5 text-[#ff8a4a]" /> : <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />}
          </div>
          {level ? (
            <div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/30">
                Stage L{level.display_order}
              </span>
              <h4 className="text-sm font-bold text-[#fff4ec] mt-1 line-clamp-2">{level.name}</h4>
            </div>
          ) : vision ? (
            <div>
              <h4 className="text-sm font-bold text-[#fff4ec]">Vision Statement</h4>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                {vision.short_statement || vision.long_term_direction}
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-muted/60 italic py-1">General execution</p>
          )}
        </div>

        {level && lifeArea ? (
          <button
            onClick={() => onNavigate(`/levels/${lifeArea.id}/${level.id}`)}
            className="mt-4 text-xs font-mono text-[#ff8a4a] hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Development Stage</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={() => onNavigate('/vision')}
            className="mt-4 text-xs font-mono text-text-muted hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Vision Overview</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </section>
  );
};
