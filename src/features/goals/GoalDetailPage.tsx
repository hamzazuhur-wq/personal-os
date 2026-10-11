import React, { useState, useEffect } from 'react';
import { useGoals } from '../../hooks/useGoals';
import { useVision } from '../../hooks/useVision';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { usePractices } from '../../hooks/usePractices';
import { useActivities } from '../../hooks/useActivities';
import { GoalStatusBadge } from './components/GoalStatusBadge';
import { GoalRow } from './components/GoalRow';
import { GoalFormModal } from './forms/GoalFormModal';
import { QuickNextActionModal } from '../execution/forms/QuickNextActionModal';
import { ExecutionTaskRow } from '../execution/components/ExecutionTaskRow';
import { MoveTaskModal } from './forms/MoveTaskModal';
import { BlockTaskModal } from '../execution/forms/BlockTaskModal';
import { WaitingTaskModal } from '../execution/forms/WaitingTaskModal';
import { DailyActivityFormModal } from '../daily-log/DailyActivityFormModal';
import {
  AddDevelopmentPointsModal,
} from '../practices/components/devpoints/AddDevelopmentPointsModal';
import {
  DevelopmentPointsBlock,
} from '../practices/components/devpoints/DevelopmentPointsBlock';
import {
  PointHistoryList,
} from '../practices/components/devpoints/PointHistoryList';
import { pointService } from '../../services/points/pointService';
import type { PointLedgerEvent } from '../../types/practice.types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { GOAL_PRIORITIES, GOAL_TIME_HORIZONS, GOAL_TYPES } from '../../constants/goals';
import { Goal } from '../../types/goal.types';
import { Task } from '../../types/task.types';
import { GoalHierarchy } from '../../utils/goalHierarchy';
import { formatHumanDate, formatTimeAgo, getTodayDateString } from '../../utils/dateUtils';
import {
  Target,
  ArrowLeft,
  Calendar,
  Sparkles,
  Edit3,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  Trash2,
  Plus,
  Clock,
  ExternalLink,
  CheckSquare,
  CalendarPlus,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface GoalDetailPageProps {
  goalId: string;
  onNavigate: (route: string) => void;
}

export const GoalDetailPage: React.FC<GoalDetailPageProps> = ({ goalId, onNavigate }) => {
  const {
    rawGoals,
    getGoalById,
    getChildGoals,
    updateGoal,
    completeGoal,
    pauseGoal,
    resumeGoal,
    archiveGoal,
    deleteGoal,
    createGoal,
  } = useGoals();

  const {
    tasks: allTasks,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    refreshTasks,
  } = useTasks();

  const { projects } = useProjects();
  const { lifeAreas, vision } = useVision();
  const { practices } = usePractices();
  const { createActivity } = useActivities();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [childGoals, setChildGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddSubGoalOpen, setIsAddSubGoalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [blockTargetTaskId, setBlockTargetTaskId] = useState<string | null>(null);
  const [waitTargetTaskId, setWaitTargetTaskId] = useState<string | null>(null);

  // Module 08 Final — Development Points
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isAddPointsOpen, setIsAddPointsOpen] = useState(false);
  const [pointsRefreshKey, setPointsRefreshKey] = useState(0);
  const [goalPointEvents, setGoalPointEvents] = useState<PointLedgerEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    pointService
      .getRecentEvents({ goal_id: goalId }, 6)
      .then((events) => {
        if (!cancelled) setGoalPointEvents(events);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [goalId, pointsRefreshKey]);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const loadGoalDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGoalById(goalId);
      if (!data) {
        setError('Strategic Goal not found.');
        return;
      }
      setGoal(data);
      const children = await getChildGoals(goalId);
      setChildGoals(children);
    } catch (err) {
      console.error('Failed to load goal:', err);
      setError('Could not load goal details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoalDetails();
  }, [goalId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <EmptyState
        icon={Target}
        title="Objective Not Found"
        description={error || 'This strategic goal does not exist or has been removed.'}
        actionLabel="← Back to Goals"
        onAction={() => onNavigate('/goals')}
      />
    );
  }

  // Goal path calculation
  const goalPath = GoalHierarchy.getGoalPath(goal.id, rawGoals);

  // Direct tasks vs Descendant tasks
  const directTasks = allTasks.filter((t) => t.related_goal_id === goal.id);
  const descendantGoalIds = new Set(GoalHierarchy.getDescendantGoalIds(goal.id, rawGoals));
  const descendantTasks = allTasks.filter(
    (t) => t.related_goal_id && descendantGoalIds.has(t.related_goal_id)
  );

  const horizonMeta = GOAL_TIME_HORIZONS.find((h) => h.id === goal.time_horizon) || GOAL_TIME_HORIZONS[1];
  const typeMeta = GOAL_TYPES.find((t) => t.id === goal.goal_type) || GOAL_TYPES[0];
  const priorityMeta = GOAL_PRIORITIES.find((p) => p.id === goal.priority) || GOAL_PRIORITIES[1];

  const lifeArea = goal.life_area_id ? lifeAreas.find((a) => a.id === goal.life_area_id) : null;
  const parentGoal = goal.parent_goal_id ? rawGoals.find((g) => g.id === goal.parent_goal_id) : null;
  const projectMap: Record<string, string> = Object.fromEntries(projects.map((p) => [p.id, p.title]));

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCompleting(true);
      await completeGoal(goal.id, completionNote.trim() || undefined);
      setIsCompleteModalOpen(false);
      await loadGoalDetails();
    } catch (err) {
      console.error('Failed to complete goal:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsProcessingAction(true);
      await archiveGoal(goal.id);
      setShowArchiveConfirm(false);
      onNavigate('/goals');
    } catch (err) {
      console.error('Failed to archive goal:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsProcessingAction(true);
      await deleteGoal(goal.id);
      setShowDeleteConfirm(false);
      onNavigate('/goals');
    } catch (err) {
      console.error('Failed to delete goal:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Breadcrumb & Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Full Ancestor Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted flex-wrap">
          <button
            onClick={() => onNavigate('/goals')}
            className="hover:text-[#ff8a4a] transition-colors cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Goals</span>
          </button>

          {goalPath.map((item, idx) => (
            <React.Fragment key={item.id}>
              <span className="text-white/30">/</span>
              {idx === goalPath.length - 1 ? (
                <span className="text-[#ff8a4a] font-bold truncate max-w-[200px]">{item.title}</span>
              ) : (
                <button
                  onClick={() => onNavigate(`/goals/${item.id}`)}
                  className="hover:text-[#fff4ec] transition-colors truncate max-w-[150px] cursor-pointer"
                >
                  {item.title}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Primary Header Action Buttons: [+ Sub-goal] [+ Task] [Edit] etc. */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddTaskModalOpen(true)}
            className="shadow-[0_0_15px_rgba(255,106,42,0.25)] font-bold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Task</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddSubGoalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>+ Sub-goal</span>
          </Button>

          {/* Module 08 Final — Development Points entry points */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLogActivityOpen(true)}
            leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
          >
            Log Activity
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddPointsOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#ffb27a]" />}
          >
            Add Dev Points
          </Button>

          {goal.status === 'active' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCompleteModalOpen(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Complete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await pauseGoal(goal.id);
                  await loadGoalDetails();
                }}
                leftIcon={<PauseCircle className="w-3.5 h-3.5" />}
              >
                Pause
              </Button>
            </>
          )}

          {goal.status === 'paused' && (
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                await resumeGoal(goal.id);
                await loadGoalDetails();
              }}
              leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
            >
              Resume Goal
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>

          {goal.status !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchiveConfirm(true)}
              leftIcon={<Archive className="w-3.5 h-3.5" />}
            >
              Archive
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-rose-400/80 hover:text-rose-300"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* 2. Dominant Hero Glass Surface */}
      <section className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-[rgba(24,28,38,0.85)] via-[rgba(15,18,25,0.9)] to-[rgba(10,12,17,0.95)] backdrop-blur-[36px] border border-white/[0.1] shadow-[0_32px_80px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.14)]">
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#ff6a2a]/[0.10] via-[#ff6a2a]/[0.03] to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Metadata Chips Strip */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <GoalStatusBadge status={goal.status} size="md" />

            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[#ffb27a] uppercase tracking-wider">
              {horizonMeta.label}
            </span>

            <span className={cn('text-xs font-mono font-semibold px-3 py-1 rounded-lg border uppercase tracking-wider', typeMeta.badgeStyle)}>
              {typeMeta.label}
            </span>

            <span className={cn('text-xs font-mono font-bold px-3 py-1 rounded-lg border uppercase tracking-wider', priorityMeta.badgeStyle)}>
              {priorityMeta.label}
            </span>

            {/* Direct & Descendant Task Summary Counter */}
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-secondary">
              Direct: {directTasks.length} {directTasks.length === 1 ? 'task' : 'tasks'}
              {descendantTasks.length > 0 && ` • ${descendantTasks.length} descendant`}
            </span>
          </div>

          {/* Goal Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#fff4ec] tracking-tight leading-tight max-w-4xl">
            {goal.title}
          </h1>

          {/* Description & Criteria */}
          {goal.description && (
            <div className="p-4 sm:p-5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/[0.07] text-text-secondary text-sm leading-relaxed whitespace-pre-wrap max-w-4xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted block mb-2">
                Outcome Criteria & Context
              </span>
              {goal.description}
            </div>
          )}

          {/* Completion Note (if completed) */}
          {goal.completion_note && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm leading-relaxed max-w-4xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400 block mb-1">
                Completion Record & Reflection
              </span>
              {goal.completion_note}
            </div>
          )}

          {/* Dates Ribbon */}
          <div className="flex items-center gap-6 text-xs font-mono text-text-muted pt-2 flex-wrap border-t border-white/[0.07]">
            {goal.start_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <span>Start: {formatHumanDate(goal.start_date)}</span>
              </div>
            )}

            {goal.target_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#ff8a4a]" />
                <span className="text-[#fff4ec]">Target: {formatHumanDate(goal.target_date)}</span>
              </div>
            )}

            {goal.completed_at && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed: {formatHumanDate(goal.completed_at.slice(0, 10))}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Strategic Alignment Panel */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              Life Area Alignment
            </div>
            {lifeArea ? (
              <div>
                <h4 className="text-sm font-bold text-[#fff4ec]">{lifeArea.name}</h4>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                  {lifeArea.short_direction || 'Core Life Area domain'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted/60 italic py-1">General Life Scope (Unassigned)</p>
            )}
          </div>

          {lifeArea && (
            <button
              onClick={() => onNavigate(`/vision/life-areas/${lifeArea.id}`)}
              className="mt-4 text-xs font-mono text-text-secondary hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View Life Area</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
              Parent Objective
            </div>
            {parentGoal ? (
              <div>
                <h4 className="text-sm font-bold text-[#fff4ec]">{parentGoal.title}</h4>
                <p className="text-xs text-text-secondary mt-1">
                  Horizon: {parentGoal.time_horizon} • Status: {parentGoal.status}
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted/60 italic py-1">Root-Level Objective (No Parent)</p>
            )}
          </div>

          {parentGoal && (
            <button
              onClick={() => onNavigate(`/goals/${parentGoal.id}`)}
              className="mt-4 text-xs font-mono text-text-secondary hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View Parent Goal</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2 flex items-center justify-between">
              <span>Vision Connection</span>
              <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
            </div>
            {goal.vision_id && vision ? (
              <div>
                <h4 className="text-sm font-bold text-[#fff4ec]">Main Vision Statement</h4>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                  {vision.short_statement || vision.long_term_direction}
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted/60 italic py-1">Direct long-term Vision alignment</p>
            )}
          </div>

          <button
            onClick={() => onNavigate('/vision')}
            className="mt-4 text-xs font-mono text-text-secondary hover:text-[#fff4ec] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Vision Overview</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </section>

      {/* 3b. Development Points (Module 08 Final) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DevelopmentPointsBlock
          goalId={goal.id}
          refreshKey={pointsRefreshKey}
          onAddPoints={() => setIsAddPointsOpen(true)}
          title="Development Points"
        />
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-[#fff4ec] tracking-tight mb-3">
            Recent Point Events
          </h3>
          <PointHistoryList
            events={goalPointEvents}
            emptyMessage="No points recorded on this goal yet."
          />
        </div>
      </section>

      {/* 4. Child Goals Section */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.20em] text-[#fff4ec]">
              Sub-Objectives & Milestones ({childGoals.length})
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Child goals nested directly under this objective.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddSubGoalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            + Add Sub-Goal
          </Button>
        </div>

        {childGoals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-black/25 backdrop-blur-xl border border-dashed border-white/[0.08] text-center">
            <p className="text-xs text-text-muted mb-3">
              No sub-goals defined under this objective.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setIsAddSubGoalOpen(true)}>
              + Create Sub-Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {childGoals.map((child) => (
              <GoalRow
                key={child.id}
                goal={child}
                lifeArea={child.life_area_id ? lifeAreas.find((a) => a.id === child.life_area_id) : null}
                parentGoal={goal}
                onSelect={(id) => onNavigate(`/goals/${id}`)}
                onComplete={async (id) => {
                  await completeGoal(id);
                  await loadGoalDetails();
                }}
                onPause={async (id) => {
                  await pauseGoal(id);
                  await loadGoalDetails();
                }}
                onResume={async (id) => {
                  await resumeGoal(id);
                  await loadGoalDetails();
                }}
                onEdit={(g) => {
                  setGoal(g);
                  setIsEditModalOpen(true);
                }}
                onArchive={async (id) => {
                  await archiveGoal(id);
                  await loadGoalDetails();
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Direct Tasks Section (Container Execution) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.20em] text-[#fff4ec] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#ff8a4a]" />
              <span>Direct Tasks ({directTasks.length})</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Tasks directly assigned to this goal node.
              {descendantTasks.length > 0 && ` (${descendantTasks.length} tasks belong to descendant sub-goals)`}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddTaskModalOpen(true)}
            className="shadow-[0_0_15px_rgba(255,106,42,0.25)] font-bold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Task</span>
          </Button>
        </div>

        {directTasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-black/25 backdrop-blur-xl border border-dashed border-white/[0.08] text-center space-y-2">
            <p className="text-xs text-text-muted font-mono">
              No tasks directly assigned to this goal yet.
              {descendantTasks.length > 0 && ` (${descendantTasks.length} tasks in descendant sub-goals)`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddTaskModalOpen(true)}
              className="text-xs text-[#ff8a4a] hover:underline"
            >
              + Define Direct Task
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {directTasks.map((task) => (
              <ExecutionTaskRow
                key={task.id}
                task={task}
                onStart={async (id) => {
                  await updateTask(id, { status: 'in_progress' });
                  await refreshTasks();
                }}
                onComplete={async (id) => {
                  await toggleTaskCompletion(id, task.status === 'completed');
                  await refreshTasks();
                }}
                onBlock={(id) => setBlockTargetTaskId(id)}
                onWait={(id) => setWaitTargetTaskId(id)}
                onMarkReady={async (id) => {
                  await updateTask(id, { status: 'ready', is_next_action: true });
                  await refreshTasks();
                }}
                onEdit={() => {}}
                onDelete={async (id) => {
                  await deleteTask(id);
                  await refreshTasks();
                }}
                projectName={task.related_project_id ? projectMap[task.related_project_id] : undefined}
                goalTitle={goal.title}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. Historical Audit Trail */}
      <section className="p-5 rounded-2xl bg-black/35 backdrop-blur-xl border border-white/[0.06] text-xs font-mono text-text-muted space-y-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center gap-1.5 mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>System Record Audit</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>Created: <span className="text-text-secondary">{formatHumanDate(goal.created_at.slice(0, 10))} ({formatTimeAgo(goal.created_at)})</span></div>
          <div>Last Updated: <span className="text-text-secondary">{formatTimeAgo(goal.updated_at)}</span></div>
          <div>Record ID: <span className="text-text-muted">{goal.id}</span></div>
        </div>
      </section>

      {/* Modals & Dialogs */}
      {/* 1. Quick Next Action Modal with prefilled Goal ID */}
      <QuickNextActionModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        preselectedGoalId={goal.id}
        projects={projects}
        goals={rawGoals}
        onSave={async (dto) => {
          await createTask(dto);
          await refreshTasks();
        }}
      />

      {/* 2. Edit Goal Modal */}
      <GoalFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        goalToEdit={goal}
        allGoals={rawGoals}
        lifeAreas={lifeAreas}
        vision={vision}
        onSave={async (dto) => {
          await updateGoal(goal.id, dto);
          await loadGoalDetails();
        }}
      />

      {/* 3. Add Sub-Goal Modal */}
      <GoalFormModal
        isOpen={isAddSubGoalOpen}
        onClose={() => setIsAddSubGoalOpen(false)}
        initialParentId={goal.id}
        initialLifeAreaId={goal.life_area_id}
        allGoals={rawGoals}
        lifeAreas={lifeAreas}
        vision={vision}
        onSave={async (dto) => {
          await createGoal(dto as any);
          await loadGoalDetails();
        }}
      />

      {/* 4. Move Task Modal */}
      <MoveTaskModal
        task={taskToMove}
        allGoals={rawGoals}
        allProjects={projects}
        isOpen={Boolean(taskToMove)}
        onClose={() => setTaskToMove(null)}
        onConfirm={async (taskId, newGoalId, newProjectId) => {
          await updateTask(taskId, {
            related_goal_id: newGoalId,
            related_project_id: newProjectId,
          });
          await refreshTasks();
        }}
      />

      {/* 5. Block Task Modal */}
      <BlockTaskModal
        isOpen={Boolean(blockTargetTaskId)}
        taskTitle={directTasks.find((t) => t.id === blockTargetTaskId)?.title}
        onClose={() => setBlockTargetTaskId(null)}
        onConfirm={async (reason) => {
          if (blockTargetTaskId) {
            await updateTask(blockTargetTaskId, {
              status: 'blocked',
              blocked_reason: reason,
              blocked_since: new Date().toISOString(),
            });
            setBlockTargetTaskId(null);
            await refreshTasks();
          }
        }}
      />

      {/* 6. Waiting Task Modal */}
      <WaitingTaskModal
        isOpen={Boolean(waitTargetTaskId)}
        taskTitle={directTasks.find((t) => t.id === waitTargetTaskId)?.title}
        onClose={() => setWaitTargetTaskId(null)}
        onConfirm={async (waitingFor, expectedDate) => {
          if (waitTargetTaskId) {
            await updateTask(waitTargetTaskId, {
              status: 'waiting',
              waiting_for: waitingFor,
              waiting_expected_date: expectedDate,
              waiting_since: new Date().toISOString(),
            });
            setWaitTargetTaskId(null);
            await refreshTasks();
          }
        }}
      />

      {/* 7. Mark Complete Modal with Completion Reflection */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Mark Goal as Completed"
        subtitle={`Congratulations on achieving "${goal.title}".`}
        maxWidth="md"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <Textarea
            label="Completion Reflection & Lessons (Optional)"
            placeholder="What key insights, milestones, or habits enabled achieving this outcome?"
            rows={4}
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            autoFocus
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <Button variant="ghost" size="md" onClick={() => setIsCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isCompleting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Complete Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Strategic Objective"
        message="Are you sure you want to archive this goal? It will be safely stored in historical records."
        confirmLabel="Archive Goal"
        isLoading={isProcessingAction}
      />

      {/* 8b. Log Activity prefilled with this goal (Module 08 Final) */}
      <DailyActivityFormModal
        isOpen={isLogActivityOpen}
        onClose={() => setIsLogActivityOpen(false)}
        date={getTodayDateString()}
        goals={rawGoals}
        projects={projects}
        practices={practices}
        lifeAreas={lifeAreas}
        tasks={allTasks}
        initialGoalId={goal.id}
        initialLifeAreaId={goal.life_area_id}
        onSave={async (dto) => {
          const created = await createActivity({
            ...(dto as any),
            related_goal_id: goal.id,
          });
          setPointsRefreshKey((k) => k + 1);
          return created;
        }}
      />

      {/* 8c. Add Development Points attributed to this goal (Module 08 Final) */}
      <AddDevelopmentPointsModal
        isOpen={isAddPointsOpen}
        onClose={() => setIsAddPointsOpen(false)}
        context={{
          lifeAreaId: goal.life_area_id,
          goalId: goal.id,
          sourceType: 'goal',
        }}
        lifeAreas={lifeAreas}
        onSaved={() => setPointsRefreshKey((k) => k + 1)}
      />

      {/* 9. Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Goal Permanently"
        message={`Are you sure you want to delete "${goal.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isProcessingAction}
      />
    </div>
  );
};
