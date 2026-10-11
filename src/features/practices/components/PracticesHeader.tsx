import React from 'react';
import { PracticeMetrics } from '../../../types/practice.types';
import { LifeArea } from '../../../types/vision.types';
import { Skill } from '../../../types/skill.types';
import { Award, Zap, Calendar, TrendingUp } from 'lucide-react';

export interface PracticesHeaderProps {
  metrics: PracticeMetrics | null;
  lifeAreas: LifeArea[];
  skills: Skill[];
  onOpenCreateModal: () => void;
}

export const PracticesHeader: React.FC<PracticesHeaderProps> = ({
  metrics,
  lifeAreas,
  skills,
  onOpenCreateModal,
}) => {
  const areaMap = Object.fromEntries(lifeAreas.map((a) => [a.id, a.name]));
  const skillMap = Object.fromEntries(skills.map((s) => [s.id, s.name]));

  const topAreaEntries = Object.entries(metrics?.pointsByLifeArea || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topSkillEntries = Object.entries(metrics?.pointsBySkill || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1c2230] via-[#121620] to-[#0a0c10] border border-white/[0.1] shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/40 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a] bg-[#ff6a2a]/15 px-2.5 py-0.5 rounded-lg border border-[#ff8a4a]/30">
                Module 08 • Practice & Evidence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#fff4ec] tracking-tight">
              Development Practices & Point Ledger
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              Record repeated development behaviors as auditable, structured evidence that fuels Goals, Skills, and Level progression.
            </p>
          </div>

          {/* Quick Action */}
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#ff6a2a] to-[#ff8a4a] text-black font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,106,42,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            + New Practice
          </button>
        </div>

        {/* Factual Metric Counters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#ff8a4a]" />
              <span>Total Points</span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-[#fff4ec] font-mono mt-1">
              {metrics?.totalPointsEarned ?? 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>This Week</span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono mt-1">
              +{metrics?.pointsThisWeek ?? 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>This Month</span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-blue-300 font-mono mt-1">
              +{metrics?.pointsThisMonth ?? 0}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completions</span>
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono mt-1">
              {metrics?.totalCompletions ?? 0}
            </p>
          </div>
        </div>

        {/* Factual Life Area & Skill Attribution Chips */}
        {(topAreaEntries.length > 0 || topSkillEntries.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap mt-4 text-xs font-mono text-text-muted">
            <span className="text-[10px] uppercase text-text-muted/80">Active Areas:</span>
            {topAreaEntries.map(([areaId, pts]) => (
              <span
                key={areaId}
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-secondary text-[11px]"
              >
                {areaMap[areaId] || 'Area'}: <strong className="text-[#fff4ec]">+{pts} pts</strong>
              </span>
            ))}

            {topSkillEntries.length > 0 && (
              <>
                <span className="text-white/20 mx-1">•</span>
                <span className="text-[10px] uppercase text-text-muted/80">Skills:</span>
                {topSkillEntries.map(([skillId, pts]) => (
                  <span
                    key={skillId}
                    className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#ffb27a] text-[11px]"
                  >
                    {skillMap[skillId] || 'Skill'}: <strong>+{pts}</strong>
                  </span>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
