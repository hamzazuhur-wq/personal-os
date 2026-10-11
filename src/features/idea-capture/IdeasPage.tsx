// ============================================================
// MODULE 11 — IDEA CAPTURE (the single unified system)
// ============================================================
// One page, one composer, one list. This absorbs the former
// Quick Capture page AND the Module 10 idea list:
//   • The unified IdeaComposer (text / voice / AI voice) — the only
//     creation surface; every new record is capture_type 'idea'.
//   • A single inbox listing ALL captures: new ideas carry a
//     user-defined category; historical records stay untouched and
//     show a subtle LEGACY · TYPE indicator when they have no
//     category. Clicking any card opens the shared workspace.
// ============================================================

import React, { useMemo, useState } from 'react';
import { useCaptures } from '../../hooks/useCaptures';
import { useIdeaCategories, categoryLabel } from '../../hooks/useIdeaCategories';
import { IdeaComposer } from './IdeaComposer';
import { DailyActivityFormModal } from '../daily-log/DailyActivityFormModal';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Badge } from '../../components/ui/Badge';
import { formatTimeAgo } from '../../utils/dateUtils';
import { Capture } from '../../types/capture.types';
import { UNCATEGORIZED_LABEL } from '../../types/ideaCategory.types';
import { useGoals } from '../../hooks/useGoals';
import { useProjects } from '../../hooks/useProjects';
import { usePractices } from '../../hooks/usePractices';
import { useActivities } from '../../hooks/useActivities';
import { useVision } from '../../hooks/useVision';
import { useTasks } from '../../hooks/useTasks';
import { getTodayDateString } from '../../utils/dateUtils';
import {
  Lightbulb,
  ArrowRight,
  Loader2,
  Search,
  Paperclip,
  Archive,
  ArchiveRestore,
  Activity,
  Trash2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface IdeasPageProps {
  onNavigate: (route: string) => void;
}

type StatusTab = 'active' | 'archived';

export function getIdeaCardModel(capture: Capture, categories: ReturnType<typeof useIdeaCategories>['all']) {
  const categoryId = (capture.metadata as any)?.idea_category_id;
  const userLabel = categoryLabel(categoryId, categories);
  const attachmentCount = Array.isArray((capture.metadata as any)?.attachments)
    ? (capture.metadata as any).attachments.length
    : 0;
  return { categoryId, userLabel, attachmentCount };
}

export const IdeasPage: React.FC<IdeasPageProps> = ({ onNavigate }) => {
  const { captures, loading, archiveCapture, deleteCapture, updateCapture, refreshCaptures } = useCaptures();
  const { all: categories, active: activeCategories } = useIdeaCategories();

  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Log-as-activity prefill (Module 08 Final behavior, preserved)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [captureToLog, setCaptureToLog] = useState<Capture | null>(null);

  const { rawGoals: goals } = useGoals();
  const { projects } = useProjects();
  const { practices } = usePractices();
  const { createActivity, refreshActivities } = useActivities();
  const { lifeAreas } = useVision();
  const { tasks } = useTasks();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return captures.filter((c) => {
      if (statusTab === 'active' && c.status === 'archived') return false;
      if (statusTab === 'archived' && c.status !== 'archived') return false;
      const { categoryId, userLabel } = getIdeaCardModel(c, categories);
      if (categoryFilter === 'uncategorized' && userLabel) return false;
      if (categoryFilter !== 'all' && categoryFilter !== 'uncategorized') {
        if (!categoryId || categoryId !== categoryFilter) return false;
      }
      if (q) {
        const title = (c.title || c.content.split('\n')[0] || '').toLowerCase();
        const haystacks = [title, c.content.toLowerCase(), (userLabel ?? '').toLowerCase()];
        if (!haystacks.some((h) => h.includes(q))) return false;
      }
      return true;
    });
  }, [captures, statusTab, searchQuery, categoryFilter, categories]);

  const handleLogAsActivity = (capture: Capture) => {
    setCaptureToLog(capture);
    setIsActivityModalOpen(true);
  };

  return (
    <div className="space-y-8" data-testid="ideas-page">
      <SectionHeader
        title="Idea Capture"
        subtitle="One place for every thought. Capture by text or voice, organize with AI when you want it, and open any idea in its own workspace."
        badge={<Badge variant="orange">Inbox</Badge>}
        action={
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-text-secondary text-sm font-medium hover:text-[#fff4ec] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            Log Activity
          </button>
        }
      />

      {/* THE single composer */}
      <IdeaComposer autoFocus goals={goals} projects={projects} onCaptured={refreshCaptures} />

      {/* Toolbar: search · category filter · status tabs */}
      <div className="flex flex-wrap items-center gap-3" data-testid="ideas-toolbar">
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas…"
            data-testid="ideas-search"
            className="w-full bg-black/30 backdrop-blur-xl border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted/55 outline-none focus:border-[#ff8a4a]/45"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          data-testid="ideas-category-filter"
          className="bg-black/30 backdrop-blur-xl border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-text-secondary outline-none focus:border-[#ff8a4a]/45 [&>option]:bg-[#12161d]"
        >
          <option value="all">All Categories</option>
          <option value="uncategorized">{UNCATEGORIZED_LABEL}</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center rounded-xl bg-black/30 border border-white/[0.08] p-0.5">
          {(['active', 'archived'] as StatusTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              data-testid={`ideas-tab-${tab}`}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer',
                statusTab === tab
                  ? 'bg-[#ff6a2a]/20 text-[#ffb27a]'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Unified list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2" data-testid="ideas-empty">
          <Lightbulb className="w-8 h-8 text-[#ffb27a]/60 mx-auto" />
          <p className="text-text-secondary">
            {statusTab === 'archived' ? 'No archived ideas.' : 'No ideas match.'}
          </p>
          <p className="text-xs text-text-muted">Capture one above — type it, speak it, or let AI voice organize it.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="ideas-list">
          {filtered.map((capture) => {
            const { userLabel, attachmentCount } = getIdeaCardModel(capture, categories);
            const isLegacyNonIdea = capture.capture_type !== 'idea';
            const displayTitle = capture.title || capture.content.split('\n')[0] || '(untitled)';
            const preview = capture.title
              ? capture.content
              : capture.content.split('\n').slice(1).join(' ').trim() || capture.content;
            return (
              <li key={capture.id} className="relative group/card">
                <button
                  onClick={() => onNavigate(`/ideas/${capture.id}`)}
                  className="w-full text-left p-4 pr-24 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-[#ff8a4a]/32 transition-all cursor-pointer"
                  data-testid={`idea-card-${capture.id}`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {userLabel ? (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider bg-[#ff6a2a]/12 text-[#ffb27a] border border-[#ff8a4a]/25"
                        data-testid={`idea-category-${capture.id}`}
                      >
                        {userLabel}
                      </span>
                    ) : isLegacyNonIdea ? (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider bg-white/[0.05] text-text-muted border border-white/[0.09]"
                        data-testid={`idea-legacy-${capture.id}`}
                      >
                        Legacy · {capture.capture_type.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider bg-white/[0.05] text-text-muted border border-white/[0.09]"
                        data-testid={`idea-uncategorized-${capture.id}`}
                      >
                        {UNCATEGORIZED_LABEL}
                      </span>
                    )}
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-text-muted">
                        <Paperclip className="w-3 h-3" />
                        {attachmentCount}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      {formatTimeAgo(capture.created_at)}
                    </span>
                  </div>
                  <p className="font-medium text-[#fff4ec] truncate">{displayTitle}</p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{preview}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#ffb27a] opacity-0 group-hover/card:opacity-100 transition-opacity">
                    Open workspace <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                {/* Hover actions */}
                <div className="absolute top-3 right-3 hidden group-hover/card:flex items-center gap-1">
                  <button
                    type="button"
                    title="Log as Activity"
                    aria-label="Log as Activity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogAsActivity(capture);
                    }}
                    className="p-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-text-muted hover:text-[#ffb27a] hover:border-[#ff8a4a]/35 transition-colors cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={capture.status === 'archived' ? 'Restore from archive' : 'Archive'}
                    aria-label={capture.status === 'archived' ? 'Restore' : 'Archive'}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (capture.status === 'archived') {
                        await updateCapture(capture.id, { status: 'inbox' });
                        refreshCaptures();
                      } else {
                        await archiveCapture(capture.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-text-muted hover:text-[#ffb27a] transition-colors cursor-pointer"
                  >
                    {capture.status === 'archived' ? (
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Delete permanently"
                    aria-label="Delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this idea permanently?')) await deleteCapture(capture.id);
                    }}
                    className="p-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-text-muted hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Capture → Log Activity (same form as Daily Log; points via PointService) */}
      <DailyActivityFormModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setCaptureToLog(null);
        }}
        date={getTodayDateString()}
        goals={goals}
        projects={projects}
        practices={practices}
        lifeAreas={lifeAreas}
        tasks={tasks}
        initialTitle={
          captureToLog ? captureToLog.content.split('\n')[0].slice(0, 120) : undefined
        }
        initialNotes={captureToLog?.content}
        onSave={async (dto) => {
          const created = await createActivity(dto as any);
          refreshActivities();
          return created;
        }}
      />
    </div>
  );
};
