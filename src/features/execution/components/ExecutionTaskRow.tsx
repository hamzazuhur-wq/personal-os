import React, { useState } from 'react';
import { Task } from '../../../types/task.types';
import { Button } from '../../../components/ui/Button';
import {
  CheckCircle2,
  Play,
  AlertOctagon,
  Clock,
  MoreHorizontal,
  FolderKanban,
  Target,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ExecutionTaskRowProps {
  task: Task;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  onMarkReady: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onOpenFocusMode?: (task: Task) => void;
  projectName?: string;
  goalTitle?: string;
}

export const ExecutionTaskRow: React.FC<ExecutionTaskRowProps> = ({
  task,
  onStart,
  onComplete,
  onBlock,
  onWait,
  onMarkReady,
  onEdit,
  onDelete,
  onOpenFocusMode,
  projectName,
  goalTitle,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';
  const isBlocked = task.status === 'blocked';
  const isWaiting = task.status === 'waiting';
  const isReady = task.status === 'ready';

  return (
    <div
      className={cn(
        'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-150',
        isInProgress
          ? 'bg-[#ff6a2a]/10 border-[#ff8a4a]/40 shadow-[0_0_20px_rgba(255,106,42,0.15)]'
          : isBlocked
          ? 'bg-rose-500/[0.04] border-rose-500/20'
          : isWaiting
          ? 'bg-amber-500/[0.03] border-amber-500/20'
          : isCompleted
          ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
      )}
    >
      {/* Left: Status Check & Action Titles */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Complete Toggle Button */}
        <button
          onClick={() => (isCompleted ? onMarkReady(task.id) : onComplete(task.id))}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer',
            isCompleted
              ? 'bg-emerald-500 border-emerald-400 text-black'
              : 'border-white/20 hover:border-[#ff8a4a] text-transparent hover:text-[#ff8a4a]/40'
          )}
          title={isCompleted ? 'Mark as Not Done' : 'Complete Action'}
        >
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Text Details */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Action Title */}
            <span
              className={cn(
                'text-xs sm:text-sm font-semibold tracking-tight truncate',
                isCompleted
                  ? 'line-through text-text-muted'
                  : isInProgress
                  ? 'text-[#fff4ec] font-bold'
                  : 'text-[#fff4ec]'
              )}
            >
              {task.next_action_title || task.title}
            </span>

            {/* Next Action Specific Pill */}
            {task.is_next_action && !task.next_action_title && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#ff6a2a]/20 text-[#ff8a4a] border border-[#ff8a4a]/30 font-bold">
                Next Action
              </span>
            )}

            {/* Priority Indicator */}
            {task.priority && task.priority !== 'medium' && (
              <span
                className={cn(
                  'text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold',
                  task.priority === 'urgent'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : task.priority === 'high'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/[0.04] text-text-muted'
                )}
              >
                {task.priority}
              </span>
            )}

            {/* Daily Priority Pill */}
            {task.daily_priority_order && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ff8a4a] text-[#090b0e] font-black">
                P{task.daily_priority_order}
              </span>
            )}
          </div>

          {/* Context & Relationship Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted flex-wrap">
            {projectName && (
              <span className="flex items-center gap-1 text-text-secondary truncate max-w-[160px]">
                <FolderKanban className="w-3 h-3 text-[#ff8a4a] shrink-0" />
                <span className="truncate">{projectName}</span>
              </span>
            )}

            {goalTitle && (
              <span className="hidden sm:flex items-center gap-1 text-text-muted truncate max-w-[140px]">
                <Target className="w-3 h-3 shrink-0" />
                <span className="truncate">{goalTitle}</span>
              </span>
            )}

            {task.context && (
              <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-text-secondary capitalize">
                @{task.context}
              </span>
            )}

            {task.estimated_minutes && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                <span>~{task.estimated_minutes}m</span>
              </span>
            )}

            {task.due_date && (
              <span
                className={cn(
                  'text-[10px]',
                  task.due_date < new Date().toISOString().slice(0, 10) && !isCompleted
                    ? 'text-rose-400 font-bold'
                    : 'text-text-muted'
                )}
              >
                Due: {task.due_date}
              </span>
            )}
          </div>

          {/* Friction Explanations */}
          {isBlocked && task.blocked_reason && (
            <p className="text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
              Blocked: {task.blocked_reason}
            </p>
          )}

          {isWaiting && task.waiting_for && (
            <p className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
              Waiting for: {task.waiting_for} {task.waiting_expected_date && `(by ${task.waiting_expected_date})`}
            </p>
          )}
        </div>
      </div>

      {/* Right: Operational Actions & Menu */}
      <div className="flex items-center gap-1.5 sm:self-center shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
        {/* Quick Action Button */}
        {isInProgress ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onComplete(task.id)}
            className="h-8 px-3 text-xs gap-1.5 font-bold shadow-[0_0_15px_rgba(255,106,42,0.3)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete</span>
          </Button>
        ) : isReady ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStart(task.id)}
            className="h-8 px-3 text-xs gap-1.5 hover:border-[#ff8a4a]/50 text-text-primary"
          >
            <Play className="w-3 h-3 text-[#ff8a4a] fill-current" />
            <span>Start</span>
          </Button>
        ) : isBlocked ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkReady(task.id)}
            className="h-8 px-2.5 text-xs text-rose-300 hover:text-rose-200"
          >
            Unblock
          </Button>
        ) : isWaiting ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkReady(task.id)}
            className="h-8 px-2.5 text-xs text-amber-300 hover:text-amber-200"
          >
            Resume
          </Button>
        ) : null}

        {/* Focus Mode Trigger */}
        {onOpenFocusMode && !isCompleted && (
          <button
            onClick={() => onOpenFocusMode(task)}
            className="p-2 rounded-xl text-text-muted hover:text-[#ff8a4a] hover:bg-white/[0.04] transition-colors"
            title="Open Focus Mode"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-white/[0.1] bg-[#12151d] p-1.5 shadow-2xl z-50 text-xs font-mono space-y-0.5">
                {!isInProgress && (
                  <button
                    onClick={() => {
                      onStart(task.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05]"
                  >
                    <Play className="w-3.5 h-3.5 text-[#ff8a4a]" />
                    <span>Start Work</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onBlock(task.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-rose-300 hover:bg-white/[0.05]"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>Mark Blocked</span>
                </button>

                <button
                  onClick={() => {
                    onWait(task.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-amber-300 hover:bg-white/[0.05]"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set Waiting</span>
                </button>

                <div className="h-[1px] bg-white/[0.06] my-1" />

                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(task);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-[#fff4ec] hover:bg-white/[0.05]"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-text-muted" />
                    <span>Edit Task</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(task.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
