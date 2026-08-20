import { UserSettings, UpdateSettingsDTO } from '../../types/settings.types';

export interface ISettingsRepository {
  getSettings(): Promise<UserSettings>;
  updateSettings(dto: UpdateSettingsDTO): Promise<UserSettings>;
  resetToDefaults(): Promise<UserSettings>;
}
