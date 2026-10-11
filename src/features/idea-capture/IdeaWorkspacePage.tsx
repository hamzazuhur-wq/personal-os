// ============================================================
// MODULE 10 — IDEA WORKSPACE PAGE
// ============================================================
// The single canonical Idea entity: editable canvas, attachments,
// revision history with real Undo, and the scoped Idea Assistant.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useIdeaWorkspace } from '../../hooks/useIdeaWorkspace';
import { useIdeaCategories, categoryLabel } from '../../hooks/useIdeaCategories';
import { IdeaAssistantPanel } from './IdeaAssistantPanel';
import { AttachmentPickerModal } from './AttachmentPickerModal';
import {
  ArrowLeft, Lightbulb, Undo2, Save, Link as LinkIcon,
  Paperclip, History, Check, X,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface IdeaWorkspacePageProps {
  ideaId: string;
  onNavigate: (route: string) => void;
}

const OPERATION_LABELS: Record<string, string> = {
  manual_save: 'Manual edit',
  title_update: 'Title change',
  attachment_change: 'Attachments',
  ai_append: 'AI append',
  ai_insert: 'AI insert',
  ai_replace: 'AI replace',
  ai_remove: 'AI removal',
  ai_reorder: 'AI reorder',
  ai_rename: 'AI section rename',
  ai_title: 'AI title',
  ai_rewrite: 'AI rewrite',
  undo: 'Undo',
};

export const IdeaWorkspacePage: React.FC<IdeaWorkspacePageProps> = ({ ideaId, onNavigate }) => {
  const ws = useIdeaWorkspace(ideaId);
  const { all: allCategories } = useIdeaCategories();
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);

  // Sync local drafts when the idea loads or an AI edit lands.
  useEffect(() => {
    if (ws.idea) {
      setDraftContent(ws.idea.content);
      setDraftTitle(ws.idea.title ?? '');
    }
  }, [ws.idea?.id, ws.idea?.content, ws.idea?.title]);

  if (ws.loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-sm">Loading workspace…</div>
    );
  }

  if (!ws.idea) {
    return (
      <div className="space-y-4 text-center py-20" data-testid="idea-workspace-missing">
        <p className="text-text-secondary">{ws.error || 'Idea not found.'}</p>
        <button onClick={() => onNavigate('/ideas')} className="text-[#ffb27a] hover:underline cursor-pointer">
          ← Back to Ideas
        </button>
      </div>
    );
  }

  const dirty = draftContent !== ws.idea.content;
  const attachments = ws.getAttachments();
  const currentCategory = categoryLabel((ws.idea.metadata as any)?.idea_category_id, allCategories);
  const isLegacyNonIdea = ws.idea.capture_type !== 'idea';

  return (
    <div className="space-y-6" data-testid="idea-workspace">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => onNavigate('/ideas')}
            className="mt-1 p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-text-muted hover:text-[#fff4ec] transition-colors cursor-pointer"
            title="Back to Ideas"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#ffb27a] shrink-0" />
              {editingTitle ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (draftTitle.trim()) await ws.renameIdea(draftTitle.trim());
                    setEditingTitle(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="bg-black/60 border border-[#ff8a4a]/45 rounded-lg px-3 py-1.5 text-lg font-semibold text-[#fff4ec] outline-none"
                    data-testid="idea-title-input"
                  />
                  <button type="submit" className="p-1.5 text-emerald-300 cursor-pointer" title="Save title"><Check className="w-4 h-4" /></button>
                  <button type="button" onClick={() => { setEditingTitle(false); setDraftTitle(ws.idea!.title ?? ''); }} className="p-1.5 text-text-muted cursor-pointer" title="Cancel"><X className="w-4 h-4" /></button>
                </form>
              ) : (
                <h1
                  className="text-xl sm:text-2xl font-semibold tracking-tight text-[#fff4ec] truncate cursor-text"
                  title="Click to rename"
                  onClick={() => setEditingTitle(true)}
                  data-testid="idea-title-display"
                >
                  {ws.idea.title || '(untitled idea)'}
                </h1>
              )}
            </div>
            <p className="text-xs font-mono uppercase tracking-[0.15em] text-text-muted mt-1 pl-8">
              Idea Capture Workspace · created {new Date(ws.idea.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Category: user-defined only. Legacy types show a subtle badge instead. */}
          {isLegacyNonIdea ? (
            <span
              className="text-[10px] px-2 py-1 rounded-md font-mono uppercase tracking-wider bg-white/[0.05] text-text-muted border border-white/[0.09]"
              data-testid="workspace-legacy-badge"
            >
              Legacy · {ws.idea.capture_type.replace(/_/g, ' ')}
            </span>
          ) : (
            <select
              value={currentCategory && allCategories.some((c) => c.name === currentCategory)
                ? allCategories.find((c) => c.name === currentCategory)!.id
                : ''}
              onChange={(e) => ws.changeCategory(e.target.value || null)}
              data-testid="workspace-category-select"
              aria-label="Idea category"
              className="bg-black/30 backdrop-blur-xl border border-[#ff8a4a]/25 rounded-lg px-2 py-2 text-xs text-[#ffb27a] outline-none [&>option]:bg-[#12161d] cursor-pointer"
            >
              <option value="">Uncategorized</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status === 'archived'}>
                  {c.name}
                  {c.status === 'archived' ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => ws.undoLatest()}
            disabled={ws.saving || ws.revisions.length === 0}
            title="Undo last change (history is kept)"
            data-testid="idea-undo-button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-text-secondary hover:text-[#fff4ec] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button
            onClick={async () => { await ws.saveCanvas(draftContent); }}
            disabled={!dirty || ws.saving}
            data-testid="idea-save-button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff6a2a]/90 text-white text-sm font-semibold hover:bg-[#ff7d47] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> {ws.saving ? 'Saving…' : dirty ? 'Save Canvas' : 'Saved'}
          </button>
        </div>
      </div>

      {ws.error && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" data-testid="workspace-error">
          {ws.error}
        </div>
      )}

      {/* Main grid: canvas + side rail | assistant */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-5 min-w-0">
          {/* Canvas editor */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 space-y-3" data-testid="idea-canvas">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ffb27a]">Canvas</p>
              {dirty && <span className="text-[10px] font-mono text-amber-300">unsaved changes</span>}
            </div>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={18}
              spellCheck={false}
              placeholder="Write your idea freely — headings, lists, anything."
              className="w-full resize-y bg-black/50 border border-white/[0.09] focus:border-[#ff8a4a]/45 rounded-lg px-3.5 py-3 text-sm leading-relaxed text-text-primary outline-none font-[inherit]"
              data-testid="idea-canvas-editor"
            />
          </div>

          {/* Attachments */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 space-y-3" data-testid="idea-attachments">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ffb27a] flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length})
              </p>
              <button
                onClick={() => setIsAttachmentPickerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.05] border border-white/[0.1] text-text-secondary hover:text-[#ffb27a] hover:border-[#ff8a4a]/30 transition-colors cursor-pointer"
                data-testid="workspace-add-attachment"
              >
                <Paperclip className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-text-muted">No attachments yet. Links and images live here and are visible to the Idea Assistant.</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((a) => {
                  const isEmbedded = typeof a.url === 'string' && a.url.startsWith('data:');
                  const displayLabel = a.label || (isEmbedded ? 'embedded image' : a.url);
                  return (
                    <li key={a.id} className="flex items-center gap-2 text-xs text-text-secondary group" data-testid={`workspace-attachment-${a.id}`}>
                      {a.type === 'image' ? (
                        <img src={a.url} alt={a.label || 'attachment'} className="w-9 h-9 rounded-md object-cover bg-black/40 border border-white/[0.08]" />
                      ) : (
                        <LinkIcon className="w-4 h-4 text-[#ffb27a] shrink-0" />
                      )}
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 truncate hover:text-[#ffb27a] hover:underline"
                        title={a.url}
                      >
                        {displayLabel}
                      </a>
                      <button
                        onClick={() => ws.removeAttachment(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-rose-400 transition-opacity cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <AttachmentPickerModal
              isOpen={isAttachmentPickerOpen}
              onClose={() => setIsAttachmentPickerOpen(false)}
              onAdd={async (att) => ws.addAttachment(att)}
            />
          </div>

          {/* Revision history */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4" data-testid="idea-revisions">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ffb27a] flex items-center gap-2 mb-2.5">
              <History className="w-3.5 h-3.5" /> History ({ws.revisions.length}) — never deleted
            </p>
            {ws.revisions.length === 0 ? (
              <p className="text-xs text-text-muted">No changes yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {ws.revisions.map((rev) => (
                  <li key={rev.id} className="flex items-center gap-2 text-[11px] text-text-muted">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0',
                        rev.editor === 'ai' ? 'bg-[#ff6a2a]/15 text-[#ffb27a]' : 'bg-sky-400/12 text-sky-300'
                      )}
                    >
                      {rev.editor}
                    </span>
                    <span>{OPERATION_LABELS[rev.operation] || rev.operation}</span>
                    {rev.reason && <span className="truncate">· {rev.reason}</span>}
                    <span className="ml-auto shrink-0 font-mono">{new Date(rev.created_at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Assistant column */}
        <div className="xl:col-span-2">
          <IdeaAssistantPanel ideaId={ideaId} onIdeaEdited={() => ws.refresh()} />
        </div>
      </div>
    </div>
  );
};
