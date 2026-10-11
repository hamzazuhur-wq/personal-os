export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  iconName:
    | 'LayoutDashboard'
    | 'Zap'
    | 'Calendar'
    | 'CheckSquare'
    | 'CalendarRange'
    | 'Settings'
    | 'Target'
    | 'Compass'
    | 'Layers'
    | 'FolderKanban'
    | 'BrainCircuit'
    | 'Sparkles'
    | 'Flame'
    | 'Award'
    | 'Lightbulb';
  module: 'module-01' | 'module-02' | 'future';
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
    // Module 11: the single unified IDEA CAPTURE system (formerly
    // "Quick Capture"). id doubles as its route path.
    id: '/ideas',
    label: 'Idea Capture',
    shortLabel: 'Ideas',
    iconName: 'Lightbulb',
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
  { id: 'vision', label: 'Vision & Long-Term', route: '/vision', isAvailable: true },
  { id: 'goals', label: 'Strategic Goals', route: '/goals', isAvailable: true },
  { id: 'levels', label: 'Development Levels', route: '/levels', isAvailable: true },
  { id: 'projects', label: 'Active Projects', route: '/projects', isAvailable: true },
  { id: 'skills', label: 'Skill Matrix', route: '/skills', isAvailable: true },
  { id: 'execution', label: 'Execution Engine', route: '/execution', isAvailable: true },
  { id: 'practices', label: 'Practices & Points', route: '/practices', isAvailable: true },
  { id: 'ai-assistant', label: 'AI Intelligence', route: '/ai', isAvailable: true },
  { id: 'idea-capture', label: 'Idea Capture', route: '/ideas', isAvailable: true },
];
