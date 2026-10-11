import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSkillRepo } from '../app/providers/RepositoryProvider';
import {
  CreateSkillDTO,
  Skill,
  SkillFilter,
  SkillMetrics,
  SkillSortOption,
  UpdateSkillDTO,
  SkillProficiency,
} from '../types/skill.types';
import { getProficiencyOrderIndex } from '../features/skills/validation/skillValidation';

export function useSkills(initialFilter?: SkillFilter) {
  const repo = useSkillRepo();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilterState] = useState<SkillFilter>(initialFilter || { status: 'active' });
  const [sortBy, setSortBy] = useState<SkillSortOption>('development_state');

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await repo.getSkills(filter);
      setSkills(data);
    } catch (err) {
      console.error('Failed to load skills:', err);
      setError('Unable to load skills.');
    } finally {
      setLoading(false);
    }
  }, [repo, filter]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const setFilter = (newFilter: Partial<SkillFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  };

  // Metrics computation
  const metrics = useMemo<SkillMetrics>(() => {
    const total = skills.length;
    const active = skills.filter((s) => s.status === 'active').length;
    const archived = skills.filter((s) => s.status === 'archived').length;

    const byDevelopmentState = {
      not_started: skills.filter((s) => s.development_state === 'not_started').length,
      developing: skills.filter((s) => s.development_state === 'developing').length,
      maintaining: skills.filter((s) => s.development_state === 'maintaining').length,
      demonstrated: skills.filter((s) => s.development_state === 'demonstrated').length,
    };

    const byProficiency = {
      foundation: skills.filter((s) => s.current_proficiency === 'foundation').length,
      developing: skills.filter((s) => s.current_proficiency === 'developing').length,
      competent: skills.filter((s) => s.current_proficiency === 'competent').length,
      advanced: skills.filter((s) => s.current_proficiency === 'advanced').length,
      expert: skills.filter((s) => s.current_proficiency === 'expert').length,
    };

    return { total, active, archived, byDevelopmentState, byProficiency };
  }, [skills]);

  // Sorted skills
  const sortedSkills = useMemo(() => {
    return [...skills].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'created_at_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'proficiency_asc') {
        return getProficiencyOrderIndex(a.current_proficiency) - getProficiencyOrderIndex(b.current_proficiency);
      }
      // default: active development first ('developing' > 'demonstrated' > 'maintaining' > 'not_started')
      const stateWeight = { developing: 0, demonstrated: 1, maintaining: 2, not_started: 3 };
      const diff = (stateWeight[a.development_state] ?? 99) - (stateWeight[b.development_state] ?? 99);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [skills, sortBy]);

  // Mutations
  const createSkill = async (dto: CreateSkillDTO): Promise<Skill> => {
    const created = await repo.createSkill(dto);
    await fetchSkills();
    return created;
  };

  const updateSkill = async (id: string, dto: UpdateSkillDTO): Promise<Skill> => {
    const updated = await repo.updateSkill(id, dto);
    await fetchSkills();
    return updated;
  };

  const archiveSkill = async (id: string): Promise<Skill> => {
    const updated = await repo.archiveSkill(id);
    await fetchSkills();
    return updated;
  };

  const updateProficiency = async (
    id: string,
    newProficiency: SkillProficiency,
    reason?: string,
    note?: string
  ): Promise<Skill> => {
    const updated = await repo.updateSkillProficiency(id, newProficiency, reason, note);
    await fetchSkills();
    return updated;
  };

  return {
    skills: sortedSkills,
    rawSkills: skills,
    metrics,
    loading,
    error,
    filter,
    sortBy,
    setFilter,
    setSortBy,
    createSkill,
    updateSkill,
    archiveSkill,
    updateProficiency,
    refresh: fetchSkills,
  };
}
