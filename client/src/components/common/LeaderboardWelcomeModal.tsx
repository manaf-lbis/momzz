import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Sparkles, X, ChevronRight, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetLeaderboardQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';

const SESSION_KEY = 'podium_welcome_shown_v2';

const triggerModalPopper = () => {
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#fbbf24', '#e2e8f0', '#ffffff'],
      ticks: 160,
      gravity: 1.2,
      scalar: 0.85,
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
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 p-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Modal Top Bar ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-1">
                  Podium Leaders
                </h3>
                <p className="text-[10px] font-mono text-zinc-400">Monthly Garage Standings</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Top 3 Showcase (Identical to Leaderboard Podium) ── */}
          <div className="bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
              {/* ── #2 Silver ── */}
              <div className="flex flex-col items-center">
                <div className="relative mb-1.5">
                  <div className="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-b from-slate-200 to-slate-400 dark:from-zinc-600 dark:to-zinc-800 shadow-xs">
                    <div className="w-full h-full rounded-[10px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-black text-xs">
                      {rank2?.profileImageUrl ? (
                        <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank2?.name || '2')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-md bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[9px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                    2
                  </div>
                </div>

                <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-full text-center">
                  {rank2 ? rank2.name : '—'}
                </p>
                <span className="text-[9px] font-black text-zinc-500 font-mono mt-0.5">
                  {rank2 ? `${rank2.taskCount || 0} pts` : '0 pts'}
                </span>

                <div className="w-full h-8 mt-2 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 flex items-center justify-center text-[10px] font-black text-zinc-500">
                  2nd
                </div>
              </div>

              {/* ── #1 Gold (Center) ── */}
              <div className="flex flex-col items-center z-10">
                <div className="relative mb-1.5">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2"
                  >
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shadow-xs">
                      <Crown className="w-3 h-3 fill-current" />
                    </div>
                  </motion.div>

                  <div className="w-15 h-15 rounded-2xl p-0.5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-md shadow-amber-500/20">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white font-black text-sm">
                      {rank1?.profileImageUrl ? (
                        <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank1?.name || '1')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                    1
                  </div>
                </div>

                <p className="text-xs font-black text-zinc-900 dark:text-white truncate w-full text-center">
                  {rank1 ? rank1.name : '—'}
                </p>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {rank1 ? `${rank1.taskCount || 0} pts` : '0 pts'}
                </span>

                <div className="w-full h-13 mt-2 rounded-xl bg-amber-500/20 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-600 dark:text-amber-400">
                  1st
                </div>
              </div>

              {/* ── #3 Bronze ── */}
              <div className="flex flex-col items-center">
                <div className="relative mb-1.5">
                  <div className="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-b from-amber-600 to-orange-400 dark:from-amber-700 dark:to-zinc-800 shadow-xs">
                    <div className="w-full h-full rounded-[10px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-black text-xs">
                      {rank3?.profileImageUrl ? (
                        <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank3?.name || '3')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-md bg-orange-200 dark:bg-amber-800/80 text-orange-900 dark:text-amber-200 text-[9px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                    3
                  </div>
                </div>

                <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-full text-center">
                  {rank3 ? rank3.name : '—'}
                </p>
                <span className="text-[9px] font-black text-zinc-500 font-mono mt-0.5">
                  {rank3 ? `${rank3.taskCount || 0} pts` : '0 pts'}
                </span>

                <div className="w-full h-6 mt-2 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 flex items-center justify-center text-[10px] font-black text-zinc-500">
                  3rd
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleViewLeaderboard}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
            >
              <span>View Full Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="w-full py-2 text-center text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
