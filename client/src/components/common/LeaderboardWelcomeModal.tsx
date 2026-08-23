import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, ChevronRight, Flame, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetLeaderboardQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../magicui/NumberTicker';
import { BorderBeam } from '../magicui/BorderBeam';

const SESSION_KEY = 'podium_welcome_shown_v5';

const triggerModalPopper = () => {
  try {
    confetti({
      particleCount: 28,
      spread: 55,
      origin: { y: 0.45 },
      colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981'],
      ticks: 140,
      gravity: 1.2,
      scalar: 0.8,
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
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.82, y: 15 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="relative w-full max-w-[290px] overflow-hidden rounded-[26px] bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-amber-400/40 shadow-2xl shadow-amber-500/15 p-4 space-y-3 text-center select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Gold Edge Beam */}
          <BorderBeam size={160} duration={5} colorFrom="#facc15" colorTo="#f59e0b" borderWidth={1.5} />

          {/* Golden Radiant Backdrop */}
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full bg-amber-400/20 blur-2xl" />

          {/* Close X */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition active:scale-90 cursor-pointer z-20"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Mini Header Tag */}
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[9px] font-mono font-black uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
            <span>Monthly Leader</span>
          </div>

          {/* ── Compact Champion Avatar & Info ── */}
          <div className="space-y-1.5 pt-1">
            <div className="relative inline-block">
              {/* Floating Crown */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/40">
                  <Crown className="w-3 h-3 fill-current" />
                </div>
              </motion.div>

              {/* Glowing Avatar */}
              <div className="w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-md shadow-amber-500/20">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-sm">
                  {rank1.profileImageUrl ? (
                    <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(rank1.name)
                  )}
                </div>
              </div>

              <div className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-amber-400 text-slate-950 text-[8px] font-mono font-black flex items-center gap-0.5 shadow-xs">
                <Star className="w-2 h-2 fill-current" />
                #1
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate px-1">
                {rank1.name}
              </h4>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                Top Garage Performer
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300">
              <Flame className="w-3 h-3 text-amber-500 fill-current" />
              <span className="text-[11px] font-mono font-black">
                <NumberTicker value={(rank1 as any).points || (rank1 as any).taskCount || 0} /> QP
              </span>
            </div>
          </div>

          {/* ── Mini 2nd & 3rd Place Inline Strip ── */}
          {(rank2 || rank3) && (
            <div className="py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 truncate">
              {rank2 && <span>🥈 {rank2.name?.split(' ')[0]}</span>}
              {rank2 && rank3 && <span>•</span>}
              {rank3 && <span>🥉 {rank3.name?.split(' ')[0]}</span>}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="pt-0.5 space-y-1">
            <button
              type="button"
              onClick={handleViewLeaderboard}
              className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <span>View Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-1 text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
