import React, { useState, useCallback } from 'react';
import { useExecution } from '../../hooks/useExecution';
import { ExecutionHeader } from './components/ExecutionHeader';
import { DailyPrioritiesSection } from './components/DailyPrioritiesSection';
import { InProgressSection } from './components/InProgressSection';
import { ReadyActionsSection } from './components/ReadyActionsSection';
import { BlockedWaitingSection } from './components/BlockedWaitingSection';
import { DueAndOverdueSection } from './components/DueAndOverdueSection';
import { CompletedTodaySection } from './components/CompletedTodaySection';
import { ExecutionFiltersBar } from './components/ExecutionFiltersBar';
import { FocusModeModal } from './components/FocusModeModal';
import { QuickNextActionModal } from './forms/QuickNextActionModal';
import { BlockTaskModal } from './forms/BlockTaskModal';
import { WaitingTaskModal } from './forms/WaitingTaskModal';
import { DailyPriorityPickerModal } from './forms/DailyPriorityPickerModal';
import { Task, ExecutionFilter } from '../../types/task.types';
import { Skeleton } from '../../components/ui/Skeleton';

export const ExecutionPage: React.FC = () => {
  const [filter, setFilter] = useState<ExecutionFilter>({});

  const {
    todayData,
    readyActions,
    projects,
    goals,
    projectMap,
    goalMap,
    loading,
    error,
    startTask,
    completeTask,
    blockTask,
    setWaitingTask,
    markReady,
    setDailyPriorities,
    createTask,
  } = useExecution(filter);

  // Modal states
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [showNewActionModal, setShowNewActionModal] = useState(false);
  const [blockTargetTask, setBlockTargetTask] = useState<Task | null>(null);
  const [waitTargetTask, setWaitTargetTask] = useState<Task | null>(null);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  const handleBlock = useCallback((id: string) => {
    const task = todayData
      ? [
          ...todayData.dailyPriorities,
          ...todayData.readyNow,
          ...todayData.inProgress,
          ...todayData.blocked,
          ...todayData.waiting,
          ...todayData.dueToday,
          ...todayData.overdue,
        ].find((t) => t.id === id)
      : null;
    setBlockTargetTask(task || { id } as Task);
  }, [todayData]);

  const handleWait = useCallback((id: string) => {
    const task = todayData
      ? [
          ...todayData.dailyPriorities,
          ...todayData.readyNow,
          ...todayData.inProgress,
          ...todayData.blocked,
          ...todayData.waiting,
          ...todayData.dueToday,
          ...todayData.overdue,
        ].find((t) => t.id === id)
      : null;
    setWaitTargetTask(task || { id } as Task);
  }, [todayData]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-sm text-rose-400 font-mono">{error}</p>
      </div>
    );
  }

  if (!todayData) return null;

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Page Header */}
      <ExecutionHeader
        date={todayData.date}
        readyCount={readyActions.length}
        blockedCount={todayData.blocked.length}
        completedTodayCount={todayData.completedToday.length}
        dailyPrioritiesCount={todayData.dailyPriorities.length}
      />

      {/* Active Work Glow Section (In Progress) */}
      <InProgressSection
        inProgressTasks={todayData.inProgress}
        onStart={startTask}
        onComplete={completeTask}
        onBlock={handleBlock}
        onWait={handleWait}
        onMarkReady={markReady}
        onOpenFocusMode={setFocusTask}
        projectMap={projectMap}
        goalMap={goalMap}
      />

      {/* Overdue / Due Today — surface early */}
      <DueAndOverdueSection
        overdueTasks={todayData.overdue}
        dueTodayTasks={todayData.dueToday}
        onStart={startTask}
        onComplete={completeTask}
        onBlock={handleBlock}
        onWait={handleWait}
        onMarkReady={markReady}
        projectMap={projectMap}
        goalMap={goalMap}
      />

      {/* Daily Priorities */}
      <DailyPrioritiesSection
        priorities={todayData.dailyPriorities}
        onStart={startTask}
        onComplete={completeTask}
        onBlock={handleBlock}
        onWait={handleWait}
        onMarkReady={markReady}
        onOpenFocusMode={setFocusTask}
        onOpenPriorityPicker={() => setShowPriorityPicker(true)}
        projectMap={projectMap}
        goalMap={goalMap}
      />

      {/* Filters Bar */}
      <ExecutionFiltersBar
        filter={filter}
        onFilterChange={setFilter}
        projects={projects}
        goals={goals}
      />

      {/* Ready Now Actions */}
      <ReadyActionsSection
        readyActions={readyActions}
        onStart={startTask}
        onComplete={completeTask}
        onBlock={handleBlock}
        onWait={handleWait}
        onMarkReady={markReady}
        onEdit={() => {}}
        onDelete={() => {}}
        onOpenFocusMode={setFocusTask}
        onOpenNewAction={() => setShowNewActionModal(true)}
        projectMap={projectMap}
        goalMap={goalMap}
      />

      {/* Blocked / Waiting */}
      <BlockedWaitingSection
        blockedTasks={todayData.blocked}
        waitingTasks={todayData.waiting}
        onStart={startTask}
        onComplete={completeTask}
        onBlock={handleBlock}
        onWait={handleWait}
        onMarkReady={markReady}
        projectMap={projectMap}
        goalMap={goalMap}
      />

      {/* Completed Today */}
      <CompletedTodaySection
        completedTasks={todayData.completedToday}
        onMarkReady={markReady}
        projectMap={projectMap}
        goalMap={goalMap}
      />

      {/* === MODALS === */}

      {/* Focus Mode */}
      <FocusModeModal
        task={focusTask}
        isOpen={!!focusTask}
        onClose={() => setFocusTask(null)}
        onStart={startTask}
        onComplete={async (id) => {
          await completeTask(id);
          setFocusTask(null);
        }}
        onBlock={(id) => {
          setFocusTask(null);
          handleBlock(id);
        }}
        onWait={(id) => {
          setFocusTask(null);
          handleWait(id);
        }}
        projectName={focusTask?.related_project_id ? projectMap[focusTask.related_project_id] : undefined}
        goalTitle={focusTask?.related_goal_id ? goalMap[focusTask.related_goal_id] : undefined}
      />

      {/* New Next Action */}
      <QuickNextActionModal
        isOpen={showNewActionModal}
        onClose={() => setShowNewActionModal(false)}
        onSave={async (dto) => { await createTask(dto); }}
        projects={projects}
        goals={goals}
      />

      {/* Block Task */}
      <BlockTaskModal
        isOpen={!!blockTargetTask}
        taskTitle={blockTargetTask?.title}
        onClose={() => setBlockTargetTask(null)}
        onConfirm={async (reason) => {
          if (blockTargetTask) {
            await blockTask(blockTargetTask.id, reason);
            setBlockTargetTask(null);
          }
        }}
      />

      {/* Waiting Task */}
      <WaitingTaskModal
        isOpen={!!waitTargetTask}
        taskTitle={waitTargetTask?.title}
        onClose={() => setWaitTargetTask(null)}
        onConfirm={async (waitingFor, expectedDate) => {
          if (waitTargetTask) {
            await setWaitingTask(waitTargetTask.id, waitingFor, expectedDate);
            setWaitTargetTask(null);
          }
        }}
      />

      {/* Daily Priority Picker */}
      <DailyPriorityPickerModal
        isOpen={showPriorityPicker}
        readyActions={readyActions}
        currentPriorityIds={todayData.dailyPriorities.map((t) => t.id)}
        onClose={() => setShowPriorityPicker(false)}
        onSave={setDailyPriorities}
      />
    </div>
  );
};
