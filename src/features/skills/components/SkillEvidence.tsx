import React from 'react';
import { SkillEvidence } from '../../../types/skill.types';
import { Button } from '../../../components/ui/Button';
import { Sparkles, Plus, Trash2, FileText, CheckCircle, Activity as ActivityIcon, Bookmark } from 'lucide-react';

export interface SkillEvidenceProps {
  evidence: SkillEvidence[];
  onAddEvidence: () => void;
  onRemoveEvidence: (id: string) => void;
}

const typeIconMap = {
  project: Bookmark,
  goal: CheckCircle,
  activity: ActivityIcon,
  document: FileText,
  note: FileText,
  manual: Sparkles,
};

export const SkillEvidenceList: React.FC<SkillEvidenceProps> = ({
  evidence,
  onAddEvidence,
  onRemoveEvidence,
}) => {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 sm:p-6 backdrop-blur-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ff8a4a]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
            Demonstrated Evidence ({evidence.length})
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddEvidence} className="h-7 text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Evidence</span>
        </Button>
      </div>

      {evidence.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-xs space-y-1">
          <p>No evidence recorded yet.</p>
          <p className="text-[11px] text-text-muted/60">
            Log projects, deliverables, milestones, or notes proving this skill has been applied.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {evidence.map((item) => {
            const Icon = typeIconMap[item.type] || Sparkles;
            return (
              <div
                key={item.id}
                className="group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-white/[0.04] text-[#ff8a4a] shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-[#fff4ec] truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-text-muted uppercase">
                        {item.type}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <span className="text-[10px] font-mono text-text-muted block">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveEvidence(item.id)}
                  className="p-1.5 text-text-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Delete evidence"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
