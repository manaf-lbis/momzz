import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

interface AnimatedThemeToggleProps {
  className?: string;
  variant?: 'pill' | 'icon-only' | 'bar';
}

export const AnimatedThemeToggle: React.FC<AnimatedThemeToggleProps> = ({
  className,
  variant = 'pill',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'icon-only') {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleTheme}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80',
          className
        )}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        <motion.div
          key={isDark ? 'dark' : 'light'}
          initial={{ rotate: -90, scale: 0, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-yellow-400" />
          ) : (
            <Moon className="h-4 w-4 text-amber-600" />
          )}
        </motion.div>
      </motion.button>
    );
  }

  if (variant === 'bar') {
    return (
      <div
        onClick={toggleTheme}
        className={cn(
          'relative flex h-8 w-16 cursor-pointer items-center rounded-full p-1 transition-colors border',
          isDark
            ? 'bg-slate-900 border-slate-700 ring-1 ring-amber-400/20'
            : 'bg-amber-100 border-amber-300 ring-1 ring-amber-400/30',
          className
        )}
        role="button"
        tabIndex={0}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
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
          {isDark ? (
            <Moon className="h-3.5 w-3.5 text-yellow-400" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold transition-all',
        'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-sm',
        className
      )}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Theme"
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -180, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {isDark ? (
          <Sun className="h-3.5 w-3.5 text-yellow-400" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-amber-600" />
        )}
      </motion.div>
      <span className="hidden sm:inline-block uppercase tracking-wider text-[10px]">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </motion.button>
  );
};
