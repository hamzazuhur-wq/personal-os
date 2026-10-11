import React, { useState } from 'react';
import { LevelSkill } from '../../../types/level.types';
import { Button } from '../../../components/ui/Button';
import { Plus, X, Zap } from 'lucide-react';

export interface LevelSkillsProps {
  skills: LevelSkill[];
  onAddSkill: (name: string) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
  isReadonly?: boolean;
}

export const LevelSkills: React.FC<LevelSkillsProps> = ({
  skills,
  onAddSkill,
  onDeleteSkill,
  isReadonly = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [skillName, setSkillName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    await onAddSkill(skillName.trim());
    setSkillName('');
    setIsAdding(false);
  };

  return (
    <section className="p-5 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight">
            Target Competencies & Skills
          </h3>
        </div>

        {!isReadonly && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-mono text-[#ff8a4a] hover:text-[#fff4ec] transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add Skill</span>
          </button>
        )}
      </div>

      {/* Adding Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="Skill or capability name..."
            autoFocus
            className="flex-1 bg-black/50 border border-[#ff8a4a]/50 text-text-primary text-xs rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
          />
          <Button size="sm" variant="primary" type="submit">
            Add
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setIsAdding(false)}>
            Cancel
          </Button>
        </form>
      )}

      {/* Skills Chips Stream */}
      {skills.length === 0 && !isAdding ? (
        <p className="text-xs text-text-muted font-mono py-2">
          No competencies attached to this stage yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <div
              key={s.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-text-primary transition-colors hover:border-white/20"
            >
              <span>{s.name}</span>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => onDeleteSkill(s.id)}
                  className="text-text-muted hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
