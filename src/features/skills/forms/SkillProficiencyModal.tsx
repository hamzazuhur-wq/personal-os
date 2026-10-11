import React, { useState } from 'react';
import { Skill, SkillProficiency } from '../../../types/skill.types';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { ArrowUpRight, X, History } from 'lucide-react';
import { getProficiencyMeta } from '../../../constants/skills';

export interface SkillProficiencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: Skill;
  onSubmit: (newProficiency: SkillProficiency, reason?: string, note?: string) => Promise<void>;
}

export const SkillProficiencyModal: React.FC<SkillProficiencyModalProps> = ({
  isOpen,
  onClose,
  skill,
  onSubmit,
}) => {
  const [newProficiency, setNewProficiency] = useState<SkillProficiency>(skill.current_proficiency);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMeta = getProficiencyMeta(skill.current_proficiency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProficiency === skill.current_proficiency) {
      setError('Please select a different proficiency level.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(newProficiency, reason.trim() || undefined, note.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to update proficiency:', err);
      setError('Unable to record proficiency change.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-6">
        {/* Top accent */}
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">Update Proficiency</h2>
              <p className="text-xs text-text-muted">Preserve audit trail of your development</p>
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
          {/* Current Level display */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-text-muted">Current Level</span>
            <span className={`text-xs font-mono font-bold ${currentMeta.textClass}`}>
              {currentMeta.label}
            </span>
          </div>

          {/* New Proficiency */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              New Proficiency Level *
            </label>
            <Select
              value={newProficiency}
              onChange={(val) => {
                setNewProficiency(val as SkillProficiency);
                setError(null);
              }}
              options={[
                { value: 'foundation', label: 'Foundation (Awareness)' },
                { value: 'developing', label: 'Developing (Learning)' },
                { value: 'competent', label: 'Competent (Independent)' },
                { value: 'advanced', label: 'Advanced (Deep)' },
                { value: 'expert', label: 'Expert (Mastery)' },
              ]}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Reason for Change (Recommended)
            </label>
            <input
              type="text"
              placeholder="e.g. Completed AVORI project; led strategic review"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50"
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Context, takeaways, or evidence details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50 resize-none"
            />
          </div>

          {/* History info banner */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center gap-2 text-xs text-blue-300">
            <History className="w-4 h-4 shrink-0 text-blue-400" />
            <span>This change will be permanently logged in your skill history.</span>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save & Log Change'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
