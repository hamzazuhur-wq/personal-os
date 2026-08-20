export interface UserSettings {
  id: string; // 'default'
  user_callsign: string;
  time_format: '24h' | '12h';
  week_start_day: 'monday' | 'sunday';
  theme: 'cyber-dark' | 'obsidian';
  accent_color: 'emerald' | 'cyan' | 'electric-blue';
  sound_effects_enabled: boolean;
  updated_at: string;
}

export type UpdateSettingsDTO = Partial<Omit<UserSettings, 'id' | 'updated_at'>>;
