import React from 'react';
import { LifeAreaLevelSummaryData } from '../../../types/level.types';
import { Button } from '../../../components/ui/Button';
import { ArrowRight, CheckCircle2, CircleDashed, Layers } from 'lucide-react';

export interface LifeAreaLevelSummaryProps {
  summary: LifeAreaLevelSummaryData;
  onNavigateToLifeArea: (lifeAreaId: string) => void;
  onNavigateToLevel: (lifeAreaId: string, levelId: string) => void;
}

export const LifeAreaLevelSummary: React.FC<LifeAreaLevelSummaryProps> = ({
  summary,
  onNavigateToLifeArea,
  onNavigateToLevel,
}) => {
  const { lifeAreaId, lifeAreaName, levels, currentLevel, nextLevel, eligibility } = summary;

  const totalLevels = levels.length;
  const completedLevels = levels.filter((l) => l.status === 'completed').length;

  const requiredCount = eligibility?.requiredCount || 0;
  const completedCount = eligibility?.completedRequiredCount || 0;
  const progressPct = requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 0;

  return (
    <article className="group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[rgba(18,22,30,0.65)] via-[rgba(13,16,22,0.75)] to-[rgba(9,11,15,0.85)] p-5 backdrop-blur-2xl transition-all duration-150 hover:border-white/[0.16] hover:shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] flex flex-col justify-between overflow-hidden">
      {/* Bottom ambient luminous glow if active */}
      {currentLevel && (
        <div className="pointer-events-none absolute -bottom-10 left-1/4 right-1/4 h-24 rounded-full bg-gradient-to-t from-[#ff6a2a]/15 to-transparent blur-2xl" />
      )}

      <div>
        {/* Header: Life Area Label & Total Level Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {lifeAreaName}
          </span>
          <span className="text-[11px] font-mono text-text-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            {completedLevels} / {totalLevels} Levels
          </span>
        </div>

        {/* Current Level Status Hero */}
        {currentLevel ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold font-mono text-[#fff4ec] tracking-tight">
                L{currentLevel.display_order < 10 ? `0${currentLevel.display_order}` : currentLevel.display_order}
              </span>
              <h3 className="text-base font-semibold text-[#fff4ec] truncate">
                {currentLevel.name}
              </h3>
            </div>

            {currentLevel.description && (
              <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                {currentLevel.description}
              </p>
            )}

            {/* Requirement Progress Bar */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>Requirements: <strong className="text-[#fff4ec]">{completedCount}</strong>/{requiredCount} completed</span>
                <span className="text-[#ff8a4a] font-semibold">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.04]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff6a2a] via-[#ff8a4a] to-[#ffb27a] transition-all duration-300 shadow-[0_0_8px_rgba(255,106,42,0.4)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Eligibility Banner if Ready */}
            {eligibility?.eligible && (
              <div className="mt-2.5 flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>All required conditions fulfilled — ready to complete</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
              <CircleDashed className="w-4 h-4" />
              <span>No current level designated</span>
            </div>
            {totalLevels > 0 ? (
              <p className="text-xs text-text-secondary">
                {totalLevels} level{totalLevels > 1 ? 's' : ''} defined. Select your active stage to begin tracking advancement.
              </p>
            ) : (
              <p className="text-xs text-text-secondary">
                No development stages defined yet for this area.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Strip */}
      <div className="pt-5 mt-5 border-t border-white/[0.07] flex items-center justify-between gap-3">
        {nextLevel && currentLevel && (
          <span className="text-[11px] font-mono text-text-muted truncate max-w-[150px]">
            Next: <span className="text-text-secondary">L{nextLevel.display_order} {nextLevel.name}</span>
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {currentLevel ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigateToLevel(lifeAreaId, currentLevel.id)}
            >
              <span>View Level</span>
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateToLifeArea(lifeAreaId)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            <span>Progression</span>
          </Button>
        </div>
      </div>
    </article>
  );
};
