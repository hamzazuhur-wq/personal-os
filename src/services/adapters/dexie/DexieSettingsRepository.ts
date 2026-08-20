import { ISettingsRepository } from '../../contracts/ISettingsRepository';
import { UserSettings, UpdateSettingsDTO } from '../../../types/settings.types';
import { posDexieDb } from './posDexieDb';

const DEFAULT_SETTINGS: UserSettings = {
  id: 'default',
  user_callsign: 'OPERATOR',
  time_format: '24h',
  week_start_day: 'monday',
  theme: 'cyber-dark',
  accent_color: 'cyan',
  sound_effects_enabled: false,
  updated_at: new Date().toISOString(),
};

export class DexieSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<UserSettings> {
    const record = await posDexieDb.settings.get('default');
    if (!record) {
      await posDexieDb.settings.put(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return record;
  }

  async updateSettings(dto: UpdateSettingsDTO): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...dto,
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.settings.put(updated);
    return updated;
  }

  async resetToDefaults(): Promise<UserSettings> {
    const defaults = {
      ...DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
    };
    await posDexieDb.settings.put(defaults);
    return defaults;
  }
}
