import React, { useState } from 'react';
import { Task } from '../../../types/task.types';
import { Goal } from '../../../types/goal.types';
import { Project } from '../../../types/project.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { ArrowRightLeft } from 'lucide-react';

export interface MoveTaskModalProps {
  task: Task | null;
  allGoals: Goal[];
  allProjects?: Project[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string, newGoalId?: string, newProjectId?: string) => Promise<void>;
}

export const MoveTaskModal: React.FC<MoveTaskModalProps> = ({
  task,
  allGoals,
  allProjects = [],
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>(task?.related_goal_id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(task?.related_project_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const goalOptions = [
    { value: '', label: 'None (Standalone Action)' },
    ...allGoals
      .filter((g) => g.status !== 'archived')
      .map((g) => ({
        value: g.id,
        label: GoalHierarchy.formatGoalPath(g.id, allGoals),
      })),
  ];

  const projectOptions = [
    { value: '', label: 'None (No Project)' },
    ...allProjects
      .filter((p) => p.status !== 'archived')
      .map((p) => ({
        value: p.id,
        label: p.title,
      })),
  ];

  const handleMove = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(task.id, selectedGoalId || undefined, selectedProjectId || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move Task"
      subtitle={`Reassign "${task.next_action_title || task.title}" to a different goal or project.`}
    >
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-text-muted">Target Goal Node</label>
          <Select
            value={selectedGoalId}
            onChange={setSelectedGoalId}
            options={goalOptions}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-text-muted">Target Project (Optional)</label>
          <Select
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            options={projectOptions}
          />
        </div>

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
            <span>Update Location</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
