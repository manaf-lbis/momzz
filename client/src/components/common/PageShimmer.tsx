import React from 'react';
import { motion } from 'framer-motion';

export const NeonSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-[2px]',
    md: 'w-6 h-6 border-[2.5px]',
    lg: 'w-10 h-10 border-[3.5px]',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer Pulse Glow */}
      <span className={`absolute -inset-1 rounded-full bg-amber-400/25 blur-sm animate-ping`} />
      {/* Outer Rotating Neon Track */}
      <span
        className={`${sizeClasses[size]} rounded-full border-t-amber-500 border-r-amber-400 border-b-transparent border-l-transparent animate-spin`}
      />
      {/* Inner Counter-Rotating Core Ring */}
      <span
        className={`absolute inset-1 rounded-full border-b-emerald-400 border-l-transparent border-t-transparent border-r-transparent animate-spin`}
        style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
      />
    </div>
  );
};

export const PageShimmer: React.FC<{ label?: string; cards?: number }> = ({
  label = 'Loading workspace...',
  cards = 4,
}) => (
  <div className="py-6 sm:py-8 space-y-4 max-w-4xl mx-auto w-full px-2" aria-label={label} role="status">
    {/* Floating Animated Header Badge */}
    <div className="flex justify-center items-center gap-3 py-2 px-4 mx-auto w-fit rounded-full bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-md backdrop-blur-md">
      <NeonSpinner size="sm" />
      <span className="text-xs font-mono font-black tracking-widest uppercase text-amber-600 dark:text-amber-400 drop-shadow-xs">
        {label}
      </span>
    </div>

    {/* Shimmering Cards */}
    {Array.from({ length: cards }, (_, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="relative overflow-hidden rounded-2xl glass-card p-4 sm:p-5 h-20 sm:h-24 border border-white/60 dark:border-white/10"
      >
        <div className="flex items-center gap-3 h-full">
          <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded-lg bg-slate-200/90 dark:bg-slate-700/70" />
            <div className="h-2.5 w-2/3 rounded-md bg-slate-200/60 dark:bg-slate-800/60" />
          </div>
        </div>

        {/* Dynamic Light Beam Sweep */}
        <motion.div
          className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-white/80 dark:via-amber-400/15 to-transparent"
          animate={{ x: ['-120%', '280%'] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: index * 0.12,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    ))}
  </div>
);

