import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'momzz_sidebar_collapsed';

interface LeftPanelContextType {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setIsCollapsed: (collapsed: boolean) => void;
}

const LeftPanelContext = createContext<LeftPanelContextType>({
  isCollapsed: false,
  toggleCollapsed: () => {},
  setIsCollapsed: () => {},
});

export const LeftPanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Keyboard shortcut Ctrl+B or ⌘B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        // Prevent default browser bookmark shortcut
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  return (
    <LeftPanelContext.Provider value={{ isCollapsed, toggleCollapsed, setIsCollapsed }}>
      {children}
    </LeftPanelContext.Provider>
  );
};

export const useLeftPanel = () => useContext(LeftPanelContext);
