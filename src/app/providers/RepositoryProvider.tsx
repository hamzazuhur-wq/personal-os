import React, { createContext, useContext, useMemo } from 'react';
import { ICaptureRepository } from '../../services/contracts/ICaptureRepository';
import { IActivityRepository } from '../../services/contracts/IActivityRepository';
import { ITaskRepository } from '../../services/contracts/ITaskRepository';
import { IWeeklyFocusRepository } from '../../services/contracts/IWeeklyFocusRepository';
import { ISettingsRepository } from '../../services/contracts/ISettingsRepository';
import { IVisionRepository } from '../../services/contracts/IVisionRepository';
import { IGoalRepository } from '../../services/contracts/IGoalRepository';
import { ILevelRepository } from '../../services/contracts/ILevelRepository';
import { IProjectRepository } from '../../services/contracts/IProjectRepository';
import { ISkillRepository } from '../../services/contracts/ISkillRepository';
import { IAIRepository } from '../../services/contracts/IAIRepository';
import { IPracticeRepository } from '../../services/contracts/IPracticeRepository';
import { IIdeaRevisionRepository } from '../../services/contracts/IIdeaRevisionRepository';
import { IIdeaCategoryRepository } from '../../services/contracts/IIdeaCategoryRepository';
import { IRecommendationRepository } from '../../services/contracts/IRecommendationRepository';

import { DexieCaptureRepository } from '../../services/adapters/dexie/DexieCaptureRepository';
import { DexieActivityRepository } from '../../services/adapters/dexie/DexieActivityRepository';
import { DexieTaskRepository } from '../../services/adapters/dexie/DexieTaskRepository';
import { DexieWeeklyFocusRepository } from '../../services/adapters/dexie/DexieWeeklyFocusRepository';
import { DexieSettingsRepository } from '../../services/adapters/dexie/DexieSettingsRepository';
import { DexieVisionRepository } from '../../services/adapters/dexie/DexieVisionRepository';
import { DexieGoalRepository } from '../../services/adapters/dexie/DexieGoalRepository';
import { DexieLevelRepository } from '../../services/adapters/dexie/DexieLevelRepository';
import { DexieProjectRepository } from '../../services/adapters/dexie/DexieProjectRepository';
import { DexieSkillRepository } from '../../services/adapters/dexie/DexieSkillRepository';
import { DexieAIRepository } from '../../services/adapters/dexie/DexieAIRepository';
import { DexiePracticeRepository } from '../../services/adapters/dexie/DexiePracticeRepository';
import { DexieIdeaRevisionRepository } from '../../services/adapters/dexie/DexieIdeaRevisionRepository';
import { DexieIdeaCategoryRepository } from '../../services/adapters/dexie/DexieIdeaCategoryRepository';
import { DexieRecommendationRepository } from '../../services/adapters/dexie/DexieRecommendationRepository';

export interface RepositoryContextType {
  captureRepo: ICaptureRepository;
  activityRepo: IActivityRepository;
  taskRepo: ITaskRepository;
  weeklyFocusRepo: IWeeklyFocusRepository;
  settingsRepo: ISettingsRepository;
  visionRepo: IVisionRepository;
  goalRepo: IGoalRepository;
  levelRepo: ILevelRepository;
  projectRepo: IProjectRepository;
  skillRepo: ISkillRepository;
  aiRepo: IAIRepository;
  practiceRepo: IPracticeRepository;
  ideaRevisionRepo: IIdeaRevisionRepository;
  ideaCategoryRepo: IIdeaCategoryRepository;
  recommendationRepo: IRecommendationRepository;
}

const RepositoryContext = createContext<RepositoryContextType | null>(null);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Instantiate the storage adapters (Dexie IndexedDB implementation)
  const repos = useMemo<RepositoryContextType>(() => ({
    captureRepo: new DexieCaptureRepository(),
    activityRepo: new DexieActivityRepository(),
    taskRepo: new DexieTaskRepository(),
    weeklyFocusRepo: new DexieWeeklyFocusRepository(),
    settingsRepo: new DexieSettingsRepository(),
    visionRepo: new DexieVisionRepository(),
    goalRepo: new DexieGoalRepository(),
    levelRepo: new DexieLevelRepository(),
    projectRepo: new DexieProjectRepository(),
    skillRepo: new DexieSkillRepository(),
    aiRepo: new DexieAIRepository(),
    practiceRepo: new DexiePracticeRepository(),
    ideaRevisionRepo: new DexieIdeaRevisionRepository(),
    ideaCategoryRepo: new DexieIdeaCategoryRepository(),
    recommendationRepo: new DexieRecommendationRepository(),
  }), []);

  return (
    <RepositoryContext.Provider value={repos}>
      {children}
    </RepositoryContext.Provider>
  );
};

export function useCaptureRepo(): ICaptureRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useCaptureRepo must be used within a RepositoryProvider');
  return context.captureRepo;
}

export function useActivityRepo(): IActivityRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useActivityRepo must be used within a RepositoryProvider');
  return context.activityRepo;
}

export function useTaskRepo(): ITaskRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useTaskRepo must be used within a RepositoryProvider');
  return context.taskRepo;
}

export function useWeeklyFocusRepo(): IWeeklyFocusRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useWeeklyFocusRepo must be used within a RepositoryProvider');
  return context.weeklyFocusRepo;
}

export function useSettingsRepo(): ISettingsRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useSettingsRepo must be used within a RepositoryProvider');
  return context.settingsRepo;
}

export function useVisionRepo(): IVisionRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useVisionRepo must be used within a RepositoryProvider');
  return context.visionRepo;
}

export function useGoalRepo(): IGoalRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useGoalRepo must be used within a RepositoryProvider');
  return context.goalRepo;
}

export function useLevelRepo(): ILevelRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useLevelRepo must be used within a RepositoryProvider');
  return context.levelRepo;
}

export function useProjectRepo(): IProjectRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useProjectRepo must be used within a RepositoryProvider');
  return context.projectRepo;
}

export function useSkillRepo(): ISkillRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useSkillRepo must be used within a RepositoryProvider');
  return context.skillRepo;
}

export function useAIRepo(): IAIRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useAIRepo must be used within a RepositoryProvider');
  return context.aiRepo;
}

export function usePracticeRepo(): IPracticeRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('usePracticeRepo must be used within a RepositoryProvider');
  return context.practiceRepo;
}

export function useIdeaRevisionRepo(): IIdeaRevisionRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useIdeaRevisionRepo must be used within a RepositoryProvider');
  return context.ideaRevisionRepo;
}

export function useIdeaCategoryRepo(): IIdeaCategoryRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useIdeaCategoryRepo must be used within a RepositoryProvider');
  return context.ideaCategoryRepo;
}

export function useRecommendationRepo(): IRecommendationRepository {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error('useRecommendationRepo must be used within a RepositoryProvider');
  return context.recommendationRepo;
}
