import React from 'react';
import { Task } from '../../../types/task.types';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { Zap, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface ReadyActionsSectionProps {
  readyActions: Task[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  onMarkReady: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenFocusMode: (task: Task) => void;
  onOpenNewAction: () => void;
  projectMap: Record<string, string>;
  goalMap: Record<string, string>;
}

export const ReadyActionsSection: React.FC<ReadyActionsSectionProps> = ({
  readyActions,
  onStart,
  onComplete,
  onBlock,
  onWait,
  onMarkReady,
  onEdit,
  onDelete,
  onOpenFocusMode,
  onOpenNewAction,
  projectMap,
  goalMap,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ff6a2a]/15 border border-[#ff8a4a]/30 text-[#ff8a4a]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#fff4ec]">
              Ready Now ({readyActions.length})
            </h2>
            <p className="text-xs text-text-secondary">
              Immediately executable actions with all dependencies cleared.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenNewAction}
          className="h-8 px-3 text-xs gap-1.5 font-semibold shadow-[0_0_15px_rgba(255,106,42,0.2)]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Next Action</span>
        </Button>
      </div>

      {readyActions.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01] space-y-2">
          <p className="text-xs font-mono text-text-muted">Nothing ready right now.</p>
          <p className="text-[11px] text-text-muted/70 max-w-sm mx-auto">
            Check Blocked or Waiting sections, or create a concrete Next Action for an active project.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenNewAction}
            className="text-xs text-[#ff8a4a] hover:underline pt-1"
          >
            + Define a Next Action
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {readyActions.map((task) => (
            <ExecutionTaskRow
              key={task.id}
              task={task}
              onStart={onStart}
              onComplete={onComplete}
              onBlock={onBlock}
              onWait={onWait}
              onMarkReady={onMarkReady}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpenFocusMode={onOpenFocusMode}
              projectName={task.related_project_id ? projectMap[task.related_project_id] : undefined}
              goalTitle={task.related_goal_id ? goalMap[task.related_goal_id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
