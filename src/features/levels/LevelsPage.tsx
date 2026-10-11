import React, { useState } from 'react';
import { useLevels } from '../../hooks/useLevels';
import { LifeAreaLevelSummary } from './components/LifeAreaLevelSummary';
import { LevelFormModal } from './forms/LevelFormModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Layers, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export interface LevelsPageProps {
  onNavigate: (path: string) => void;
}

export const LevelsPage: React.FC<LevelsPageProps> = ({ onNavigate }) => {
  const { summaries, lifeAreas, levels, loading, error, createLevel } = useLevels();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLifeAreaId, setSelectedLifeAreaId] = useState<string>('all');

  const filteredSummaries = summaries.filter(
    (s) => selectedLifeAreaId === 'all' || s.lifeAreaId === selectedLifeAreaId
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header with Title and Create Stage Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#ff8a4a] uppercase tracking-widest mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Progression Framework</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fff4ec]">
            Development Levels
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Track real-world capability stages per Life Area. A Level represents verified readiness and achievement, not merely elapsed time.
          </p>
        </div>

        {lifeAreas.length > 0 && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            <span>Define Stage</span>
          </Button>
        )}
      </div>

      {/* Life Area Selector Pills Filter (if > 1 life area) */}
      {lifeAreas.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedLifeAreaId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer border ${
              selectedLifeAreaId === 'all'
                ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/50 text-[#fff4ec] shadow-[0_0_12px_rgba(255,106,42,0.2)]'
                : 'bg-black/35 border-white/[0.08] text-text-muted hover:text-text-primary hover:border-white/20'
            }`}
          >
            All Life Areas ({summaries.length})
          </button>
          {lifeAreas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => setSelectedLifeAreaId(area.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
                selectedLifeAreaId === area.id
                  ? 'bg-[#ff6a2a]/20 border-[#ff8a4a]/50 text-[#fff4ec] shadow-[0_0_12px_rgba(255,106,42,0.2)]'
                  : 'bg-black/35 border-white/[0.08] text-text-muted hover:text-text-primary hover:border-white/20'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-2xl bg-white/[0.03]" />
          <Skeleton className="h-64 rounded-2xl bg-white/[0.03]" />
          <Skeleton className="h-64 rounded-2xl bg-white/[0.03]" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : lifeAreas.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Life Areas Defined"
          description="Development Levels require at least one Life Area in your Vision architecture."
          actionLabel="Go to Vision & Life Areas"
          onAction={() => onNavigate('/vision/life-areas')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSummaries.map((summary) => (
            <LifeAreaLevelSummary
              key={summary.lifeAreaId}
              summary={summary}
              onNavigateToLifeArea={(areaId) => onNavigate(`/levels/${areaId}`)}
              onNavigateToLevel={(areaId, levelId) => onNavigate(`/levels/${areaId}/${levelId}`)}
            />
          ))}
        </div>
      )}

      {/* Create Level Modal */}
      <LevelFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        lifeAreas={lifeAreas}
        allLevels={levels}
        onSubmit={async (dto) => {
          await createLevel(dto as any);
        }}
      />
    </div>
  );
};
