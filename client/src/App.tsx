import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { SessionLoginSound } from './components/common/SessionLoginSound';
import { Footer } from './components/common/Footer';
import { LeaderboardWelcomeModal } from './components/common/LeaderboardWelcomeModal';
import { QuickAccessDock } from './components/navigation/QuickAccessDock';

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <SessionLoginSound />
      <ThemeProvider>
        <BrowserRouter>
          <SocketProvider>
              <LeaderboardWelcomeModal />
              <AppRoutes />
              <Footer />
              <QuickAccessDock />
            </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
