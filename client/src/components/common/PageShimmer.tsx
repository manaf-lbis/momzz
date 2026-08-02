import React from 'react';
import { motion } from 'framer-motion';

export const NeonSpinner: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <span className={`${size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-[3px]'} inline-block rounded-full border-t-amber-400 border-r-transparent border-b-amber-400/30 border-l-transparent animate-spin shadow-lg shadow-amber-400/20`} />
);

export const PageShimmer: React.FC<{ label?: string; cards?: number }> = ({ label = 'Loading workspace', cards = 4 }) => (
  <div className="py-8 space-y-3" aria-label={label} role="status">
    {Array.from({ length: cards }, (_, index) => (
      <motion.div key={index} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.06 }} className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 h-20">
        <div className="h-3 w-2/5 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-2 w-3/5 rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        <motion.div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 dark:via-zinc-700/50 to-transparent" animate={{ x: ['-120%', '260%'] }} transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.1, ease: 'linear' }} />
      </motion.div>
    ))}
    <div className="flex justify-center items-center gap-2 pt-2 text-xs font-mono font-bold uppercase text-amber-600 dark:text-yellow-400"><NeonSpinner />{label}</div>
  </div>
);
