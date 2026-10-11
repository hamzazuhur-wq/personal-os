import React, { useState } from 'react';
import { useGoals } from '../../hooks/useGoals';
import { useVision } from '../../hooks/useVision';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { StatWidget } from '../../components/shared/StatWidget';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GoalFilters } from './components/GoalFilters';
import { GoalRow } from './components/GoalRow';
import { GoalCard } from './components/GoalCard';
import { GoalHierarchyTree } from './components/GoalHierarchyTree';
import { GoalFormModal } from './forms/GoalFormModal';
import { MoveGoalModal } from './forms/MoveGoalModal';
import { MoveTaskModal } from './forms/MoveTaskModal';
import { QuickNextActionModal } from '../execution/forms/QuickNextActionModal';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { Goal } from '../../types/goal.types';
import { Task } from '../../types/task.types';
import { Target, Plus, List, Grid, GitBranch, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface GoalsPageProps {
  onNavigate: (route: string) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ onNavigate }) => {
  const {
    goals,
    rawGoals,
    loading,
    error,
    filter,
    sortBy,
    stats,
    setFilter,
    setSortBy,
    createGoal,
    updateGoal,
    completeGoal,
    pauseGoal,
    resumeGoal,
    archiveGoal,
    moveGoal,
    refresh,
  } = useGoals();

  const { tasks, createTask, toggleTaskCompletion, updateTask, refreshTasks } = useTasks();
  const { projects } = useProjects();
  const { lifeAreas, vision } = useVision();

  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'tree'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [parentGoalForNew, setParentGoalForNew] = useState<string | undefined>(undefined);

  const [goalToMove, setGoalToMove] = useState<Goal | null>(null);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [preselectedGoalIdForTask, setPreselectedGoalIdForTask] = useState<string | undefined>(undefined);

  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleOpenAdd = (parentId?: string) => {
    setEditingGoal(null);
    setParentGoalForNew(parentId);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setParentGoalForNew(undefined);
    setIsModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!archiveTargetId) return;
    try {
      setIsArchiving(true);
      await archiveGoal(archiveTargetId);
      setArchiveTargetId(null);
    } catch (err) {
      console.error('Failed to archive goal:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  const getLifeArea = (areaId?: string) => {
    if (!areaId) return null;
    return lifeAreas.find((a) => a.id === areaId) || null;
  };

  const getParentGoal = (parentId?: string) => {
    if (!parentId) return null;
    return rawGoals.find((g) => g.id === parentId) || null;
  };

  const getChildCount = (goalId: string) => {
    return rawGoals.filter((g) => g.parent_goal_id === goalId).length;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Editorial Typography */}
      <SectionHeader
        title="Goals & Strategic Objectives"
        subtitle="Translate long-term vision into explicit, time-bound objectives. Keep outcome focus separate from tactical daily actions."
        badge={<Badge variant="orange">{stats.active} Active Outcomes</Badge>}
        action={
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenAdd()}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + Add Goal
          </Button>
        }
      />

      {/* 2. Key Horizon Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatWidget
          label="Active Objectives"
          value={stats.active}
          subtext="In active pursuit"
          icon={Target}
          accentColor="orange"
        />
        <StatWidget
          label="Annual Horizon"
          value={stats.annual}
          subtext="1-Year outcomes"
          icon={Calendar}
          accentColor="purple"
        />
        <StatWidget
          label="Monthly / Tactical"
          value={stats.monthly + stats.weekly}
          subtext="Short-term momentum"
          icon={Calendar}
          accentColor="amber"
        />
        <StatWidget
          label="Achieved & Completed"
          value={stats.completed}
          subtext="Outcomes attained"
          icon={Target}
          accentColor="emerald"
        />
      </div>

      {/* 3. Filter Bar & View Mode Toggle */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.20em] text-text-muted">
            Objectives Matrix ({goals.length})
          </h3>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/[0.08] w-fit self-end sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'list'
                  ? 'bg-white/[0.12] text-[#fff4ec] border border-white/15'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Dense List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px]">List</span>
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'tree'
                  ? 'bg-white/[0.12] text-[#fff4ec] border border-white/15'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Hierarchy Tree View"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="text-[11px]">Hierarchy</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'grid'
                  ? 'bg-white/[0.12] text-[#fff4ec] border border-white/15'
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Cards Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Cards</span>
            </button>
          </div>
        </div>

        <GoalFilters
          filter={filter}
          sortBy={sortBy}
          lifeAreas={lifeAreas}
          stats={stats}
          onFilterChange={setFilter}
          onSortChange={setSortBy}
          onResetFilters={() => setFilter({ status: 'all', life_area_id: 'all', time_horizon: 'all', priority: 'all', searchQuery: '' })}
        />
      </div>

      {/* 4. Goals Content View */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          icon={Target}
          title="Goals system temporarily unavailable"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={filter.searchQuery || filter.status !== 'all' ? 'No matching goals' : 'No strategic goals defined'}
          description={
            filter.searchQuery || filter.status !== 'all'
              ? 'Try modifying your filters or search keywords.'
              : 'Translate your vision into concrete, time-bound objectives. A goal defines a desired outcome rather than an individual daily task.'
          }
          actionLabel="+ Define First Goal"
          onAction={() => handleOpenAdd()}
        />
      ) : viewMode === 'tree' ? (
        <GoalHierarchyTree
          goals={goals}
          tasks={tasks}
          lifeAreas={lifeAreas}
          onSelect={(id) => onNavigate(`/goals/${id}`)}
          onAddSubGoal={(parentId) => handleOpenAdd(parentId)}
          onAddTask={(goalId) => {
            setPreselectedGoalIdForTask(goalId);
            setIsAddTaskModalOpen(true);
          }}
          onMoveGoal={(goal) => setGoalToMove(goal)}
          onEdit={handleOpenEdit}
          onArchive={(id) => setArchiveTargetId(id)}
          onMoveTask={(task) => setTaskToMove(task)}
          onStartTask={async (taskId) => {
            await updateTask(taskId, { status: 'in_progress' });
            await refreshTasks();
          }}
          onCompleteTask={async (taskId) => {
            await toggleTaskCompletion(taskId, false);
            await refreshTasks();
          }}
          onNavigate={onNavigate}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              lifeArea={getLifeArea(goal.life_area_id)}
              parentGoal={getParentGoal(goal.parent_goal_id)}
              childCount={getChildCount(goal.id)}
              onSelect={(id) => onNavigate(`/goals/${id}`)}
              onComplete={completeGoal}
              onPause={pauseGoal}
              onResume={resumeGoal}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              lifeArea={getLifeArea(goal.life_area_id)}
              parentGoal={getParentGoal(goal.parent_goal_id)}
              childCount={getChildCount(goal.id)}
              onSelect={(id) => onNavigate(`/goals/${id}`)}
              onComplete={completeGoal}
              onPause={pauseGoal}
              onResume={resumeGoal}
              onEdit={handleOpenEdit}
              onArchive={(id) => setArchiveTargetId(id)}
            />
          ))}
        </div>
      )}

      {/* Goal Creation/Edit Modal */}
      <GoalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goalToEdit={editingGoal}
        initialParentId={parentGoalForNew}
        allGoals={rawGoals}
        lifeAreas={lifeAreas}
        vision={vision}
        onSave={async (dto) => {
          if (editingGoal) {
            await updateGoal(editingGoal.id, dto);
          } else {
            await createGoal(dto as any);
          }
        }}
      />

      {/* Move Goal Modal (Circular Prevention) */}
      <MoveGoalModal
        goal={goalToMove}
        allGoals={rawGoals}
        isOpen={Boolean(goalToMove)}
        onClose={() => setGoalToMove(null)}
        onConfirm={async (goalId, newParentId) => {
          await moveGoal(goalId, newParentId);
        }}
      />

      {/* Move Task Modal */}
      <MoveTaskModal
        task={taskToMove}
        allGoals={rawGoals}
        isOpen={Boolean(taskToMove)}
        onClose={() => setTaskToMove(null)}
        onConfirm={async (taskId, newGoalId, newProjectId) => {
          await updateTask(taskId, {
            related_goal_id: newGoalId,
            related_project_id: newProjectId,
          });
        }}
      />

      {/* Quick Task Creation Modal with Prefilled Goal */}
      <QuickNextActionModal
        isOpen={isAddTaskModalOpen}
        onClose={() => {
          setIsAddTaskModalOpen(false);
          setPreselectedGoalIdForTask(undefined);
        }}
        preselectedGoalId={preselectedGoalIdForTask}
        projects={projects}
        goals={rawGoals}
        onSave={async (dto) => {
          await createTask(dto);
          await refreshTasks();
        }}
      />

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={Boolean(archiveTargetId)}
        onClose={() => setArchiveTargetId(null)}
        onConfirm={handleConfirmArchive}
        title="Archive Strategic Goal"
        message="Are you sure you want to archive this goal? Archived goals are safely preserved in history and can be reviewed anytime under the Archived filter."
        confirmLabel="Archive Goal"
        isLoading={isArchiving}
      />
    </div>
  );
};
