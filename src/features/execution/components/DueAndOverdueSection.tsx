import React from 'react';
import { Task } from '../../../types/task.types';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { Calendar, AlertTriangle } from 'lucide-react';

export interface DueAndOverdueSectionProps {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  onMarkReady: (id: string) => void;
  projectMap: Record<string, string>;
  goalMap: Record<string, string>;
}

export const DueAndOverdueSection: React.FC<DueAndOverdueSectionProps> = ({
  overdueTasks,
  dueTodayTasks,
  onStart,
  onComplete,
  onBlock,
  onWait,
  onMarkReady,
  projectMap,
  goalMap,
}) => {
  if (overdueTasks.length === 0 && dueTodayTasks.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl border border-rose-500/30 bg-rose-500/[0.04] backdrop-blur-2xl shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
              Overdue Items ({overdueTasks.length})
            </h2>
          </div>
          <div className="space-y-2">
            {overdueTasks.map((task) => (
              <ExecutionTaskRow
                key={task.id}
                task={task}
                onStart={onStart}
                onComplete={onComplete}
                onBlock={onBlock}
                onWait={onWait}
                onMarkReady={onMarkReady}
                projectName={task.related_project_id ? projectMap[task.related_project_id] : undefined}
                goalTitle={task.related_goal_id ? goalMap[task.related_goal_id] : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Today Section */}
      {dueTodayTasks.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#ff8a4a]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#fff4ec]">
              Due Today ({dueTodayTasks.length})
            </h2>
          </div>
          <div className="space-y-2">
            {dueTodayTasks.map((task) => (
              <ExecutionTaskRow
                key={task.id}
                task={task}
                onStart={onStart}
                onComplete={onComplete}
                onBlock={onBlock}
                onWait={onWait}
                onMarkReady={onMarkReady}
                projectName={task.related_project_id ? projectMap[task.related_project_id] : undefined}
                goalTitle={task.related_goal_id ? goalMap[task.related_goal_id] : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
