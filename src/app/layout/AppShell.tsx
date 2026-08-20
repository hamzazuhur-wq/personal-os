import React from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileNavigation } from './MobileNavigation';
import { APP_CONFIG } from '../../config/app.config';
import { MAIN_NAV_ITEMS } from '../../constants/navigation';

export interface AppShellProps {
  currentRoute: string;
  onRouteChange: (routeId: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  children,
}) => {
  const currentItem = MAIN_NAV_ITEMS.find((item) => item.id === currentRoute);
  const currentTitle = currentItem?.label || 'Command Center';

  return (
    <div className="relative min-h-screen bg-[#060709] text-text-primary overflow-x-hidden selection:bg-[#ff6a2a]/25 selection:text-[#fff4ec]">
      {/* =========================================================================
          ATMOSPHERIC DEEP LIGHTING LAYER (Visible through frosted glass)
          ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Primary Warm Fiery Orange Atmospheric Bloom - Top Center/Right */}
        <div className="absolute -top-[15%] left-[25%] sm:left-[35%] w-[650px] h-[550px] sm:w-[900px] sm:h-[700px] rounded-full bg-gradient-to-br from-[#ff6a2a]/14 via-[#ff8a4a]/08 to-transparent blur-[140px] opacity-75" />

        {/* Secondary Warm Ambient Glow - Mid Left */}
        <div className="absolute top-[45%] -left-[10%] w-[500px] h-[600px] rounded-full bg-gradient-to-tr from-[#ff6a2a]/09 via-[#ffb27a]/04 to-transparent blur-[160px] opacity-60" />

        {/* Soft Low-Opacity White Ambient Light - Bottom Center */}
        <div className="absolute -bottom-[10%] right-[15%] w-[600px] h-[500px] rounded-full bg-gradient-to-t from-white/[0.03] via-[#ff6a2a]/06 to-transparent blur-[150px] opacity-50" />

        {/* Deep Charcoal Grid Noise Underlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Main Structural Container */}
      <div className="relative z-10 flex min-h-screen">
        {/* Desktop & Tablet Glass Sidebar */}
        <div className="hidden md:block">
          <AppSidebar currentRoute={currentRoute} onRouteChange={onRouteChange} />
        </div>

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
          <AppHeader currentSection={currentTitle} />

          <main className="flex-1 p-3.5 sm:p-6 lg:p-8">
            <div className={`mx-auto ${APP_CONFIG.maxContentWidth} w-full`}>
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Floating Bottom Glass Nav */}
        <MobileNavigation currentRoute={currentRoute} onRouteChange={onRouteChange} />
      </div>
    </div>
  );
};
