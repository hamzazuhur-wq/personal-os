import React, { useState } from 'react';
import { AIMemory, AIMemoryType, CreateAIMemoryDTO } from '../../../types/ai.types';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Bookmark, Plus, Trash2, X, Archive } from 'lucide-react';
import { validateAIMemory, hasAIMemoryValidationErrors, AIMemoryValidationErrors } from '../validation/aiValidation';

export interface AIMemoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: AIMemory[];
  onSaveMemory: (dto: CreateAIMemoryDTO) => Promise<AIMemory>;
  onArchiveMemory: (id: string) => Promise<AIMemory>;
  onDeleteMemory: (id: string) => Promise<void>;
}

export const AIMemoryManagerModal: React.FC<AIMemoryManagerModalProps> = ({
  isOpen,
  onClose,
  memories,
  onSaveMemory,
  onArchiveMemory,
  onDeleteMemory,
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<AIMemoryType>('preference');
  const [errors, setErrors] = useState<AIMemoryValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const valErrors = validateAIMemory(content, type);
    if (hasAIMemoryValidationErrors(valErrors)) {
      setErrors(valErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onSaveMemory({
        content: content.trim(),
        type,
        status: 'active',
        source: 'explicit_user',
        confidence: 1.0,
      });
      setContent('');
      setErrors({});
    } catch (err) {
      console.error('Failed to save memory:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-6">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">Durable AI Memory Store</h2>
              <p className="text-xs text-text-muted">
                Curated user preferences, persistent constraints, and operating decisions
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Memory Form */}
        <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. Prefer asynchronous reviews; avoid scheduling focus work before 10 AM"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setErrors({});
              }}
              className="flex-1 bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
            />
            <div className="w-44">
              <Select
                value={type}
                onChange={(val) => setType(val as AIMemoryType)}
                options={[
                  { value: 'preference', label: 'Preference' },
                  { value: 'constraint', label: 'Constraint' },
                  { value: 'decision', label: 'Decision' },
                  { value: 'context', label: 'Context' },
                  { value: 'interaction_preference', label: 'Style Preference' },
                ]}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={submitting}
              className="h-9 px-3.5 gap-2 shrink-0 font-semibold"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Save Preference</span>
            </Button>
          </div>
          {errors.content && <p className="text-xs text-rose-400">{errors.content}</p>}
        </form>

        {/* Memory List */}
        <div className="max-h-72 overflow-y-auto space-y-2.5">
          {memories.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No memories recorded yet.</p>
          ) : (
            memories.map((m) => (
              <div
                key={m.id}
                className="group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/25 uppercase font-semibold">
                      {m.type}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      Confirmed: {new Date(m.last_confirmed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#fff4ec] leading-relaxed">{m.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onArchiveMemory(m.id)}
                    className="p-1.5 text-text-muted hover:text-amber-400"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteMemory(m.id)}
                    className="p-1.5 text-text-muted hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
