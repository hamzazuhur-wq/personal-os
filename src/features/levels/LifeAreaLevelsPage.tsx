import React, { useState, useMemo } from 'react';
import { useLevels } from '../../hooks/useLevels';
import { LevelProgressionStrip } from './components/LevelProgressionStrip';
import { LevelFormModal } from './forms/LevelFormModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ChevronRight, Layers, Plus, Sparkles, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LifeAreaLevelsPageProps {
  lifeAreaId: string;
  onNavigate: (path: string) => void;
}

export const LifeAreaLevelsPage: React.FC<LifeAreaLevelsPageProps> = ({
  lifeAreaId,
  onNavigate,
}) => {
  const { levels, lifeAreas, loading, error, createLevel, setCurrentLevel } = useLevels();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const lifeArea = lifeAreas.find((la) => la.id === lifeAreaId);
  const areaLevels = useMemo(() => {
    return levels
      .filter((l) => l.life_area_id === lifeAreaId && l.status !== 'archived')
      .sort((a, b) => a.display_order - b.display_order);
  }, [levels, lifeAreaId]);

  const currentLevel = areaLevels.find((l) => l.status === 'current') || null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-mono text-text-muted">
        <button
          type="button"
          onClick={() => onNavigate('/levels')}
          className="hover:text-[#fff4ec] transition-colors cursor-pointer"
        >
          Development Levels
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#ff8a4a] font-semibold">{lifeArea?.name || 'Life Area'}</span>
      </nav>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#ff8a4a] uppercase tracking-widest mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Progression Arc</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fff4ec]">
            {lifeArea?.name || 'Life Area'} Stages
          </h2>
          {lifeArea?.short_direction && (
            <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
              {lifeArea.short_direction}
            </p>
          )}
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          <span>Define Stage</span>
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 rounded-2xl bg-white/[0.03]" />
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : areaLevels.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Stages Defined for this Life Area"
          description="Build the developmental progression framework for this area from foundational habits to master competence."
          actionLabel="Define Level 1"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* Progression Strip Horizontal Scroll */}
          <div className="p-4 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-3">
              Stages Progression Strip ({areaLevels.length} Total)
            </div>
            <LevelProgressionStrip
              levels={areaLevels}
              activeLevelId={currentLevel?.id}
              onSelectLevel={(lvlId) => onNavigate(`/levels/${lifeAreaId}/${lvlId}`)}
            />
          </div>

          {/* Current Active Stage Dominant Glass Card */}
          {currentLevel ? (
            <section className="relative overflow-hidden rounded-3xl border border-[#ff8a4a]/40 bg-gradient-to-b from-[rgba(25,29,38,0.85)] via-[rgba(16,19,26,0.9)] to-[rgba(10,12,17,0.95)] p-6 sm:p-8 backdrop-blur-3xl shadow-[0_20px_50px_-15px_rgba(255,106,42,0.2)] space-y-4">
              <div className="pointer-events-none absolute -bottom-10 right-1/4 h-32 w-1/2 rounded-full bg-[#ff6a2a]/15 blur-3xl" />

              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#ff6a2a]/20 text-[#fff4ec] border border-[#ff8a4a]/50">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff8a4a]" />
                  CURRENT ACTIVE STAGE
                </span>
                <span className="text-xs font-mono text-text-muted">
                  Stage L{currentLevel.display_order}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl sm:text-3xl font-bold text-[#fff4ec]">
                  {currentLevel.name}
                </h3>
                {currentLevel.description && (
                  <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
                    {currentLevel.description}
                  </p>
                )}
              </div>

              <div className="pt-3">
                <Button
                  variant="primary"
                  onClick={() => onNavigate(`/levels/${lifeAreaId}/${currentLevel.id}`)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  <span>Open Stage Workspace</span>
                </Button>
              </div>
            </section>
          ) : (
            <div className="p-6 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-xs text-text-secondary space-y-3">
              <div className="flex items-center gap-2 font-mono text-amber-300 font-bold uppercase">
                <ShieldAlert className="w-4 h-4" />
                <span>No Current Active Stage Designated</span>
              </div>
              <p>
                Select which stage currently reflects your verified baseline to activate requirements tracking.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {areaLevels.map((lvl) => (
                  <Button
                    key={lvl.id}
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await setCurrentLevel(lifeAreaId, lvl.id);
                    }}
                  >
                    <span>Set L{lvl.display_order}: {lvl.name} as Active</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* All Stages Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-text-muted">
              All Defined Stages ({areaLevels.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areaLevels.map((lvl) => {
                const isCurrent = lvl.status === 'current';
                const isCompleted = lvl.status === 'completed';
                const isLocked = lvl.status === 'locked';

                return (
                  <div
                    key={lvl.id}
                    onClick={() => onNavigate(`/levels/${lifeAreaId}/${lvl.id}`)}
                    className={cn(
                      'p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between',
                      isCurrent
                        ? 'bg-gradient-to-b from-[#ff6a2a]/15 to-transparent border-[#ff8a4a]/50 shadow-[0_4px_20px_-5px_rgba(255,106,42,0.2)]'
                        : isCompleted
                        ? 'bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40'
                        : isLocked
                        ? 'bg-black/25 border-white/[0.05] opacity-75 hover:opacity-100 hover:border-white/20'
                        : 'bg-black/35 border-white/[0.08] hover:border-white/20'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-text-muted">
                          L{lvl.display_order < 10 ? `0${lvl.display_order}` : lvl.display_order}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> COMPLETED
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-[#ff8a4a] font-bold uppercase">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-semibold text-[#fff4ec] group-hover:text-[#ff8a4a] transition-colors">
                        {lvl.name}
                      </h4>

                      {lvl.description && (
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                          {lvl.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-text-muted">
                      <span>View Stage Requirements</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-[#fff4ec] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Level Modal */}
      <LevelFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialLifeAreaId={lifeAreaId}
        lifeAreas={lifeAreas}
        allLevels={levels}
        onSubmit={async (dto) => {
          await createLevel(dto as any);
        }}
      />
    </div>
  );
};
