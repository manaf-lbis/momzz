import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  ChevronRight,
  ChevronLeft,
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
  autoScrollInterval = 4000,
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = jobs.length;

  // Auto-scroll loop
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, autoScrollInterval);
    return () => clearInterval(timer);
  }, [total, isPaused, autoScrollInterval]);

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

  const currentJob = jobs[currentIndex];
  const nextJob = jobs[(currentIndex + 1) % total];
  const isReady = currentJob.totalTasks > 0 && currentJob.completedTasks === currentJob.totalTasks;
  const deliveryInfo = getDeliveryStatusInfo(currentJob.expectedDeliveryDate, isReady);

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % total);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + total) % total);

  return (
    <div
      className={cn('relative w-full select-none space-y-2', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2500)}
    >
      {/* ── INTERACTIVE SWIPEABLE CARD CONTAINER ── */}
      <div className="relative overflow-hidden min-h-[135px] sm:min-h-[145px] flex items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentJob.id + '-' + currentIndex}
            initial={{ opacity: 0, x: 50, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40) handleNext();
              else if (info.offset.x > 40) handlePrev();
            }}
            onClick={() => navigate(`/jobs/${currentJob.id}`)}
            className="w-full rounded-2xl p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-amber-400/50 dark:border-amber-400/40 shadow-lg shadow-amber-500/5 dark:shadow-black/50"
          >
            {/* Header: Vehicle Icon, Model & Reg Plate */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                    isReady
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  )}
                >
                  <Car className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight leading-tight truncate text-slate-900 dark:text-white">
                    {currentJob.vehicleName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] sm:text-xs font-mono font-black text-slate-950 bg-amber-400 px-2 py-0.5 rounded-md border border-amber-500/50 shadow-xs inline-block tracking-wider">
                      {currentJob.vehicleNumber}
                    </span>
                    {currentJob.vehicleColor && (
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        • {currentJob.vehicleColor}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {currentJob.isPinned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[9px] font-mono font-black border border-amber-400/30 shadow-2xs animate-pulse">
                    <Sparkles className="w-2.5 h-2.5" />
                    Priority
                  </span>
                )}
                {currentJob.expectedDeliveryDate && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${deliveryInfo.badgeClass}`}>
                    {deliveryInfo.shortLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Middle: Progress Bar Beam */}
            <div className="space-y-1.5 py-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px] sm:text-[10px] font-bold">
                  Progress
                </span>
                <span className="font-black text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20">
                  {currentJob.completedTasks}/{currentJob.totalTasks} ({currentJob.progressPercent}%)
                </span>
              </div>
              <ProgressBarBeam progress={currentJob.progressPercent} />
            </div>

            {/* Bottom: Delivery Status & Open CTA */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {currentJob.expectedDeliveryDate ? deliveryInfo.label : 'In Garage Service'}
                </span>
              </div>

              <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                <span>View Job</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── LOOP COUNTER & NAVIGATION CONTROLS ── */}
      {total > 1 && (
        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Vehicle {currentIndex + 1} of {total} • Swipe to loop
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition active:scale-90"
              title="Previous car"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Dot Stack Indicators */}
            <div className="flex items-center gap-1 px-1">
              {jobs.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
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

            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition active:scale-90"
              title="Next car"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
