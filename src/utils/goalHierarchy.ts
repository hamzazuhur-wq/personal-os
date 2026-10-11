import { Goal } from '../types/goal.types';
import { Task } from '../types/task.types';

export interface GoalTreeNode {
  goal: Goal;
  children: GoalTreeNode[];
  tasks: Task[];
  directTaskCount: number;
  totalDescendantTaskCount: number;
  completedTaskCount: number;
}

export interface GoalPathItem {
  id: string;
  title: string;
  level: number;
}

export class GoalHierarchy {
  /**
   * Resolves the full breadcrumb path from the root ancestor down to the specified goal.
   * e.g. [ { id: '1', title: 'Professional' }, { id: '2', title: 'Branding' }, { id: '3', title: 'Positioning' } ]
   */
  static getGoalPath(goalId: string, allGoals: Goal[]): GoalPathItem[] {
    const goalMap = new Map<string, Goal>(allGoals.map((g) => [g.id, g]));
    const path: GoalPathItem[] = [];
    const visited = new Set<string>();

    let current = goalMap.get(goalId);
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift({
        id: current.id,
        title: current.title,
        level: 0,
      });

      if (current.parent_goal_id) {
        current = goalMap.get(current.parent_goal_id);
      } else {
        break;
      }
    }

    // Set 0-based depth levels
    return path.map((item, idx) => ({ ...item, level: idx }));
  }

  /**
   * Formats a goal path into a readable string: "Root Goal → Sub Goal → Deep Goal"
   */
  static formatGoalPath(goalId: string, allGoals: Goal[]): string {
    const path = this.getGoalPath(goalId, allGoals);
    return path.map((p) => p.title).join(' → ');
  }

  /**
   * Returns all recursive descendant IDs for a given goal (not including the goal itself).
   */
  static getDescendantGoalIds(goalId: string, allGoals: Goal[]): string[] {
    const childrenMap = new Map<string, string[]>();
    for (const g of allGoals) {
      if (g.parent_goal_id) {
        const list = childrenMap.get(g.parent_goal_id) || [];
        list.push(g.id);
        childrenMap.set(g.parent_goal_id, list);
      }
    }

    const descendantIds: string[] = [];
    const queue = [...(childrenMap.get(goalId) || [])];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        descendantIds.push(currentId);
        const children = childrenMap.get(currentId) || [];
        queue.push(...children);
      }
    }

    return descendantIds;
  }

  /**
   * Checks if moving targetGoalId under proposedParentId is valid (prevents circular loops & self-parenting).
   */
  static canMoveGoal(
    targetGoalId: string,
    proposedParentId: string | null | undefined,
    allGoals: Goal[]
  ): { valid: boolean; reason?: string } {
    if (!proposedParentId) {
      return { valid: true }; // Moving to root level is always valid
    }

    if (targetGoalId === proposedParentId) {
      return { valid: false, reason: 'A goal cannot be its own parent.' };
    }

    const descendantIds = new Set(this.getDescendantGoalIds(targetGoalId, allGoals));
    if (descendantIds.has(proposedParentId)) {
      return {
        valid: false,
        reason: 'Cannot move a goal under one of its own descendant sub-goals (would cause a circular hierarchy).',
      };
    }

    return { valid: true };
  }

  /**
   * Builds an in-memory recursive tree structure containing both child goals and direct tasks.
   */
  static buildTree(
    allGoals: Goal[],
    allTasks: Task[],
    rootParentId: string | null = null
  ): GoalTreeNode[] {
    const tasksByGoal = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (t.related_goal_id) {
        const list = tasksByGoal.get(t.related_goal_id) || [];
        list.push(t);
        tasksByGoal.set(t.related_goal_id, list);
      }
    }

    const goalsByParent = new Map<string, Goal[]>();
    for (const g of allGoals) {
      const pId = g.parent_goal_id || '__ROOT__';
      const list = goalsByParent.get(pId) || [];
      list.push(g);
      goalsByParent.set(pId, list);
    }

    const buildNode = (goal: Goal): GoalTreeNode => {
      const childGoals = goalsByParent.get(goal.id) || [];
      const childrenNodes = childGoals.map(buildNode);
      const directTasks = tasksByGoal.get(goal.id) || [];

      let totalTasks = directTasks.length;
      let completedTasks = directTasks.filter((t) => t.status === 'completed').length;

      for (const child of childrenNodes) {
        totalTasks += child.totalDescendantTaskCount;
        completedTasks += child.completedTaskCount;
      }

      return {
        goal,
        children: childrenNodes,
        tasks: directTasks,
        directTaskCount: directTasks.length,
        totalDescendantTaskCount: totalTasks,
        completedTaskCount: completedTasks,
      };
    };

    const rootKey = rootParentId || '__ROOT__';
    const rootGoals = goalsByParent.get(rootKey) || [];
    return rootGoals.map(buildNode);
  }
}
