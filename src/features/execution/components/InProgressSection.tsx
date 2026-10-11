import React from 'react';
import { Task } from '../../../types/task.types';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { Flame } from 'lucide-react';

export interface InProgressSectionProps {
  inProgressTasks: Task[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  onMarkReady: (id: string) => void;
  onOpenFocusMode: (task: Task) => void;
  projectMap: Record<string, string>;
  goalMap: Record<string, string>;
}

export const InProgressSection: React.FC<InProgressSectionProps> = ({
  inProgressTasks,
  onStart,
  onComplete,
  onBlock,
  onWait,
  onMarkReady,
  onOpenFocusMode,
  projectMap,
  goalMap,
}) => {
  if (inProgressTasks.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-[#ff8a4a]/40 bg-gradient-to-r from-[#ff6a2a]/15 via-black/50 to-black/60 backdrop-blur-2xl shadow-[0_0_30px_rgba(255,106,42,0.15)] space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-[#ff6a2a]/20 text-[#ff8a4a]">
          <Flame className="w-4 h-4 fill-current animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#fff4ec]">
            Currently Active ({inProgressTasks.length})
          </h2>
          <p className="text-xs text-text-secondary">Work is actively underway on these items.</p>
        </div>
      </div>

      <div className="space-y-2">
        {inProgressTasks.map((task) => (
          <ExecutionTaskRow
            key={task.id}
            task={task}
            onStart={onStart}
            onComplete={onComplete}
            onBlock={onBlock}
            onWait={onWait}
            onMarkReady={onMarkReady}
            onOpenFocusMode={onOpenFocusMode}
            projectName={task.related_project_id ? projectMap[task.related_project_id] : undefined}
            goalTitle={task.related_goal_id ? goalMap[task.related_goal_id] : undefined}
          />
        ))}
      </div>
    </div>
  );
};
