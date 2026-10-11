import React, { useState } from 'react';
import { useSkills } from '../../hooks/useSkills';
import { useVision } from '../../hooks/useVision';
import { SkillFilters } from './components/SkillFilters';
import { SkillMatrix } from './components/SkillMatrix';
import { SkillFormModal } from './forms/SkillFormModal';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { BrainCircuit, Plus } from 'lucide-react';
import { CreateSkillDTO } from '../../types/skill.types';

export interface SkillsPageProps {
  onNavigate: (route: string) => void;
}

export const SkillsPage: React.FC<SkillsPageProps> = ({ onNavigate }) => {
  const {
    skills,
    rawSkills,
    loading,
    error,
    filter,
    setFilter,
    createSkill,
  } = useSkills();

  const { lifeAreas, loading: visionLoading } = useVision();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateSkill = async (dto: CreateSkillDTO) => {
    await createSkill(dto);
  };

  const isInitialLoading = loading && rawSkills.length === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#fff4ec] tracking-tight">
              Skill Matrix
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl">
            A structured system for defining, tracking, developing, and reviewing real-world capabilities across your Life Areas.
          </p>
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 shrink-0 shadow-[0_4px_20px_rgba(255,106,42,0.25)]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Skill</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <SkillFilters
        filter={filter}
        lifeAreas={lifeAreas}
        onFilterChange={setFilter}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {isInitialLoading || visionLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl bg-white/[0.03]" />
          <Skeleton className="h-28 w-full rounded-2xl bg-white/[0.03]" />
          <Skeleton className="h-28 w-full rounded-2xl bg-white/[0.03]" />
        </div>
      ) : (
        <SkillMatrix
          skills={skills}
          lifeAreas={lifeAreas}
          onSkillClick={(id) => onNavigate(`/skills/${id}`)}
          onCreateSkill={() => setIsCreateModalOpen(true)}
        />
      )}

      {/* Create Modal */}
      <SkillFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSkill}
        lifeAreas={lifeAreas}
      />
    </div>
  );
};
