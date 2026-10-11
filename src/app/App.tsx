import React, { useState } from 'react';
import { AppShell } from './layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DailyLogPage } from '../features/daily-log/DailyLogPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { WeeklyReviewPage } from '../features/weekly-review/WeeklyReviewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { VisionPage } from '../features/vision/VisionPage';
import { GoalsPage } from '../features/goals/GoalsPage';
import { GoalDetailPage } from '../features/goals/GoalDetailPage';
import { LevelsPage } from '../features/levels/LevelsPage';
import { LifeAreaLevelsPage } from '../features/levels/LifeAreaLevelsPage';
import { LevelDetailPage } from '../features/levels/LevelDetailPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { SkillsPage } from '../features/skills/SkillsPage';
import { SkillDetailPage } from '../features/skills/SkillDetailPage';
import { AIPage } from '../features/ai/AIPage';
import { ExecutionPage } from '../features/execution/ExecutionPage';
import { PracticesPage } from '../features/practices/PracticesPage';
import { ReviewOverviewPage } from '../features/review/ReviewOverviewPage';
import { LifeAreaReviewPage } from '../features/review/LifeAreaReviewPage';
import { ReviewFilterProvider } from '../features/review/state/reviewFiltersContext';
import { IdeasPage } from '../features/idea-capture/IdeasPage';
import { IdeaWorkspacePage } from '../features/idea-capture/IdeaWorkspacePage';

const pathToRoute = (path: string): string => {
  if (
    path === '/vision' ||
    path === '/vision/overview' ||
    path === '/vision/life-areas' ||
    path === '/vision/current-state' ||
    path.startsWith('/vision/life-areas/')
  ) {
    return path;
  }

  if (path === '/review' || path.startsWith('/review/')) {
    return path;
  }

  if (path === '/goals' || path.startsWith('/goals/')) {
    return path;
  }

  if (path === '/levels' || path.startsWith('/levels/')) {
    return path;
  }

  if (path === '/projects' || path.startsWith('/projects/')) {
    return path;
  }

  if (path === '/skills' || path.startsWith('/skills/')) {
    return path;
  }

  if (path === '/ai') {
    return path;
  }

  if (path === '/ideas' || path.startsWith('/ideas/')) {
    return path;
  }

  if (path === '/execution') {
    return path;
  }

  if (path === '/practices') {
    return path;
  }

  const legacyRoutes: Record<string, string> = {
    '/dashboard': 'dashboard',
    // Module 11: /quick-capture is a compatibility alias only —
    // it redirects into the unified IDEA CAPTURE system.
    '/quick-capture': '/ideas',
    '/daily-log': 'daily-log',
    '/tasks': 'tasks',
    '/weekly-review': 'weekly-review',
    '/settings': 'settings',
  };
  return legacyRoutes[path] || 'dashboard';
};

const routeToPath = (route: string): string => {
  if (
    route.startsWith('/vision') ||
    route.startsWith('/goals') ||
    route.startsWith('/levels') ||
    route.startsWith('/projects') ||
    route.startsWith('/skills') ||
    route.startsWith('/review') ||
    route === '/ai' ||
    route === '/execution' ||
    route.startsWith('/ideas')
  ) {
    return route;
  }
  return route === 'dashboard' ? '/' : `/${route}`;
};

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => pathToRoute(window.location.pathname));

  React.useEffect(() => {
    const onPopState = () => setCurrentRoute(pathToRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Normalize the legacy alias in the address bar (one-way: /quick-capture → /ideas).
  React.useEffect(() => {
    if (window.location.pathname === '/quick-capture') {
      window.history.replaceState({}, '', '/ideas');
    }
  }, [currentRoute]);

  const navigate = (route: string) => {
    const path = routeToPath(route);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(route);
  };

  const renderActiveRoute = () => {
    if (currentRoute === '/ai') {
      return <AIPage />;
    }

    if (currentRoute === '/ideas') {
      return <IdeasPage onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/ideas/')) {
      const ideaId = currentRoute.replace('/ideas/', '');
      return <IdeaWorkspacePage ideaId={ideaId} onNavigate={navigate} />;
    }

    if (currentRoute === '/review') {
      return <ReviewOverviewPage onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/review/life-area/')) {
      const lifeAreaId = currentRoute.replace('/review/life-area/', '');
      return <LifeAreaReviewPage lifeAreaId={lifeAreaId} onNavigate={navigate} />;
    }

    if (currentRoute === '/execution') {
      return <ExecutionPage />;
    }

    if (currentRoute === '/skills') {
      return <SkillsPage onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/skills/')) {
      const skillId = currentRoute.replace('/skills/', '');
      return <SkillDetailPage skillId={skillId} onNavigate={navigate} />;
    }

    if (currentRoute === '/execution') {
      return <ExecutionPage />;
    }

    if (currentRoute === '/practices') {
      return <PracticesPage />;
    }

    if (currentRoute === '/projects') {
      return <ProjectsPage onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/projects/')) {
      const projectId = currentRoute.replace('/projects/', '');
      return <ProjectDetailPage projectId={projectId} onNavigate={navigate} />;
    }

    if (currentRoute === '/levels') {
      return <LevelsPage onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/levels/')) {
      const parts = currentRoute.replace('/levels/', '').split('/');
      if (parts.length >= 2) {
        return <LevelDetailPage lifeAreaId={parts[0]} levelId={parts[1]} onNavigate={navigate} />;
      }
      return <LifeAreaLevelsPage lifeAreaId={parts[0]} onNavigate={navigate} />;
    }

    if (currentRoute === '/goals') {
      return <GoalsPage onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/goals/')) {
      const goalId = currentRoute.replace('/goals/', '');
      return <GoalDetailPage goalId={goalId} onNavigate={navigate} />;
    }

    if (currentRoute.startsWith('/vision')) {
      return <VisionPage route={currentRoute} onNavigate={navigate} />;
    }

    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'daily-log':
        return <DailyLogPage />;
      case 'tasks':
        return <TasksPage />;
      case 'weekly-review':
        return <WeeklyReviewPage onNavigateToDay={() => setCurrentRoute('daily-log')} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <ReviewFilterProvider>
      <AppShell currentRoute={currentRoute} onRouteChange={navigate}>
        {renderActiveRoute()}
      </AppShell>
    </ReviewFilterProvider>
  );
};
