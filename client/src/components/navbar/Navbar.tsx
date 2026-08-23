import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { User, Volume2, VolumeX, Search } from 'lucide-react';
import { InstallAppBanner } from '../common/InstallAppBanner';
import { isCompletionSoundEnabled, setCompletionSoundEnabled, playWelcomeSound } from '../../utils/completionSound';
import { AnimatedThemeToggle } from '../magicui/AnimatedThemeToggle';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

export const Navbar: React.FC<{ glass?: boolean }> = ({ glass = false }) => {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSoundEnabled, setIsSoundEnabled] = useState(isCompletionSoundEnabled());
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !sessionStorage.getItem('welcomePlayed')) {
      sessionStorage.setItem('welcomePlayed', '1');
      playWelcomeSound();
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <InstallAppBanner />
      <header className={`hidden sm:block sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${glass ? 'glass-navbar' : 'bg-white/95 dark:bg-zinc-950/95 border-zinc-200 dark:border-zinc-800'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="MOMZ'Z AUTOMOTIVE Logo"
                className="w-9 h-9 rounded-lg object-cover bg-black border border-zinc-800 shadow-md transform group-hover:scale-105 active:scale-95 transition-all shrink-0"
              />
              <div>
                <span className="font-extrabold text-base tracking-wider uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  MOMZ<span className="text-amber-600 dark:text-yellow-400 font-black">'Z</span> AUTO GARAGE
                </span>
              </div>
            </Link>

            {/* Global Search Bar (Quick Trigger) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-400 hover:border-amber-400/50 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-2xs w-64 justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium">Search vehicles or jobs...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700">
                ⌘K
              </kbd>
            </button>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextValue = !isSoundEnabled;
                  setIsSoundEnabled(nextValue);
                  setCompletionSoundEnabled(nextValue);
                }}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 glass-btn transition-all active:scale-95 cursor-pointer"
                title={isSoundEnabled ? 'Turn completion sound off' : 'Turn completion sound on'}
                aria-label={isSoundEnabled ? 'Turn completion sound off' : 'Turn completion sound on'}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Animated Theme Toggle */}
              <AnimatedThemeToggle variant="pill" />

              <Link
                to="/profile"
                className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95 ${glass ? 'glass-btn' : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'}`}
                title="My profile"
                aria-label="My profile"
              >
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Your profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
