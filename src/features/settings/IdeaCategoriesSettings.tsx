// ============================================================
// MODULE 11 PATCH — IDEA CATEGORIES SETTINGS
// ============================================================
// Compact, collapsible. Default collapsed. Header:
//   Idea Categories · N active
//
// Per-row actions (••• menu): Rename / Archive|Restore / Delete.
// Delete is only available when NO capture references the category;
// otherwise the user is told to archive.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useIdeaCategories } from '../../hooks/useIdeaCategories';
import {
  Lightbulb,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { IdeaCategory } from '../../types/ideaCategory.types';

export const IdeaCategoriesSettings: React.FC = () => {
  const { active, all, loading, error, create, rename, archive, restore, remove, countReferences } =
    useIdeaCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [referenceCounts, setReferenceCounts] = useState<Record<string, number>>({});

  // Refresh reference counts whenever the full category list changes
  // (create/rename/archive/restore/delete). This is a cheap local scan.
  useEffect(() => {
    void (async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        all.map(async (c) => {
          counts[c.id] = await countReferences(c.id);
        })
      );
      setReferenceCounts(counts);
    });
  }, [all, countReferences]);

  const canDelete = (category: IdeaCategory) => (referenceCounts[category.id] ?? 0) === 0;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setBusy(true);
      setActionError(null);
      await fn();
    } catch (err: any) {
      setActionError(err?.message ?? 'Action failed.');
    } finally {
      setBusy(false);
      setMenuOpenId(null);
      setConfirmingDeleteId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busy) return;
    await run(() => create(newName.trim()));
    setNewName('');
  };

  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-category-menu-anchor]')) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  return (
    <div data-testid="idea-categories-settings">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/30 shadow-[0_0_12px_rgba(255,106,42,0.2)]">
            <Lightbulb className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
              Idea Categories
            </h3>
            <p className="text-[11px] text-text-muted">
              {active.length} active · {all.length - active.length} archived
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          data-testid="idea-categories-toggle"
          aria-expanded={isOpen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-text-secondary text-xs hover:text-[#fff4ec] hover:border-[#ff8a4a]/30 transition-all cursor-pointer"
        >
          <span>{isOpen ? 'Collapse' : 'Manage'}</span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-text-muted transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3" data-testid="idea-categories-expanded">
          <p className="text-xs text-text-muted leading-relaxed">
            Free labels for your ideas. Categories are archived rather than deleted
            when they are referenced, so past ideas always keep their labels.
          </p>

          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name…"
              data-testid="idea-category-new-input"
              className="flex-1 bg-black/40 border border-white/[0.09] focus:border-[#ff8a4a]/45 rounded-xl px-3.5 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted/50"
            />
            <button
              type="submit"
              disabled={!newName.trim() || busy}
              data-testid="idea-category-create-button"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a] text-[#0a0c10] text-xs font-bold disabled:opacity-40 cursor-pointer transition-all hover:brightness-110"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </form>

          {(error || actionError) && (
            <p className="text-xs text-red-400" data-testid="idea-category-error">
              {actionError ?? error}
            </p>
          )}

          {loading ? (
            <p className="text-xs text-text-muted">Loading categories…</p>
          ) : (
            <ul className="space-y-1.5" data-testid="idea-categories-list">
              {all.map((category) => {
                const refs = referenceCounts[category.id] ?? 0;
                const isEditing = editingId === category.id;
                const isMenuOpen = menuOpenId === category.id;
                const isConfirmingDelete = confirmingDeleteId === category.id;
                const canRemove = canDelete(category);
                return (
                  <li
                    key={category.id}
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-2 rounded-xl border bg-black/30',
                      category.status === 'active'
                        ? 'border-white/[0.08]'
                        : 'border-white/[0.05] opacity-60'
                    )}
                    data-testid={`idea-category-row-${category.name}`}
                  >
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                          }}
                          className="flex-1 bg-black/60 border border-[#ff8a4a]/45 rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none"
                        />
                        <button
                          type="button"
                          title="Save name"
                          onClick={async () => {
                            if (editValue.trim()) {
                              await run(() => rename(category.id, editValue.trim()));
                            }
                            setEditingId(null);
                          }}
                          className="p-1.5 text-emerald-300 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-text-muted cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-text-primary truncate">{category.name}</span>
                        <span
                          className={cn(
                            'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                            category.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-white/[0.06] text-text-muted'
                          )}
                        >
                          {category.status}
                        </span>
                        {refs > 0 && (
                          <span className="text-[9px] font-mono text-text-muted shrink-0">
                            {refs} {refs === 1 ? 'ref' : 'refs'}
                          </span>
                        )}
                        <div className="ml-auto relative" data-category-menu-anchor>
                          <button
                            type="button"
                            onClick={() => setMenuOpenId(isMenuOpen ? null : category.id)}
                            title="Actions"
                            data-testid={`idea-category-menu-${category.name}`}
                            className="p-1.5 rounded-lg text-text-muted hover:text-[#ffb27a] hover:bg-white/[0.06] transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {isMenuOpen && (
                            <div
                              className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 p-1.5 rounded-2xl bg-gradient-to-b from-[#181d26]/95 to-[#0d1017]/98 backdrop-blur-3xl border border-white/[0.14] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
                              data-testid="idea-category-menu-popup"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(category.id);
                                  setEditValue(category.name);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/[0.06] hover:text-[#fff4ec] cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Rename
                              </button>
                              {category.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => run(() => archive(category.id))}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/[0.06] hover:text-amber-300 cursor-pointer"
                                >
                                  <Archive className="w-3.5 h-3.5" /> Archive
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => run(() => restore(category.id))}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/[0.06] hover:text-emerald-300 cursor-pointer"
                                >
                                  <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={!canRemove}
                                onClick={() => {
                                  if (!canRemove) return;
                                  setConfirmingDeleteId(category.id);
                                  setMenuOpenId(null);
                                }}
                                title={
                                  canRemove
                                    ? 'Permanently delete this unused category'
                                    : `This category is used by ${refs} idea${refs === 1 ? '' : 's'} and cannot be deleted. Archive it instead.`
                                }
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-white/[0.06] hover:text-red-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {isConfirmingDelete && (
                      <div className="absolute inset-0 z-[2] flex items-center justify-end gap-2 px-3 rounded-xl bg-black/90 border border-red-400/30" data-testid="idea-category-confirm-delete">
                        <span className="text-xs text-red-200 mr-auto">Permanently delete?</span>
                        <button
                          type="button"
                          onClick={() => run(() => remove(category.id))}
                          className="px-2 py-1 rounded-lg text-xs bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25 cursor-pointer"
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="px-2 py-1 rounded-lg text-xs bg-white/[0.05] border border-white/[0.1] text-text-muted hover:text-[#fff4ec] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
