import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, ChevronRight, Flame, Trophy, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetLeaderboardQuery } from '../../../features/auth/api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { NumberTicker } from '../magicui/NumberTicker';
import { LEGAL_METADATA } from '../legal/legalContent';

const SESSION_KEY = 'podium_welcome_shown_v7';

export const LeaderboardWelcomeModal: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: leaderboardData } = useGetLeaderboardQuery(undefined, { skip: !isAuthenticated });
  const leaderboard = leaderboardData?.data || [];

  const [isOpen, setIsOpen] = useState(false);
  const hasOpened = useRef(false);

  // Top 3 Podium Leaders
  const rank1 = leaderboard[0];
  const rank2 = leaderboard[1];
  const rank3 = leaderboard[2];

  const getInitials = (name: string) => {
    return (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  useEffect(() => {
    // Listen for manual trigger event from anywhere in the app
    const handleManualOpen = () => setIsOpen(true);
    window.addEventListener('open-top-performers-modal', handleManualOpen);

    // Auto-show once per session only if terms are accepted
    const needsTerms = user && (user.needsTermsAcceptance || user.acceptedTermsVersion !== LEGAL_METADATA.version);
    if (isAuthenticated && !needsTerms && leaderboard.length && !hasOpened.current) {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        hasOpened.current = true;
        sessionStorage.setItem(SESSION_KEY, '1');
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('open-top-performers-modal', handleManualOpen);
        };
      }
    }

    return () => window.removeEventListener('open-top-performers-modal', handleManualOpen);
  }, [isAuthenticated, leaderboard.length]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleViewLeaderboard = () => {
    setIsOpen(false);
    navigate('/leaderboard');
  };

  if (!isOpen || !leaderboard.length || !rank1) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl glass-modern-card shadow-2xl p-5 sm:p-6 space-y-4 text-center select-none border border-slate-200/80 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-400/15 blur-3xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition active:scale-90 cursor-pointer z-20"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-black uppercase tracking-wider">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span>Top Performers Spotlight</span>
          </div>

          {/* ── #1 Champion Spotlight ── */}
          <div className="space-y-2 pt-1">
            <div className="relative inline-block">
              {/* Animated Floating Crown */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/35">
                  <Crown className="w-4 h-4 fill-current" />
                </div>
              </motion.div>

              {/* Glossy Avatar Frame */}
              <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/25">
                <div className="w-full h-full rounded-[12px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-xl">
                  {rank1.profileImageUrl ? (
                    <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(rank1.name)
                  )}
                </div>
              </div>

              {/* Rank 1 Badge */}
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-mono font-black flex items-center gap-0.5 shadow-md">
                <Star className="w-2.5 h-2.5 fill-current" />
                #1 Champion
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate px-2">
                {rank1.name}
              </h3>
              <p className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">
                Workshop MVP · {rank1.role || 'Senior Technician'}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span className="text-xs sm:text-sm font-mono font-black">
                <NumberTicker value={(rank1 as any).points || (rank1 as any).taskCount || 0} /> Quality Points
              </span>
            </div>
          </div>

          {/* ── 2nd & 3rd Place Runner-ups ── */}
          {(rank2 || rank3) && (
            <div className="grid grid-cols-2 gap-2.5 text-left pt-1">
              {/* 2nd Place */}
              {rank2 && (
                <div className="p-2.5 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center gap-2.5 shadow-xs">
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-200 shrink-0">
                    {rank2.profileImageUrl ? (
                      <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank2.name)
                    )}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-300 dark:bg-slate-600 rounded-tl text-[8px] font-mono font-bold flex items-center justify-center">
                      2
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {rank2.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                      {(rank2 as any).points || (rank2 as any).taskCount || 0} QP
                    </p>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {rank3 && (
                <div className="p-2.5 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center gap-2.5 shadow-xs">
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-xs font-black text-amber-800 dark:text-amber-300 shrink-0">
                    {rank3.profileImageUrl ? (
                      <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank3.name)
                    )}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-200 dark:bg-amber-800 rounded-tl text-[8px] font-mono font-bold flex items-center justify-center">
                      3
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {rank3.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                      {(rank3 as any).points || (rank3 as any).taskCount || 0} QP
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleViewLeaderboard}
              className="w-full py-2.5 px-4 rounded-xl glass-gold-btn text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
            >
              <span>Explore Workshop Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-1.5 text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LeaderboardWelcomeModal;
