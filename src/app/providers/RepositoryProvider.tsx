import React, { createContext, useContext, useMemo } from 'react';
import { ICaptureRepository } from '../../services/contracts/ICaptureRepository';
import { IActivityRepository } from '../../services/contracts/IActivityRepository';
import { ITaskRepository } from '../../services/contracts/ITaskRepository';
import { IWeeklyFocusRepository } from '../../services/contracts/IWeeklyFocusRepository';
import { ISettingsRepository } from '../../services/contracts/ISettingsRepository';

import { DexieCaptureRepository } from '../../services/adapters/dexie/DexieCaptureRepository';
import { DexieActivityRepository } from '../../services/adapters/dexie/DexieActivityRepository';
import { DexieTaskRepository } from '../../services/adapters/dexie/DexieTaskRepository';
import { DexieWeeklyFocusRepository } from '../../services/adapters/dexie/DexieWeeklyFocusRepository';
import { DexieSettingsRepository } from '../../services/adapters/dexie/DexieSettingsRepository';

export interface RepositoryContextType {
  captureRepo: ICaptureRepository;
  activityRepo: IActivityRepository;
  taskRepo: ITaskRepository;
  weeklyFocusRepo: IWeeklyFocusRepository;
  settingsRepo: ISettingsRepository;
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
