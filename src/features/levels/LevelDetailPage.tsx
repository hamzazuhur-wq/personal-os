import React, { useState } from 'react';
import { useLevelDetail } from '../../hooks/useLevelDetail';
import { useLevels } from '../../hooks/useLevels';
import { LevelHero } from './components/LevelHero';
import { LevelProgressionStrip } from './components/LevelProgressionStrip';
import { LevelRequirements } from './components/LevelRequirements';
import { LevelSkills } from './components/LevelSkills';
import { LevelMilestones } from './components/LevelMilestones';
import { LevelLinkedGoals } from './components/LevelLinkedGoals';
import { LevelHistoryList } from './components/LevelHistory';
import { ProgressionExceptionPanel } from './components/ProgressionExceptionPanel';

import { LevelFormModal } from './forms/LevelFormModal';
import { RequirementFormModal } from './forms/RequirementFormModal';
import { MilestoneFormModal } from './forms/MilestoneFormModal';
import { EvidenceFormModal } from './forms/EvidenceFormModal';
import { ProgressionExceptionFormModal } from './forms/ProgressionExceptionFormModal';
import { ConfirmLevelCompletionModal } from './forms/ConfirmLevelCompletionModal';

import { Skeleton } from '../../components/ui/Skeleton';
import { ChevronRight } from 'lucide-react';
import { LevelRequirement } from '../../types/level.types';

export interface LevelDetailPageProps {
  lifeAreaId: string;
  levelId: string;
  onNavigate: (path: string) => void;
}

