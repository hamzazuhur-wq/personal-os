import React, { useState, useEffect } from 'react';
import { CreateSkillDTO, Skill, SkillDevelopmentState, SkillProficiency } from '../../../types/skill.types';
import { LifeArea } from '../../../types/vision.types';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { validateSkill, hasSkillValidationErrors, SkillValidationErrors } from '../validation/skillValidation';
import { useSkillRepo } from '../../../app/providers/RepositoryProvider';
import { X, BrainCircuit, AlertTriangle } from 'lucide-react';

export interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateSkillDTO) => Promise<void>;
  initialSkill?: Skill | null;
  lifeAreas: LifeArea[];
}

export const SkillFormModal: React.FC<SkillFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialSkill,
  lifeAreas,
}) => {
  const skillRepo = useSkillRepo();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lifeAreaId, setLifeAreaId] = useState<string>('all');
  const [currentProficiency, setCurrentProficiency] = useState<SkillProficiency>('foundation');
  const [targetProficiency, setTargetProficiency] = useState<SkillProficiency>('competent');
  const [developmentState, setDevelopmentState] = useState<SkillDevelopmentState>('not_started');

  const [errors, setErrors] = useState<SkillValidationErrors & { form?: string }>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialSkill) {
      setName(initialSkill.name);
      setDescription(initialSkill.description || '');
      setLifeAreaId(initialSkill.life_area_id || 'all');
      setCurrentProficiency(initialSkill.current_proficiency);
      setTargetProficiency(initialSkill.target_proficiency);
      setDevelopmentState(initialSkill.development_state);
    } else {
      setName('');
      setDescription('');
      setLifeAreaId(lifeAreas[0]?.id || 'all');
      setCurrentProficiency('foundation');
      setTargetProficiency('competent');
      setDevelopmentState('not_started');
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [initialSkill, isOpen, lifeAreas]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateSkillDTO = {
      name: name.trim(),
      description: description.trim() || undefined,
      life_area_id: lifeAreaId === 'all' ? undefined : lifeAreaId,
      current_proficiency: currentProficiency,
      target_proficiency: targetProficiency,
      development_state: developmentState,
      status: 'active',
    };

    const validationErrors = validateSkill(dto);
    if (hasSkillValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    // Duplicate check
    try {
      const isDup = await skillRepo.checkDuplicate(
        dto.name,
        dto.life_area_id,
        initialSkill ? initialSkill.id : undefined
      );
      if (isDup) {
        setDuplicateWarning(`A skill named "${dto.name}" already exists in this Life Area.`);
        return;
      }
    } catch {
      // Continue if duplicate check fails
    }

    try {
      setSubmitting(true);
      await onSubmit(dto);
      onClose();
    } catch (err) {
      console.error('Failed to submit skill:', err);
      setErrors({ form: 'Unable to save skill. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181c26] via-[#12151d] to-[#0a0c11] p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-6">
        {/* Top accent */}
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fff4ec]">
                {initialSkill ? 'Edit Skill' : 'Define New Skill'}
              </h2>
              <p className="text-xs text-text-muted">
                Capture a core capability and its target level
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skill Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Skill Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Brand Strategy, System Architecture, Negotiation"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDuplicateWarning(null);
                setErrors((prev) => {
                  const updated = { ...prev };
                  delete updated.name;
                  return updated;
                });
              }}
              className="w-full bg-black/40 border border-white/[0.1] text-sm text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50"
            />
            {errors.name && <p className="text-xs text-rose-400">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Description / Scope (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="What does this capability encompass?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.1] text-xs text-text-primary rounded-xl px-3.5 py-2.5 outline-none focus:border-[#ff8a4a] transition-colors placeholder:text-text-muted/50 resize-none"
            />
          </div>

          {/* Life Area */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Life Area
            </label>
            <Select
              value={lifeAreaId}
              onChange={(val) => {
                setLifeAreaId(val);
                setDuplicateWarning(null);
              }}
              options={[
                { value: 'all', label: 'Unassigned / General' },
                ...lifeAreas.map((la) => ({ value: la.id, label: la.name })),
              ]}
            />
          </div>

          {/* Proficiency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                Current Level
              </label>
              <Select
                value={currentProficiency}
                onChange={(val) => setCurrentProficiency(val as SkillProficiency)}
                options={[
                  { value: 'foundation', label: 'Foundation (Awareness)' },
                  { value: 'developing', label: 'Developing (Learning)' },
                  { value: 'competent', label: 'Competent (Independent)' },
                  { value: 'advanced', label: 'Advanced (Deep)' },
                  { value: 'expert', label: 'Expert (Mastery)' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                Target Level
              </label>
              <Select
                value={targetProficiency}
                onChange={(val) => setTargetProficiency(val as SkillProficiency)}
                options={[
                  { value: 'foundation', label: 'Foundation' },
                  { value: 'developing', label: 'Developing' },
                  { value: 'competent', label: 'Competent' },
                  { value: 'advanced', label: 'Advanced' },
                  { value: 'expert', label: 'Expert' },
                ]}
              />
            </div>
          </div>

          {/* Development State */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Development State
            </label>
            <Select
              value={developmentState}
              onChange={(val) => setDevelopmentState(val as SkillDevelopmentState)}
              options={[
                { value: 'not_started', label: 'Not Started' },
                { value: 'developing', label: 'Developing (Actively Working)' },
                { value: 'maintaining', label: 'Maintaining' },
                { value: 'demonstrated', label: 'Demonstrated' },
              ]}
            />
          </div>

          {errors.form && <p className="text-xs text-rose-400">{errors.form}</p>}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : initialSkill ? 'Save Changes' : 'Create Skill'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
