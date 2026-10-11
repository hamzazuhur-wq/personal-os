import { useState, useEffect, useCallback } from 'react';
import {
  useSkillRepo,
  useGoalRepo,
  useLevelRepo,
  useProjectRepo,
} from '../app/providers/RepositoryProvider';
import { useVision } from './useVision';
import { useLevels } from './useLevels';
import {
  Skill,
  SkillEvidence,
  SkillHistory,
  SkillGoalRelation,
  SkillLevelRelation,
  SkillProjectRelation,
  SkillProficiency,
  UpdateSkillDTO,
  CreateSkillEvidenceDTO,
} from '../types/skill.types';
import { Goal } from '../types/goal.types';
import { Level } from '../types/level.types';
import { Project } from '../types/project.types';

export function useSkillDetail(skillId: string) {
  const skillRepo = useSkillRepo();
  const goalRepo = useGoalRepo();
  const levelRepo = useLevelRepo();
  const projectRepo = useProjectRepo();
  const { lifeAreas } = useVision();
  const { levels: allLevels } = useLevels();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);
  const [history, setHistory] = useState<SkillHistory[]>([]);
  const [goalRelations, setGoalRelations] = useState<SkillGoalRelation[]>([]);
  const [levelRelations, setLevelRelations] = useState<SkillLevelRelation[]>([]);
  const [projectRelations, setProjectRelations] = useState<SkillProjectRelation[]>([]);

  // Resolved related objects
  const [linkedGoals, setLinkedGoals] = useState<Goal[]>([]);
  const [linkedLevels, setLinkedLevels] = useState<Level[]>([]);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkillData = useCallback(async () => {
    if (!skillId) return;
    try {
      setLoading(true);
      setError(null);

      const skillData = await skillRepo.getSkill(skillId);
      if (!skillData) {
        setError('Skill not found.');
        setSkill(null);
        return;
      }
      setSkill(skillData);

      // Parallel sub-fetches
      const [evList, histList, gRels, lRels, pRels] = await Promise.all([
        skillRepo.getSkillEvidence(skillId),
        skillRepo.getSkillHistory(skillId),
        skillRepo.getSkillGoals(skillId),
        skillRepo.getSkillLevels(skillId),
        skillRepo.getSkillProjects(skillId),
      ]);

      setEvidence(evList);
      setHistory(histList);
      setGoalRelations(gRels);
      setLevelRelations(lRels);
      setProjectRelations(pRels);

      // Resolve linked Goal objects
      const goalPromises = gRels.map((r) => goalRepo.getGoal(r.goal_id));
      const resolvedGoals = (await Promise.all(goalPromises)).filter(Boolean) as Goal[];
      setLinkedGoals(resolvedGoals);

      // Resolve linked Level objects
      const levelPromises = lRels.map((r) => levelRepo.getLevel(r.level_id));
      const resolvedLevels = (await Promise.all(levelPromises)).filter(Boolean) as Level[];
      setLinkedLevels(resolvedLevels);

      // Resolve linked Project objects
      const projectPromises = pRels.map((r) => projectRepo.getProject(r.project_id));
      const resolvedProjects = (await Promise.all(projectPromises)).filter(Boolean) as Project[];
      setLinkedProjects(resolvedProjects);
    } catch (err) {
      console.error('Failed to load skill details:', err);
      setError('Unable to load skill details.');
    } finally {
      setLoading(false);
    }
  }, [skillId, skillRepo, goalRepo, levelRepo, projectRepo]);

  useEffect(() => {
    fetchSkillData();
  }, [fetchSkillData]);

  // Life Area resolution
  const lifeArea = lifeAreas.find((la) => la.id === skill?.life_area_id) ?? null;

  // Actions
  const updateSkill = async (dto: UpdateSkillDTO): Promise<Skill> => {
    if (!skill) throw new Error('No active skill');
    const updated = await skillRepo.updateSkill(skill.id, dto);
    setSkill(updated);
    return updated;
  };

  const updateProficiency = async (
    newProficiency: SkillProficiency,
    reason?: string,
    note?: string
  ): Promise<Skill> => {
    if (!skill) throw new Error('No active skill');
    const updated = await skillRepo.updateSkillProficiency(skill.id, newProficiency, reason, note);
    setSkill(updated);
    const updatedHistory = await skillRepo.getSkillHistory(skill.id);
    setHistory(updatedHistory);
    return updated;
  };

  const archiveSkill = async (): Promise<Skill> => {
    if (!skill) throw new Error('No active skill');
    const updated = await skillRepo.archiveSkill(skill.id);
    setSkill(updated);
    return updated;
  };

  const addEvidence = async (dto: CreateSkillEvidenceDTO): Promise<SkillEvidence> => {
    if (!skill) throw new Error('No active skill');
    const added = await skillRepo.addSkillEvidence(dto);
    const updatedEvidence = await skillRepo.getSkillEvidence(skill.id);
    setEvidence(updatedEvidence);
    return added;
  };

  const removeEvidence = async (evidenceId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.removeSkillEvidence(evidenceId);
    setEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
  };

  const linkGoal = async (goalId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.linkSkillToGoal(skill.id, goalId);
    await fetchSkillData();
  };

  const unlinkGoal = async (goalId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.unlinkSkillFromGoal(skill.id, goalId);
    await fetchSkillData();
  };

  const linkLevel = async (levelId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.linkSkillToLevel(skill.id, levelId);
    await fetchSkillData();
  };

  const unlinkLevel = async (levelId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.unlinkSkillFromLevel(skill.id, levelId);
    await fetchSkillData();
  };

  const linkProject = async (projectId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.linkSkillToProject(skill.id, projectId);
    await fetchSkillData();
  };

  const unlinkProject = async (projectId: string): Promise<void> => {
    if (!skill) throw new Error('No active skill');
    await skillRepo.unlinkSkillFromProject(skill.id, projectId);
    await fetchSkillData();
  };

  return {
    skill,
    lifeArea,
    evidence,
    history,
    goalRelations,
    levelRelations,
    projectRelations,
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
    refresh: fetchSkillData,
  };
}
