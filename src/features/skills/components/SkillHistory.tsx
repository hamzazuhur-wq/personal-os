import React from 'react';
import { SkillHistory } from '../../../types/skill.types';
import { getProficiencyMeta } from '../../../constants/skills';
import { History, ArrowRight } from 'lucide-react';

export interface SkillHistoryProps {
  history: SkillHistory[];
}

export const SkillHistoryTimeline: React.FC<SkillHistoryProps> = ({ history }) => {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 sm:p-6 backdrop-blur-2xl space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-[#ff8a4a]" />
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#fff4ec]">
          Proficiency Change History ({history.length})
        </h2>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-text-muted py-3">No proficiency changes recorded yet.</p>
      ) : (
        <div className="relative border-l border-white/[0.1] ml-2.5 pl-4 space-y-4">
          {history.map((record) => {
            const prevMeta = getProficiencyMeta(record.previous_proficiency);
            const newMeta = getProficiencyMeta(record.new_proficiency);

            return (
              <div key={record.id} className="relative space-y-1">
                {/* Timeline Dot */}
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />

                {/* Transition Header */}
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono font-semibold">
                  <span className={prevMeta.textClass}>{prevMeta.label}</span>
                  <ArrowRight className="w-3 h-3 text-text-muted" />
                  <span className={newMeta.textClass}>{newMeta.label}</span>
                  <span className="text-[10px] text-text-muted font-normal ml-auto">
                    {new Date(record.changed_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Reason & Note */}
                {record.reason && (
                  <p className="text-xs text-[#fff4ec] font-medium">
                    {record.reason}
                  </p>
                )}
                {record.note && (
                  <p className="text-xs text-text-secondary">
                    {record.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
