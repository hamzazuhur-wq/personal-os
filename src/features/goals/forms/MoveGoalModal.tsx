import React, { useState } from 'react';
import { Goal } from '../../../types/goal.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { ArrowRightLeft, AlertTriangle } from 'lucide-react';

export interface MoveGoalModalProps {
  goal: Goal | null;
  allGoals: Goal[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (goalId: string, newParentGoalId: string | null) => Promise<void>;
}

export const MoveGoalModal: React.FC<MoveGoalModalProps> = ({
  goal,
  allGoals,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string>('__ROOT__');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !goal) return null;

  // Filter out the goal itself and any of its descendants to prevent circular hierarchy
  const descendantIds = new Set(GoalHierarchy.getDescendantGoalIds(goal.id, allGoals));
  const validParentOptions = [
    { value: '__ROOT__', label: 'Top-Level (Root Goal)' },
    ...allGoals
      .filter((g) => g.id !== goal.id && !descendantIds.has(g.id) && g.status !== 'archived')
      .map((g) => {
        const path = GoalHierarchy.formatGoalPath(g.id, allGoals);
        return {
          value: g.id,
          label: path,
        };
      }),
  ];

  const handleMove = async () => {
    const targetParentId = selectedParentId === '__ROOT__' ? null : selectedParentId;
    const check = GoalHierarchy.canMoveGoal(goal.id, targetParentId, allGoals);
    if (!check.valid) {
      setError(check.reason || 'Invalid goal move.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(goal.id, targetParentId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move Goal in Hierarchy"
      subtitle={`Reposition "${goal.title}" under another goal node or make it a top-level goal.`}
    >
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-text-muted">
            New Parent Goal *
          </label>
          <Select
            value={selectedParentId}
            onChange={setSelectedParentId}
            options={validParentOptions}
          />
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
            onClick={handleMove}
            disabled={isSubmitting}
            className="px-5 font-bold"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Save Location</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
