import React from 'react';
import { ExecutionFilter, TaskContext } from '../../../types/task.types';
import { Project } from '../../../types/project.types';
import { Goal } from '../../../types/goal.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Select } from '../../../components/ui/Select';
import { Search, X } from 'lucide-react';

export interface ExecutionFiltersBarProps {
  filter: ExecutionFilter;
  onFilterChange: (filter: ExecutionFilter) => void;
  projects: Project[];
  goals?: Goal[];
}

const CONTEXTS: { value: TaskContext | 'all'; label: string }[] = [
  { value: 'all', label: 'All Contexts' },
  { value: 'deep_work', label: '@deep_work' },
  { value: 'quick', label: '@quick' },
  { value: 'computer', label: '@computer' },
  { value: 'phone', label: '@phone' },
  { value: 'office', label: '@office' },
  { value: 'home', label: '@home' },
  { value: 'anywhere', label: '@anywhere' },
];

export const ExecutionFiltersBar: React.FC<ExecutionFiltersBarProps> = ({
  filter,
  onFilterChange,
  projects,
  goals = [],
}) => {
  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...projects
      .filter((p) => p.status !== 'archived')
      .map((p) => ({ value: p.id, label: p.title })),
  ];

  const goalOptions = [
    { value: 'all', label: 'All Goals & Subtrees' },
    ...goals
      .filter((g) => g.status !== 'archived')
      .map((g) => ({
        value: g.id,
        label: GoalHierarchy.formatGoalPath(g.id, goals),
      })),
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter actions, next actions..."
          value={filter.searchQuery || ''}
          onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
          className="w-full bg-black/40 border border-white/[0.08] text-xs text-text-primary rounded-xl pl-8 pr-7 py-2 outline-none focus:border-[#ff8a4a] placeholder:text-text-muted/60 transition-colors"
        />
        {filter.searchQuery && (
          <button
            onClick={() => onFilterChange({ ...filter, searchQuery: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Goal Subtree Selector */}
        {goals.length > 0 && (
          <div className="w-48 sm:w-56">
            <Select
              size="sm"
              value={filter.goal_id || 'all'}
              onChange={(val) => onFilterChange({ ...filter, goal_id: val as any })}
              options={goalOptions}
            />
          </div>
        )}

        {/* Project Selector */}
        <div className="w-36 sm:w-44">
          <Select
            size="sm"
            value={filter.project_id || 'all'}
            onChange={(val) => onFilterChange({ ...filter, project_id: val as any })}
            options={projectOptions}
          />
        </div>

        {/* Context Selector */}
        <div className="w-32">
          <Select
            size="sm"
            value={filter.context || 'all'}
            onChange={(val) => onFilterChange({ ...filter, context: val as any })}
            options={CONTEXTS}
          />
        </div>
      </div>
    </div>
  );
};
