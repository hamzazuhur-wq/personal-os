import React, { useMemo } from 'react';
import { Goal } from '../../../types/goal.types';
import { Task } from '../../../types/task.types';
import { LifeArea } from '../../../types/vision.types';
import { GoalHierarchy } from '../../../utils/goalHierarchy';
import { GoalTreeItem } from './GoalTreeItem';

export interface GoalHierarchyTreeProps {
  goals: Goal[];
  tasks?: Task[];
  lifeAreas?: LifeArea[];
  rootParentId?: string | null;
  onSelect: (id: string) => void;
  onAddSubGoal: (parentId: string) => void;
  onAddTask: (goalId: string) => void;
  onMoveGoal: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onArchive: (id: string) => void;
  onMoveTask?: (task: Task) => void;
  onStartTask?: (id: string) => void;
  onCompleteTask?: (id: string) => void;
  onNavigate?: (route: string) => void;
}

export const GoalHierarchyTree: React.FC<GoalHierarchyTreeProps> = ({
  goals,
  tasks = [],
  rootParentId = null,
  onSelect,
  onAddSubGoal,
  onAddTask,
  onMoveGoal,
  onEdit,
  onArchive,
  onMoveTask = () => {},
  onStartTask = () => {},
  onCompleteTask = () => {},
  onNavigate,
}) => {
  const treeNodes = useMemo(() => {
    return GoalHierarchy.buildTree(goals, tasks, rootParentId);
  }, [goals, tasks, rootParentId]);

  if (treeNodes.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
        <p className="text-xs font-mono text-text-muted">No goals defined in this view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {treeNodes.map((node) => (
        <GoalTreeItem
          key={node.goal.id}
          node={node}
          depth={0}
          onSelectGoal={onSelect}
          onAddSubGoal={onAddSubGoal}
          onAddTask={onAddTask}
          onMoveGoal={onMoveGoal}
          onEditGoal={onEdit}
          onArchiveGoal={onArchive}
          onMoveTask={onMoveTask}
          onStartTask={onStartTask}
          onCompleteTask={onCompleteTask}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
};
