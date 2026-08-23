import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ArrowLeft,
  Crown,
  Sparkles,
  Clock,
  Award,
  Zap,
  Flame,
  ChevronRight,
  TrendingUp,
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

// Small subtle popper for podium celebration
const triggerPodiumPopper = () => {
  try {
    confetti({
      particleCount: 28,
      spread: 55,
      origin: { y: 0.55 },
      colors: ['#f59e0b', '#fbbf24', '#e2e8f0', '#ffffff'],
      ticks: 150,
      gravity: 1.2,
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

  // Precise timeframe boundaries:
  // - Daily: 12:00 AM to 11:59:59 PM today
  // - Weekly: Monday 00:00:00 to Saturday 23:59:59
  // - Monthly: 1st of month 00:00:00 to 30/31st 23:59:59
  // - Yearly: Jan 1 00:00:00 to Dec 31 23:59:59
  // - All Time: from start to till
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
        timeRemainingText: `${hours}h ${mins}m left today`,
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
        timeRemainingText: `${days}d ${hours}h left this week`,
      };
    }

    if (timeframe === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const diffMs = Math.max(0, end - now.getTime());
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return {
        startTimestamp: start,
        endTimestamp: end,
        timeRemainingText: `${days}d ${hours}h left this month`,
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
      timeRemainingText: 'All-Time Record',
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

  // Trigger small popper automatically when page opens or data loads
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
        badge: 'Garage Race',
        text: 'Leaderboard reflects verified task completions for this period.',
      };
    }

    if (currentUserPoints === 0) {
      return {
        badge: 'Get Started',
        text: `Complete your first task this ${timeframe} to climb onto the podium!`,
      };
    }

    if (currentUserRank === 1) {
      const runnerUp = rankedUsers[1];
      const leadGap = runnerUp ? parseFloat((currentUserPoints - runnerUp.points).toFixed(1)) : 0;
      return {
        badge: '1st Place Leader',
        text: leadGap > 0
          ? `You hold #1 with a ${leadGap} QP lead over 2nd place!`
          : `You're leading the garage podium with ${currentUserPoints} QP!`,
      };
    }

    if (currentUserRank === 2 || currentUserRank === 3) {
      const aheadUser = rankedUsers[currentUserRank - 2];
      const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
      return {
        badge: `Top 3 Podium (#${currentUserRank})`,
        text: `Only ${gap} QP behind #${currentUserRank - 1} (${aheadUser?.name || 'Top'}).`,
      };
    }

    const percentile = Math.max(10, Math.round(((totalUsersCount - currentUserRank) / (totalUsersCount - 1 || 1)) * 100));
    const aheadUser = rankedUsers[currentUserRank - 2];
    const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
    return {
      badge: `Rank #${currentUserRank}`,
      text: `Better than ${percentile}% of techs (${gap} QP to reach #${currentUserRank - 1}).`,
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
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 pb-24 sm:pb-28">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition active:scale-95 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 dark:bg-amber-400/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
                  <Trophy className="w-4 h-4" />
                </div>
                Technician Standings
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Garage task points & technician rankings
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {timeRemainingText}
          </span>
        </div>

        {/* ── Responsive Multi-Column Layout for Desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── LEFT COLUMN: Timeframe & Podium Showcase ── */}
          <div className="lg:col-span-5 space-y-4">
            {/* Minimalist Segmented Timeframe Switcher */}
            <div className="grid grid-cols-5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs">
              {TIMEFRAMES.map(({ key, label }) => {
                const isActive = timeframe === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setTimeframe(key);
                      triggerPodiumPopper();
                    }}
                    className={`relative py-1.5 text-xs font-bold rounded-lg transition-colors capitalize ${
                      isActive
                        ? 'text-zinc-950 dark:text-white font-black'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="modern-tf-pill"
                        className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-xs border border-zinc-200/60 dark:border-zinc-700/60"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modern Dynamic Performance Card */}
            <motion.div
              key={`${timeframe}-${currentUserRank}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-amber-500/30 dark:border-amber-500/20 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 4 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-black text-sm flex items-center justify-center shadow-sm shrink-0 cursor-pointer"
                  onClick={triggerPodiumPopper}
                >
                  {currentUserRank ? `#${currentUserRank}` : '—'}
                </motion.div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>{dynamicInsight.badge}</span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mt-0.5 truncate">
                    {dynamicInsight.text}
                  </p>
                </div>
                {currentUserPoints > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-zinc-900 dark:text-white">{currentUserPoints}</span>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">pts</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sleek Modern Top 3 Showcase */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
          <div className="text-center mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Podium Leaders
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end pt-2 pb-1">
            {/* ── #2 Silver (Left) ── */}
            <motion.div
              key={`showcase-2-${timeframe}`}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={{ y: -5 }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => {
                triggerPodiumPopper();
                if (rank2) setSelectedUserModal(rank2);
              }}
            >
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-b from-slate-200 to-slate-400 dark:from-zinc-600 dark:to-zinc-800 shadow-sm transition-transform">
                  <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-black text-sm">
                    {rank2?.profileImageUrl ? (
                      <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank2?.name || '2')
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-lg bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-[10px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                  2
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-full">
                  {rank2 ? rank2.name : '—'}
                </p>
                <div className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                  {rank2 ? <><NumberTicker value={rank2.points} decimalPlaces={1} /> QP</> : '0 QP'}
                </div>
              </div>

              {/* Minimal Elevation Pillar */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 56, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="w-full mt-3 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/50 flex items-center justify-center shadow-xs"
              >
                <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">2nd</span>
              </motion.div>
            </motion.div>

            {/* ── #1 Gold (Center) ── */}
            <motion.div
              key={`showcase-1-${timeframe}`}
              initial={{ opacity: 0, y: 40, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.02, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ y: -7 }}
              className="flex flex-col items-center z-10 cursor-pointer"
              onClick={() => {
                triggerPodiumPopper();
                if (rank1) setSelectedUserModal(rank1);
              }}
            >
              <div className="relative mb-2">
                {/* Floating Gold Crown Badge */}
                <motion.div
                  animate={{ y: [0, -5, 0], rotate: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shadow-md">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  </div>
                </motion.div>

                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
                  <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white font-black text-base">
                    {rank1?.profileImageUrl ? (
                      <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank1?.name || '1')
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900">
                  1
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white truncate w-full">
                  {rank1 ? rank1.name : '—'}
                </p>
                <div className="mt-1 inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-400/20 border border-amber-400/30 text-[10px] font-black text-amber-700 dark:text-amber-300">
                  {rank1 ? <><NumberTicker value={rank1.points} decimalPlaces={1} /> QP</> : '0 QP'}
                </div>
              </div>

              {/* Minimal Elevation Pillar (Tallest) */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 88, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-full mt-3 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 dark:from-amber-500/20 dark:to-zinc-800/80 border border-amber-500/30 dark:border-amber-500/30 flex items-center justify-center shadow-xs"
              >
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">1st</span>
              </motion.div>
            </motion.div>

            {/* ── #3 Bronze (Right) ── */}
            <motion.div
              key={`showcase-3-${timeframe}`}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={{ y: -5 }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => {
                triggerPodiumPopper();
                if (rank3) setSelectedUserModal(rank3)}
              }
            >
              <div className="relative mb-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-b from-amber-600 to-orange-400 dark:from-amber-700 dark:to-zinc-800 shadow-sm">
                  <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-black text-sm">
                    {rank3?.profileImageUrl ? (
                      <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(rank3?.name || '3')
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-lg bg-orange-200 dark:bg-amber-800/80 text-orange-900 dark:text-amber-200 text-[10px] font-black flex items-center justify-center shadow-xs border border-white dark:border-zinc-900">
                  3
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-full">
                  {rank3 ? rank3.name : '—'}
                </p>
                <div className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                  {rank3 ? <><NumberTicker value={rank3.points} decimalPlaces={1} /> QP</> : '0 QP'}
                </div>
              </div>

              {/* Minimal Elevation Pillar */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 44, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="w-full mt-3 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/50 flex items-center justify-center shadow-xs"
              >
                <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">3rd</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>


      {/* ── RIGHT COLUMN: Full Standings Ranking List ── */}
      <div className="lg:col-span-7 space-y-4">
        {/* ── Modern Standings List (Rank #4+) ── */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm overflow-hidden space-y-3">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              All Technician Rankings
            </span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {rankedUsers.length} Active Technicians
            </span>
          </div>


          {isLeaderboardLoading || isJobsLoading ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Loading standings...</p>
            </div>
          ) : remainingUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No other mechanics ranked for this timeframe.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[360px] overflow-y-auto no-scrollbar">
              {remainingUsers.map((u, idx) => {
                const actualRank = idx + 4;
                const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);
                const pct = maxPoints > 0 ? (u.points / maxPoints) * 100 : 0;

                return (
                  <motion.div
                    key={`${u.id}-${timeframe}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.025, type: 'spring', stiffness: 300, damping: 24 }}
                    whileHover={{ scale: 1.01 }}
                    className={`flex items-center gap-3 px-2 py-3 rounded-2xl transition-colors cursor-pointer ${
                      isMe
                        ? 'bg-amber-500/10 dark:bg-amber-400/10'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                    onClick={() => {
                      triggerPodiumPopper();
                      setSelectedUserModal(u);
                    }}
                  >
                    {/* Rank Circle */}
                    <div className="w-6 text-center text-xs font-black text-zinc-400 dark:text-zinc-500 shrink-0">
                      #{actualRank}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 text-zinc-600 dark:text-zinc-300 shadow-xs">
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(u.name)
                      )}
                    </div>

                    {/* Name + Animated Progress Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs sm:text-sm font-bold truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {u.name} {isMe && <span className="text-[11px] font-normal text-amber-500">(You)</span>}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, pct)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.03 }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                        />
                      </div>
                    </div>

                    {/* Points */}
                    <div className="shrink-0 text-right pl-2">
                      <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
                        {u.points}
                      </span>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                        pts
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  </main>


      {/* ── Modern User Podium Profile Modal ── */}
      <AnimatePresence>
        {selectedUserModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setSelectedUserModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              className="relative w-full max-w-xs overflow-hidden rounded-[32px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Golden Glow Backdrop */}
              <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />

              <div className="relative w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white text-xl font-black">
                  {selectedUserModal.profileImageUrl ? (
                    <img src={selectedUserModal.profileImageUrl} alt={selectedUserModal.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(selectedUserModal.name)
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                  {selectedUserModal.name}
                </h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px] uppercase tracking-wider border border-amber-400/30">
                  {selectedUserModal.role || 'Mechanic'}
                </span>
              </div>

              <div className="p-4 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/25">
                <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                  {new Date().toLocaleDateString(undefined, { month: 'long' }).toUpperCase()} POINTS
                </span>
                <span className="text-3xl font-black text-amber-500 mt-1 block tracking-tight">
                  <NumberTicker value={selectedUserModal.points || 0} decimalPlaces={1} />{' '}
                  <span className="text-xs font-bold text-zinc-400 font-sans">QP</span>
                </span>
                <p className="text-[10px] font-mono text-zinc-400 mt-1">
                  Workshop ranking standing
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-400/20 active:scale-95 transition cursor-pointer"
              >
                Close Podium Detail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

  );
};
