import React, { useState } from 'react';
import { LiveClock } from '../../components/shared/LiveClock';
import { DashboardFocusCard } from './DashboardFocusCard';
import { TodayActivitySummary } from './TodayActivitySummary';
import { ActiveTasksWidget } from './ActiveTasksWidget';
import { RecentCapturesWidget } from './RecentCapturesWidget';
import { IdeaComposerModal } from '../idea-capture/IdeaComposerModal';
import { DailyActivityFormModal } from '../daily-log/DailyActivityFormModal';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { useActivities } from '../../hooks/useActivities';
import { useTasks } from '../../hooks/useTasks';
import { useGoals } from '../../hooks/useGoals';
import { useProjects } from '../../hooks/useProjects';
import { usePractices } from '../../hooks/usePractices';
import { useVision } from '../../hooks/useVision';
import { getTodayDateString } from '../../utils/dateUtils';
import { Task } from '../../types/task.types';
import { Lightbulb, Activity, CalendarDays } from 'lucide-react';

export interface DashboardPageProps {
  onNavigate: (routeId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const today = getTodayDateString();
  const { createActivity, refreshActivities } = useActivities();
  const { createTask, updateTask, refreshTasks } = useTasks();
  const { rawGoals: goals } = useGoals();
  const { projects } = useProjects();
  const { practices } = usePractices();
  const { lifeAreas } = useVision();

  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleOpenAddTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-0">

      {/* ─── SECTION 1: Identity bar — Live Clock + Action Strip ───────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <LiveClock />

        {/* Quick-action strip: compact glass buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PRIMARY: + Idea Capture — glowing orange pill */}
          <button
            onClick={() => setIsCaptureOpen(true)}
            data-testid="home-idea-capture-button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a] text-[#0a0c10] text-sm font-bold shadow-[0_4px_20px_rgba(255,106,42,0.40)] hover:shadow-[0_6px_30px_rgba(255,106,42,0.6)] transition-all cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Idea Capture</span>
          </button>

          {/* PRIMARY: + Add Task — reuses the existing Task form */}
          <button
            onClick={handleOpenAddTask}
            data-testid="home-add-task-button"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-text-secondary text-sm font-medium hover:text-[#fff4ec] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Add Task</span>
          </button>

          {/* SECONDARY: Log Activity */}
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-text-secondary text-sm font-medium hover:text-[#fff4ec] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Activity</span>
          </button>

          {/* SECONDARY: View Week */}
          <button
            onClick={() => onNavigate('weekly-review')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-text-secondary text-sm font-medium hover:text-[#fff4ec] hover:bg-white/[0.1] hover:border-white/[0.18] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Week</span>
          </button>
        </div>
      </div>

      {/* ─── SECTION 2: Dominant hero — Strategic Focus ────────────────────────── */}
      <div className="mb-6">
        <DashboardFocusCard onNavigateToWeekly={() => onNavigate('weekly-review')} />
      </div>

      {/* ─── SECTION 3: Core Execution Diptych — 2-column at lg ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* Today's Output — wider column (3/5) */}
        <div className="lg:col-span-3">
          <TodayActivitySummary
            onNavigateToDaily={() => onNavigate('daily-log')}
            onOpenAddActivity={() => setIsActivityModalOpen(true)}
          />
        </div>

        {/* Active Tasks — narrower column (2/5) */}
        <div className="lg:col-span-2">
          <ActiveTasksWidget
            onNavigateToTasks={() => onNavigate('tasks')}
            onOpenAddTask={handleOpenAddTask}
            onEditTask={handleOpenEditTask}
          />
        </div>
      </div>

      {/* ─── SECTION 4: Idea stream — full width, lighter glass ────────────── */}
      <div className="mb-2">
        <RecentCapturesWidget
          onNavigateToCaptures={() => onNavigate('/ideas')}
          onOpenIdea={(id) => onNavigate(`/ideas/${id}`)}
        />
      </div>

      {/* ─── IDEA COMPOSER OVERLAY (the single composer, modal shell) ────────── */}
      <IdeaComposerModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        goals={goals}
        projects={projects}
      />

      {/* ─── MODALS ─────────────────────────────────────────────────────────────── */}
      <DailyActivityFormModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        date={today}
        goals={goals}
        projects={projects}
        practices={practices}
        lifeAreas={lifeAreas}
        onSave={async (dto) => {
          const created = await createActivity(dto as any);
          refreshActivities();
          return created;
        }}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={editingTask}
        practices={practices}
        onSave={async (dto) => {
          if (editingTask) {
            await updateTask(editingTask.id, dto);
          } else {
            await createTask(dto as any);
          }
          refreshTasks();
        }}
      />
    </div>
  );
};
