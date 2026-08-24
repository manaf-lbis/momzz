import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X, Check, Loader2, Globe, Lock, Sparkles } from 'lucide-react';
import { JobCardData } from '../../api/jobApi';
import { BorderBeam } from '../magicui/BorderBeam';

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
  const [localLoadingMode, setLocalLoadingMode] = useState<'ALL' | 'ME' | null>(null);

  if (!isOpen || !job) return null;

  const jobId = job.id || job._id!;
  const isPinnedForAll = !!job.isPinnedForAll;
  const isPinnedForMe =
    Array.isArray(job.pinnedBy) &&
    job.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === currentUserId);

  const handleAction = async (mode: 'ALL' | 'ME') => {
    if (localLoadingMode || isPinningMode) return;
    setLocalLoadingMode(mode);
    try {
      await onTogglePin(jobId, mode);
    } finally {
      setLocalLoadingMode(null);
    }
  };

  const effectiveLoading = localLoadingMode || isPinningMode;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 pb-24 sm:pb-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="relative w-full max-w-sm bg-[#0f0f1e] rounded-3xl border border-white/12 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <BorderBeam size={180} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />

          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shadow-xs">
                <Pin className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Pin Priority Vehicle
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold text-slate-300 truncate max-w-[140px]">
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
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-white/[0.06]" />

          {/* Options */}
          <div className="p-4 space-y-2.5">
            {/* ── PIN FOR ALL (Admin-Only or shown always) ── */}
            {isAdmin && (
              <motion.button
                type="button"
                whileHover={{ scale: effectiveLoading ? 1 : 1.01 }}
                whileTap={{ scale: effectiveLoading ? 1 : 0.97 }}
                disabled={effectiveLoading !== null}
                onClick={() => handleAction('ALL')}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isPinnedForAll
                    ? 'border-amber-400/60 bg-amber-400/15 shadow-md shadow-amber-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40'
                }`}
              >
                <div className="relative flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isPinnedForAll
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-black ${isPinnedForAll ? 'text-amber-300' : 'text-white'}`}>
                        Pin for everyone
                      </span>
                      {isPinnedForAll && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-mono font-black uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                      Stays at top for all mechanics & advisors
                    </p>
                  </div>

                  {/* State Indicator */}
                  <div className="shrink-0">
                    {effectiveLoading === 'ALL' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      </div>
                    ) : isPinnedForAll ? (
                      <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                        <Pin className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            )}

            {/* ── PIN FOR ME ── */}
            <motion.button
              type="button"
              whileHover={{ scale: effectiveLoading ? 1 : 1.01 }}
              whileTap={{ scale: effectiveLoading ? 1 : 0.97 }}
              disabled={effectiveLoading !== null}
              onClick={() => handleAction('ME')}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isPinnedForMe
                  ? 'border-purple-400/60 bg-purple-500/15 shadow-md shadow-purple-500/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-purple-400/40'
              }`}
            >
              <div className="relative flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isPinnedForMe
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-black ${isPinnedForMe ? 'text-purple-300' : 'text-white'}`}>
                      Pin just for me
                    </span>
                    {isPinnedForMe && (
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-500 text-white text-[9px] font-mono font-black uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Personal focus list on your account
                  </p>
                </div>

                {/* State Indicator */}
                <div className="shrink-0">
                  {effectiveLoading === 'ME' ? (
                    <div className="w-8 h-8 rounded-full bg-purple-400/20 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    </div>
                  ) : isPinnedForMe ? (
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                      <Pin className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
