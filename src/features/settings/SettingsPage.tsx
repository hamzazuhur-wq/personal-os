import React from 'react';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Badge } from '../../components/ui/Badge';
import { DataManagement } from './DataManagement';
import { IdeaCategoriesSettings } from './IdeaCategoriesSettings';
import { Shield, Database, Info, Mic } from 'lucide-react';
import { useSettings } from '../../app/providers/SettingsProvider';
import { VoiceLanguage } from '../../types/settings.types';
import { cn } from '../../utils/cn';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();

  const voiceLanguage = settings?.voice_language ?? 'ar-SA';

  const handleVoiceLanguageChange = async (value: VoiceLanguage) => {
    await updateSettings({ voice_language: value });
  };
  return (
    <div className="space-y-6">
      <SectionHeader
        title="System Settings"
        subtitle="Configure data management, portability, and application information."
        badge={<Badge variant="orange">Local-First</Badge>}
      />

      {/* System Info Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-white/[0.01] backdrop-blur-3xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-[#ff6a2a]/15 text-[#ff8a4a] border border-[#ff8a4a]/30 shadow-[0_0_12px_rgba(255,106,42,0.2)]">
            <Info className="w-4 h-4 stroke-[2]" />
          </div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
            System Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Module', value: '01 — Core Foundation' },
            { label: 'Storage Engine', value: 'IndexedDB / Dexie.js' },
            { label: 'Architecture', value: 'Local-First (Hostinger-ready)' },
            { label: 'Stack', value: 'React 19 + TypeScript + Tailwind v4' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.07] flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">{label}</span>
              <span className="text-xs font-semibold text-text-primary font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy & Storage Architecture Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-white/[0.01] backdrop-blur-3xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <Shield className="w-4 h-4 stroke-[2]" />
          </div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
            Privacy Architecture
          </h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
          All data is stored exclusively in your browser's IndexedDB on this device. No data leaves your machine. No account, no cloud sync, no telemetry. The storage layer is abstracted behind a repository interface — when you choose to migrate to a self-hosted Hostinger backend in the future, no UI or business logic will require modification.
        </p>
      </div>

      {/* Voice & Input Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-white/[0.01] backdrop-blur-3xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
            <Mic className="w-4 h-4 stroke-[2]" />
          </div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
            Voice & Input
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-text-muted block mb-2">
              Voice Language
            </label>
            <p className="text-xs text-text-secondary mb-3">
              Choose the speech-recognition locale for Voice and AI Voice capture. Arabic is the default; switch to English if you primarily dictate in English.
            </p>
            <div className="flex items-center gap-2">
              {(['ar-SA', 'en-US'] as VoiceLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleVoiceLanguageChange(lang)}
                  disabled={settingsLoading}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border',
                    voiceLanguage === lang
                      ? 'bg-[#ff6a2a]/15 border-[#ff8a4a]/40 text-[#ffb27a]'
                      : 'bg-black/30 border-white/[0.08] text-text-muted hover:text-text-secondary'
                  )}
                  data-testid={`voice-lang-${lang}`}
                >
                  <span className="font-mono uppercase tracking-wider">{lang}</span>
                  <span className="text-[10px] opacity-70">{lang === 'ar-SA' ? 'العربية' : 'English'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Idea Categories Management (the ONLY place categories are managed) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-white/[0.01] backdrop-blur-3xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <IdeaCategoriesSettings />
      </div>

      {/* Data Management Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-white/[0.01] backdrop-blur-3xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Database className="w-4 h-4 stroke-[2]" />
          </div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-[0.18em] text-[#fff4ec]">
            Data Portability & Backup
          </h3>
        </div>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Export your complete operating system state as a portable JSON archive. Import a backup to restore state on any device.
        </p>
        <DataManagement />
      </div>
    </div>
  );
};
