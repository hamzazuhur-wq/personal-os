import React, { useState, useEffect } from 'react';
import { CreatePracticeDTO, Practice } from '../../../types/practice.types';
import { LifeArea } from '../../../types/vision.types';
import { Skill } from '../../../types/skill.types';
import { Goal } from '../../../types/goal.types';
import { Project } from '../../../types/project.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Plus, Edit3 } from 'lucide-react';

export interface PracticeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  practiceToEdit?: Practice | null;
  lifeAreas: LifeArea[];
  skills: Skill[];
  goals: Goal[];
  projects: Project[];
  onSave: (dto: CreatePracticeDTO) => Promise<void>;
}

export const PracticeFormModal: React.FC<PracticeFormModalProps> = ({
  isOpen,
  onClose,
  practiceToEdit,
  lifeAreas,
  skills,
  goals,
  projects,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointValue, setPointValue] = useState<number>(10);
  const [lifeAreaId, setLifeAreaId] = useState('');
  const [skillId, setSkillId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [repeatable, setRepeatable] = useState(true);
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (practiceToEdit) {
      setTitle(practiceToEdit.title);
      setDescription(practiceToEdit.description || '');
      setPointValue(practiceToEdit.point_value);
      setLifeAreaId(practiceToEdit.life_area_id || '');
      setSkillId(practiceToEdit.skill_id || '');
      setGoalId(practiceToEdit.goal_id || '');
      setProjectId(practiceToEdit.project_id || '');
      setRepeatable(practiceToEdit.repeatable !== false);
      setEvidenceRequired(Boolean(practiceToEdit.evidence_required));
    } else {
      setTitle('');
      setDescription('');
      setPointValue(10);
      setLifeAreaId('');
      setSkillId('');
      setGoalId('');
      setProjectId('');
      setRepeatable(true);
      setEvidenceRequired(false);
    }
    setError(null);
  }, [practiceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Practice title is required.');
      return;
    }
    if (pointValue <= 0) {
      setError('Point value must be greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        point_value: pointValue,
        status: 'active',
        life_area_id: lifeAreaId || undefined,
        skill_id: skillId || undefined,
        goal_id: goalId || undefined,
        project_id: projectId || undefined,
        repeatable,
        evidence_required: evidenceRequired,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save practice definition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const areaOptions = [
    { value: '', label: 'None (Unassigned)' },
    ...lifeAreas.map((a) => ({ value: a.id, label: a.name })),
  ];

  const skillOptions = [
    { value: '', label: 'None' },
    ...skills.filter((s) => s.status !== 'archived').map((s) => ({ value: s.id, label: s.name })),
  ];

  const goalOptions = [
    { value: '', label: 'None' },
    ...goals
      .filter((g) => g.status !== 'archived')
      .map((g) => ({
        value: g.id,
        label: GoalHierarchy.formatGoalPath(g.id, goals),
      })),
  ];

  const projectOptions = [
    { value: '', label: 'None' },
    ...projects
      .filter((p) => p.status !== 'archived')
      .map((p) => ({ value: p.id, label: p.title })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={practiceToEdit ? 'Edit Development Practice' : 'New Development Practice'}
      subtitle="Define a repeatable development behavior and its verifiable point weight."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Practice Title *"
          placeholder="e.g. Listen to Educational Podcast, Write Reflection"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Description & Guidance (Optional)"
          placeholder="What constitutes a meaningful practice completion?"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Point Value */}
        <div className="space-y-1">
          <label className="text-xs font-mono uppercase text-text-muted">
            Point Value (Verification Weight) *
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={pointValue}
            onChange={(e) => setPointValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3 py-2 outline-none focus:border-[#ff8a4a]"
            required
          />
        </div>

        {/* Domain Associations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Life Area</label>
            <Select size="sm" value={lifeAreaId} onChange={setLifeAreaId} options={areaOptions} />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Skill Target</label>
            <Select size="sm" value={skillId} onChange={setSkillId} options={skillOptions} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Related Goal</label>
            <Select size="sm" value={goalId} onChange={setGoalId} options={goalOptions} />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">Related Project</label>
            <Select size="sm" value={projectId} onChange={setProjectId} options={projectOptions} />
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="flex items-center gap-6 pt-1 text-xs font-mono text-text-secondary">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={evidenceRequired}
              onChange={(e) => setEvidenceRequired(e.target.checked)}
              className="rounded border-white/20 text-[#ff8a4a] focus:ring-0"
            />
            <span>Require Note / Evidence when logged</span>
          </label>
        </div>

        {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} className="font-bold">
            {practiceToEdit ? <Edit3 className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            <span>{practiceToEdit ? 'Save Changes' : 'Create Practice'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
