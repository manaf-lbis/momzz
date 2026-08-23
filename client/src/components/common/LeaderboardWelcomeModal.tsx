import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Sparkles, X, ChevronRight, Award, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetLeaderboardQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../magicui/NumberTicker';

const SESSION_KEY = 'podium_welcome_shown_v3';

const triggerModalPopper = () => {
  try {
    confetti({
      particleCount: 40,
      spread: 65,
      origin: { y: 0.45 },
      colors: ['#f59e0b', '#fbbf24', '#e2e8f0', '#ffffff', '#10b981'],
      ticks: 180,
      gravity: 1.1,
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  } catch (e) {}
};

export const LeaderboardWelcomeModal: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
    if (!isAuthenticated || !leaderboard.length || hasOpened.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    hasOpened.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');

    const timer = setTimeout(() => {
      setIsOpen(true);
      triggerModalPopper();
    }, 600);

    return () => clearTimeout(timer);
  }, [isAuthenticated, leaderboard.length]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleViewLeaderboard = () => {
    setIsOpen(false);
    navigate('/leaderboard');
  };

  if (!isOpen || !leaderboard.length) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/40 dark:shadow-black/90 p-5 sm:p-6 space-y-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Golden Glow Backdrop */}
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Workshop Standings</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Podium Champions
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Top performing garage mechanics this month
            </p>
          </div>

          {/* ── Top 3 Showcase ── */}
          <div className="bg-slate-50/80 dark:bg-slate-950/60 rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800/80">
            <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-1">
              {/* ── #2 Silver (Left) ── */}
              <div className="flex flex-col items-center">
                <div className="relative mb-1.5">
                  <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-b from-slate-200 to-slate-400 dark:from-zinc-600 dark:to-zinc-800 shadow-xs">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-xs">
                      {rank2?.profileImageUrl ? (
                        <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank2?.name || '2')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-lg bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[9px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                    2
                  </div>
                </div>

                <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate w-full text-center">
                  {rank2 ? rank2.name : '—'}
                </p>
                <span className="text-[10px] font-black text-slate-500 font-mono mt-0.5">
                  {rank2 ? <><NumberTicker value={(rank2 as any).points || (rank2 as any).taskCount || 0} /> QP</> : '0 QP'}
                </span>

                <div className="w-full h-8 mt-2 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-400">
                  2nd
                </div>
              </div>

              {/* ── #1 Gold (Center Champion) ── */}
              <div className="flex flex-col items-center z-10">
                <div className="relative mb-1.5">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                  >
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/30">
                      <Crown className="w-3 h-3 fill-current" />
                    </div>
                  </motion.div>

                  <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-sm">
                      {rank1?.profileImageUrl ? (
                        <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank1?.name || '1')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md border border-white dark:border-zinc-900">
                    1
                  </div>
                </div>

                <p className="text-xs font-black text-slate-900 dark:text-white truncate w-full text-center">
                  {rank1 ? rank1.name : '—'}
                </p>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {rank1 ? <><NumberTicker value={(rank1 as any).points || (rank1 as any).taskCount || 0} /> QP</> : '0 QP'}
                </span>

                <div className="w-full h-12 mt-2 rounded-xl bg-amber-500/20 dark:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-600 dark:text-amber-400 shadow-xs">
                  1st 👑
                </div>
              </div>

              {/* ── #3 Bronze (Right) ── */}
              <div className="flex flex-col items-center">
                <div className="relative mb-1.5">
                  <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-b from-amber-600 to-orange-400 dark:from-amber-700 dark:to-zinc-800 shadow-xs">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-xs">
                      {rank3?.profileImageUrl ? (
                        <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank3?.name || '3')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-lg bg-orange-200 dark:bg-amber-800/80 text-orange-900 dark:text-amber-200 text-[9px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                    3
                  </div>
                </div>

                <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate w-full text-center">
                  {rank3 ? rank3.name : '—'}
                </p>
                <span className="text-[10px] font-black text-slate-500 font-mono mt-0.5">
                  {rank3 ? <><NumberTicker value={(rank3 as any).points || (rank3 as any).taskCount || 0} /> QP</> : '0 QP'}
                </span>

                <div className="w-full h-6 mt-2 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-400">
                  3rd
                </div>
              </div>

            </div>
          </div>

          {/* ── Actions ── */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleViewLeaderboard}
              className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/25 active:scale-95 transition cursor-pointer"
            >
              <span>View Full Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Continue to Workshop
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
