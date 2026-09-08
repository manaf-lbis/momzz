import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

interface SlideToSignoffProps {
  onSignoff: () => Promise<void> | void;
  isLoading?: boolean;
  isVerified?: boolean;
  verifierName?: string;
  className?: string;
}

export const SlideToSignoff: React.FC<SlideToSignoffProps> = ({
  onSignoff,
  isLoading = false,
  isVerified = false,
  verifierName,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState<number>(240);
  const [hasTriggered, setHasTriggered] = useState<boolean>(false);

  const x = useMotionValue(0);

  // Compute maximum drag distance based on track width
  useEffect(() => {
    const updateMaxDrag = () => {
      if (containerRef.current) {
        const trackWidth = containerRef.current.clientWidth;
        // Button diameter is 44px, padding is 6px on each side (total 12px)
        const computedMax = Math.max(80, trackWidth - 44 - 12);
        setMaxDrag(computedMax);
      }
    };

    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, []);

  // Opacity of prompt text as slider moves right
  const textOpacity = useTransform(x, [0, maxDrag * 0.6], [1, 0.1]);
  // Background fill glow as slider moves
  const progressWidth = useTransform(x, [0, maxDrag], [0, maxDrag + 44]);

  const handleTrigger = async () => {
    if (isLoading || isVerified || hasTriggered) return;
    setHasTriggered(true);
    try {
      await onSignoff();
    } catch (e) {
      setHasTriggered(false);
    }
  };

  const handleDragEnd = async (_: any, info: any) => {
    if (isLoading || isVerified || hasTriggered) return;

    // Trigger if dragged over 70% of max distance
    if (info.offset.x >= maxDrag * 0.7) {
      handleTrigger();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-[360px] ${className}`}
    >
      <div
        ref={containerRef}
        className={`relative h-14 w-full rounded-full p-1.5 flex items-center select-none overflow-hidden backdrop-blur-2xl transition-all duration-300 ${
          isVerified
            ? 'bg-emerald-950/90 dark:bg-emerald-950/95 border-2 border-emerald-400/80 shadow-[0_12px_40px_rgba(16,185,129,0.35)]'
            : 'bg-slate-900/95 dark:bg-slate-950/95 border border-amber-400/50 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(251,191,36,0.25)]'
        }`}
      >
        {/* Top edge glass highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

        {/* Dynamic Drag Progress Fill */}
        {!isVerified && (
          <motion.div
            style={{ width: progressWidth }}
            className="absolute left-0 inset-y-0 bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-emerald-500/30 rounded-full pointer-events-none"
          />
        )}

        {/* Center Prompt Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
          {isVerified ? (
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>QA Signed Off {verifierName ? `• ${verifierName}` : '✓'}</span>
            </div>
          ) : isLoading || hasTriggered ? (
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-black uppercase tracking-wider">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Verifying & Signing Off...</span>
            </div>
          ) : (
            <motion.div
              style={{ opacity: textOpacity }}
              className="flex items-center gap-2 text-amber-300 dark:text-amber-400 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Slide to QA Sign-Off</span>
              <span className="flex items-center -space-x-1 text-amber-400/60">
                <ChevronRight className="w-3.5 h-3.5 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 animate-pulse delay-75" />
                <ChevronRight className="w-3.5 h-3.5 animate-pulse delay-150" />
              </span>
            </motion.div>
          )}
        </div>

        {/* Draggable Handle Button */}
        {!isVerified ? (
          <motion.div
            drag={isLoading || hasTriggered ? false : 'x'}
            dragConstraints={{ left: 0, right: maxDrag }}
            dragElastic={0.05}
            dragSnapToOrigin={!hasTriggered && !isLoading}
            onDragEnd={handleDragEnd}
            onClick={handleTrigger}
            style={{ x }}
            whileTap={{ scale: 0.94 }}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/50 cursor-grab active:cursor-grabbing z-10 shrink-0 touch-none"
          >
            {isLoading || hasTriggered ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
            ) : (
              <ChevronRight className="w-5 h-5 stroke-[3] text-slate-950 ml-0.5" />
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-11 h-11 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/50 z-10 shrink-0 ml-auto"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
export default SlideToSignoff;
