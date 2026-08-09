import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { User, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { InstallAppBanner } from '../common/InstallAppBanner';
import { isCompletionSoundEnabled, setCompletionSoundEnabled } from '../../utils/completionSound';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSoundEnabled, setIsSoundEnabled] = useState(isCompletionSoundEnabled());

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <InstallAppBanner />
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">

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


          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextValue = !isSoundEnabled;
                setIsSoundEnabled(nextValue);
                setCompletionSoundEnabled(nextValue);
              }}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all active:scale-95"
              title={isSoundEnabled ? 'Turn completion sound off' : 'Turn completion sound on'}
              aria-label={isSoundEnabled ? 'Turn completion sound off' : 'Turn completion sound on'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-mono"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            <Link
              to="/profile"
              className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all active:scale-95"
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
    </>
  );
};
