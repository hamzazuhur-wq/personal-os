import React, { useState } from 'react';
import { CreateSkillEvidenceDTO, SkillEvidenceType } from '../../../types/skill.types';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Sparkles, X } from 'lucide-react';
import { EVIDENCE_TYPES } from '../../../constants/skills';

export interface SkillEvidenceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillId: string;
  onSubmit: (dto: CreateSkillEvidenceDTO) => Promise<void>;
}

export const SkillEvidenceFormModal: React.FC<SkillEvidenceFormModalProps> = ({
  isOpen,
  onClose,
  skillId,
  onSubmit,
}) => {
  const [type, setType] = useState<SkillEvidenceType>('project');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Evidence title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        skill_id: skillId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        reference_id: referenceId.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add evidence:', err);
      setError('Unable to save evidence record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-6">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">Add Skill Evidence</h2>
              <p className="text-xs text-text-muted">Record proof of application and mastery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Evidence Type
            </label>
            <Select
              value={type}
              onChange={(val) => setType(val as SkillEvidenceType)}
              options={EVIDENCE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Title / Deliverable *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AVORI Brand Identity Guidebook"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="How was this skill demonstrated in this piece of work?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Reference Link / ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Document link, repo URL, or artifact ID"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Evidence'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
