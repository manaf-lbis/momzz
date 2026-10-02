import React, { useState, useCallback } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { ThemeProvider } from './features/auth/context/ThemeContext';
import { SocketProvider } from './features/auth/context/SocketContext';
import { Footer } from './shared/components/common/Footer';
import { QuickAccessDock } from './shared/components/navigation/QuickAccessDock';
import { LeftPanel } from './shared/components/navigation/LeftPanel';
import { LeftPanelProvider, useLeftPanel } from './shared/context/LeftPanelContext';
import { KineticSplash } from './shared/components/common/KineticSplash';
import { ModernAppBackground } from './shared/components/common/FluidCanvasBackground';
import { useAuth } from './shared/hooks/useAuth';
import { LEGAL_METADATA } from './shared/components/legal/legalContent';

// Show splash once per browser session (clears on tab close)
const SPLASH_KEY = 'momzz_splash_v1';
const hasSeenSplash = () => sessionStorage.getItem(SPLASH_KEY) === '1';
const markSplashSeen = () => sessionStorage.setItem(SPLASH_KEY, '1');

/**
 * Main application layout wrapper
 * Coordinates between persistent LeftPanel on large devices and floating QuickAccessDock on small devices
 */
const AppLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isCollapsed } = useLeftPanel();
  const location = useLocation();

  const currentPath = location.pathname;

  const isExcluded =
    !isAuthenticated ||
    !user ||
    user.needsTermsAcceptance ||
    user.acceptedTermsVersion !== LEGAL_METADATA.version ||
    currentPath === '/track' ||
    currentPath.endsWith('/photo') ||
    currentPath.endsWith('/capture');

  const showLeftPanel = !isExcluded;

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      {/* Persistent Left Panel for Large Devices (rail when collapsed, full drawer when expanded) */}
      {showLeftPanel && <LeftPanel />}

      {/* Main Content Area: Dynamic offset on large devices adapting to sidebar collapse */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          showLeftPanel ? (isCollapsed ? 'lg:pl-20' : 'lg:pl-64 xl:pl-72') : ''
        }`}
      >
        <AppRoutes />
        <Footer />
      </div>

      {/* Mobile & Tablet Floating Dock (hidden on large screens where left panel is active) */}
      <QuickAccessDock />
    </div>
  );
};

export const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(hasSeenSplash);

  const handleSplashComplete = useCallback(() => {
    markSplashSeen();
    setSplashDone(true);
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SocketProvider>
            <LeftPanelProvider>
              <ModernAppBackground />
              <AppLayout />
            </LeftPanelProvider>
          </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>

      {/* Kinetic splash — renders above everything, slides away once done */}
      {!splashDone && <KineticSplash onComplete={handleSplashComplete} />}
    </Provider>
  );
};

export default App;
