import React from 'react';
import { Task } from '../../../types/task.types';
import { ExecutionTaskRow } from './ExecutionTaskRow';
import { Target, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface DailyPrioritiesSectionProps {
  priorities: Task[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onBlock: (id: string) => void;
  onWait: (id: string) => void;
  onMarkReady: (id: string) => void;
  onOpenFocusMode: (task: Task) => void;
  onOpenPriorityPicker: () => void;
  projectMap: Record<string, string>;
  goalMap: Record<string, string>;
}

export const DailyPrioritiesSection: React.FC<DailyPrioritiesSectionProps> = ({
  priorities,
  onStart,
  onComplete,
  onBlock,
  onWait,
  onMarkReady,
  onOpenFocusMode,
  onOpenPriorityPicker,
  projectMap,
  goalMap,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-[#ff8a4a]/25 bg-gradient-to-br from-[#ff6a2a]/[0.08] via-black/40 to-black/60 backdrop-blur-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ff6a2a]/20 border border-[#ff8a4a]/40 text-[#ff8a4a]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#fff4ec]">
              Top Daily Priorities (1–3)
            </h2>
            <p className="text-xs text-text-secondary">
              High-leverage physical actions selected for deliberate execution today.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenPriorityPicker}
          className="h-8 px-3 text-xs gap-1.5 font-mono text-text-secondary hover:text-[#fff4ec]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
          <span>{priorities.length === 0 ? 'Select Top Priorities' : 'Change Priorities'}</span>
        </Button>
      </div>

      {priorities.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01] space-y-2">
          <p className="text-xs text-text-muted font-mono">
            No primary priorities selected for today yet.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenPriorityPicker}
            className="text-xs text-[#ff8a4a] hover:underline"
          >
            + Pick 1–3 priorities from Ready Actions
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {priorities.map((task) => (
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
      )}
    </div>
  );
};
