import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Bookmark, ShieldCheck, History, Sliders } from 'lucide-react';
import { AIMemory, AISettings } from '../../../types/ai.types';

export interface AIContextPanelProps {
  memories: AIMemory[];
  settings: AISettings | null;
  onOpenMemoryManager: () => void;
  onOpenAuditLog: () => void;
  onOpenSettings: () => void;
}

export const AIContextPanel: React.FC<AIContextPanelProps> = ({
  memories,
  settings,
  onOpenMemoryManager,
  onOpenAuditLog,
  onOpenSettings,
}) => {
  return (
    <div className="space-y-5 select-none">
      {/* 1. Durable AI Memory Summary */}
      <div className="rounded-3xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-2xl space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#ff8a4a]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
              Durable Memory ({memories.length})
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onOpenMemoryManager} className="h-7 text-xs">
            Manage
          </Button>
        </div>

        {memories.length === 0 ? (
          <p className="text-xs text-text-muted leading-relaxed">
            No durable preferences stored yet. Say &quot;Remember that...&quot; in chat to record persistent constraints.
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {memories.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1"
              >
                <span className="text-[10px] font-mono text-[#ff8a4a] uppercase font-semibold">
                  {m.type}
                </span>
                <p className="text-text-secondary line-clamp-2 leading-relaxed">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Context & Guardrail Safeguards */}
      <div className="rounded-3xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-2xl space-y-3.5 shadow-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
            Active Guardrails
          </h3>
        </div>

        <div className="space-y-2 text-xs text-text-muted">
          <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
            <span>Write Policy</span>
            <span className="text-text-secondary font-mono capitalize">
              {settings?.action_policy.replace(/_/g, ' ') || 'Ask Before Write'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
            <span>Destructive Action</span>
            <span className="text-emerald-400 font-mono">Forbidden (Archive Only)</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>Context Depth</span>
            <span className="text-text-secondary font-mono capitalize">
              {settings?.context_depth || 'Standard'}
            </span>
          </div>
        </div>

        <div className="pt-1 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAuditLog}
            className="w-full h-9 text-xs gap-2 justify-center font-medium"
          >
            <History className="w-4 h-4 text-[#ff8a4a] shrink-0" />
            <span>View Action Audit Log</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="w-full h-9 text-xs gap-2 justify-center text-text-muted hover:text-text-primary font-medium"
          >
            <Sliders className="w-4 h-4 text-[#ff8a4a] shrink-0" />
            <span>Configure AI Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
