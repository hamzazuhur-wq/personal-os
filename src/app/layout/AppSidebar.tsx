import React from 'react';
import { MAIN_NAV_ITEMS, FUTURE_MODULES } from '../../constants/navigation';
import {
  LayoutDashboard,
  Zap,
  Calendar,
  CheckSquare,
  CalendarRange,
  Settings,
  Lock,
  Compass,
  Target,
  Layers,
  FolderKanban,
  BrainCircuit,
  Sparkles,
  Flame,
  Award,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AppSidebarProps {
  currentRoute: string;
  onRouteChange: (routeId: string) => void;
}

const iconMap = {
  LayoutDashboard,
  Zap,
  Calendar,
  CheckSquare,
  CalendarRange,
  Settings,
  Target,
  Compass,
  Layers,
  FolderKanban,
  BrainCircuit,
  Sparkles,
  Flame,
  Award,
  Lightbulb,
};

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentRoute, onRouteChange }) => {
  return (
    <aside className="w-64 bg-black/40 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col h-screen sticky top-0 shrink-0 select-none shadow-[4px_0_30px_-5px_rgba(0,0,0,0.5)]">
      {/* Brand Header with Minimalist Monochrome Abstract Sketch Figure */}
      <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Abstract Line Sketch Monogram / Silhouette */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] overflow-hidden group">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5 text-text-primary/90 stroke-[1.4]"
            >
              <circle cx="12" cy="7" r="2.5" className="stroke-[#ff8a4a]" />
              <path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <path d="M12 13v4" strokeDasharray="1 1" className="stroke-white/40" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-[#ff6a2a]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div>
            <h1 className="text-xs font-bold tracking-[0.2em] text-[#fff4ec] uppercase font-mono">
              AURA
            </h1>
            <p className="text-[10px] font-mono text-[#ff8a4a] uppercase tracking-widest flex items-center gap-1.5">
              <span>LEVELING</span>
              <span className="text-white/20">/</span>
              <span>GROWTH</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Execution Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <div className="px-3 mb-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted/80">
            Command Center
          </div>
          <nav className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.iconName];
              const isActive =
                currentRoute === item.id ||
                (item.id === '/ideas' && currentRoute.startsWith('/ideas'));

              return (
                <button
                  key={item.id}
                  onClick={() => onRouteChange(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative',
                    isActive
                      ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)] font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[#ff8a4a]' : 'text-text-muted group-hover:text-text-secondary'
                    )}
                  />
                  <span>{item.label}</span>

                  {isActive && (
                    <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Strategic Architecture Modules */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted/80">
            <span>Strategic Architecture</span>
          </div>
          <div className="space-y-1">
            {/* Vision Module */}
            <button
              onClick={() => onRouteChange('/vision')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/vision')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <Compass className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/vision') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>Vision & Long-Term</span>
              {currentRoute.startsWith('/vision') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* Goals Module */}
            <button
              onClick={() => onRouteChange('/goals')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/goals')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <Target className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/goals') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>Strategic Goals</span>
              {currentRoute.startsWith('/goals') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* Levels Module */}
            <button
              onClick={() => onRouteChange('/levels')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/levels')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <Layers className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/levels') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>Development Levels</span>
              {currentRoute.startsWith('/levels') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* Active Projects Module */}
            <button
              onClick={() => onRouteChange('/projects')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/projects')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <FolderKanban className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/projects') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>Active Projects</span>
              {currentRoute.startsWith('/projects') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* Skill Matrix Module */}
            <button
              onClick={() => onRouteChange('/skills')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/skills')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <BrainCircuit className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/skills') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>Skill Matrix</span>
              {currentRoute.startsWith('/skills') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* Review & Analytics Module */}
            <button
              onClick={() => onRouteChange('/review')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/review')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <BarChart3 className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/review') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>Review &amp; Analytics</span>
              {currentRoute.startsWith('/review') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* AI Intelligence Module */}
            <button
              onClick={() => onRouteChange('/ai')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left cursor-pointer group relative border',
                currentRoute.startsWith('/ai')
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/08 text-[#fff4ec] border-[#ff8a4a]/40 shadow-[0_4px_20px_-3px_rgba(255,106,42,0.25)] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-transparent hover:border-white/[0.06]'
              )}
            >
              <Sparkles className={cn('w-4 h-4 shrink-0', currentRoute.startsWith('/ai') ? 'text-[#ff8a4a]' : 'text-text-muted')} />
              <span>AI Intelligence</span>
              {currentRoute.startsWith('/ai') && <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a]" />}
            </button>

            {/* Module 11: Idea Capture now lives in the main nav above —
                no separate strategic entry, one user-facing system. */}

            {/* Locked Future Modules */}
            {FUTURE_MODULES.filter((m) => !m.isAvailable).map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-text-muted/40 bg-white/[0.01] border border-transparent cursor-not-allowed select-none"
              >
                <span className="truncate">{mod.label}</span>
                <Lock className="w-3 h-3 text-text-muted/30 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff8a4a] shadow-[0_0_8px_#ff6a2a] animate-pulse" />
            <span className="text-[11px] text-text-secondary font-medium">ENVIRONMENT ACTIVE</span>
          </div>
          <span className="text-[10px] text-[#ff8a4a]/80 font-mono">LOCAL</span>
        </div>
      </div>
    </aside>
  );
};
