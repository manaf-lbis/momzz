import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface ModernInfiniteLoaderProps {
  /** Ref attached to the sentinel DOM node observed by IntersectionObserver */
  sentinelRef?: React.Ref<HTMLDivElement>;
  /** Whether there are more items to fetch from subsequent pages */
  hasMore: boolean;
  /** Whether an active fetch is currently in progress */
  isLoading: boolean;
  /** Total count of items currently accumulated/displayed */
  totalCount?: number;
  /** Name of the entity being loaded (e.g. 'vehicles', 'parts', 'records') */
  entityName?: string;
  /** Custom text to display during fetch */
  loadingLabel?: string;
  /** Optional custom CSS classes for the container */
  className?: string;
}

export const ModernInfiniteLoader: React.FC<ModernInfiniteLoaderProps> = ({
  sentinelRef,
  hasMore,
  isLoading,
  totalCount,
  entityName = 'items',
  loadingLabel,
  className = '',
}) => {
  // If there are no items loaded at all, don't show infinite scroll footer
  if (totalCount !== undefined && totalCount === 0) {
    return null;
  }

  return (
    <div className={`py-6 flex flex-col items-center justify-center gap-2 select-none ${className}`}>
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center justify-center gap-2.5 px-4 py-2 text-center"
        >
          {/* Dual-ring glowing spinner */}
          <div className="relative flex items-center justify-center w-8 h-8">
            {/* Outer ambient glow */}
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-sm animate-pulse" />

            {/* Background track ring */}
            <div className="absolute inset-0 rounded-full border-2 border-slate-200/60 dark:border-white/10" />

            {/* Spinning gradient arc */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 border-r-amber-400 dark:border-t-amber-400 dark:border-r-amber-300 animate-spin" />

            {/* Inner pulsing core dot */}
            <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping opacity-75" />
          </div>

          {/* Loading label with animated pulse */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            <span>{loadingLabel || `Loading more ${entityName}`}</span>
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-bounce" />
            </span>
          </div>
        </div>
      ) : (
        /* Polished end-of-feed completion state */
        totalCount !== undefined && totalCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] backdrop-blur-md text-slate-500 dark:text-slate-400 text-[11px] font-mono shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>
              All {totalCount} {entityName} loaded
            </span>
          </div>
        )
      )}
    </div>
  );
};

export default ModernInfiniteLoader;
