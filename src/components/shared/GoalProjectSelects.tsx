import React from 'react';
import { Select } from '../ui/Select';
import { Goal } from '../../types/goal.types';
import { Project } from '../../types/project.types';
import { GoalHierarchy } from '../../utils/goalHierarchy';
import { cn } from '../../utils/cn';

export interface GoalProjectSelectsProps {
  goals: Goal[];
  projects: Project[];
  goalId: string;
  projectId: string;
  onGoalChange: (goalId: string) => void;
  onProjectChange: (projectId: string) => void;
  size?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

/**
 * Module 08.2 — Nested Goal / Project relationship selectors.
 *
 * Goals render their FULL hierarchy path ("Root → Sub → Leaf") so nested
 * relationships stay visible and preserved wherever items are linked.
 * Selecting a project automatically inherits its primary goal when no goal
 * has been chosen yet.
 */
export const GoalProjectSelects: React.FC<GoalProjectSelectsProps> = ({
  goals,
  projects,
  goalId,
  projectId,
  onGoalChange,
  onProjectChange,
  size = 'sm',
  showLabels = true,
  className,
}) => {
  const goalOptions = [
    { value: '', label: 'No Goal' },
    ...goals
      .filter((g) => g.status !== 'archived')
      .map((g) => ({
        value: g.id,
        label: GoalHierarchy.formatGoalPath(g.id, goals),
      })),
  ];

  const projectOptions = [
    { value: '', label: 'No Project' },
    ...projects
      .filter((p) => p.status !== 'archived')
      .map((p) => ({
        value: p.id,
        label: p.title,
        subtext: p.primary_goal_id
          ? GoalHierarchy.formatGoalPath(p.primary_goal_id, goals)
          : undefined,
      })),
  ];

  const handleProjectChange = (value: string) => {
    onProjectChange(value);
    if (value && !goalId) {
      const project = projects.find((p) => p.id === value);
      if (project?.primary_goal_id) {
        onGoalChange(project.primary_goal_id);
      }
    }
  };

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3', className)}>
      <div className="space-y-1">
        {showLabels && (
          <label className="text-[11px] font-mono text-text-muted uppercase">Related Goal</label>
        )}
        <Select
          size={size}
          value={goalId}
          onChange={onGoalChange}
          options={goalOptions}
          placeholder="Select nested goal..."
          aria-label="Related Goal"
        />
      </div>

      <div className="space-y-1">
        {showLabels && (
          <label className="text-[11px] font-mono text-text-muted uppercase">Related Project</label>
        )}
        <Select
          size={size}
          value={projectId}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder="Select project..."
          aria-label="Related Project"
        />
      </div>
    </div>
  );
};
