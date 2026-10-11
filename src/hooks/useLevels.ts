import { useState, useEffect, useCallback } from 'react';
import { useLevelRepo } from '../app/providers/RepositoryProvider';
import { useVision } from './useVision';
import {
  CreateLevelDTO,
  Level,
  LevelRequirement,
  LifeAreaLevelSummaryData,
  UpdateLevelDTO,
} from '../types/level.types';

export function useLevels() {
  const levelRepo = useLevelRepo();
  const { lifeAreas, loading: visionLoading } = useVision();

  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Collect levels for all life areas
      const levelPromises = lifeAreas.map((la) => levelRepo.getLevelsByLifeArea(la.id));
      const results = await Promise.all(levelPromises);
      const flattened = results.flat();
      setAllLevels(flattened);
    } catch (err) {
      console.error('Failed to load levels:', err);
      setError('Unable to load development levels.');
    } finally {
      setLoading(false);
    }
  }, [levelRepo, lifeAreas]);

  useEffect(() => {
    if (!visionLoading) {
      fetchLevels();
    }
  }, [visionLoading, fetchLevels]);

  // Compute Life Area Level Summaries for Overview Page
  const [summaries, setSummaries] = useState<LifeAreaLevelSummaryData[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function buildSummaries() {
      if (visionLoading || lifeAreas.length === 0) {
        if (isMounted) setSummaries([]);
        return;
      }

      try {
        const summaryData: LifeAreaLevelSummaryData[] = await Promise.all(
          lifeAreas.map(async (area) => {
            const areaLevels = allLevels.filter((l) => l.life_area_id === area.id && l.status !== 'archived');
            areaLevels.sort((a, b) => a.display_order - b.display_order);

            const currentLevel = areaLevels.find((l) => l.status === 'current') || null;
            let nextLevel: Level | null = null;
            if (currentLevel) {
              nextLevel = areaLevels.find((l) => l.display_order === currentLevel.display_order + 1) || null;
            } else if (areaLevels.length > 0) {
              // If no current level designated, the first level is candidate
              nextLevel = areaLevels[0];
            }

            let requirements: LevelRequirement[] = [];
            let eligibility = null;
            if (currentLevel) {
              requirements = await levelRepo.getRequirements(currentLevel.id);
              eligibility = await levelRepo.checkLevelEligibility(currentLevel.id);
            }

            return {
              lifeAreaId: area.id,
              lifeAreaName: area.name,
              levels: areaLevels,
              currentLevel,
              nextLevel,
              requirements,
              eligibility,
            };
          })
        );

        if (isMounted) {
          setSummaries(summaryData);
        }
      } catch (err) {
        console.error('Error generating level summaries:', err);
      }
    }

    buildSummaries();

    return () => {
      isMounted = false;
    };
  }, [lifeAreas, allLevels, visionLoading, levelRepo]);

  const createLevel = async (dto: CreateLevelDTO): Promise<Level> => {
    try {
      const created = await levelRepo.createLevel(dto);
      await fetchLevels();
      return created;
    } catch (err) {
      console.error('Failed to create level:', err);
      throw err;
    }
  };

  const updateLevel = async (id: string, dto: UpdateLevelDTO): Promise<Level> => {
    try {
      const updated = await levelRepo.updateLevel(id, dto);
      await fetchLevels();
      return updated;
    } catch (err) {
      console.error('Failed to update level:', err);
      throw err;
    }
  };

  const archiveLevel = async (id: string): Promise<Level> => {
    try {
      const archived = await levelRepo.archiveLevel(id);
      await fetchLevels();
      return archived;
    } catch (err) {
      console.error('Failed to archive level:', err);
      throw err;
    }
  };

  const setCurrentLevel = async (lifeAreaId: string, levelId: string): Promise<Level> => {
    try {
      const level = await levelRepo.setCurrentLevel(lifeAreaId, levelId);
      await fetchLevels();
      return level;
    } catch (err) {
      console.error('Failed to set current level:', err);
      throw err;
    }
  };

  const reorderLevels = async (lifeAreaId: string, orderedIds: string[]): Promise<Level[]> => {
    try {
      const reordered = await levelRepo.reorderLevels(lifeAreaId, orderedIds);
      await fetchLevels();
      return reordered;
    } catch (err) {
      console.error('Failed to reorder levels:', err);
      throw err;
    }
  };

  return {
    levels: allLevels,
    summaries,
    lifeAreas,
    loading: loading || visionLoading,
    error,
    createLevel,
    updateLevel,
    archiveLevel,
    setCurrentLevel,
    reorderLevels,
    refresh: fetchLevels,
  };
}
