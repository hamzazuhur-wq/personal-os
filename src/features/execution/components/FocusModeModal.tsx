import React from 'react';
import { Task } from '../../../types/task.types';
import { Button } from '../../../components/ui/Button';
import {
  Sparkles,
  X,
  Play,
  CheckCircle2,
  AlertOctagon,
  Clock,
  FolderKanban,
  Target,
} from 'lucide-react';

export interface FocusModeModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  projectName?: string;
  goalTitle?: string;
}

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  task,
  isOpen,
  onClose,
  onStart,
  onComplete,
  onBlock,
  onWait,
  projectName,
  goalTitle,
}) => {
  if (!isOpen || !task) return null;

  const isInProgress = task.status === 'in_progress';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-[#ff8a4a]/40 bg-gradient-to-b from-[#1c2230] via-[#121620] to-[#090b0f] p-6 sm:p-10 shadow-[0_32px_80px_rgba(0,0,0,0.95)] space-y-8">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/20 border border-[#ff8a4a]/40 text-[#ff8a4a]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#ff8a4a] font-bold">
                Focus Mode • Single Unit Execution
              </span>
              <p className="text-xs text-text-muted">Eliminate context switching. Execute this single physical step.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Action Showcase */}
        <div className="p-6 rounded-2xl bg-black/50 border border-white/[0.08] space-y-4 text-center">
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Next Physical Action
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#fff4ec] leading-snug">
            {task.next_action_title || task.title}
          </h2>

          {task.description && (
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Strategic Context Breadcrumbs */}
          <div className="flex items-center justify-center gap-3 pt-2 text-xs font-mono text-text-muted flex-wrap">
            {projectName && (
              <span className="flex items-center gap-1 text-text-secondary bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/[0.06]">
                <FolderKanban className="w-3.5 h-3.5 text-[#ff8a4a]" />
                <span>{projectName}</span>
              </span>
            )}

            {goalTitle && (
              <span className="flex items-center gap-1 text-text-muted bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/[0.06]">
                <Target className="w-3.5 h-3.5" />
                <span>{goalTitle}</span>
              </span>
            )}

            {task.context && (
              <span className="bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/[0.06] text-text-secondary capitalize">
                @{task.context}
              </span>
            )}

            {task.estimated_minutes && (
              <span className="bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/[0.06] text-text-muted">
                ~{task.estimated_minutes} min
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {!isInProgress ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onStart(task.id)}
              className="px-8 gap-2 font-bold shadow-[0_0_25px_rgba(255,106,42,0.35)]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Execution</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                onComplete(task.id);
                onClose();
              }}
              className="px-8 gap-2 font-bold shadow-[0_0_25px_rgba(16,185,129,0.35)] bg-gradient-to-r from-emerald-500 to-emerald-600 text-black border-emerald-400"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Mark Completed</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              onBlock(task.id);
              onClose();
            }}
            className="text-xs text-rose-300 hover:text-rose-200"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400 mr-1.5" />
            <span>Mark Blocked</span>
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              onWait(task.id);
              onClose();
            }}
            className="text-xs text-amber-300 hover:text-amber-200"
          >
            <Clock className="w-4 h-4 text-amber-400 mr-1.5" />
            <span>Set Waiting</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
