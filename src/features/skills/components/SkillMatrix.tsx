import React from 'react';
import { Skill } from '../../../types/skill.types';
import { LifeArea } from '../../../types/vision.types';
import { SkillRow } from './SkillRow';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BrainCircuit, Compass } from 'lucide-react';

export interface SkillMatrixProps {
  skills: Skill[];
  lifeAreas: LifeArea[];
  onSkillClick: (id: string) => void;
  onCreateSkill: () => void;
}

export const SkillMatrix: React.FC<SkillMatrixProps> = ({
  skills,
  lifeAreas,
  onSkillClick,
  onCreateSkill,
}) => {
  if (skills.length === 0) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="No skills defined yet"
        description="The Skill Matrix tracks your real-world capabilities, their current strength, target levels, and development history across Life Areas."
        actionLabel="Add First Skill"
        onAction={onCreateSkill}
      />
    );
  }

  // Group skills by Life Area
  const grouped = lifeAreas.reduce<Record<string, { area: LifeArea; skills: Skill[] }>>((acc, area) => {
    const areaSkills = skills.filter((s) => s.life_area_id === area.id);
    if (areaSkills.length > 0) {
      acc[area.id] = { area, skills: areaSkills };
    }
    return acc;
  }, {});

  const unassignedSkills = skills.filter(
    (s) => !s.life_area_id || !lifeAreas.some((la) => la.id === s.life_area_id)
  );

  return (
    <div className="space-y-8">
      {Object.values(grouped).map(({ area, skills: areaSkills }) => (
        <section key={area.id} className="space-y-3">
          {/* Life Area Group Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-[#ff8a4a]" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#fff4ec]">
                {area.name}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-text-muted border border-white/[0.08]">
                {areaSkills.length} {areaSkills.length === 1 ? 'skill' : 'skills'}
              </span>
            </div>
          </div>

          {/* Area Skills List */}
          <div className="space-y-2.5">
            {areaSkills.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                lifeArea={area}
                onClick={() => onSkillClick(skill.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Unassigned Skills Group */}
      {unassignedSkills.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="w-4 h-4 text-text-muted" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-text-muted">
                General / Unassigned
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-text-muted border border-white/[0.08]">
                {unassignedSkills.length}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {unassignedSkills.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                lifeArea={null}
                onClick={() => onSkillClick(skill.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
