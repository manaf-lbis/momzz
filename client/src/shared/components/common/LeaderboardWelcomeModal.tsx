import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, ChevronRight, Flame, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetLeaderboardQuery } from '../../../features/auth/api/authApi';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../magicui/NumberTicker';
import { BorderBeam } from '../magicui/BorderBeam';

const SESSION_KEY = 'podium_welcome_shown_v6';

const triggerModalPopper = () => {
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.4 },
      colors: ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff', '#10b981'],
      ticks: 160,
      gravity: 1.1,
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
    }, 450);

    return () => clearTimeout(timer);
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
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 18 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="relative w-full max-w-[315px] overflow-hidden rounded-[28px] bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-amber-400/50 shadow-2xl shadow-amber-500/20 p-4 space-y-3.5 text-center select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Golden Radiance Edge Beam */}
          <BorderBeam size={180} duration={5} colorFrom="#facc15" colorTo="#f59e0b" borderWidth={1.5} />

          {/* Golden Radiant Backdrop */}
          <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full bg-gradient-to-b from-amber-400/25 to-transparent blur-2xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition active:scale-90 cursor-pointer z-20"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Tagline */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[9px] font-mono font-black uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
            <span>Monthly Garage Leader</span>
          </div>

          {/* ── #1 Champion Hero Spotlight with Bigger Profile Picture ── */}
          <div className="space-y-1.5 pt-0.5">
            <div className="relative inline-block">
              {/* Floating Animated 3D Crown */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/40">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                </div>
              </motion.div>

              {/* Big Glossy Avatar (80px) */}
              <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/25">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-xl">
                  {rank1.profileImageUrl ? (
                    <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(rank1.name)
                  )}
                </div>
              </div>

              {/* Rank 1 Star Badge */}
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-mono font-black flex items-center gap-0.5 shadow-md">
                <Star className="w-2.5 h-2.5 fill-current" />
                #1
              </div>
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white truncate px-2">
                {rank1.name}
              </h4>
              <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                Top Performer
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span className="text-xs font-mono font-black">
                <NumberTicker value={(rank1 as any).points || (rank1 as any).taskCount || 0} /> Quality Points
              </span>
            </div>
          </div>

          {/* ── 2nd and 3rd Place Mini Showcase with Avatars ── */}
          {(rank2 || rank3) && (
            <div className="grid grid-cols-2 gap-2 text-left pt-1">
              {/* 2nd Place Silver */}
              {rank2 && (
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-200 shrink-0">
                    {rank2.profileImageUrl ? (
                      <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank2.name)
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-tl text-[7px] font-mono font-bold flex items-center justify-center">
                      2
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                      {rank2.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 font-bold">
                      {(rank2 as any).points || (rank2 as any).taskCount || 0} QP
                    </p>
                  </div>
                </div>
              )}

              {/* 3rd Place Bronze */}
              {rank3 && (
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-xs font-black text-amber-800 dark:text-amber-300 shrink-0">
                    {rank3.profileImageUrl ? (
                      <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank3.name)
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-200 dark:bg-amber-800 rounded-tl text-[7px] font-mono font-bold flex items-center justify-center">
                      3
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                      {rank3.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 font-bold">
                      {(rank3 as any).points || (rank3 as any).taskCount || 0} QP
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="pt-1 space-y-1">
            <button
              type="button"
              onClick={handleViewLeaderboard}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-amber-400/20 active:scale-95 transition cursor-pointer"
            >
              <span>View Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-1 text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Continue to Garage
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
