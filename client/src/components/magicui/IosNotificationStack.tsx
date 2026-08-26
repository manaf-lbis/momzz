import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Clock,
  Pin,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProgressBarBeam } from './AnimatedBeam';
import { BorderBeam } from './BorderBeam';
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
  autoScrollInterval = 4500,
}) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = jobs.length;

  // Track active item on scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.clientWidth * 0.77 + 12; // 77% card width + 12px gap
    const newIndex = Math.round(scrollLeft / itemWidth);
    if (newIndex >= 0 && newIndex < total && newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  // Scroll to a specific index
  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const itemWidth = container.clientWidth * 0.77 + 12;
    container.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % total;
    scrollToIndex(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (activeIndex - 1 + total) % total;
    scrollToIndex(prevIndex);
  };

  // Auto-scroll loop
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [total, isPaused, activeIndex, autoScrollInterval]);

  if (total === 0) {
    return (
      <div className="w-full h-32 flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
        <p className="text-xs font-bold text-slate-200 font-mono">No Active Vehicles in Service</p>
        <p className="text-[10px] text-slate-500 font-mono">All workshop vehicles are clear</p>
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full select-none space-y-2.5', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
    >
      {/* ── 1.3 CARDS SMOOTH HORIZONTAL PEEK TRACK ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 px-0.5 no-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {jobs.map((job, idx) => {
          const isReady = job.totalTasks > 0 && job.completedTasks === job.totalTasks;
          const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);
          const isActive = idx === activeIndex;

          return (
            <motion.div
              key={job.id + '-' + idx}
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className={cn(
                'group relative shrink-0 w-[77%] sm:w-[78%] md:w-[74%] snap-start rounded-2xl p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between backdrop-blur-2xl transition-all duration-300 shadow-lg shadow-black/40 overflow-hidden',
                isActive
                  ? 'bg-white/[0.045] border border-amber-400/40 hover:border-amber-400/70 shadow-amber-500/5'
                  : 'bg-white/[0.025] border border-white/[0.07] opacity-85 hover:opacity-100 hover:border-white/20'
              )}
            >
              {job.isPinned && (
                <BorderBeam size={160} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={0.75} />
              )}

              <div>
                {/* Top Row: Vehicle Name, Reg Plate & Ready Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight truncate text-white group-hover:text-amber-200 transition-colors">
                        {job.vehicleName}
                      </h4>
                      {isReady && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-black text-amber-300/90 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/10 tracking-wider">
                        {job.vehicleNumber}
                      </span>
                      {job.vehicleColor && (
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          • {job.vehicleColor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority / Delivery Pill */}
                  <div className="flex items-center gap-1 shrink-0">
                    {job.isPinned && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[8px] font-mono font-black border border-amber-400/40 shadow-xs">
                        <Sparkles className="w-2.5 h-2.5" />
                        Pin
                      </span>
                    )}
                    {job.expectedDeliveryDate && (
                      <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border', deliveryInfo.badgeClass)}>
                        {deliveryInfo.shortLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar Beam */}
                <div className="space-y-1 mt-2.5 pt-2 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 uppercase font-bold">
                      Progress
                    </span>
                    <span
                      className={cn(
                        'font-black text-[10px] px-1.5 py-0.2 rounded',
                        isReady
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-amber-300 border border-white/10'
                      )}
                    >
                      {job.completedTasks}/{job.totalTasks} ({job.progressPercent}%)
                    </span>
                  </div>
                  <ProgressBarBeam progress={job.progressPercent} />
                </div>
              </div>

              {/* Bottom CTA Strip */}
              <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1 text-slate-400 truncate">
                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {job.expectedDeliveryDate ? deliveryInfo.label : 'In Garage Service'}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 text-slate-300 group-hover:text-amber-300 font-bold transition-colors shrink-0">
                  <span>Checklist</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── PEAK FLOW CONTROLS & PAGINATION INDICATOR ── */}
      {total > 1 && (
        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Vehicle {activeIndex + 1} of {total} • Swipe to browse
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:text-amber-400 hover:bg-white/10 transition active:scale-90 cursor-pointer"
              title="Previous vehicle"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Dot Stack Indicators */}
            <div className="flex items-center gap-1 px-1">
              {jobs.slice(0, Math.min(total, 6)).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 cursor-pointer',
                    i === activeIndex
                      ? 'w-4 bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'w-1.5 bg-white/20 hover:bg-amber-400/60'
                  )}
                  title={`Vehicle ${i + 1}`}
                />
              ))}
              {total > 6 && <span className="text-[8px] text-slate-500">+{total - 6}</span>}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:text-amber-400 hover:bg-white/10 transition active:scale-90 cursor-pointer"
              title="Next vehicle"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
