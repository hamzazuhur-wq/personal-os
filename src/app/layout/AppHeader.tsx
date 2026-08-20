import React from 'react';
import { LiveClock } from '../../components/shared/LiveClock';
import { useSettings } from '../providers/SettingsProvider';

export interface AppHeaderProps {
  currentSection: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentSection }) => {
  const { settings } = useSettings();
  const callsign = settings?.user_callsign || 'OPERATOR';

  return (
    <header className="h-16 border-b border-white/[0.07] bg-black/35 backdrop-blur-2xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]">
      {/* Contextual Breadcrumb */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
          <span className="text-[#ff8a4a] font-bold tracking-widest">POS</span>
          <span className="text-white/20 font-light">/</span>
          <span className="text-text-primary uppercase tracking-wider font-semibold text-xs sm:text-sm">
            {currentSection}
          </span>
        </div>
      </div>

      {/* Right-aligned Stats & Operator Identity */}
      <div className="flex items-center gap-4 sm:gap-6">
        <LiveClock compact className="hidden md:flex" />

        {/* Minimal Operator Identity Chip */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] backdrop-blur-md text-xs font-mono transition-colors">
          {/* Subtle line silhouette avatar */}
          <div className="w-4 h-4 rounded-full bg-[#ff6a2a]/20 border border-[#ff8a4a]/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff8a4a]" />
          </div>
          <span className="text-text-muted text-[11px] hidden sm:inline tracking-wider">OP:</span>
          <span className="text-[#fff4ec] font-bold tracking-wide">{callsign}</span>
        </div>
      </div>
    </header>
  );
};
