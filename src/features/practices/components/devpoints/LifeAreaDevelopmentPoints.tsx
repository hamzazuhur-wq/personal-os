import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import {
  AddDevelopmentPointsModal,
} from './AddDevelopmentPointsModal';
import { useLifeAreaPointSummary } from '../../../../hooks/useDevelopmentPoints';
import type { LifeArea } from '../../../../types/vision.types';

export interface LifeAreaDevelopmentPointsProps {
  lifeArea: LifeArea;
}

/**
 * Module 08 Final — Development Points summary embedded in the Life Area
 * detail page. Life Area is the required top-level scope of every point.
 */
export const LifeAreaDevelopmentPoints: React.FC<LifeAreaDevelopmentPointsProps> = ({
  lifeArea,
}) => {
  const { summary, reload } = useLifeAreaPointSummary(lifeArea.id);
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <>
      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[.18em] text-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#ff8a4a]" />
              Development Points
            </p>
            <p className="mt-2 text-3xl font-semibold font-mono text-[#ffb27a] tabular-nums">
              {summary?.total ?? '…'}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {summary ? `${summary.thisWeek} this week · ${summary.thisMonth} last 30 days` : ''}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsAddOpen(true)}>
            + Add Points
          </Button>
        </div>
      </article>

      <AddDevelopmentPointsModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        context={{ lifeAreaId: lifeArea.id }}
        lifeAreas={[lifeArea]}
        onSaved={() => {
          reload().catch(() => undefined);
        }}
      />
    </>
  );
};
