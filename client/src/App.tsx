import React, { useState, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { ThemeProvider } from './features/auth/context/ThemeContext';
import { SocketProvider } from './features/auth/context/SocketContext';
import { SessionLoginSound } from './shared/components/common/SessionLoginSound';
import { Footer } from './shared/components/common/Footer';
import { LeaderboardWelcomeModal } from './shared/components/common/LeaderboardWelcomeModal';
import { QuickAccessDock } from './shared/components/navigation/QuickAccessDock';
import { KineticSplash } from './shared/components/common/KineticSplash';

// Show splash once per browser session (clears on tab close)
const SPLASH_KEY = 'momzz_splash_v1';
const hasSeenSplash = () => sessionStorage.getItem(SPLASH_KEY) === '1';
const markSplashSeen = () => sessionStorage.setItem(SPLASH_KEY, '1');

export const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(hasSeenSplash);

  const handleSplashComplete = useCallback(() => {
    markSplashSeen();
    setSplashDone(true);
  }, []);

  return (
    <Provider store={store}>
      <SessionLoginSound />
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SocketProvider>
            <LeaderboardWelcomeModal />
            <AppRoutes />
            <Footer />
            <QuickAccessDock />
          </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>

      {/* Kinetic splash — renders above everything, slides away once done */}
      {!splashDone && <KineticSplash onComplete={handleSplashComplete} />}
    </Provider>
  );
};

export default App;
