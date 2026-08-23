import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ChevronLeft,
  Crown,
  Sparkles,
  Clock,
  Award,
  Zap,
  Flame,
  Star,
  ChevronRight,
  Medal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetLeaderboardQuery } from '../api/authApi';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../components/magicui/NumberTicker';

type Timeframe = 'day' | 'week' | 'month' | 'year' | 'all';

interface LeaderboardUser {
  id: string;
  _id?: string;
  name: string;
  mobile?: string;
  role?: string;
  profileImageUrl?: string;
  points: number;
}

const triggerPodiumPopper = () => {
  try {
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.45 },
      colors: ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff', '#10b981'],
      ticks: 160,
      gravity: 1.1,
      scalar: 0.85,
      disableForReducedMotion: true,
    });
  } catch (e) {}
};

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [selectedUserModal, setSelectedUserModal] = useState<LeaderboardUser | null>(null);

  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } = useGetLeaderboardQuery();
  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 200 });

  const rawLeaderboard = leaderboardResponse?.data || [];
  const jobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if ((jobsResponse.data as any).jobs) return (jobsResponse.data as any).jobs;
    return [];
  }, [jobsResponse]);

  // Timeframe boundaries
  const { startTimestamp, endTimestamp, timeRemainingText } = useMemo(() => {
    const now = new Date();

    if (timeframe === 'day') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const diffMs = Math.max(0, end - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        startTimestamp: start,
        endTimestamp: end,
        timeRemainingText: `${hours}h ${mins}m left`,
      };
    }

    if (timeframe === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const saturday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5, 23, 59, 59, 999);
      const diffMs = Math.max(0, saturday.getTime() - now.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return {
        startTimestamp: monday.getTime(),
        endTimestamp: saturday.getTime(),
        timeRemainingText: `${days}d ${hours}h left`,
      };
    }

    if (timeframe === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const diffMs = Math.max(0, end - now.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return {
        startTimestamp: start,
        endTimestamp: end,
        timeRemainingText: `${days}d left this month`,
      };
    }

    if (timeframe === 'year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
      const diffMs = Math.max(0, end - now.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return {
        startTimestamp: start,
        endTimestamp: end,
        timeRemainingText: `${days}d left this year`,
      };
    }

    return {
      startTimestamp: 0,
      endTimestamp: Infinity,
      timeRemainingText: 'All-Time',
    };
  }, [timeframe]);

  // Ranking calculation
  const rankedUsers: LeaderboardUser[] = useMemo(() => {
    if (timeframe === 'all' && rawLeaderboard.length > 0) {
      return [...rawLeaderboard]
        .map((u: any) => ({
          id: String(u.id || u._id),
          name: u.name || 'Technician',
          mobile: u.mobile,
          role: u.role || 'MECHANIC',
          profileImageUrl: u.profileImageUrl,
          points: Number(u.taskCount || 0),
        }))
        .sort((a, b) => b.points - a.points);
    }

    const pointsMap: Record<string, { name: string; profileImageUrl?: string; role?: string; mobile?: string; points: number }> = {};

    rawLeaderboard.forEach((u: any) => {
      const uid = String(u.id || u._id);
      pointsMap[uid] = {
        name: u.name,
        profileImageUrl: u.profileImageUrl,
        role: u.role,
        mobile: u.mobile,
        points: 0,
      };
    });

    jobs.forEach((job) => {
      (job.tasks || []).forEach((t) => {
        if (t.status === 'COMPLETED' && t.completedAt) {
          const compTime = new Date(t.completedAt).getTime();
          if (compTime >= startTimestamp && compTime <= endTimestamp) {
            const primaryId = t.completedBy ? String((t.completedBy as any).id || (t.completedBy as any)._id) : null;
            const partnerIds = (t.partners || []).map((p: any) => String(p.id || p._id || p)).filter(Boolean);

            if (t.isShared && partnerIds.length > 0) {
              const allWorkerIds = Array.from(new Set([primaryId, ...partnerIds].filter(Boolean) as string[]));
              const ptsEach = 1 / allWorkerIds.length;
              allWorkerIds.forEach((wid) => {
                if (wid && pointsMap[wid]) {
                  pointsMap[wid].points += ptsEach;
                }
              });
            } else if (primaryId && pointsMap[primaryId]) {
              pointsMap[primaryId].points += 1;
            }
          }
        }
      });
    });

    return Object.entries(pointsMap)
      .map(([id, data]) => ({
        id,
        name: data.name || 'Technician',
        mobile: data.mobile,
        role: data.role || 'MECHANIC',
        profileImageUrl: data.profileImageUrl,
        points: parseFloat(data.points.toFixed(2)),
      }))
      .sort((a, b) => b.points - a.points);
  }, [timeframe, rawLeaderboard, jobs, startTimestamp, endTimestamp]);

  // Current user standing
  const currentUserId = String(user?.id || (user as any)?._id || '');
  const currentUserIndex = rankedUsers.findIndex((u) => u.id === currentUserId || (user?.mobile && u.mobile === user.mobile));
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
  const currentUserPoints = currentUserIndex !== -1 ? rankedUsers[currentUserIndex].points : 0;
  const totalUsersCount = rankedUsers.length || 1;

  useEffect(() => {
    if (!isLeaderboardLoading && rankedUsers.length > 0) {
      const timer = setTimeout(() => {
        triggerPodiumPopper();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLeaderboardLoading]);

  const dynamicInsight = useMemo(() => {
    if (!currentUserRank) {
      return {
        badge: 'Standings',
        text: 'Leaderboard reflects verified task completions for this period.',
      };
    }

    if (currentUserPoints === 0) {
      return {
        badge: 'Get Started',
        text: `Complete your first task this ${timeframe} to enter the leaderboard!`,
      };
    }

    if (currentUserRank === 1) {
      const runnerUp = rankedUsers[1];
      const leadGap = runnerUp ? parseFloat((currentUserPoints - runnerUp.points).toFixed(1)) : 0;
      return {
        badge: '1st Place Leader',
        text: leadGap > 0
          ? `Holding #1 with a ${leadGap} QP lead over 2nd place!`
          : `Leading the garage podium with ${currentUserPoints} QP!`,
      };
    }

    if (currentUserRank === 2 || currentUserRank === 3) {
      const aheadUser = rankedUsers[currentUserRank - 2];
      const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
      return {
        badge: `Rank #${currentUserRank}`,
        text: `Only ${gap} QP behind #${currentUserRank - 1} (${aheadUser?.name || 'Top'}).`,
      };
    }

    const percentile = Math.max(10, Math.round(((totalUsersCount - currentUserRank) / (totalUsersCount - 1 || 1)) * 100));
    const aheadUser = rankedUsers[currentUserRank - 2];
    const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
    return {
      badge: `Rank #${currentUserRank}`,
      text: `Better than ${percentile}% of mechanics (${gap} QP to #${currentUserRank - 1}).`,
    };
  }, [currentUserRank, currentUserPoints, rankedUsers, timeframe, totalUsersCount]);

  const maxPoints = Math.max(1, rankedUsers[0]?.points || 1);

  // Top 3 Podium
  const rank1 = rankedUsers[0];
  const rank2 = rankedUsers[1];
  const rank3 = rankedUsers[2];
  const remainingUsers = rankedUsers.slice(3);

  const getInitials = (name: string) => {
    return (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const TIMEFRAMES: Array<{ key: Timeframe; label: string }> = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-6 space-y-3.5 sm:space-y-4 pb-28 sm:pb-32">
        {/* ── SIMPLE & MODERN CLEAN HEADER ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-amber-500 active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center shrink-0"
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Leaderboard
                <span className="text-base">🏆</span>
              </h1>
              <p className="text-[11px] font-mono text-slate-400">
                Garage task rankings & performance
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold shrink-0">
            <Clock className="w-3 h-3" />
            <span>{timeRemainingText}</span>
          </div>
        </div>

        {/* ── SEGMENTED TIMEFRAME SWITCHER ── */}
        <div className="grid grid-cols-5 p-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          {TIMEFRAMES.map(({ key, label }) => {
            const isActive = timeframe === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTimeframe(key);
                  triggerPodiumPopper();
                }}
                className={`relative py-2 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer ${
                  isActive
                    ? 'text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tf-pill"
                    className="absolute inset-0 bg-amber-400 rounded-xl shadow-sm"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── PERSONAL INSIGHT CARD ── */}
        <motion.div
          key={`${timeframe}-${currentUserRank}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-amber-400/30 p-3.5 shadow-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs shrink-0 cursor-pointer active:scale-95 transition"
              onClick={triggerPodiumPopper}
            >
              {currentUserRank ? `#${currentUserRank}` : '—'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{dynamicInsight.badge}</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                {dynamicInsight.text}
              </p>
            </div>
          </div>
          {currentUserPoints > 0 && (
            <div className="text-right shrink-0">
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                <NumberTicker value={currentUserPoints} decimalPlaces={1} />
              </span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">QP</p>
            </div>
          )}
        </motion.div>

        {/* ── DISTINCT PODIUM CHAMPIONS CEREMONY ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Medal className="w-3 h-3 text-amber-500" />
              Podium Champions
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-2 pb-1">
            {/* 🥈 #2 Silver Champion (Left) */}
            <motion.div
              key={`rank-2-${timeframe}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => {
                triggerPodiumPopper();
                if (rank2) setSelectedUserModal(rank2);
              }}
            >
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 shadow-md ring-2 ring-slate-300 dark:ring-slate-600 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[12px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm">
                    {rank2?.profileImageUrl ? (
                      <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank2?.name || '2')
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-[9px] font-mono font-black shadow-xs border border-white dark:border-slate-900">
                  🥈 #2
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate w-full">
                  {rank2 ? rank2.name : '—'}
                </p>
                <p className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-400 mt-0.5">
                  {rank2 ? <><NumberTicker value={rank2.points} decimalPlaces={1} /> QP</> : '0 QP'}
                </p>
              </div>

              {/* Silver Pillar */}
              <div className="w-full h-14 mt-2.5 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/80 dark:from-slate-800 dark:to-slate-800/60 border border-slate-300/80 dark:border-slate-700 flex items-center justify-center text-[11px] font-black text-slate-600 dark:text-slate-300">
                2nd
              </div>
            </motion.div>

            {/* 👑 #1 Gold Champion (Center Topper - Large & Highly Distinct) */}
            <motion.div
              key={`rank-1-${timeframe}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center z-10 cursor-pointer group"
              onClick={() => {
                triggerPodiumPopper();
                if (rank1) setSelectedUserModal(rank1);
              }}
            >
              <div className="relative mb-2">
                {/* Floating Gold Crown */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/40">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  </div>
                </motion.div>

                {/* Topper Large Distinct Avatar (84px) with Glowing Gold Ring */}
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/35 ring-4 ring-amber-400/60 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-xl">
                    {rank1?.profileImageUrl ? (
                      <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank1?.name || '1')
                    )}
                  </div>
                </div>

                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-mono font-black shadow-md border border-white dark:border-slate-900 flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  #1 Top
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate w-full">
                  {rank1 ? rank1.name : '—'}
                </p>
                <div className="mt-0.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[10px] font-mono font-black text-amber-700 dark:text-amber-300">
                  <Flame className="w-3 h-3 text-amber-500 fill-current" />
                  {rank1 ? <><NumberTicker value={rank1.points} decimalPlaces={1} /> QP</> : '0 QP'}
                </div>
              </div>

              {/* Gold Champion Pillar (Tallest) */}
              <div className="w-full h-22 mt-2.5 rounded-2xl bg-gradient-to-b from-amber-400/25 via-amber-400/15 to-transparent dark:from-amber-400/20 dark:to-slate-800/80 border border-amber-400/40 flex items-center justify-center text-xs font-black text-amber-700 dark:text-amber-300 shadow-inner">
                1st Champion 👑
              </div>
            </motion.div>

            {/* 🥉 #3 Bronze Champion (Right) */}
            <motion.div
              key={`rank-3-${timeframe}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => {
                triggerPodiumPopper();
                if (rank3) setSelectedUserModal(rank3);
              }}
            >
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1 bg-gradient-to-b from-amber-600 via-amber-700 to-orange-800 shadow-md ring-2 ring-amber-700/60 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[12px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm">
                    {rank3?.profileImageUrl ? (
                      <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank3?.name || '3')
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-[9px] font-mono font-black shadow-xs border border-white dark:border-slate-900">
                  🥉 #3
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate w-full">
                  {rank3 ? rank3.name : '—'}
                </p>
                <p className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-400 mt-0.5">
                  {rank3 ? <><NumberTicker value={rank3.points} decimalPlaces={1} /> QP</> : '0 QP'}
                </p>
              </div>

              {/* Bronze Pillar */}
              <div className="w-full h-10 mt-2.5 rounded-2xl bg-gradient-to-b from-amber-100/80 to-amber-200/50 dark:from-amber-950/40 dark:to-slate-800/60 border border-amber-300/60 dark:border-amber-800/40 flex items-center justify-center text-[11px] font-black text-amber-800 dark:text-amber-400">
                3rd
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── ALL TECHNICIANS STANDINGS LIST (#4+) ── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              All Rankings
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {rankedUsers.length} Mechanics
            </span>
          </div>

          {isLeaderboardLoading || isJobsLoading ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Loading rankings...</p>
            </div>
          ) : remainingUsers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-mono">
              No other mechanics ranked for this timeframe.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {remainingUsers.map((u, idx) => {
                const actualRank = idx + 4;
                const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);
                const pct = maxPoints > 0 ? (u.points / maxPoints) * 100 : 0;

                return (
                  <motion.div
                    key={`${u.id}-${timeframe}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 px-2.5 py-3 rounded-2xl transition-colors cursor-pointer ${
                      isMe
                        ? 'bg-amber-400/10 dark:bg-amber-400/10 border border-amber-400/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                    onClick={() => {
                      triggerPodiumPopper();
                      setSelectedUserModal(u);
                    }}
                  >
                    {/* Rank Badge */}
                    <div className="w-7 text-center text-xs font-black text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                      #{actualRank}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-slate-600 dark:text-slate-300 shadow-xs">
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(u.name)
                      )}
                    </div>

                    {/* Name & Progress Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs sm:text-sm font-bold truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {u.name} {isMe && <span className="text-[11px] font-normal text-amber-500">(You)</span>}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, pct)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.02 }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                        />
                      </div>
                    </div>

                    {/* Points */}
                    <div className="shrink-0 text-right pl-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {u.points}
                      </span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        QP
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Luxury User Profile Modal ── */}
      <AnimatePresence>
        {selectedUserModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setSelectedUserModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="relative w-full max-w-xs overflow-hidden rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-amber-400/40 shadow-2xl p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Golden Glow */}
              <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />

              <div className="relative w-20 h-20 mx-auto rounded-2xl p-1 bg-gradient-to-tr from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white text-xl font-black">
                  {selectedUserModal.profileImageUrl ? (
                    <img src={selectedUserModal.profileImageUrl} alt={selectedUserModal.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(selectedUserModal.name)
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedUserModal.name}
                </h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px] uppercase tracking-wider border border-amber-400/30">
                  {selectedUserModal.role || 'Mechanic'}
                </span>
              </div>

              <div className="p-4 bg-amber-400/10 dark:bg-amber-400/15 rounded-2xl border border-amber-400/25">
                <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                  {timeframe.toUpperCase()} QUALITY POINTS
                </span>
                <span className="text-3xl font-black text-amber-500 mt-1 block tracking-tight">
                  <NumberTicker value={selectedUserModal.points || 0} decimalPlaces={1} />{' '}
                  <span className="text-xs font-bold text-slate-400 font-sans">QP</span>
                </span>
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  Verified garage standing
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-400/20 active:scale-95 transition cursor-pointer"
              >
                Close Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
