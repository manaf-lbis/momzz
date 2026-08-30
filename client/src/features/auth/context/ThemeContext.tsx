import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (event?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ── Ripple overlay that expands from the click origin ──────────────────────────
const ThemeRippleOverlay: React.FC<{
  active: boolean;
  origin: { x: number; y: number };
  nextTheme: Theme;
  onDone: () => void;
}> = ({ active, origin, nextTheme, onDone }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    // Calculate the radius needed to cover the entire viewport from the click origin
    const maxX = Math.max(origin.x, window.innerWidth - origin.x);
    const maxY = Math.max(origin.y, window.innerHeight - origin.y);
    const radius = Math.hypot(maxX, maxY) * 2.1;

    const el = ref.current;
    el.style.width = `${radius}px`;
    el.style.height = `${radius}px`;
    el.style.left = `${origin.x - radius / 2}px`;
    el.style.top = `${origin.y - radius / 2}px`;
    el.style.transform = 'scale(0)';
    el.style.opacity = '1';

    // Force reflow so the initial state is painted
    void el.offsetWidth;

    el.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease';
    el.style.transform = 'scale(1)';

    const timer = setTimeout(() => {
      // Fade out after the theme has been applied
      el.style.transition = 'opacity 0.25s ease';
      el.style.opacity = '0';
      setTimeout(onDone, 280);
    }, 560);

    return () => clearTimeout(timer);
  }, [active, origin, nextTheme, onDone]);

  if (!active) return null;

  const bg = nextTheme === 'dark'
    ? 'radial-gradient(circle, #0B0F17 0%, #080d1a 50%, #030712 100%)'
    : 'radial-gradient(circle, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)';

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        borderRadius: '50%',
        background: bg,
        zIndex: 99999,
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      }}
    />
  );
};

// ──────────────────────────────────────────────────────────────────────────────

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('garagehub_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [ripple, setRipple] = useState<{
    active: boolean;
    origin: { x: number; y: number };
    nextTheme: Theme;
  }>({ active: false, origin: { x: 0, y: 0 }, nextTheme: 'dark' });

  // Apply theme class immediately on mount
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('garagehub_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback((event?: React.MouseEvent) => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    // Get click origin for the ripple
    const origin = event
      ? { x: event.clientX, y: event.clientY }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Start ripple overlay BEFORE applying theme
    setRipple({ active: true, origin, nextTheme });

    // Apply theme after a tiny delay so the overlay starts first
    setTimeout(() => {
      setTheme(nextTheme);
    }, 80);
  }, [theme]);

  const handleRippleDone = useCallback(() => {
    setRipple(prev => ({ ...prev, active: false }));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
      <ThemeRippleOverlay
        active={ripple.active}
        origin={ripple.origin}
        nextTheme={ripple.nextTheme}
        onDone={handleRippleDone}
      />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