export const LevelDetailPage: React.FC<LevelDetailPageProps> = ({
  lifeAreaId,
  levelId,
  onNavigate,
}) => {
  const {
    level,
    requirements,
    skills,
    milestones,
    evidenceMap,
    history,
    exceptions,
    eligibility,
    linkedGoals,
    allGoals,
    loading,
    error,
    createRequirement,
    updateRequirement,
    completeRequirement,
    reopenRequirement,
    waiverRequirement,
    archiveRequirement,
    createSkill,
    deleteSkill,
    createMilestone,
    completeMilestone,
    reopenMilestone,
    createEvidence,
    createProgressionException,
    confirmLevelCompletion,
  } = useLevelDetail(levelId);

  const { levels, lifeAreas, updateLevel, archiveLevel, setCurrentLevel } = useLevels();

  // Modals state
  const [isEditLevelModalOpen, setIsEditLevelModalOpen] = useState(false);
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<LevelRequirement | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedRequirementForEvidence, setSelectedRequirementForEvidence] = useState<LevelRequirement | null>(null);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  const lifeArea = lifeAreas.find((la) => la.id === lifeAreaId);
  const areaLevels = levels
    .filter((l) => l.life_area_id === lifeAreaId && l.status !== 'archived')
    .sort((a, b) => a.display_order - b.display_order);

  const nextLevel = areaLevels.find((l) => l.display_order === (level?.display_order || 0) + 1) || null;

  // Locked stage read-only policy (Decision 1)
  const isLocked = level?.status === 'locked';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48 rounded-xl bg-white/[0.04]" />
        <Skeleton className="h-64 rounded-3xl bg-white/[0.03]" />
        <Skeleton className="h-96 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  if (error || !level) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center space-y-3">
        <p className="text-sm">{error || 'Level not found.'}</p>
        <button
          type="button"
          onClick={() => onNavigate(`/levels/${lifeAreaId}`)}
          className="text-xs font-mono text-[#ff8a4a] hover:underline"
        >
          Return to Life Area
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center gap-2 text-xs font-mono text-text-muted flex-wrap">
        <button
          type="button"
          onClick={() => onNavigate('/levels')}
          className="hover:text-[#fff4ec] transition-colors cursor-pointer"
        >
          Development Levels
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button
          type="button"
          onClick={() => onNavigate(`/levels/${lifeAreaId}`)}
          className="hover:text-[#fff4ec] transition-colors cursor-pointer"
        >
          {lifeArea?.name || 'Life Area'}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#ff8a4a] font-semibold truncate">
          L{level.display_order}: {level.name}
        </span>
      </nav>

      {/* Progression Strip Quick Navigation */}
      <div className="p-3.5 rounded-2xl bg-black/35 border border-white/[0.08] backdrop-blur-xl">
        <LevelProgressionStrip
          levels={areaLevels}
          activeLevelId={level.id}
          onSelectLevel={(id) => onNavigate(`/levels/${lifeAreaId}/${id}`)}
        />
      </div>

      {/* Dominant Hero Glass Panel */}
      <LevelHero
        level={level}
        lifeAreaName={lifeArea?.name || 'Life Area'}
        eligibility={eligibility}
        onEdit={() => setIsEditLevelModalOpen(true)}
        onConfirmComplete={() => setIsCompletionModalOpen(true)}
        onSetCurrent={async () => {
          await setCurrentLevel(lifeAreaId, level.id);
        }}
      />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Requirements Stream */}
        <div className="lg:col-span-2 space-y-8">
          <LevelRequirements
            requirements={requirements}
            evidenceMap={evidenceMap}
            allGoals={allGoals}
            onToggleComplete={async (id, currentStatus) => {
              if (currentStatus === 'completed') {
                await reopenRequirement(id);
              } else {
                await completeRequirement(id);
              }
            }}
            onSelectRequirement={(req) => {
              setSelectedRequirementForEvidence(req);
              setIsEvidenceModalOpen(true);
            }}
            onAddRequirement={() => {
              setEditingRequirement(null);
              setIsRequirementModalOpen(true);
            }}
            isReadonly={isLocked}
          />

          {/* Historical Advancement Audit */}
          <LevelHistoryList history={history} />

          {/* Progression Exceptions Panel */}
          <ProgressionExceptionPanel
            exceptions={exceptions}
            onAddException={() => setIsExceptionModalOpen(true)}
            isReadonly={isLocked}
          />
        </div>

        {/* Right 1 Col: Supporting Context (Skills, Milestones, Linked Goals) */}
        <div className="space-y-6">
          <LevelSkills
            skills={skills}
            onAddSkill={async (name) => {
              await createSkill({ level_id: level.id, name, status: 'active' });
            }}
            onDeleteSkill={async (id) => {
              await deleteSkill(id);
            }}
            isReadonly={isLocked}
          />

          <LevelMilestones
            milestones={milestones}
            onToggleMilestone={async (id, currentStatus) => {
              if (currentStatus === 'completed') {
                await reopenMilestone(id);
              } else {
                await completeMilestone(id);
              }
            }}
            onAddMilestone={() => setIsMilestoneModalOpen(true)}
            isReadonly={isLocked}
          />

          <LevelLinkedGoals
            goals={linkedGoals}
            onNavigateToGoal={(goalId) => onNavigate(`/goals/${goalId}`)}
          />
        </div>
      </div>

      {/* Modals */}
      {/* 1. Edit Level Modal */}
      <LevelFormModal
        isOpen={isEditLevelModalOpen}
        onClose={() => setIsEditLevelModalOpen(false)}
        levelToEdit={level}
        lifeAreas={lifeAreas}
        allLevels={levels}
        onSubmit={async (dto) => {
          await updateLevel(level.id, dto);
        }}
        onArchive={async (id) => {
          await archiveLevel(id);
          onNavigate(`/levels/${lifeAreaId}`);
        }}
      />

      {/* 2. Requirement Create/Edit Modal */}
      <RequirementFormModal
        isOpen={isRequirementModalOpen}
        onClose={() => {
          setIsRequirementModalOpen(false);
          setEditingRequirement(null);
        }}
        requirementToEdit={editingRequirement}
        levelId={level.id}
        allGoals={allGoals}
        onSubmit={async (dto) => {
          if (editingRequirement) {
            await updateRequirement(editingRequirement.id, dto);
          } else {
            await createRequirement(dto as any);
          }
        }}
        onArchive={async (id) => {
          await archiveRequirement(id);
        }}
        onWaiver={async (id) => {
          await waiverRequirement(id);
        }}
      />

      {/* 3. Milestone Modal */}
      <MilestoneFormModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        levelId={level.id}
        onSubmit={async (dto) => {
          await createMilestone(dto);
        }}
      />

      {/* 4. Evidence Modal */}
      {selectedRequirementForEvidence && (
        <EvidenceFormModal
          isOpen={isEvidenceModalOpen}
          onClose={() => {
            setIsEvidenceModalOpen(false);
            setSelectedRequirementForEvidence(null);
          }}
          requirementId={selectedRequirementForEvidence.id}
          requirementTitle={selectedRequirementForEvidence.title}
          onSubmit={async (dto) => {
            await createEvidence(dto);
          }}
        />
      )}

      {/* 5. Progression Exception Modal */}
      <ProgressionExceptionFormModal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        lifeAreaId={lifeAreaId}
        levelId={level.id}
        onSubmit={async (dto) => {
          await createProgressionException(dto);
        }}
      />

      {/* 6. Confirm Advancement Modal */}
      <ConfirmLevelCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        level={level}
        nextLevel={nextLevel}
        onConfirm={async (note) => {
          await confirmLevelCompletion(note);
        }}
      />
    </div>
  );
};
