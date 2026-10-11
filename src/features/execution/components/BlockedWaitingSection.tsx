import React, { useState } from 'react';
import { Task } from '../../../types/task.types';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { ShieldAlert, Clock, AlertOctagon } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface BlockedWaitingSectionProps {
  blockedTasks: Task[];
  waitingTasks: Task[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  onMarkReady: (id: string) => void;
  projectMap: Record<string, string>;
  goalMap: Record<string, string>;
}

export const BlockedWaitingSection: React.FC<BlockedWaitingSectionProps> = ({
  blockedTasks,
  waitingTasks,
  onStart,
  onComplete,
  onBlock,
  onWait,
  onMarkReady,
  projectMap,
  goalMap,
}) => {
  const [activeTab, setActiveTab] = useState<'blocked' | 'waiting'>('blocked');

  if (blockedTasks.length === 0 && waitingTasks.length === 0) return null;

  const currentList = activeTab === 'blocked' ? blockedTasks : waitingTasks;

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-xl space-y-4">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#fff4ec]">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#fff4ec]">
              Friction Management
            </h2>
            <p className="text-xs text-text-secondary">
              Resolve internal blockers or track dependencies waiting on external actors.
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <button
            onClick={() => setActiveTab('blocked')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-colors cursor-pointer',
              activeTab === 'blocked'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Blocked ({blockedTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('waiting')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-colors cursor-pointer',
              activeTab === 'waiting'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Waiting ({waitingTasks.length})</span>
          </button>
        </div>
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
          <p className="text-xs font-mono text-text-muted">
            {activeTab === 'blocked' ? 'No blocked tasks.' : 'No waiting tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((task) => (
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
      )}
    </div>
  );
};
