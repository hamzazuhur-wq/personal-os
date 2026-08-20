import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { ArrowRight, Plus, Check } from 'lucide-react';
import { TASK_PRIORITIES } from '../../constants/priorities';
import { cn } from '../../utils/cn';

export interface ActiveTasksWidgetProps {
  onNavigateToTasks: () => void;
  onOpenAddTask: () => void;
  onEditTask: (task: any) => void;
}

export const ActiveTasksWidget: React.FC<ActiveTasksWidgetProps> = ({
  onNavigateToTasks,
  onOpenAddTask,
  onEditTask,
}) => {
  const { tasks, loading, toggleTaskCompletion } = useTasks('not_started');

  return (
    <div className="relative h-full rounded-2xl overflow-hidden group">
      {/* Lighter glass tier — visually secondary to TodayActivitySummary */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(16,19,27,0.55)] to-[rgba(10,12,17,0.72)] backdrop-blur-[24px] border border-white/[0.07]" />
      <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {/* Soft warm tint at base */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#ff6a2a]/[0.06] to-transparent pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.4)] group-hover:shadow-[0_16px_44px_rgba(0,0,0,0.45)] transition-shadow duration-300" />

      <div className="relative z-10 p-5 flex flex-col h-full min-h-[260px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.20em] text-text-muted">
            Active Actions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddTask}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08] text-text-muted hover:text-[#fff4ec] hover:bg-[#ff6a2a]/15 hover:border-[#ff8a4a]/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateToTasks}
              className="text-[11px] font-mono text-text-muted hover:text-[#ff8a4a] flex items-center gap-1 transition-colors cursor-pointer"
            >
              All <ArrowRight className="w-3 h-3 inline" />
            </button>
          </div>
        </div>

        {/* Count indicator */}
        <div className="mb-4">
          <span className="text-3xl font-extrabold font-mono text-[#fff4ec] tabular-nums">{tasks.length}</span>
          <span className="text-xs text-text-muted ml-2 font-medium">pending items</span>
        </div>

        {/* Task rows */}
        <div className="space-y-2 flex-1">
          {loading ? (
            <div className="text-xs text-text-muted/50">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="py-4 text-center">
              <div className="text-xs text-text-muted/40 italic">Queue clear.</div>
            </div>
          ) : (
            tasks.slice(0, 4).map((task) => {
              const priorityMeta = TASK_PRIORITIES.find((p) => p.id === (task.priority || 'medium'));
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/25 border border-white/[0.04] hover:border-white/[0.08] transition-colors group/task cursor-pointer"
                  onClick={() => onEditTask(task)}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskCompletion(task.id, false);
                    }}
                    className="w-4.5 h-4.5 rounded-md border border-white/20 bg-black/30 flex items-center justify-center hover:border-[#ff8a4a]/60 hover:shadow-[0_0_8px_rgba(255,106,42,0.2)] transition-all shrink-0 cursor-pointer"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <Check className="w-2.5 h-2.5 text-transparent group-hover/task:text-[#ff8a4a]/30 transition-colors" />
                  </button>

                  <span className="text-xs text-text-primary font-medium truncate flex-1">{task.title}</span>

                  {priorityMeta && (
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider shrink-0', priorityMeta.badgeStyle)}>
                      {priorityMeta.label.slice(0, 3)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
