import React, { useState } from 'react';
import { Goal } from '../../../types/goal.types';
import { Task } from '../../../types/task.types';
import { GoalTreeNode } from '../../../utils/goalHierarchy';
import {
  ChevronRight,
  ChevronDown,
  Target,
  CheckCircle2,
  Play,
  Plus,
  MoreHorizontal,
  ArrowRightLeft,
  Edit2,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface GoalTreeItemProps {
  node: GoalTreeNode;
  depth?: number;
  onSelectGoal: (id: string) => void;
  onAddSubGoal: (parentId: string) => void;
  onAddTask: (goalId: string) => void;
  onMoveGoal: (goal: Goal) => void;
  onEditGoal: (goal: Goal) => void;
  onArchiveGoal: (id: string) => void;
  onMoveTask: (task: Task) => void;
  onStartTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onNavigate?: (route: string) => void;
}

export const GoalTreeItem: React.FC<GoalTreeItemProps> = ({
  node,
  depth = 0,
  onSelectGoal,
  onAddSubGoal,
  onAddTask,
  onMoveGoal,
  onEditGoal,
  onArchiveGoal,
  onMoveTask,
  onStartTask,
  onCompleteTask,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2);
  const [showGoalMenu, setShowGoalMenu] = useState<boolean>(false);
  const [activeTaskMenuId, setActiveTaskMenuId] = useState<string | null>(null);

  const { goal, children, tasks, totalDescendantTaskCount, completedTaskCount } = node;
  const hasChildren = children.length > 0 || tasks.length > 0;
  const isCompleted = goal.status === 'completed';

  const indentPx = Math.min(depth * 20, 160);

  return (
    <div className="select-none transition-all duration-150">
      {/* ─── GOAL NODE ROW ───────────────────────────────────── */}
      <div
        className={cn(
          'group relative flex items-center justify-between gap-2 p-2.5 rounded-2xl border transition-all duration-150',
          isCompleted
            ? 'bg-white/[0.01] border-white/[0.04] opacity-70'
            : depth === 0
            ? 'bg-gradient-to-r from-white/[0.04] to-transparent border-white/[0.09] hover:border-white/20'
            : 'bg-white/[0.02] border-white/[0.05] hover:border-white/15'
        )}
        style={{ marginLeft: `${indentPx}px` }}
      >
        {/* Left: Expand Toggle + Goal Icon + Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-transform"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#ff8a4a]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-5.5" />
          )}

          <div
            onClick={() => onSelectGoal(goal.id)}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
          >
            <div
              className={cn(
                'p-1.5 rounded-lg border shrink-0',
                isCompleted
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#ff6a2a]/15 border-[#ff8a4a]/30 text-[#ff8a4a]'
              )}
            >
              <Target className="w-3.5 h-3.5" />
            </div>

            <span
              className={cn(
                'text-xs sm:text-sm font-semibold truncate',
                isCompleted ? 'line-through text-text-muted' : 'text-[#fff4ec]'
              )}
            >
              {goal.title}
            </span>

            {/* Factual Aggregate Counters */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted shrink-0">
              {children.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06]">
                  {children.length} sub-goal{children.length > 1 ? 's' : ''}
                </span>
              )}

              {totalDescendantTaskCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-text-secondary">
                  {completedTaskCount}/{totalDescendantTaskCount} tasks
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Compact Node Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Add Sub-goal Quick Action */}
          <button
            onClick={() => onAddSubGoal(goal.id)}
            className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.06] border border-transparent hover:border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
            title="Add Sub-goal"
          >
            <Plus className="w-3 h-3 text-[#ff8a4a]" />
            <span className="hidden sm:inline">Sub-goal</span>
          </button>

          {/* Add Task Quick Action */}
          <button
            onClick={() => onAddTask(goal.id)}
            className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold text-text-muted hover:text-[#fff4ec] hover:bg-white/[0.06] border border-transparent hover:border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
            title="Add Task under this Goal"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Task</span>
          </button>

          {/* Goal Overflow Menu */}
          <div className="relative">
            <button
              onClick={() => setShowGoalMenu((prev) => !prev)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showGoalMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowGoalMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-white/[0.1] bg-[#12151d] p-1.5 shadow-2xl z-50 text-xs font-mono space-y-0.5 animate-in fade-in duration-100">
                  <button
                    onClick={() => {
                      onSelectGoal(goal.id);
                      setShowGoalMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#ff8a4a]" />
                    <span>Open Detail</span>
                  </button>

                  <button
                    onClick={() => {
                      onMoveGoal(goal);
                      setShowGoalMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05]"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                    <span>Move Goal</span>
                  </button>

                  <button
                    onClick={() => {
                      onEditGoal(goal);
                      setShowGoalMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05]"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-text-muted" />
                    <span>Edit Goal</span>
                  </button>

                  <div className="h-[1px] bg-white/[0.06] my-1" />

                  <button
                    onClick={() => {
                      onArchiveGoal(goal.id);
                      setShowGoalMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Goal</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── EXPANDED CHILDREN (MIXED GOALS + TASKS) ─────────── */}
      {isExpanded && (
        <div className="mt-1.5 space-y-1.5 transition-all duration-150 ease-out">
          {/* Direct Tasks Under This Goal */}
          {tasks.map((task) => {
            const isTaskDone = task.status === 'completed';
            const isTaskActive = task.status === 'in_progress';
            const isMenuOpen = activeTaskMenuId === task.id;

            return (
              <div
                key={task.id}
                className={cn(
                  'group/task flex items-center justify-between gap-2 p-2 rounded-xl border transition-all duration-150',
                  isTaskDone
                    ? 'bg-white/[0.01] border-white/[0.03] opacity-60'
                    : isTaskActive
                    ? 'bg-[#ff6a2a]/10 border-[#ff8a4a]/30'
                    : 'bg-white/[0.015] border-white/[0.04] hover:border-white/10'
                )}
                style={{ marginLeft: `${indentPx + 24}px` }}
              >
                {/* Complete Toggle + Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => (isTaskDone ? onStartTask(task.id) : onCompleteTask(task.id))}
                    className={cn(
                      'w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer',
                      isTaskDone
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-white/20 hover:border-[#ff8a4a]'
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                  </button>

                  <span
                    className={cn(
                      'text-xs truncate font-medium',
                      isTaskDone ? 'line-through text-text-muted' : 'text-text-primary'
                    )}
                  >
                    {task.next_action_title || task.title}
                  </span>

                  {task.is_next_action && !task.next_action_title && (
                    <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-[#ff6a2a]/20 text-[#ff8a4a] border border-[#ff8a4a]/30 font-bold">
                      Next Action
                    </span>
                  )}

                  {task.priority && task.priority !== 'medium' && (
                    <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-white/[0.04] text-text-muted">
                      {task.priority}
                    </span>
                  )}
                </div>

                {/* Task Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/task:opacity-100 transition-opacity">
                  {!isTaskDone && (
                    <button
                      onClick={() => onStartTask(task.id)}
                      className="p-1 rounded text-text-muted hover:text-[#ff8a4a] hover:bg-white/[0.04]"
                      title="Start Task"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}

                  {/* Task Overflow */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveTaskMenuId(isMenuOpen ? null : task.id)}
                      className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveTaskMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-white/[0.1] bg-[#12151d] p-1 shadow-2xl z-50 text-xs font-mono space-y-0.5">
                          <button
                            onClick={() => {
                              onMoveTask(task);
                              setActiveTaskMenuId(null);
                            }}
                            className="flex items-center gap-2 w-full px-2 py-1 rounded text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05]"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-blue-400" />
                            <span>Move Task</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Child Goals Recursively */}
          {children.map((childNode) => (
            <GoalTreeItem
              key={childNode.goal.id}
              node={childNode}
              depth={depth + 1}
              onSelectGoal={onSelectGoal}
              onAddSubGoal={onAddSubGoal}
              onAddTask={onAddTask}
              onMoveGoal={onMoveGoal}
              onEditGoal={onEditGoal}
              onArchiveGoal={onArchiveGoal}
              onMoveTask={onMoveTask}
              onStartTask={onStartTask}
              onCompleteTask={onCompleteTask}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
