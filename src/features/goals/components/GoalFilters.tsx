import React from 'react';
import { GoalFilter, GoalSortOption, GoalStatus, GoalTimeHorizon } from '../../../types/goal.types';
import { GOAL_TIME_HORIZONS, GOAL_PRIORITIES } from '../../../constants/goals';
import { LifeArea } from '../../../types/vision.types';
import { Select } from '../../../components/ui/Select';
import { Search, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface GoalFiltersProps {
  filter: GoalFilter;
  sortBy: GoalSortOption;
  lifeAreas: LifeArea[];
  stats: {
    total: number;
    active: number;
    draft: number;
    paused: number;
    completed: number;
    archived: number;
  };
  onFilterChange: (newFilter: Partial<GoalFilter>) => void;
  onSortChange: (newSort: GoalSortOption) => void;
  onResetFilters: () => void;
}

export const GoalFilters: React.FC<GoalFiltersProps> = ({
  filter,
  sortBy,
  lifeAreas,
  stats,
  onFilterChange,
  onSortChange,
  onResetFilters,
}) => {
  const statusTabs: { id: GoalStatus | 'all'; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'active', label: 'Active', count: stats.active },
    { id: 'draft', label: 'Draft', count: stats.draft },
    { id: 'paused', label: 'Paused', count: stats.paused },
    { id: 'completed', label: 'Completed', count: stats.completed },
    { id: 'archived', label: 'Archived', count: stats.archived },
  ];

  const hasActiveFilters =
    (filter.status && filter.status !== 'all') ||
    (filter.life_area_id && filter.life_area_id !== 'all') ||
    (filter.time_horizon && filter.time_horizon !== 'all') ||
    (filter.priority && filter.priority !== 'all') ||
    Boolean(filter.searchQuery);

  return (
    <div className="space-y-3.5">
      {/* Status Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        {/* Status Pills */}
        <div className="flex items-center gap-1 bg-black/45 backdrop-blur-xl p-1 rounded-xl border border-white/[0.08] overflow-x-auto max-w-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          {statusTabs.map((tab) => {
            const isSelected = (filter.status || 'all') === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange({ status: tab.id })}
                className={cn(
                  'px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_2px_12px_rgba(255,106,42,0.2)] font-bold'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-mono', isSelected ? 'bg-[#ff6a2a]/30 text-[#fff4ec]' : 'bg-white/10 text-slate-400')}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter.searchQuery || ''}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search objectives..."
            className="w-full bg-black/40 backdrop-blur-xl border border-white/[0.08] text-text-primary text-xs rounded-xl pl-8 pr-3 py-2 min-h-[38px] outline-none focus:border-[#ff8a4a]/60 focus:shadow-[0_0_12px_rgba(255,106,42,0.2)]"
          />
          {filter.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-[#fff4ec]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Dropdown Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Horizon Filter */}
          <div className="w-36">
            <Select
              size="sm"
              value={filter.time_horizon || 'all'}
              onChange={(val) => onFilterChange({ time_horizon: val as GoalTimeHorizon | 'all' })}
              options={[
                { value: 'all', label: 'All Horizons' },
                ...GOAL_TIME_HORIZONS.map((h) => ({ value: h.id, label: h.label })),
              ]}
              aria-label="Filter by time horizon"
            />
          </div>

          {/* Life Area Filter */}
          <div className="w-40">
            <Select
              size="sm"
              value={filter.life_area_id || 'all'}
              onChange={(val) => onFilterChange({ life_area_id: val })}
              options={[
                { value: 'all', label: 'All Life Areas' },
                ...lifeAreas.map((area) => ({ value: area.id, label: area.name })),
              ]}
              aria-label="Filter by life area"
            />
          </div>

          {/* Priority Filter */}
          <div className="w-36">
            <Select
              size="sm"
              value={filter.priority || 'all'}
              onChange={(val) => onFilterChange({ priority: val as any })}
              options={[
                { value: 'all', label: 'All Priorities' },
                ...GOAL_PRIORITIES.map((p) => ({ value: p.id, label: p.label })),
              ]}
              aria-label="Filter by priority"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-xs font-mono text-[#ff8a4a] hover:text-[#fff4ec] px-2 py-1 transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Sort By Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Sort:</span>
          <div className="w-48">
            <Select
              size="sm"
              align="right"
              value={sortBy}
              onChange={(val) => onSortChange(val as GoalSortOption)}
              options={[
                { value: 'target_date_asc', label: 'Target Date (Earliest)' },
                { value: 'target_date_desc', label: 'Target Date (Latest)' },
                { value: 'priority_desc', label: 'Priority (Highest)' },
                { value: 'created_at_desc', label: 'Newest Created' },
                { value: 'title_asc', label: 'Alphabetical (A-Z)' },
              ]}
              aria-label="Sort objectives"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
