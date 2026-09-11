import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../features/auth/context/ThemeContext';
import { cn } from '../../lib/utils';

interface AnimatedThemeToggleProps {
  className?: string;
  variant?: 'pill' | 'icon-only' | 'bar' | 'large-card';
}

export const AnimatedThemeToggle: React.FC<AnimatedThemeToggleProps> = ({
  className,
  variant = 'pill',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // ── icon-only ──────────────────────────────────────────────────────────────
  if (variant === 'icon-only') {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => toggleTheme(e)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80',
          className
        )}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? 'dark-ico' : 'light-ico'}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-yellow-400" />
            ) : (
              <Moon className="h-4 w-4 text-amber-600" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    );
  }

  // ── bar (slider toggle) ────────────────────────────────────────────────────
  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={(e) => toggleTheme(e)}
        className={cn(
          'relative flex h-8 w-16 cursor-pointer items-center rounded-full p-1 transition-colors border focus:outline-none',
          isDark
            ? 'bg-slate-900 border-slate-700 ring-1 ring-amber-400/20'
            : 'bg-amber-100 border-amber-300 ring-1 ring-amber-400/30',
          className
        )}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        <motion.div
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md"
          animate={{
            x: isDark ? 30 : 0,
            rotate: isDark ? 360 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDark ? 'dark-bar' : 'light-bar'}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              {isDark ? (
                <Moon className="h-3.5 w-3.5 text-yellow-400" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </button>
    );
  }

  // ── large-card (profile page row) ─────────────────────────────────────────
  if (variant === 'large-card') {
    return (
      <button
        type="button"
        onClick={(e) => toggleTheme(e)}
        className={cn(
          'w-full flex items-center justify-between gap-3 cursor-pointer px-4 py-3.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5 focus:outline-none',
          className
        )}
        aria-label="Toggle Theme"
      >
        {/* Left: icon + label */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-amber-400/15 text-amber-600'
          )}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? 'dark-lc' : 'light-lc'}
                initial={{ rotate: -120, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 120, scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              >
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Appearance</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isDark ? 'Dark mode active' : 'Light mode active'}
            </p>
          </div>
        </div>

        {/* Right: animated slider */}
        <div className={cn(
          'relative flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors',
          isDark ? 'bg-indigo-600' : 'bg-amber-400'
        )}>
          <motion.div
            className="h-5 w-5 rounded-full bg-white shadow-md flex items-center justify-center"
            animate={{ x: isDark ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? 'dark-dot' : 'light-dot'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                {isDark
                  ? <Moon className="w-2.5 h-2.5 text-indigo-600" />
                  : <Sun className="w-2.5 h-2.5 text-amber-500" />
                }
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </button>
    );
  }

  // ── pill (default, navbar) ─────────────────────────────────────────────────
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={(e) => toggleTheme(e)}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold transition-all focus:outline-none',
        'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-sm',
        className
      )}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'dark-pill' : 'light-pill'}
          initial={{ rotate: -180, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 180, scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {isDark ? (
            <Sun className="h-3.5 w-3.5 text-yellow-400" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-amber-600" />
          )}
        </motion.div>
      </AnimatePresence>
      <span className="hidden sm:inline-block uppercase tracking-wider text-[10px]">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </motion.button>
  );
};
