import React, { useState } from 'react';
import { Task } from '../../../types/task.types';
import { Button } from '../../../components/ui/Button';
import { X, Target, CheckCircle2 } from 'lucide-react';

export interface DailyPriorityPickerModalProps {
  isOpen: boolean;
  readyActions: Task[];
  currentPriorityIds: string[];
  onClose: () => void;
  onSave: (taskIds: string[]) => Promise<void>;
}

export const DailyPriorityPickerModal: React.FC<DailyPriorityPickerModalProps> = ({
  isOpen,
  readyActions,
  currentPriorityIds,
  onClose,
  onSave,
}) => {
  const [selected, setSelected] = useState<string[]>(currentPriorityIds.slice(0, 3));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        // Replace the last selected with new
        return [...prev.slice(0, 2), id];
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await onSave(selected);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#ff8a4a]/30 bg-gradient-to-b from-[#181c26] to-[#0a0c11] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/20 border border-[#ff8a4a]/30 text-[#ff8a4a]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#fff4ec]">Pick Today's Top Priorities</h2>
              <p className="text-xs text-text-muted">
                Select 1–3 actions that must get done today. These become P1/P2/P3.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Priority Slots Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-200 ${
                selected.length >= slot ? 'bg-[#ff8a4a]' : 'bg-white/[0.08]'
              }`}
            />
          ))}
          <span className="text-xs font-mono text-text-muted ml-1">{selected.length}/3</span>
        </div>

        {/* Selectable Ready Actions */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
          {readyActions.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-8 font-mono">
              No ready actions to pick from. Create next actions first.
            </p>
          ) : (
            readyActions.map((task) => {
              const isSelected = selected.includes(task.id);
              const rank = selected.indexOf(task.id) + 1;
              return (
                <button
                  key={task.id}
                  onClick={() => toggle(task.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#ff6a2a]/15 border-[#ff8a4a]/50 text-[#fff4ec]'
                      : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:border-white/[0.15] hover:text-text-primary'
                  }`}
                >
                  {/* Rank / Toggle */}
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#ff8a4a] border-[#ff8a4a] text-black'
                        : 'border-white/20'
                    }`}
                  >
                    {isSelected ? rank : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {task.next_action_title || task.title}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono">
                      {task.context ? `@${task.context}` : ''}{task.estimated_minutes ? ` • ~${task.estimated_minutes}m` : ''}
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-[#ff8a4a] shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.08] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected([])}
            className="text-xs text-text-muted"
          >
            Clear All
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 font-bold"
            >
              Set Priorities
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
