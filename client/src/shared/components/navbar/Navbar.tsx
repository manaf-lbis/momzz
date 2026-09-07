import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../../features/auth/context/ThemeContext';
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
      <header
        className={`hidden sm:block sticky top-0 z-40 backdrop-blur-2xl border-b transition-colors ${
          glass
            ? 'glass-modern-header'
            : 'bg-white/85 dark:bg-[#080811]/85 border-slate-200/80 dark:border-white/10 shadow-2xs'
        }`}
      >
        <div className="app-container">
          <div className="flex items-center justify-between h-13 sm:h-14">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group">
              <img
                src="/logo.png"
                alt="MOMZ'Z Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover bg-black border border-slate-200 dark:border-white/15 shadow-sm transform group-hover:scale-105 active:scale-95 transition-all shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-1">
                  MOMZ<span className="text-amber-500 dark:text-amber-400 font-black">'Z</span> AUTO
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 -mt-0.5 tracking-widest hidden sm:inline">
                  GARAGE WORKSPACE
                </span>
              </div>
            </Link>

            {/* Desktop Global Search Bar */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-xs text-slate-400 hover:border-amber-400/50 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-2xs w-64 justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium">Search vehicle or plate...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-white/10 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                ⌘K
              </kbd>
            </button>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mobile Quick Search Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="sm:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 transition active:scale-95 cursor-pointer"
                title="Search vehicles"
                aria-label="Search vehicles"
              >
                <Search className="w-4 h-4 text-amber-500" />
              </button>

              <button
                onClick={() => {
                  const nextValue = !isSoundEnabled;
                  setIsSoundEnabled(nextValue);
                  setCompletionSoundEnabled(nextValue);
                }}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 transition active:scale-95 cursor-pointer"
                title={isSoundEnabled ? 'Audio chime enabled' : 'Audio chime disabled'}
                aria-label={isSoundEnabled ? 'Audio chime enabled' : 'Audio chime disabled'}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Animated Theme Toggle */}
              <AnimatedThemeToggle variant="icon-only" />

              <Link
                to="/profile"
                className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-amber-400 transition active:scale-95"
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
