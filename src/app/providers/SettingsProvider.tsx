import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserSettings, UpdateSettingsDTO } from '../../types/settings.types';
import { useSettingsRepo } from './RepositoryProvider';

export interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (dto: UpdateSettingsDTO) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settingsRepo = useSettingsRepo();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsRepo.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load user settings:', err);
    } finally {
      setLoading(false);
    }
  }, [settingsRepo]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (dto: UpdateSettingsDTO) => {
    const updated = await settingsRepo.updateSettings(dto);
    setSettings(updated);
  };

  const resetSettings = async () => {
    const reset = await settingsRepo.resetToDefaults();
    setSettings(reset);
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
}
