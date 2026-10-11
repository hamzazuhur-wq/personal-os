import React from 'react';
import { ProjectFilter } from '../../../types/project.types';
import { LifeArea } from '../../../types/vision.types';
import { Goal } from '../../../types/goal.types';
import { Select } from '../../../components/ui/Select';
import { Search } from 'lucide-react';

export interface ProjectFiltersProps {
  filter: ProjectFilter;
  lifeAreas: LifeArea[];
  goals: Goal[];
  onFilterChange: (filter: Partial<ProjectFilter>) => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filter,
  lifeAreas,
  goals,
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
              placeholder="Search projects or outcomes..."
              value={filter.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#ff8a4a]"
            />
          </div>

          {/* Status Select */}
          <Select
            value={filter.status || 'all'}
            onChange={(val) => onFilterChange({ status: val as any })}
            options={[
              { value: 'all', label: 'All Statuses (Active, Paused, Drafts)' },
              { value: 'active', label: 'Active Projects' },
              { value: 'paused', label: 'Paused Projects' },
              { value: 'draft', label: 'Draft Projects' },
              { value: 'completed', label: 'Completed Projects' },
              { value: 'archived', label: 'Archived Projects' },
            ]}
          />

          {/* Life Area Select */}
          <Select
            value={filter.life_area_id || 'all'}
            onChange={(val) => onFilterChange({ life_area_id: val })}
            options={[
              { value: 'all', label: 'All Life Areas' },
              ...lifeAreas.map((la) => ({ value: la.id, label: la.name })),
            ]}
          />

          {/* Primary Goal Select */}
          <Select
            value={filter.primary_goal_id || 'all'}
            onChange={(val) => onFilterChange({ primary_goal_id: val })}
            options={[
              { value: 'all', label: 'All Strategic Goals' },
              ...goals.map((g) => ({ value: g.id, label: g.title })),
            ]}
          />
        </div>
      </div>
    </div>
  );
};
