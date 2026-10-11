import React, { useState } from 'react';
import { Task } from '../../../types/task.types';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export interface CompletedTodaySectionProps {
  completedTasks: Task[];
  onMarkReady: (id: string) => void;
  projectMap: Record<string, string>;
  goalMap: Record<string, string>;
}

export const CompletedTodaySection: React.FC<CompletedTodaySectionProps> = ({
  completedTasks,
  onMarkReady,
  projectMap,
  goalMap,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (completedTasks.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-3xl border border-white/[0.06] bg-black/20 backdrop-blur-xl shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-emerald-400 transition-colors cursor-pointer select-none"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold uppercase tracking-wider">
            Completed Today ({completedTasks.length})
          </span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <span className="text-[11px] font-mono text-text-muted">
          Permanent chronological record
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
          {completedTasks.map((task) => (
            <ExecutionTaskRow
              key={task.id}
              task={task}
              onStart={() => {}}
              onComplete={() => {}}
              onBlock={() => {}}
              onWait={() => {}}
              onMarkReady={onMarkReady}
              projectName={task.related_project_id ? projectMap[task.related_project_id] : undefined}
              goalTitle={task.related_goal_id ? goalMap[task.related_goal_id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
