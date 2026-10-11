import React, { useState } from 'react';
import { AIConversationGroup, CreateAIConversationGroupDTO, UpdateAIConversationGroupDTO } from '../../../types/ai.types';
import { Button } from '../../../components/ui/Button';
import { Folder, Plus, X, Edit2, Archive, Check } from 'lucide-react';

export interface AIConversationGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AIConversationGroup[];
  onCreateGroup: (dto: CreateAIConversationGroupDTO) => Promise<AIConversationGroup>;
  onUpdateGroup: (id: string, dto: UpdateAIConversationGroupDTO) => Promise<AIConversationGroup>;
  onArchiveGroup: (id: string) => Promise<void>;
}

export const AIConversationGroupModal: React.FC<AIConversationGroupModalProps> = ({
  isOpen,
  onClose,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onArchiveGroup,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      setIsSubmitting(true);
      await onCreateGroup({
        name: newGroupName.trim(),
        sort_order: groups.length,
        status: 'active',
      });
      setNewGroupName('');
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (g: AIConversationGroup) => {
    setEditingGroupId(g.id);
    setEditName(g.name);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await onUpdateGroup(id, { name: editName.trim() });
      setEditingGroupId(null);
      setEditName('');
    } catch (err) {
      console.error('Failed to update group:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-5">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">Manage Conversation Groups</h2>
              <p className="text-xs text-text-muted">Organize discussions by workstream or project domain</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Group Form */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="New Group Name (e.g. Work, Ideas, Career)..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex-1 bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a]"
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting || !newGroupName.trim()}
            className="h-9 px-3.5 gap-2 shrink-0 font-semibold"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Group</span>
          </Button>
        </form>

        {/* Group List */}
        <div className="max-h-64 overflow-y-auto space-y-2 pt-1">
          {groups.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No groups created yet.</p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs"
              >
                {editingGroupId === g.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-black/60 border border-[#ff8a4a] text-xs text-[#fff4ec] rounded-lg px-2.5 py-1 outline-none"
                    />
                    <button
                      onClick={() => saveEdit(g.id)}
                      className="p-1.5 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="p-1.5 text-text-muted hover:text-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-[#ff8a4a]" />
                      <span className="font-semibold text-[#fff4ec]">{g.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(g)}
                        className="p-1.5 text-text-muted hover:text-text-primary"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onArchiveGroup(g.id)}
                        className="p-1.5 text-text-muted hover:text-rose-400"
                        title="Archive Group"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
