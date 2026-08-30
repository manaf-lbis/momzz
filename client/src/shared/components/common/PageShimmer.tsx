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
      <span className="absolute -inset-1 rounded-full bg-amber-400/25 blur-sm animate-ping" />
      {/* Outer Rotating Track */}
      <span
        className={`${sizeClasses[size]} rounded-full border-t-amber-500 border-r-amber-400 border-b-transparent border-l-transparent animate-spin`}
      />
      {/* Inner Rotating Ring */}
      <span
        className="absolute inset-1 rounded-full border-b-amber-400 border-l-transparent border-t-transparent border-r-transparent animate-spin"
        style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
      />
    </div>
  );
};

/* ── Light Sweep Animation Overlay ── */
const ShimmerSweep: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.07] to-transparent"
    animate={{ translateX: ['-100%', '200%'] }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      delay,
      ease: 'easeInOut',
    }}
  />
);

/* ── Universal Bento Card Skeleton ── */
export const BentoCardSkeleton: React.FC<{ className?: string; height?: string; delay?: number }> = ({
  className = '',
  height = 'h-36',
  delay = 0,
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-white/[0.035] backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs flex flex-col justify-between ${height} ${className}`}
  >
    <ShimmerSweep delay={delay} />
    <div className="flex items-start justify-between gap-3">
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-200/80 dark:bg-white/10" />
      <div className="w-16 h-5 rounded-full bg-slate-200/80 dark:bg-white/10" />
    </div>
    <div className="space-y-2 mt-auto">
      <div className="w-3/5 h-4 sm:h-5 rounded-lg bg-slate-200/90 dark:bg-white/15" />
      <div className="w-2/5 h-3 rounded-md bg-slate-200/60 dark:bg-white/10" />
    </div>
  </div>
);

/* ── Generic / Fallback Page Shimmer ── */
export const PageShimmer: React.FC<{ label?: string; cards?: number }> = ({
  label = 'Loading...',
  cards = 4,
}) => (
  <div className="py-4 space-y-3 max-w-7xl mx-auto w-full px-2" aria-label={label} role="status">
    {/* Floating Header Badge */}
    <div className="flex justify-center items-center gap-2.5 py-1.5 px-4 mx-auto w-fit rounded-full bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
      <NeonSpinner size="sm" />
      <span className="text-[11px] font-mono font-black tracking-wider uppercase text-amber-600 dark:text-amber-400">
        {label}
      </span>
    </div>

    {/* Responsive Bento Grid of Skeleton Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: cards }, (_, i) => (
        <BentoCardSkeleton key={i} delay={i * 0.08} />
      ))}
    </div>
  </div>
);

/* ── Dashboard Specific Bento Skeleton ── */
export const DashboardBentoSkeleton: React.FC = () => (
  <div className="space-y-4 max-w-7xl w-full mx-auto" aria-label="Loading dashboard" role="status">
    {/* Header Greeting Skeleton */}
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-white/[0.035] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 flex items-center justify-between">
      <ShimmerSweep />
      <div className="space-y-2">
        <div className="w-24 h-5 rounded-full bg-slate-200/80 dark:bg-white/10" />
        <div className="w-48 sm:w-64 h-7 sm:h-9 rounded-xl bg-slate-200/90 dark:bg-white/15" />
        <div className="w-32 h-3.5 rounded-md bg-slate-200/60 dark:bg-white/10" />
      </div>
      <div className="hidden sm:flex gap-4">
        <div className="w-16 h-12 rounded-xl bg-slate-200/70 dark:bg-white/10" />
        <div className="w-16 h-12 rounded-xl bg-slate-200/70 dark:bg-white/10" />
      </div>
    </div>

    {/* Bento Grid layout */}
    <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-3">
      {/* Hero Workflow Stack Skeleton (col 7) */}
      <div className="col-span-2 sm:col-span-6 lg:col-span-7 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.08] p-5 min-h-[220px] flex flex-col justify-between">
        <ShimmerSweep delay={0.1} />
        <div className="flex items-center justify-between">
          <div className="w-32 h-6 rounded-xl bg-slate-200/80 dark:bg-white/15" />
          <div className="w-20 h-6 rounded-lg bg-slate-200/60 dark:bg-white/10" />
        </div>
        <div className="space-y-2 my-auto">
          <div className="w-full h-16 rounded-2xl bg-slate-200/50 dark:bg-white/5" />
        </div>
      </div>

      {/* 2 Quick Cards (col 5) */}
      <div className="col-span-2 sm:col-span-3 lg:col-span-5 grid grid-cols-2 gap-3">
        <BentoCardSkeleton height="min-h-[140px] sm:min-h-[220px]" delay={0.15} />
        <BentoCardSkeleton height="min-h-[140px] sm:min-h-[220px]" delay={0.2} />
      </div>

      {/* Row 2: 4 compact cards */}
      <BentoCardSkeleton className="col-span-1 sm:col-span-2 lg:col-span-3" height="min-h-[130px]" delay={0.25} />
      <BentoCardSkeleton className="col-span-1 sm:col-span-2 lg:col-span-3" height="min-h-[130px]" delay={0.3} />
      <BentoCardSkeleton className="col-span-1 sm:col-span-2 lg:col-span-3" height="min-h-[130px]" delay={0.35} />
      <BentoCardSkeleton className="col-span-1 sm:col-span-2 lg:col-span-3" height="min-h-[130px]" delay={0.4} />

      {/* Row 3: Admin / Wide Cards */}
      <BentoCardSkeleton className="col-span-1 sm:col-span-2 lg:col-span-4" height="min-h-[130px]" delay={0.45} />
      <BentoCardSkeleton className="col-span-1 sm:col-span-2 lg:col-span-4" height="min-h-[130px]" delay={0.5} />
      <BentoCardSkeleton className="col-span-2 sm:col-span-2 lg:col-span-4" height="min-h-[130px]" delay={0.55} />
    </div>
  </div>
);

/* ── Jobs List Bento Skeleton ── */
export const JobsListSkeleton: React.FC = () => (
  <div className="space-y-3 max-w-7xl w-full mx-auto" aria-label="Loading active jobs" role="status">
    {/* Tabs Skeleton */}
    <div className="h-11 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10" />
    {/* Search & Sort Skeleton */}
    <div className="h-10 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10" />
    {/* Vehicle Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] p-3.5 space-y-3"
        >
          <ShimmerSweep delay={i * 0.08} />
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-4 rounded bg-slate-200/80 dark:bg-white/15" />
              <div className="w-24 h-4 rounded bg-slate-200/60 dark:bg-white/10" />
            </div>
            <div className="w-16 h-6 rounded-lg bg-slate-200/60 dark:bg-white/10" />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
            <div className="w-full h-1.5 rounded-full bg-slate-200/60 dark:bg-white/10" />
            <div className="flex justify-between">
              <div className="w-20 h-3 rounded bg-slate-200/50 dark:bg-white/5" />
              <div className="w-12 h-3 rounded bg-slate-200/50 dark:bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Leaderboard Bento Skeleton ── */
export const LeaderboardSkeleton: React.FC = () => (
  <div className="space-y-4 max-w-6xl w-full mx-auto" aria-label="Loading leaderboard" role="status">
    {/* Timeframe Tabs */}
    <div className="h-11 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10" />
    {/* User Standing Hero */}
    <div className="h-20 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10" />
    {/* Grid: Podium (Left) + List (Right) */}
    <div className="lg:grid lg:grid-cols-5 lg:gap-6 space-y-4 lg:space-y-0">
      <div className="lg:col-span-2 h-72 rounded-3xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10" />
      <div className="lg:col-span-3 space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10" />
        ))}
      </div>
    </div>
  </div>
);

