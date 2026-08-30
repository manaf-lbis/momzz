import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Clock,
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

// Number of loop clone sets to ensure endless forward and backward sliding
const REPEAT_COUNT = 9;

export const IosNotificationStack: React.FC<IosNotificationStackProps> = ({
  jobs,
  className,
  autoScrollInterval = 6000,
}) => {
  const navigate = useNavigate();
  const total = jobs.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isDraggingRef = useRef(false);

  // Clamp index if jobs array changes
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(total - 1);
    }
  }, [total, currentIndex]);

  const handleNext = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  // Optional gentle auto-advance (paused on hover/touch)
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [total, isPaused, autoScrollInterval]);

  // Clean 1-card drag gesture
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 30;
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -threshold || velocity < -250) {
      handleNext();
    } else if (offset > threshold || velocity > 250) {
      handlePrev();
    } else if (Math.abs(offset) < 8 && Math.abs(info.offset.y) < 8) {
      // Direct tap without dragging
      if (currentJob?.id) {
        navigate(`/jobs/${currentJob.id}`);
      }
    }

    setTimeout(() => {
      isDraggingRef.current = false;
      setIsPaused(false);
    }, 100);
  };

  if (total === 0) {
    return (
      <div className="w-full h-32 flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-white/95 dark:bg-[#12131F]/90 border border-slate-200/80 dark:border-white/[0.08]">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-1">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">No Active Vehicles in Service</p>
        <p className="text-[10px] text-slate-500 font-mono">All workshop vehicles are clear</p>
      </div>
    );
  }

  const currentJob = jobs[currentIndex] || jobs[0];
  const isReady = currentJob.totalTasks > 0 && currentJob.completedTasks === currentJob.totalTasks;
  const deliveryInfo = getDeliveryStatusInfo(currentJob.expectedDeliveryDate, isReady);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDraggingRef.current && currentJob?.id) {
      navigate(`/jobs/${currentJob.id}`);
    }
  };

  return (
    <div
      className={cn('relative w-full space-y-2.5 select-none touch-manipulation', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 4000)}
    >
      {/* ── STABLE 1-CARD SNAP TRACK ── */}
      <div className="relative w-full overflow-hidden">
        <motion.div
          key={currentJob.id || currentIndex}
          initial={{ opacity: 0.85, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0.85, x: -20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragStart={() => {
            isDraggingRef.current = true;
            setIsPaused(true);
          }}
          onDragEnd={handleDragEnd}
          onTap={() => {
            if (currentJob?.id) {
              navigate(`/jobs/${currentJob.id}`);
            }
          }}
          onClick={handleCardClick}
          className={cn(
            'group relative w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between backdrop-blur-2xl transition-all duration-200 shadow-sm dark:shadow-xl dark:shadow-black/50 overflow-hidden',
            'bg-white/95 dark:bg-[#12131F]/90 border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/60 dark:hover:border-amber-400/50'
          )}
        >
          {currentJob.isPinned && (
            <BorderBeam size={200} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />
          )}

          <div>
            {/* Top Row: Vehicle Name, Plate, Status & Priority */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black uppercase tracking-tight truncate text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                    {currentJob.vehicleName}
                  </h4>
                  {isReady && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                  {currentJob.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[9px] font-mono font-black border border-amber-400/40 shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" /> Pinned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black text-slate-950 dark:text-amber-300 bg-amber-400/20 dark:bg-white/[0.08] px-2.5 py-0.5 rounded-lg border border-amber-400/30 dark:border-white/10 tracking-wider">
                    {currentJob.vehicleNumber}
                  </span>
                  {currentJob.vehicleColor && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      • {currentJob.vehicleColor}
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Info Badge */}
              {currentJob.expectedDeliveryDate && (
                <span className={cn('text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border shrink-0', deliveryInfo.badgeClass)}>
                  {deliveryInfo.shortLabel}
                </span>
              )}
            </div>

            {/* Progress Bar Beam */}
            <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
                  Service Tasks Progress
                </span>
                <span
                  className={cn(
                    'font-black text-xs px-2 py-0.5 rounded-md',
                    isReady
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-white/5 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-white/10'
                  )}
                >
                  {currentJob.completedTasks}/{currentJob.totalTasks} ({currentJob.progressPercent}%)
                </span>
              </div>
              <ProgressBarBeam progress={currentJob.progressPercent} />
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {currentJob.expectedDeliveryDate ? deliveryInfo.label : 'In Garage Service'}
              </span>
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (currentJob?.id) {
                  navigate(`/jobs/${currentJob.id}`);
                }
              }}
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold transition-colors shrink-0 group-hover:translate-x-0.5 cursor-pointer"
            >
              <span>View Job Card</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── CLEAN ERGONOMIC PAGINATION & CONTROLS ── */}
      {total > 1 && (
        <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Vehicle {currentIndex + 1} of {total}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Left Nav Arrow */}
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer border border-slate-200/80 dark:border-white/10"
              title="Previous vehicle"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dot Stack Indicators */}
            <div className="flex items-center gap-1 px-1">
              {jobs.slice(0, Math.min(total, 6)).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 cursor-pointer border-0 outline-none',
                    i === currentIndex
                      ? 'w-5 bg-amber-400 shadow-xs shadow-amber-400/50'
                      : 'w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-amber-400/60'
                  )}
                  title={`Vehicle ${i + 1}`}
                />
              ))}
              {total > 6 && <span className="text-[10px] text-slate-400">+{total - 6}</span>}
            </div>

            {/* Right Nav Arrow */}
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer border border-slate-200/80 dark:border-white/10"
              title="Next vehicle"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
