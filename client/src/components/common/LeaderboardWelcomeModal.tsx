import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Sparkles, X, ChevronRight, Award, Flame, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetLeaderboardQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../magicui/NumberTicker';
import { BorderBeam } from '../magicui/BorderBeam';

const SESSION_KEY = 'podium_welcome_shown_v4';

const triggerModalPopper = () => {
  try {
    // Stage 1: Main Center Star Burst
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.4 },
      colors: ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff', '#10b981'],
      ticks: 200,
      gravity: 1.1,
      scalar: 0.95,
      disableForReducedMotion: true,
    });

    // Stage 2: Left & Right Gold Cannons
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0.15, y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#facc15'],
        ticks: 160,
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 0.85, y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#facc15'],
        ticks: 160,
      });
    }, 250);
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
    }, 500);

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
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 25 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 border border-amber-400/40 shadow-2xl shadow-amber-500/10 p-5 sm:p-6 space-y-4 text-center select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Gold Edge Beam */}
          <BorderBeam size={220} duration={6} colorFrom="#facc15" colorTo="#f59e0b" borderWidth={1.5} />

          {/* Golden Radiant Halo Backdrop */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-gradient-to-b from-amber-400/25 to-transparent blur-3xl" />

          {/* Close X */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-white transition active:scale-95 cursor-pointer z-20"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Recognition Header */}
          <div className="space-y-1 pt-1 relative z-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-black uppercase tracking-wider"
            >
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Workshop Excellence</span>
            </motion.div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Top Garage Champions
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Recognizing outstanding craft & speed this month
            </p>
          </div>

          {/* ── Center Champion Spotlight Card ── */}
          {rank1 && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="relative p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/30 shadow-inner space-y-2.5"
            >
              {/* Crown Icon with Float Animation */}
              <div className="relative inline-block">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/40">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  </div>
                </motion.div>

                {/* Avatar with Halo Ring */}
                <div className="w-18 h-18 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/25">
                  <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-lg">
                    {rank1.profileImageUrl ? (
                      <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank1.name)
                    )}
                  </div>
                </div>

                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-mono font-black flex items-center gap-0.5 shadow-md">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  #1
                </div>
              </div>

              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {rank1.name}
                </h4>
                <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                  Monthly Top Performer
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-400/20 dark:bg-amber-400/15 border border-amber-400/30 text-slate-900 dark:text-amber-200">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                <span className="text-xs font-mono font-black">
                  <NumberTicker value={(rank1 as any).points || (rank1 as any).taskCount || 0} /> Quality Points
                </span>
              </div>
            </motion.div>
          )}

          {/* ── Runners Up Podium Row (Rank #2 & Rank #3) ── */}
          {(rank2 || rank3) && (
            <div className="grid grid-cols-2 gap-2 text-left">
              {/* Rank 2 Silver */}
              {rank2 && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {rank2.profileImageUrl ? (
                      <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank2.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate">
                      {rank2.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 font-bold">
                      2nd • {(rank2 as any).points || (rank2 as any).taskCount || 0} pts
                    </p>
                  </div>
                </div>
              )}

              {/* Rank 3 Bronze */}
              {rank3 && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-orange-100 dark:bg-amber-950/60 flex items-center justify-center font-bold text-xs shrink-0 text-amber-700 dark:text-amber-300">
                    {rank3.profileImageUrl ? (
                      <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank3.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate">
                      {rank3.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 font-bold">
                      3rd • {(rank3 as any).points || (rank3 as any).taskCount || 0} pts
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleViewLeaderboard}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer"
            >
              <span>Explore Standings & Logs</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-1.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Continue to Garage
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
