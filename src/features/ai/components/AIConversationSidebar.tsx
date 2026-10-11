import React from 'react';
import {
  AIConversation,
  AIConversationGroup,
  ConversationFilter,
} from '../../../types/ai.types';
import { AIConversationSearch } from './AIConversationSearch';
import { Button } from '../../../components/ui/Button';
import {
  Plus,
  Pin,
  PinOff,
  Archive,
  Folder,
  Settings as SettingsIcon,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface AIConversationSidebarProps {
  conversations: AIConversation[];
  groups: AIConversationGroup[];
  activeConversationId: string | null;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onTogglePin: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  onOpenGroupManager: () => void;
  onOpenSettings: () => void;
}

export const AIConversationSidebar: React.FC<AIConversationSidebarProps> = ({
  conversations,
  groups,
  activeConversationId,
  filter,
  onFilterChange,
  onSelectConversation,
  onNewConversation,
  onTogglePin,
  onArchiveConversation,
  onOpenGroupManager,
  onOpenSettings,
}) => {
  // Categorize conversations by time: Today, This Week, Older
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 86400000;

  const pinnedList = conversations.filter((c) => c.pinned);
  const unpinnedList = conversations.filter((c) => !c.pinned);

  const todayList = unpinnedList.filter((c) => new Date(c.updated_at).getTime() >= todayStart);
  const thisWeekList = unpinnedList.filter(
    (c) => new Date(c.updated_at).getTime() >= weekStart && new Date(c.updated_at).getTime() < todayStart
  );
  const olderList = unpinnedList.filter((c) => new Date(c.updated_at).getTime() < weekStart);

  const renderConversationRow = (conv: AIConversation) => {
    const isActive = conv.id === activeConversationId;
    const group = groups.find((g) => g.id === conv.group_id);

    return (
      <div
        key={conv.id}
        className={cn(
          'group relative flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer select-none',
          isActive
            ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 border-[#ff8a4a]/40 text-[#fff4ec] font-bold shadow-[0_4px_16px_rgba(255,106,42,0.18)]'
            : 'bg-white/[0.02] border-white/[0.05] text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05] hover:border-white/[0.1]'
        )}
        onClick={() => onSelectConversation(conv.id)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          <MessageSquare
            className={cn(
              'w-3.5 h-3.5 shrink-0',
              isActive ? 'text-[#ff8a4a]' : 'text-text-muted group-hover:text-text-secondary'
            )}
          />
          <div className="min-w-0 flex-1">
            <span className="truncate block leading-tight">{conv.title || 'Untitled Session'}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted">
                {conv.category || 'general'}
              </span>
              {group && (
                <>
                  <span className="text-text-muted/40 text-[9px]">•</span>
                  <span className="text-[9px] font-mono text-[#ff8a4a]/80 truncate max-w-[80px]">
                    {group.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hover Quick Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(conv.id);
            }}
            className="p-1 rounded text-text-muted hover:text-[#ff8a4a]"
            title={conv.pinned ? 'Unpin' : 'Pin'}
          >
            {conv.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchiveConversation(conv.id);
            }}
            className="p-1 rounded text-text-muted hover:text-rose-400"
            title="Archive"
          >
            <Archive className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-3xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Action: New Chat */}
      <Button
        variant="primary"
        size="sm"
        onClick={onNewConversation}
        className="w-full h-9 rounded-2xl justify-center gap-2 shadow-[0_0_20px_rgba(255,106,42,0.2)] font-semibold"
      >
        <Plus className="w-4 h-4" />
        <span>New Chat</span>
      </Button>

      {/* Search & Categories */}
      <AIConversationSearch filter={filter} onFilterChange={onFilterChange} />

      {/* Groups Filter Dropdown / Row */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px]">
            <Folder className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>Groups</span>
          </div>
          <button
            onClick={onOpenGroupManager}
            className="text-[11px] text-[#ff8a4a] hover:underline font-mono"
          >
            Manage
          </button>
        </div>
      )}

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
        {/* Pinned Section */}
        {pinnedList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff8a4a] px-1 font-semibold flex items-center gap-1">
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </span>
            <div className="space-y-1">{pinnedList.map(renderConversationRow)}</div>
          </div>
        )}

        {/* Today */}
        {todayList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted px-1 font-semibold">
              Today
            </span>
            <div className="space-y-1">{todayList.map(renderConversationRow)}</div>
          </div>
        )}

        {/* This Week */}
        {thisWeekList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted px-1 font-semibold">
              This Week
            </span>
            <div className="space-y-1">{thisWeekList.map(renderConversationRow)}</div>
          </div>
        )}

        {/* Older */}
        {olderList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted px-1 font-semibold">
              Older
            </span>
            <div className="space-y-1">{olderList.map(renderConversationRow)}</div>
          </div>
        )}

        {conversations.length === 0 && (
          <div className="text-center py-8 text-xs text-text-muted">
            No conversations found.
          </div>
        )}
      </div>

      {/* Footer / Settings Link */}
      <div className="pt-2 border-t border-white/[0.08]">
        <button
          onClick={onOpenSettings}
          className="inline-flex flex-row items-center justify-start gap-2 text-xs text-text-secondary hover:text-[#fff4ec] font-mono transition-colors px-3 py-2 rounded-xl hover:bg-white/[0.04] w-full cursor-pointer whitespace-nowrap"
        >
          <SettingsIcon className="w-4 h-4 text-[#ff8a4a] shrink-0" />
          <span className="truncate">AI Provider & Settings</span>
        </button>
      </div>
    </div>
  );
};
