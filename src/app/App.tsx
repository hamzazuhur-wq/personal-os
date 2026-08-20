import React, { useState } from 'react';
import { AppShell } from './layout/AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { QuickCapturePage } from '../features/quick-capture/QuickCapturePage';
import { DailyLogPage } from '../features/daily-log/DailyLogPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { WeeklyReviewPage } from '../features/weekly-review/WeeklyReviewPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');

  const renderActiveRoute = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={(routeId) => setCurrentRoute(routeId)} />;
      case 'quick-capture':
        return <QuickCapturePage />;
      case 'daily-log':
        return <DailyLogPage />;
      case 'tasks':
        return <TasksPage />;
      case 'weekly-review':
        return <WeeklyReviewPage onNavigateToDay={() => setCurrentRoute('daily-log')} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={(routeId) => setCurrentRoute(routeId)} />;
    }
  };

  return (
    <AppShell currentRoute={currentRoute} onRouteChange={(routeId) => setCurrentRoute(routeId)}>
      {renderActiveRoute()}
    </AppShell>
  );
};
