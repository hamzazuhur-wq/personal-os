import { useState, useEffect, useCallback } from 'react';
import { useLevelRepo } from '../app/providers/RepositoryProvider';
import { useGoals } from './useGoals';
import {
  CreateEvidenceDTO,
  CreateExceptionDTO,
  CreateMilestoneDTO,
  CreateRequirementDTO,
  CreateSkillDTO,
  EligibilityResult,
  Level,
  LevelHistory,
  LevelMilestone,
  LevelRequirement,
  LevelSkill,
  ProgressionException,
  RequirementEvidence,
  UpdateMilestoneDTO,
  UpdateRequirementDTO,
} from '../types/level.types';

export function useLevelDetail(levelId: string) {
  const levelRepo = useLevelRepo();
  const { goals } = useGoals();

  const [level, setLevel] = useState<Level | null>(null);
  const [requirements, setRequirements] = useState<LevelRequirement[]>([]);
  const [skills, setSkills] = useState<LevelSkill[]>([]);
  const [milestones, setMilestones] = useState<LevelMilestone[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, RequirementEvidence[]>>({});
  const [history, setHistory] = useState<LevelHistory[]>([]);
  const [exceptions, setExceptions] = useState<ProgressionException[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevelData = useCallback(async () => {
    if (!levelId) return;

    try {
      setLoading(true);
      setError(null);

      const lvl = await levelRepo.getLevel(levelId);
      if (!lvl) {
        setError('Level not found.');
        return;
      }
      setLevel(lvl);

      const [reqs, sks, mls, hist, excs, elig] = await Promise.all([
        levelRepo.getRequirements(levelId),
        levelRepo.getLevelSkills(levelId),
        levelRepo.getMilestones(levelId),
        levelRepo.getLevelHistory(lvl.life_area_id),
        levelRepo.getProgressionExceptions(lvl.life_area_id),
        levelRepo.checkLevelEligibility(levelId),
      ]);

      setRequirements(reqs);
      setSkills(sks);
      setMilestones(mls);
      setHistory(hist);
      setExceptions(excs);
      setEligibility(elig);

      // Fetch evidence for each requirement
      const evidenceEntries = await Promise.all(
        reqs.map(async (r) => {
          const ev = await levelRepo.getEvidence(r.id);
          return [r.id, ev] as [string, RequirementEvidence[]];
        })
      );
      setEvidenceMap(Object.fromEntries(evidenceEntries));
    } catch (err) {
      console.error('Failed to load level detail:', err);
      setError('Unable to load level details.');
    } finally {
      setLoading(false);
    }
  }, [levelId, levelRepo]);

  useEffect(() => {
    fetchLevelData();
  }, [fetchLevelData]);

  // Requirement actions
  const createRequirement = async (dto: CreateRequirementDTO) => {
    const res = await levelRepo.createRequirement(dto);
    await fetchLevelData();
    return res;
  };

  const updateRequirement = async (id: string, dto: UpdateRequirementDTO) => {
    const res = await levelRepo.updateRequirement(id, dto);
    await fetchLevelData();
    return res;
  };

  const completeRequirement = async (id: string) => {
    const res = await levelRepo.completeRequirement(id);
    await fetchLevelData();
    return res;
  };

  const reopenRequirement = async (id: string) => {
    const res = await levelRepo.reopenRequirement(id);
    await fetchLevelData();
    return res;
  };

  const waiverRequirement = async (id: string) => {
    const res = await levelRepo.waiverRequirement(id);
    await fetchLevelData();
    return res;
  };

  const archiveRequirement = async (id: string) => {
    const res = await levelRepo.archiveRequirement(id);
    await fetchLevelData();
    return res;
  };

  // Skill actions
  const createSkill = async (dto: CreateSkillDTO) => {
    const res = await levelRepo.createSkill(dto);
    await fetchLevelData();
    return res;
  };

  const updateSkill = async (id: string, name: string) => {
    const res = await levelRepo.updateSkill(id, name);
    await fetchLevelData();
    return res;
  };

  const deleteSkill = async (id: string) => {
    await levelRepo.deleteSkill(id);
    await fetchLevelData();
  };

  // Milestone actions
  const createMilestone = async (dto: CreateMilestoneDTO) => {
    const res = await levelRepo.createMilestone(dto);
    await fetchLevelData();
    return res;
  };

  const updateMilestone = async (id: string, dto: UpdateMilestoneDTO) => {
    const res = await levelRepo.updateMilestone(id, dto);
    await fetchLevelData();
    return res;
  };

  const completeMilestone = async (id: string) => {
    const res = await levelRepo.completeMilestone(id);
    await fetchLevelData();
    return res;
  };

  const reopenMilestone = async (id: string) => {
    const res = await levelRepo.reopenMilestone(id);
    await fetchLevelData();
    return res;
  };

  // Evidence actions
  const createEvidence = async (dto: CreateEvidenceDTO) => {
    const res = await levelRepo.createEvidence(dto);
    await fetchLevelData();
    return res;
  };

  const deleteEvidence = async (id: string) => {
    await levelRepo.deleteEvidence(id);
    await fetchLevelData();
  };

  // Exception actions
  const createProgressionException = async (dto: CreateExceptionDTO) => {
    const res = await levelRepo.createProgressionException(dto);
    await fetchLevelData();
    return res;
  };

  // Completion confirmation
  const confirmLevelCompletion = async (note?: string) => {
    const res = await levelRepo.confirmLevelCompletion(levelId, note);
    await fetchLevelData();
    return res;
  };

  // Linked Goals for this Level
  const linkedGoals = goals.filter(
    (g) => g.level_id === levelId || requirements.some((r) => r.goal_id === g.id)
  );

  return {
    level,
    requirements,
    skills,
    milestones,
    evidenceMap,
    history,
    exceptions,
    eligibility,
    linkedGoals,
    allGoals: goals,
    loading,
    error,
    createRequirement,
    updateRequirement,
    completeRequirement,
    reopenRequirement,
    waiverRequirement,
    archiveRequirement,
    createSkill,
    updateSkill,
    deleteSkill,
    createMilestone,
    updateMilestone,
    completeMilestone,
    reopenMilestone,
    createEvidence,
    deleteEvidence,
    createProgressionException,
    confirmLevelCompletion,
    refresh: fetchLevelData,
  };
}
