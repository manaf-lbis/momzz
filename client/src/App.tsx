import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AppRoutes } from './routes/AppRoutes';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
