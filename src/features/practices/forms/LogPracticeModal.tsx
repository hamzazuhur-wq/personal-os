import React, { useState } from 'react';
import { Practice } from '../../../types/practice.types';
import { Goal } from '../../../types/goal.types';
import { Skill } from '../../../types/skill.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Zap, Award, AlertTriangle } from 'lucide-react';

export interface LogPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  practice: Practice | null;
  goals: Goal[];
  skills: Skill[];
  onConfirm: (params: {
    practiceId: string;
    note?: string;
    evidenceUrl?: string;
    goalId?: string;
    skillId?: string;
    lifeAreaId?: string;
  }) => Promise<void>;
}

export const LogPracticeModal: React.FC<LogPracticeModalProps> = ({
  isOpen,
  onClose,
  practice,
  goals,
  skills,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [overrideGoalId, setOverrideGoalId] = useState('');
  const [overrideSkillId, setOverrideSkillId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !practice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (practice.evidence_required && !note.trim() && !evidenceUrl.trim()) {
      setError('This practice requires a reflection note or evidence link.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm({
        practiceId: practice.id,
        note: note.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
        goalId: overrideGoalId || practice.goal_id,
        skillId: overrideSkillId || practice.skill_id,
        lifeAreaId: practice.life_area_id,
      });
      setNote('');
      setEvidenceUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record practice completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goalOptions = [
    { value: '', label: practice.goal_id ? '(Default Practice Goal)' : 'None' },
    ...goals
      .filter((g) => g.status !== 'archived')
      .map((g) => ({
        value: g.id,
        label: GoalHierarchy.formatGoalPath(g.id, goals),
      })),
  ];

  const skillOptions = [
    { value: '', label: practice.skill_id ? '(Default Practice Skill)' : 'None' },
    ...skills.filter((s) => s.status !== 'archived').map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Practice Completion"
      subtitle={`Record a completed session of "${practice.title}" (+${practice.point_value} points).`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
          <span className="text-text-muted">Award Weight:</span>
          <span className="text-[#ff8a4a] font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>+{practice.point_value} Points</span>
          </span>
        </div>

        <Textarea
          label={practice.evidence_required ? 'Reflection & Notes (Required) *' : 'Reflection & Notes (Optional)'}
          placeholder="What insights, findings, or deliberate actions occurred?"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required={practice.evidence_required}
          autoFocus
        />

        <Input
          label="Evidence Link / URL (Optional)"
          placeholder="https://..."
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
        />

        {/* Optional Overrides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Attributed Goal</label>
            <Select size="sm" value={overrideGoalId} onChange={setOverrideGoalId} options={goalOptions} />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Attributed Skill</label>
            <Select size="sm" value={overrideSkillId} onChange={setOverrideSkillId} options={skillOptions} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting}
            className="font-bold shadow-[0_0_15px_rgba(255,106,42,0.25)]"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            <span>Record Points</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
