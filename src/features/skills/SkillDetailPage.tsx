import React, { useState } from 'react';
import { useSkillDetail } from '../../hooks/useSkillDetail';
import { useVision } from '../../hooks/useVision';
import { useGoals } from '../../hooks/useGoals';
import { useProjects } from '../../hooks/useProjects';
import { SkillHero } from './components/SkillHero';
import { SkillRelationships } from './components/SkillRelationships';
import { SkillEvidenceList } from './components/SkillEvidence';
import { SkillHistoryTimeline } from './components/SkillHistory';
import { SkillFormModal } from './forms/SkillFormModal';
import { SkillProficiencyModal } from './forms/SkillProficiencyModal';
import { SkillEvidenceFormModal } from './forms/SkillEvidenceFormModal';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft, X } from 'lucide-react';
import { CreateSkillDTO, CreateSkillEvidenceDTO, SkillProficiency } from '../../types/skill.types';

export interface SkillDetailPageProps {
  skillId: string;
  onNavigate: (route: string) => void;
}

export const SkillDetailPage: React.FC<SkillDetailPageProps> = ({
  skillId,
  onNavigate,
}) => {
  const {
    skill,
    lifeArea,
    evidence,
    history,
    linkedGoals,
    linkedLevels,
    linkedProjects,
    allLevels,
    loading,
    error,
    updateSkill,
    updateProficiency,
    archiveSkill,
    addEvidence,
    removeEvidence,
    linkGoal,
    unlinkGoal,
    linkLevel,
    unlinkLevel,
    linkProject,
    unlinkProject,
  } = useSkillDetail(skillId);

  const { lifeAreas } = useVision();
  const { goals: allGoals } = useGoals();
  const { projects: allProjects } = useProjects();

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProficiencyModalOpen, setIsProficiencyModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  // Link pickers state
  const [isLinkGoalOpen, setIsLinkGoalOpen] = useState(false);
  const [isLinkLevelOpen, setIsLinkLevelOpen] = useState(false);
  const [isLinkProjectOpen, setIsLinkProjectOpen] = useState(false);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        <Skeleton className="h-60 w-full rounded-3xl bg-white/[0.04]" />
        <Skeleton className="h-40 w-full rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-4">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 max-w-md mx-auto text-xs">
          {error || 'Skill not found.'}
        </div>
        <Button variant="ghost" size="md" onClick={() => onNavigate('/skills')}>
          Back to Skill Matrix
        </Button>
      </div>
    );
  }

  const handleEditSubmit = async (dto: CreateSkillDTO) => {
    await updateSkill(dto);
  };

  const handleProficiencySubmit = async (
    newProf: SkillProficiency,
    reason?: string,
    note?: string
  ) => {
    await updateProficiency(newProf, reason, note);
  };

  const handleEvidenceSubmit = async (dto: CreateSkillEvidenceDTO) => {
    await addEvidence(dto);
  };

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this skill? It will be hidden from the active matrix.')) {
      await archiveSkill();
      onNavigate('/skills');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('/skills')}
          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 text-xs font-mono select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Skill Matrix</span>
        </button>
        <span className="text-text-muted text-xs">/</span>
        <span className="text-xs font-mono text-text-secondary truncate">{skill.name}</span>
      </div>

      {/* Dominant Glass Hero */}
      <SkillHero
        skill={skill}
        lifeArea={lifeArea}
        onEdit={() => setIsEditModalOpen(true)}
        onUpdateProficiency={() => setIsProficiencyModalOpen(true)}
        onArchive={handleArchive}
      />

      {/* Two Column Layout: Left (Relationships + Evidence) / Right (Proficiency History) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Relationships & Demonstrated Evidence */}
        <div className="lg:col-span-2 space-y-8">
          <SkillRelationships
            linkedGoals={linkedGoals}
            linkedLevels={linkedLevels}
            linkedProjects={linkedProjects}
            onNavigate={onNavigate}
            onLinkGoal={() => setIsLinkGoalOpen(true)}
            onUnlinkGoal={unlinkGoal}
            onLinkLevel={() => setIsLinkLevelOpen(true)}
            onUnlinkLevel={unlinkLevel}
            onLinkProject={() => setIsLinkProjectOpen(true)}
            onUnlinkProject={unlinkProject}
          />

          <SkillEvidenceList
            evidence={evidence}
            onAddEvidence={() => setIsEvidenceModalOpen(true)}
            onRemoveEvidence={removeEvidence}
          />
        </div>

        {/* Right 1 Col: Proficiency Change History Audit */}
        <div className="space-y-6">
          <SkillHistoryTimeline history={history} />
        </div>
      </div>

      {/* Modals */}
      <SkillFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialSkill={skill}
        lifeAreas={lifeAreas}
      />

      <SkillProficiencyModal
        isOpen={isProficiencyModalOpen}
        onClose={() => setIsProficiencyModalOpen(false)}
        skill={skill}
        onSubmit={handleProficiencySubmit}
      />

      <SkillEvidenceFormModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        skillId={skill.id}
        onSubmit={handleEvidenceSubmit}
      />

      {/* Simple Link Picker Modals */}
      {/* 1. Link Goal Picker */}
      {isLinkGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#12151d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fff4ec]">Link Strategic Goal</h3>
              <button onClick={() => setIsLinkGoalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {allGoals
                .filter((g) => !linkedGoals.some((lg) => lg.id === g.id))
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={async () => {
                      await linkGoal(g.id);
                      setIsLinkGoalOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-[#ff6a2a]/10 hover:border-[#ff8a4a]/30 border border-white/[0.06] transition-colors"
                  >
                    <span className="text-xs font-semibold text-[#fff4ec] block">{g.title}</span>
                    <span className="text-[10px] font-mono text-text-muted">{g.goal_type}</span>
                  </button>
                ))}
              {allGoals.length === 0 && <p className="text-xs text-text-muted">No goals available.</p>}
            </div>
          </div>
        </div>
      )}

      {/* 2. Link Level Picker */}
      {isLinkLevelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#12151d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fff4ec]">Link Development Level</h3>
              <button onClick={() => setIsLinkLevelOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {allLevels
                .filter((lvl) => !linkedLevels.some((ll) => ll.id === lvl.id))
                .map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={async () => {
                      await linkLevel(lvl.id);
                      setIsLinkLevelOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-[#ff6a2a]/10 hover:border-[#ff8a4a]/30 border border-white/[0.06] transition-colors"
                  >
                    <span className="text-xs font-semibold text-[#fff4ec] block">{lvl.name}</span>
                    <span className="text-[10px] font-mono text-text-muted">Order {lvl.display_order} • {lvl.status}</span>
                  </button>
                ))}
              {allLevels.length === 0 && <p className="text-xs text-text-muted">No levels available.</p>}
            </div>
          </div>
        </div>
      )}

      {/* 3. Link Project Picker */}
      {isLinkProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#12151d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fff4ec]">Link Active Project</h3>
              <button onClick={() => setIsLinkProjectOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {allProjects
                .filter((p) => !linkedProjects.some((lp) => lp.id === p.id))
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      await linkProject(p.id);
                      setIsLinkProjectOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-[#ff6a2a]/10 hover:border-[#ff8a4a]/30 border border-white/[0.06] transition-colors"
                  >
                    <span className="text-xs font-semibold text-[#fff4ec] block">{p.title}</span>
                    <span className="text-[10px] font-mono text-text-muted">{p.status}</span>
                  </button>
                ))}
              {allProjects.length === 0 && <p className="text-xs text-text-muted">No projects available.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
