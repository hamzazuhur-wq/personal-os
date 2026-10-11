import React from 'react';
import { MAIN_NAV_ITEMS } from '../../constants/navigation';
import {
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
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MobileNavigationProps {
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
  BarChart3,
  Lightbulb,
};

// Strategic Architecture navigation items
const STRATEGIC_NAV_ITEMS = [
  { id: '/vision', label: 'Vision', icon: 'Compass' },
  { id: '/goals', label: 'Goals', icon: 'Target' },
  { id: '/levels', label: 'Levels', icon: 'Layers' },
  { id: '/projects', label: 'Projects', icon: 'FolderKanban' },
  { id: '/skills', label: 'Skills', icon: 'BrainCircuit' },
  { id: '/review', label: 'Review', icon: 'BarChart3' },
  { id: '/ai', label: 'AI', icon: 'Sparkles' },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentRoute,
  onRouteChange,
}) => {
  return (
    <nav
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-black/65 backdrop-blur-2xl border border-white/[0.12] rounded-2xl select-none shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_-5px_rgba(255,106,42,0.15)]"
    >
      {/* Horizontal Scrollable Container */}
      <div className="flex items-center overflow-x-auto overflow-y-hidden gap-1 px-1.5 py-1.5 scrollbar-hide">
        {/* Main Navigation Items */}
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
                'flex flex-col items-center justify-center min-w-[62px] flex-shrink-0 min-h-[46px] py-1 px-2 rounded-xl transition-all cursor-pointer relative',
                isActive
                  ? 'text-[#fff4ec] bg-gradient-to-b from-[#ff6a2a]/20 to-[#ff8a4a]/08 border border-[#ff8a4a]/35 shadow-[0_2px_12px_rgba(255,106,42,0.2)]'
                  : 'text-text-muted hover:text-text-secondary active:text-text-primary'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 mb-0.5 transition-colors',
                  isActive ? 'text-[#ff8a4a]' : 'text-text-muted'
                )}
              />
              <span className="text-[10px] font-medium tracking-tight truncate max-w-[58px]">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {/* Strategic Architecture Items */}
        {STRATEGIC_NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = currentRoute.startsWith(item.id);

          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[62px] flex-shrink-0 min-h-[46px] py-1 px-2 rounded-xl transition-all cursor-pointer relative',
                isActive
                  ? 'text-[#fff4ec] bg-gradient-to-b from-[#ff6a2a]/20 to-[#ff8a4a]/08 border border-[#ff8a4a]/35 shadow-[0_2px_12px_rgba(255,106,42,0.2)]'
                  : 'text-text-muted hover:text-text-secondary active:text-text-primary'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 mb-0.5 transition-colors',
                  isActive ? 'text-[#ff8a4a]' : 'text-text-muted'
                )}
              />
              <span className="text-[10px] font-medium tracking-tight truncate max-w-[58px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
