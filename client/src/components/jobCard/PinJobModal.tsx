import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Users, User, X, Check, Loader2, Globe, Lock } from 'lucide-react';
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
  isAdmin,
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                  Pin Vehicle
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                    {job.vehicleName}
                  </span>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950">
                    {job.vehicleNumber}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-zinc-100 dark:border-zinc-800" />

          {/* Options */}
          <div className="p-3 space-y-2.5">
            {/* ── PIN FOR ALL (Admin-Only or shown always) ── */}
            {isAdmin && (
              <motion.button
                type="button"
                whileHover={{ scale: isPinningMode !== null ? 1 : 1.01 }}
                whileTap={{ scale: isPinningMode !== null ? 1 : 0.97 }}
                disabled={isPinningMode !== null}
                onClick={() => onTogglePin(jobId, 'ALL')}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  isPinnedForAll
                    ? 'border-amber-400 bg-amber-500/10 dark:bg-amber-500/15'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-amber-400/60'
                }`}
              >
                {/* Active glow */}
                {isPinnedForAll && (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent pointer-events-none" />
                )}
                <div className="relative flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isPinnedForAll
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    <Globe className="w-5 h-5" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-black ${isPinnedForAll ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-900 dark:text-white'}`}>
                        Pin for everyone
                      </span>
                      {isPinnedForAll && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-mono font-black uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                      Stays at top for all mechanics & advisors
                    </p>
                  </div>

                  {/* State Indicator */}
                  <div className="shrink-0">
                    {isPinningMode === 'ALL' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      </div>
                    ) : isPinnedForAll ? (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </motion.div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                        <Pin className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            )}

            {/* ── PIN FOR ME ── */}
            <motion.button
              type="button"
              whileHover={{ scale: isPinningMode !== null ? 1 : 1.01 }}
              whileTap={{ scale: isPinningMode !== null ? 1 : 0.97 }}
              disabled={isPinningMode !== null}
              onClick={() => onTogglePin(jobId, 'ME')}
              className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                isPinnedForMe
                  ? 'border-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/15'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-indigo-400/60'
              }`}
            >
              {isPinnedForMe && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 via-transparent to-transparent pointer-events-none" />
              )}
              <div className="relative flex items-center gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isPinnedForMe
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                  <Lock className="w-5 h-5" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-black ${isPinnedForMe ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-900 dark:text-white'}`}>
                      Pin just for me
                    </span>
                    {isPinnedForMe && (
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-[9px] font-mono font-black uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                    Visible only to you in your own view
                  </p>
                </div>

                {/* State Indicator */}
                <div className="shrink-0">
                  {isPinningMode === 'ME' ? (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    </div>
                  ) : isPinnedForMe ? (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  )}
                </div>
              </div>
            </motion.button>

            {/* Status summary pill */}
            {(isPinnedForAll || isPinnedForMe) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-1.5">
                  {isPinnedForAll && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      <Globe className="w-3 h-3" /> All
                    </span>
                  )}
                  {isPinnedForAll && isPinnedForMe && (
                    <span className="text-zinc-400 text-[10px]">+</span>
                  )}
                  {isPinnedForMe && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                      <Lock className="w-3 h-3" /> You
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 flex-1">Tap a card above to toggle</span>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-xs tracking-wide hover:opacity-90 transition active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
