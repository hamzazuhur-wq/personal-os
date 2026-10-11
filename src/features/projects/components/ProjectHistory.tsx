import React from 'react';
import { Project } from '../../../types/project.types';
import { formatHumanDate, formatTimeAgo } from '../../../utils/dateUtils';
import { History, ShieldCheck } from 'lucide-react';

export interface ProjectHistoryProps {
  project: Project;
}

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({ project }) => {
  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-[#ff8a4a]" />
        <h3 className="text-sm font-bold text-[#fff4ec] tracking-tight uppercase font-mono">
          System Record & Lifecycle Audit
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-text-muted">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span className="block text-[10px] text-text-muted/60 uppercase">Created</span>
          <span className="text-text-secondary font-medium">
            {formatHumanDate(project.created_at.slice(0, 10))}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span className="block text-[10px] text-text-muted/60 uppercase">Last Updated</span>
          <span className="text-text-secondary font-medium">{formatTimeAgo(project.updated_at)}</span>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <span className="block text-[10px] text-text-muted/60 uppercase">System Status</span>
          <span className="text-[#ff8a4a] font-bold uppercase">{project.status}</span>
        </div>
      </div>

      {project.completed_at && (
        <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25 flex items-center gap-2 text-xs font-mono text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Formally completed on {formatHumanDate(project.completed_at.slice(0, 10))}</span>
        </div>
      )}
    </section>
  );
};
