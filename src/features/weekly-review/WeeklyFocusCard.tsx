import React, { useState, useEffect } from 'react';
import { WeeklyFocus, SetWeeklyFocusDTO } from '../../types/weekly.types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Target, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';

export interface WeeklyFocusCardProps {
  weekId: string;
  startDate: string;
  endDate: string;
  focus: WeeklyFocus | null;
  onSaveFocus: (dto: SetWeeklyFocusDTO) => Promise<void>;
}

export const WeeklyFocusCard: React.FC<WeeklyFocusCardProps> = ({
  weekId,
  startDate,
  endDate,
  focus,
  onSaveFocus,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [primaryFocus, setPrimaryFocus] = useState(focus?.primary_focus || '');
  const [objectives, setObjectives] = useState<string[]>(focus?.secondary_objectives || []);
  const [reflectionNotes, setReflectionNotes] = useState(focus?.reflection_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPrimaryFocus(focus?.primary_focus || '');
    setObjectives(focus?.secondary_objectives || []);
    setReflectionNotes(focus?.reflection_notes || '');
  }, [focus]);

  const handleAddObjective = () => {
    setObjectives([...objectives, '']);
  };

  const handleObjectiveChange = (index: number, val: string) => {
    const updated = [...objectives];
    updated[index] = val;
    setObjectives(updated);
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!primaryFocus.trim()) return;
    try {
      setIsSubmitting(true);
      await onSaveFocus({
        week_id: weekId,
        start_date: startDate,
        end_date: endDate,
        primary_focus: primaryFocus.trim(),
        secondary_objectives: objectives.filter((o) => o.trim().length > 0),
        reflection_notes: reflectionNotes.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save weekly focus:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.015] backdrop-blur-3xl border border-white/[0.1] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] overflow-hidden luminous-bottom-glow">
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/30 shadow-[0_0_14px_rgba(255,106,42,0.25)]">
            <Target className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#ff8a4a]">
              Weekly Strategic Directive
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              Core objective for {weekId} ({startDate} → {endDate})
            </div>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            {focus ? 'Edit Focus' : 'Set Focus'}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 pt-2 relative z-10">
          <Input
            label="Primary Focus Directive"
            placeholder="e.g. Complete core module architecture and verification"
            value={primaryFocus}
            onChange={(e) => setPrimaryFocus(e.target.value)}
            required
            autoFocus
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted">
                Secondary Key Objectives
              </label>
              <button
                type="button"
                onClick={handleAddObjective}
                className="text-xs text-[#ff8a4a] hover:text-[#fff4ec] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {objectives.map((obj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Objective ${i + 1}`}
                    value={obj}
                    onChange={(e) => handleObjectiveChange(i, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveObjective(i)}
                    className="text-text-muted hover:text-rose-400 p-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Textarea
            label="Strategic Context / Reflection Notes"
            placeholder="Key constraints, criteria for success, or lessons..."
            rows={2}
            value={reflectionNotes}
            onChange={(e) => setReflectionNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSubmitting}
              disabled={!primaryFocus.trim()}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Save Directive
            </Button>
          </div>
        </div>
      ) : focus ? (
        <div className="space-y-4 pt-1 relative z-10">
          <div className="p-4 sm:p-5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <h3 className="text-base sm:text-xl font-extrabold text-[#fff4ec] tracking-tight leading-snug">
              "{focus.primary_focus}"
            </h3>
          </div>

          {focus.secondary_objectives && focus.secondary_objectives.length > 0 && (
            <div className="space-y-2 pl-1">
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-[0.18em] block">
                Key Supporting Objectives:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {focus.secondary_objectives.map((obj, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 text-xs text-text-secondary bg-white/[0.03] backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-white/[0.06]"
                  >
                    <span className="text-[#ff8a4a] font-mono font-bold">•</span>
                    <span className="font-medium">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {focus.reflection_notes && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-text-secondary leading-relaxed">
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-[0.18em] block mb-1">
                Strategic Notes:
              </span>
              {focus.reflection_notes}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-black/35 backdrop-blur-xl border border-dashed border-white/[0.08] text-center relative z-10">
          <p className="text-xs text-text-muted mb-3">
            No primary strategic focus directive defined for this week.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            + Define Weekly Focus
          </Button>
        </div>
      )}
    </div>
  );
};
