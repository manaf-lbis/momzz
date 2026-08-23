import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProgressBarBeam } from './AnimatedBeam';
import { getDeliveryStatusInfo } from '../../utils/dateUtils';

export interface StackJobCardItem {
  id: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  expectedDeliveryDate?: string;
  isPinned?: boolean;
  createdAt?: string;
}

interface IosNotificationStackProps {
  jobs: StackJobCardItem[];
  className?: string;
  autoScrollInterval?: number;
}

export const IosNotificationStack: React.FC<IosNotificationStackProps> = ({
  jobs,
  className,
  autoScrollInterval = 3400,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isAutoScrollingRef = useRef(false);

  const total = jobs.length;

  // Tripled list for seamless infinite circular loop
  const infiniteJobs = total > 1 ? [...jobs, ...jobs, ...jobs] : jobs;

  // Scroll to a specific card index
  const scrollToItem = useCallback((virtualIdx: number, smooth = true) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardEl = container.children[virtualIdx] as HTMLElement;
    if (cardEl) {
      isAutoScrollingRef.current = true;
      container.scrollTo({
        left: cardEl.offsetLeft - container.offsetLeft - 4,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setCurrentIndex(virtualIdx % total);
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 400);
    }
  }, [total]);

  // Initial center alignment
  useEffect(() => {
    if (total > 1 && scrollRef.current) {
      const startIdx = total;
      scrollToItem(startIdx, false);
    }
  }, [total, scrollToItem]);

  // Handle continuous loop bounds reset on scroll
  const handleScroll = () => {
    if (!scrollRef.current || total <= 1) return;
    const container = scrollRef.current;
    const firstCard = container.children[0] as HTMLElement;
    if (!firstCard) return;

    const itemWidth = firstCard.offsetWidth + 12;
    const scrollLeft = container.scrollLeft;
    const setWidth = itemWidth * total;

    if (scrollLeft >= setWidth * 2) {
      container.scrollLeft -= setWidth;
    } else if (scrollLeft <= setWidth * 0.2) {
      container.scrollLeft += setWidth;
    }

    const currentVirtualIdx = Math.round(container.scrollLeft / itemWidth);
    setCurrentIndex(currentVirtualIdx % total);
  };

  // Continuous forward auto-scroll loop
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const firstCard = container.children[0] as HTMLElement;
      if (!firstCard) return;

      const itemWidth = firstCard.offsetWidth + 12;
      const currentVirtualIdx = Math.round(container.scrollLeft / itemWidth);
      const nextVirtualIdx = currentVirtualIdx + 1;

      scrollToItem(nextVirtualIdx, true);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [total, isPaused, autoScrollInterval, scrollToItem]);

  if (total === 0) {
    return (
      <div className="w-full h-28 flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">No Active Jobs in Service</p>
        <p className="text-[10px] text-slate-400 font-mono">All workshop vehicles are clear</p>
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full select-none', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2200)}
    >
      {/* ── 1.5 CARD INFINITE SNAP-SCROLL CONTAINER ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2.5 sm:gap-3.5 overflow-x-auto snap-x snap-mandatory no-scrollbar py-1 px-1 scroll-smooth"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {infiniteJobs.map((job, idx) => {
          const originalIdx = idx % total;
          const isActive = originalIdx === currentIndex;
          const isReady = job.totalTasks > 0 && job.completedTasks === job.totalTasks;
          const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);

          return (
            <motion.div
              key={`${job.id}-${idx}`}
              initial={false}
              animate={{
                scale: isActive ? 1 : 0.96,
                opacity: isActive ? 1 : 0.82,
                y: isActive ? 0 : 2,
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              whileHover={{ y: -3, scale: isActive ? 1.01 : 0.98 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className={cn(
                'snap-start shrink-0 rounded-2xl p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between transition-all backdrop-blur-xl h-[126px] sm:h-[136px]',
                // Exactly 1.5 cards visible width
                'w-[74%] sm:w-[68%] md:w-[66%] lg:w-[65%]',
                isActive
                  ? 'bg-white/95 dark:bg-slate-900/95 border border-amber-400/50 dark:border-amber-400/40 shadow-md shadow-amber-500/5 dark:shadow-black/50 z-10'
                  : 'bg-white/75 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800/80 shadow-xs z-0'
              )}
            >
              {/* Header: Vehicle Icon, Model & Reg Plate */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                      isReady
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    )}
                  >
                    <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className={cn(
                        'text-xs sm:text-sm font-black uppercase tracking-tight leading-tight truncate transition-colors',
                        isActive
                          ? 'text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {job.vehicleName}
                    </h4>
                    <span className="text-[10px] sm:text-xs font-mono font-black text-slate-950 bg-amber-400 px-2 py-0.5 rounded-md border border-amber-500/50 shadow-xs inline-block mt-0.5 tracking-wider">
                      {job.vehicleNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {job.isPinned && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[8px] font-mono font-black border border-amber-400/30 shadow-2xs animate-pulse">
                      <Sparkles className="w-2 h-2" />
                      Priority
                    </span>
                  )}
                  {job.expectedDeliveryDate && (
                    <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${deliveryInfo.badgeClass}`}>
                      {deliveryInfo.shortLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Middle: Progress Bar Beam */}
              <div className="space-y-1 py-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px] sm:text-[10px] font-bold">
                    Progress
                  </span>
                  <span className="font-black text-amber-700 dark:text-amber-300 text-xs px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20">
                    {job.completedTasks}/{job.totalTasks} ({job.progressPercent}%)
                  </span>
                </div>
                <ProgressBarBeam progress={job.progressPercent} />
              </div>

              {/* Bottom: Delivery Status & Open CTA */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-mono">
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {job.expectedDeliveryDate ? deliveryInfo.label : 'In Service'}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <span>Open</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── STACK FOOTER: INFINITE LOOP COUNTER & DOT INDICATORS ── */}
      {total > 1 && (
        <div className="mt-2 flex items-center justify-between px-1 text-[9px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              {currentIndex + 1} of {total} active vehicles • Live Loop
            </span>
          </div>

          {/* Dot Stack Indicators */}
          <div className="flex items-center gap-1">
            {jobs.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToItem(total + i, true);
                }}
                className={cn(
                  'h-1 rounded-full transition-all duration-300 cursor-pointer',
                  i === currentIndex
                    ? 'w-4 bg-amber-500 dark:bg-amber-400'
                    : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-amber-300'
                )}
                title={`Vehicle ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
