import React from 'react';
import { EligibilityResult, Level } from '../../../types/level.types';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, Edit3, Lock, Sparkles } from 'lucide-react';

export interface LevelHeroProps {
  level: Level;
  lifeAreaName: string;
  eligibility: EligibilityResult | null;
  onEdit: () => void;
  onConfirmComplete?: () => void;
  onSetCurrent?: () => void;
}

export const LevelHero: React.FC<LevelHeroProps> = ({
  level,
  lifeAreaName,
  eligibility,
  onEdit,
  onConfirmComplete,
  onSetCurrent,
}) => {
  const isCurrent = level.status === 'current';
  const isCompleted = level.status === 'completed';
  const isLocked = level.status === 'locked';

  const requiredCount = eligibility?.requiredCount || 0;
  const completedCount = eligibility?.completedRequiredCount || 0;
  const progressPct = requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[rgba(22,26,35,0.7)] via-[rgba(15,18,25,0.85)] to-[rgba(10,12,17,0.95)] p-6 sm:p-8 backdrop-blur-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
      {/* Upward Luminous Illumination Glow */}
      <div className="pointer-events-none absolute -bottom-16 left-1/3 right-1/3 h-36 rounded-full bg-gradient-to-t from-[#ff6a2a]/20 via-[#ff8a4a]/08 to-transparent blur-3xl" />

      <div className="relative z-10 space-y-6">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a]">
              {lifeAreaName}
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              STAGE DEFINITION
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isCurrent && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#ff6a2a]/15 text-[#fff4ec] border border-[#ff8a4a]/50 shadow-[0_0_12px_rgba(255,106,42,0.25)]">
                <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
                CURRENT ACTIVE STAGE
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                COMPLETED
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-white/[0.04] text-text-muted border border-white/[0.08]">
                <Lock className="w-3.5 h-3.5" />
                FUTURE / LOCKED
              </span>
            )}
          </div>
        </div>

        {/* Level Title & Stage Hierarchy */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-3.5 flex-wrap">
            <span className="text-4xl sm:text-5xl font-extrabold font-mono text-[#fff4ec] tracking-tight">
              L{level.display_order < 10 ? `0${level.display_order}` : level.display_order}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#fff4ec] tracking-tight">
              {level.name}
            </h1>
          </div>

          {level.description && (
            <p className="text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed pt-1">
              {level.description}
            </p>
          )}
        </div>

        {/* Requirements Progress Ribbon */}
        {!isCompleted && !isLocked && (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.07] space-y-2.5 max-w-xl">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>Required Conditions Met: <strong className="text-[#fff4ec]">{completedCount}</strong> of {requiredCount}</span>
              <span className="text-[#ff8a4a] font-semibold">{progressPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff6a2a] via-[#ff8a4a] to-[#ffb27a] transition-all duration-300 shadow-[0_0_10px_rgba(255,106,42,0.4)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Controls Toolbar */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {isCurrent && eligibility?.eligible && onConfirmComplete && (
            <Button
              variant="primary"
              onClick={onConfirmComplete}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              <span>Confirm Level Advancement</span>
            </Button>
          )}

          {!isCurrent && !isCompleted && onSetCurrent && (
            <Button
              variant="accent"
              onClick={onSetCurrent}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              <span>Set as Active Level</span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={onEdit}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            <span>Edit Level</span>
          </Button>
        </div>
      </div>
    </section>
  );
};
