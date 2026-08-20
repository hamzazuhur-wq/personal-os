export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  iconName: 'LayoutDashboard' | 'Zap' | 'Calendar' | 'CheckSquare' | 'CalendarRange' | 'Settings';
  module: 'module-01' | 'future';
  isAvailable: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Command Center',
    shortLabel: 'Dashboard',
    iconName: 'LayoutDashboard',
    module: 'module-01',
    isAvailable: true,
  },
  {
    id: 'quick-capture',
    label: 'Quick Capture',
    shortLabel: 'Capture',
    iconName: 'Zap',
    module: 'module-01',
    isAvailable: true,
  },
  {
    id: 'daily-log',
    label: 'Daily Activity Log',
    shortLabel: 'Daily Log',
    iconName: 'Calendar',
    module: 'module-01',
    isAvailable: true,
  },
  {
    id: 'tasks',
    label: 'Actions & Tasks',
    shortLabel: 'Tasks',
    iconName: 'CheckSquare',
    module: 'module-01',
    isAvailable: true,
  },
  {
    id: 'weekly-review',
    label: 'Weekly Overview',
    shortLabel: 'Weekly',
    iconName: 'CalendarRange',
    module: 'module-01',
    isAvailable: true,
  },
  {
    id: 'settings',
    label: 'System Settings',
    shortLabel: 'Settings',
    iconName: 'Settings',
    module: 'module-01',
    isAvailable: true,
  },
];

export const FUTURE_MODULES = [
  { id: 'vision', label: 'Vision & Long-Term' },
  { id: 'goals', label: 'Strategic Goals' },
  { id: 'levels', label: 'Development Levels' },
  { id: 'projects', label: 'Active Projects' },
  { id: 'skills', label: 'Skill Matrix' },
  { id: 'ai-assistant', label: 'AI Intelligence' },
];
