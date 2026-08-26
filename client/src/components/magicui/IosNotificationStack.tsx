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
  autoScrollInterval = 4500,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const total = jobs.length;

  // Start in the middle repetition for infinite scroll in both directions
  const baseOffset = Math.floor(REPEAT_COUNT / 2) * total;
  const [virtualIndex, setVirtualIndex] = useState(baseOffset);
  const [isPaused, setIsPaused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(400);
  const isDraggingRef = useRef(false);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Compute repeated array
  const repeatedJobs = React.useMemo(() => {
    if (total === 0) return [];
    const list: { job: StackJobCardItem; uniqueKey: string; originalIndex: number }[] = [];
    for (let r = 0; r < REPEAT_COUNT; r++) {
      for (let i = 0; i < total; i++) {
        list.push({
          job: jobs[i],
          uniqueKey: `${r}-${jobs[i].id || i}`,
          originalIndex: i,
        });
      }
    }
    return list;
  }, [jobs, total]);

  // Card dimensions for 1.3 card peek effect (78% card width + 12px gap)
  const cardWidth = Math.max(220, containerWidth * 0.78);
  const cardGap = 12;
  const slideStep = cardWidth + cardGap;

  // Active original job index (0 to total-1)
  const activeOriginalIndex = total > 0 ? ((virtualIndex % total) + total) % total : 0;

  const handleNext = () => {
    setVirtualIndex((prev) => {
      const next = prev + 1;
      // If we approach the right edge of repetitions, wrap smoothly
      if (next >= repeatedJobs.length - total) {
        return baseOffset + (next % total);
      }
      return next;
    });
  };

  const handlePrev = () => {
    setVirtualIndex((prev) => {
      const next = prev - 1;
      // If we approach the left edge of repetitions, wrap smoothly
      if (next < total) {
        return baseOffset + (((next % total) + total) % total);
      }
      return next;
    });
  };

  const handleDotClick = (targetOriginalIndex: number) => {
    const diff = targetOriginalIndex - activeOriginalIndex;
    setVirtualIndex((prev) => prev + diff);
  };

  // Auto-scroll loop
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [total, isPaused, virtualIndex, autoScrollInterval]);

  // Drag handling with Framer Motion Pan
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 35;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || velocity < -200) {
      handleNext();
    } else if (offset > threshold || velocity > 200) {
      handlePrev();
    }

    setTimeout(() => {
      isDraggingRef.current = false;
      setIsPaused(false);
    }, 150);
  };

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
      className={cn('relative w-full space-y-2.5 overflow-hidden', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
    >
      {/* ── 1.3 CARDS SEAMLESS INFINITE SLIDING TRACK ── */}
      <div ref={containerRef} className="relative w-full overflow-hidden py-1 px-0.5">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragStart={() => {
            isDraggingRef.current = true;
            setIsPaused(true);
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: -virtualIndex * slideStep }}
          transition={{
            type: 'spring',
            stiffness: 240,
            damping: 28,
            mass: 0.75,
          }}
          className="flex cursor-grab active:cursor-grabbing"
          style={{ gap: `${cardGap}px` }}
        >
          {repeatedJobs.map((item, idx) => {
            const job = item.job;
            const isReady = job.totalTasks > 0 && job.completedTasks === job.totalTasks;
            const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);
            const isCurrentActive = idx === virtualIndex;

            return (
              <div
                key={item.uniqueKey + '-' + idx}
                style={{ width: `${cardWidth}px` }}
                onClick={() => {
                  if (!isDraggingRef.current) {
                    navigate(`/jobs/${job.id}`);
                  }
                }}
                className={cn(
                  'group relative shrink-0 rounded-2xl p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between backdrop-blur-2xl transition-all duration-300 shadow-lg shadow-black/40 overflow-hidden select-none',
                  isCurrentActive
                    ? 'bg-white/[0.045] border border-amber-400/40 hover:border-amber-400/70 shadow-amber-500/5 scale-100 opacity-100'
                    : 'bg-white/[0.02] border border-white/[0.07] opacity-75 hover:opacity-95 scale-[0.98]'
                )}
              >
                {job.isPinned && isCurrentActive && (
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
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* ── PEAK FLOW CONTROLS & PAGINATION INDICATOR ── */}
      {total > 1 && (
        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Vehicle {activeOriginalIndex + 1} of {total} • Infinite loop
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Left Arrow: Zero borders, zero rings */}
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-full text-slate-400 hover:text-amber-300 hover:bg-white/10 active:scale-90 transition cursor-pointer border-0 outline-none ring-0 shadow-none"
              title="Previous vehicle"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dot Stack Indicators */}
            <div className="flex items-center gap-1 px-0.5">
              {jobs.slice(0, Math.min(total, 6)).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDotClick(i)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 cursor-pointer border-0 outline-none',
                    i === activeOriginalIndex
                      ? 'w-4 bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'w-1.5 bg-white/20 hover:bg-amber-400/60'
                  )}
                  title={`Vehicle ${i + 1}`}
                />
              ))}
              {total > 6 && <span className="text-[8px] text-slate-500">+{total - 6}</span>}
            </div>

            {/* Right Arrow: Zero borders, zero rings */}
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-full text-slate-400 hover:text-amber-300 hover:bg-white/10 active:scale-90 transition cursor-pointer border-0 outline-none ring-0 shadow-none"
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
