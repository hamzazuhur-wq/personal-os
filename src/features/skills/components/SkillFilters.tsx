import React from 'react';
import { SkillFilter, SkillProficiency, SkillDevelopmentState } from '../../../types/skill.types';
import { LifeArea } from '../../../types/vision.types';
import { Select } from '../../../components/ui/Select';
import { Search } from 'lucide-react';

export interface SkillFiltersProps {
  filter: SkillFilter;
  lifeAreas: LifeArea[];
  onFilterChange: (filter: Partial<SkillFilter>) => void;
}

export const SkillFilters: React.FC<SkillFiltersProps> = ({
  filter,
  lifeAreas,
  onFilterChange,
}) => {
  return (
    <div className="relative z-10">
      <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search skills..."
              value={filter.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#ff8a4a] placeholder:text-text-muted/60"
            />
          </div>

          {/* Life Area Select */}
          <Select
            value={filter.life_area_id || 'all'}
            onChange={(val) => onFilterChange({ life_area_id: val })}
            options={[
              { value: 'all', label: 'All Life Areas' },
              ...lifeAreas.map((la) => ({ value: la.id, label: la.name })),
            ]}
          />

          {/* Proficiency Select */}
          <Select
            value={filter.current_proficiency || 'all'}
            onChange={(val) => onFilterChange({ current_proficiency: val as SkillProficiency | 'all' })}
            options={[
              { value: 'all', label: 'All Proficiency Levels' },
              { value: 'foundation', label: 'Foundation' },
              { value: 'developing', label: 'Developing' },
              { value: 'competent', label: 'Competent' },
              { value: 'advanced', label: 'Advanced' },
              { value: 'expert', label: 'Expert' },
            ]}
          />

          {/* Development State Select */}
          <Select
            value={filter.development_state || 'all'}
            onChange={(val) => onFilterChange({ development_state: val as SkillDevelopmentState | 'all' })}
            options={[
              { value: 'all', label: 'All Development States' },
              { value: 'developing', label: 'Developing (Active)' },
              { value: 'maintaining', label: 'Maintaining' },
              { value: 'demonstrated', label: 'Demonstrated' },
              { value: 'not_started', label: 'Not Started' },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
