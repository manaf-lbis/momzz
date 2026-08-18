import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Users, User, X, Check, Loader2 } from 'lucide-react';
import { JobCardData } from '../../api/jobApi';

interface PinJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobCardData | null;
  currentUserId?: string;
  isAdmin?: boolean;
  onTogglePin: (jobCardId: string, mode: 'ALL' | 'ME') => Promise<void>;
  isPinningMode?: 'ALL' | 'ME' | null;
}

export const PinJobModal: React.FC<PinJobModalProps> = ({
  isOpen,
  onClose,
  job,
  currentUserId,
  onTogglePin,
  isPinningMode = null,
}) => {
  if (!isOpen || !job) return null;

  const jobId = job.id || job._id!;
  const isPinnedForAll = !!job.isPinnedForAll;
  const isPinnedForMe =
    Array.isArray(job.pinnedBy) &&
    job.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === currentUserId);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-2xs">
                <Pin className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                  Pin Job Card
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {job.vehicleName}
                  </span>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {job.vehicleNumber}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Options: Full Cards are Clickable (No small separate buttons) */}
          <div className="p-4 sm:p-5 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Tap a card below to pin or unpin this vehicle:
            </p>

            {/* Option 1: Complete Pin for All (Entire Card Clickable) */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (isPinningMode === null) {
                  onTogglePin(jobId, 'ALL');
                }
              }}
              className={`p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                isPinnedForAll
                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/50 ring-2 ring-amber-400/40 shadow-sm'
                  : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400/50 dark:hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3.5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isPinnedForAll
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-zinc-900 dark:text-white">
                        Complete pin for all
                      </span>
                      {isPinnedForAll && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[9px] font-mono font-black uppercase shadow-2xs">
                          Pinned for All
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Keeps this vehicle at the top of the job cards list for every mechanic and advisor.
                    </p>
                  </div>
                </div>

                {/* Right Status Indicator */}
                <div className="shrink-0 flex items-center justify-center">
                  {isPinningMode === 'ALL' ? (
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : isPinnedForAll ? (
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 flex items-center justify-center text-transparent hover:border-amber-400 transition-colors">
                      <Pin className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Option 2: Pin for Me (Entire Card Clickable) */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (isPinningMode === null) {
                  onTogglePin(jobId, 'ME');
                }
              }}
              className={`p-4 rounded-2xl border cursor-pointer select-none transition-all ${
                isPinnedForMe
                  ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/50 ring-2 ring-blue-400/40 shadow-sm'
                  : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-blue-400/50 dark:hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3.5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isPinnedForMe
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-zinc-900 dark:text-white">
                        Pin for me
                      </span>
                      {isPinnedForMe && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500 text-white text-[9px] font-mono font-black uppercase shadow-2xs">
                          Pinned for You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Pins this vehicle at the top only for your personal view and logged-in account.
                    </p>
                  </div>
                </div>

                {/* Right Status Indicator */}
                <div className="shrink-0 flex items-center justify-center">
                  {isPinningMode === 'ME' ? (
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : isPinnedForMe ? (
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 flex items-center justify-center text-transparent hover:border-blue-400 transition-colors">
                      <Pin className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs rounded-xl hover:opacity-90 transition active:scale-95 shadow-sm"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
