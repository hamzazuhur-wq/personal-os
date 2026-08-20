import React, { useState } from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { CaptureCard } from './CaptureCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { CaptureStatus } from '../../types/capture.types';
import { CAPTURE_TYPES } from '../../constants/categories';
import { Inbox, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CaptureListProps {
  onNewCaptureClick?: () => void;
}

export const CaptureList: React.FC<CaptureListProps> = ({ onNewCaptureClick }) => {
  const [activeTab, setActiveTab] = useState<CaptureStatus>('inbox');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { captures, loading, updateCapture, archiveCapture, deleteCapture } = useCaptures(activeTab);

  const filteredCaptures = captures.filter((item) => {
    if (selectedTypeFilter !== 'all' && item.capture_type !== selectedTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      return item.content.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const tabs: { id: CaptureStatus; label: string }[] = [
    { id: 'inbox', label: 'Inbox Stream' },
    { id: 'organized', label: 'Organized' },
    { id: 'archived', label: 'Archive' },
  ];

  return (
    <div className="space-y-4">
      {/* Header Filters & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-xl p-1 rounded-xl border border-white/[0.08] w-fit shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_2px_12px_rgba(255,106,42,0.2)] font-bold'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stream..."
              className="w-full bg-black/40 backdrop-blur-xl border border-white/[0.08] text-text-primary text-xs rounded-lg pl-8 pr-3 py-1.5 min-h-[36px] outline-none focus:border-[#ff8a4a]/60 focus:shadow-[0_0_12px_rgba(255,106,42,0.2)]"
            />
          </div>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-black/40 backdrop-blur-xl border border-white/[0.08] text-text-secondary text-xs rounded-lg px-2.5 py-1.5 min-h-[36px] outline-none focus:border-[#ff8a4a]/60 cursor-pointer"
          >
            <option value="all">All Classifications</option>
            {CAPTURE_TYPES.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0f1218]">
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List Content */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredCaptures.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            searchQuery
              ? 'No matching entries found'
              : activeTab === 'inbox'
              ? 'Stream is clear'
              : `No ${activeTab} captures`
          }
          description={
            searchQuery
              ? 'Try modifying your search criteria or category filter.'
              : activeTab === 'inbox'
              ? 'All raw captures have been processed. Use Quick Capture anytime to record ideas.'
              : 'Items categorized here will appear in this archive.'
          }
          actionLabel={activeTab === 'inbox' && onNewCaptureClick ? '+ Capture Idea' : undefined}
          onAction={onNewCaptureClick}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCaptures.map((capture) => (
            <CaptureCard
              key={capture.id}
              capture={capture}
              onUpdate={async (id, updates) => {
                await updateCapture(id, updates);
              }}
              onArchive={archiveCapture}
              onDelete={deleteCapture}
            />
          ))}
        </div>
      )}
    </div>
  );
};
