import React from 'react';
import { ConversationFilter, AIConversationCategory } from '../../../types/ai.types';
import { Search, X } from 'lucide-react';

export interface AIConversationSearchProps {
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
}

const CATEGORIES: { value: AIConversationCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'goals', label: 'Goals' },
  { value: 'levels', label: 'Levels' },
  { value: 'skills', label: 'Skills' },
  { value: 'projects', label: 'Projects' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'career', label: 'Career' },
  { value: 'personal', label: 'Personal' },
  { value: 'reflection', label: 'Reflection' },
];

export const AIConversationSearch: React.FC<AIConversationSearchProps> = ({
  filter,
  onFilterChange,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={filter.searchQuery || ''}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              searchQuery: e.target.value,
            })
          }
          className="w-full bg-black/40 border border-white/[0.08] text-xs text-text-primary rounded-xl pl-8 pr-7 py-2 outline-none focus:border-[#ff8a4a] placeholder:text-text-muted/60 transition-colors"
        />
        {filter.searchQuery && (
          <button
            onClick={() => onFilterChange({ ...filter, searchQuery: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = (filter.category ?? 'all') === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() =>
                onFilterChange({
                  ...filter,
                  category: cat.value,
                })
              }
              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors select-none ${
                isActive
                  ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/40 text-[#fff4ec] font-semibold'
                  : 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
