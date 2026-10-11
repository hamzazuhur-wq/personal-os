import React from 'react';
import { Skill } from '../../../types/skill.types';
import { LifeArea } from '../../../types/vision.types';
import { SkillProficiencyIndicator } from './SkillProficiencyIndicator';
import { SkillDevelopmentBadge } from './SkillDevelopmentBadge';
import { Button } from '../../../components/ui/Button';
import { ArrowUpRight, Compass, Edit3, Archive } from 'lucide-react';
import { getProficiencyOrder } from '../../../constants/skills';

export interface SkillHeroProps {
  skill: Skill;
  lifeArea?: LifeArea | null;
  onEdit: () => void;
  onUpdateProficiency: () => void;
  onArchive: () => void;
}

export const SkillHero: React.FC<SkillHeroProps> = ({
  skill,
  lifeArea,
  onEdit,
  onUpdateProficiency,
  onArchive,
}) => {
  const currentOrder = getProficiencyOrder(skill.current_proficiency);
  const targetOrder = getProficiencyOrder(skill.target_proficiency);
  const isTargetReached = currentOrder >= targetOrder;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[rgba(24,28,38,0.85)] via-[rgba(16,19,26,0.9)] to-[rgba(10,12,17,0.95)] p-6 sm:p-8 backdrop-blur-3xl shadow-[0_24px_64px_rgba(0,0,0,0.65)] space-y-6">
      {/* Top Hairline Accent */}
      <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          {/* Metadata badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {lifeArea && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#ff8a4a] px-2.5 py-1 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25">
                <Compass className="w-3.5 h-3.5" />
                <span>{lifeArea.name}</span>
              </span>
            )}
            <SkillDevelopmentBadge state={skill.development_state} size="sm" />
            {skill.status === 'archived' && (
              <span className="text-xs font-mono text-rose-400 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                Archived
              </span>
            )}
          </div>

          {/* Skill Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fff4ec] tracking-tight">
            {skill.name}
          </h1>

          {/* Description */}
          {skill.description && (
            <p className="text-sm text-text-secondary leading-relaxed">
              {skill.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={onUpdateProficiency}
            className="gap-2 border-[#ff8a4a]/30 text-[#fff4ec] hover:border-[#ff8a4a]/60 shadow-[0_0_15px_rgba(255,106,42,0.15)]"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>Update Level</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5">
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Button>
          {skill.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchive}
              className="text-text-muted hover:text-rose-400 gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </Button>
          )}
        </div>
      </div>

      {/* Proficiency Progression Bar */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1.5">
            Capability Progression
          </span>
          <SkillProficiencyIndicator
            current={skill.current_proficiency}
            target={skill.target_proficiency}
            size="lg"
          />
        </div>

        {isTargetReached && (
          <div className="text-right">
            <span className="text-xs font-mono text-[#ff8a4a] font-semibold bg-[#ff6a2a]/10 px-3 py-1.5 rounded-xl border border-[#ff8a4a]/25 inline-block">
              🎯 Target Level Achieved
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
