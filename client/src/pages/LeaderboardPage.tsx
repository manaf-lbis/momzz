import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ArrowLeft,
  Crown,
  Sparkles,
  User as UserIcon,
  Clock,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetLeaderboardQuery } from '../api/authApi';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';

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

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } = useGetLeaderboardQuery();
  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 200 });

  const rawLeaderboard = leaderboardResponse?.data || [];
  const jobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if ((jobsResponse.data as any).jobs) return (jobsResponse.data as any).jobs;
    return [];
  }, [jobsResponse]);

  // Compute precise timeframe boundaries:
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
      const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
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

    // 'all'
    return {
      startTimestamp: 0,
      endTimestamp: Infinity,
      timeRemainingText: 'All-Time Record',
    };
  }, [timeframe]);

  // Dynamic ranking calculation based on timeframe
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

  // Current logged in user's rank & dynamic insight computation
  const currentUserId = String(user?.id || (user as any)?._id || '');
  const currentUserIndex = rankedUsers.findIndex((u) => u.id === currentUserId || (user?.mobile && u.mobile === user.mobile));
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
  const currentUserPoints = currentUserIndex !== -1 ? rankedUsers[currentUserIndex].points : 0;
  const totalUsersCount = rankedUsers.length || 1;

  const dynamicInsight = useMemo(() => {
    if (!currentUserRank) {
      return {
        badge: '⚡ Garage Race',
        text: 'Leaderboard reflects verified task completions for this period.',
      };
    }

    if (currentUserPoints === 0) {
      return {
        badge: '🚀 Ready to Climb',
        text: `Complete your first task this ${timeframe} to get on the podium!`,
      };
    }

    if (currentUserRank === 1) {
      const runnerUp = rankedUsers[1];
      const leadGap = runnerUp ? parseFloat((currentUserPoints - runnerUp.points).toFixed(1)) : 0;
      return {
        badge: '👑 Leaderboard #1',
        text: leadGap > 0
          ? `You're leading the garage with a ${leadGap} QP lead over #2!`
          : `You're holding 1st place on the podium with ${currentUserPoints} QP!`,
      };
    }

    if (currentUserRank === 2 || currentUserRank === 3) {
      const aheadUser = rankedUsers[currentUserRank - 2];
      const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
      return {
        badge: `🔥 Podium Rank #${currentUserRank}`,
        text: `Only ${gap} QP behind #${currentUserRank - 1} (${aheadUser?.name || 'Top Rank'})!`,
      };
    }

    // Rank 4+
    const percentile = Math.max(10, Math.round(((totalUsersCount - currentUserRank) / (totalUsersCount - 1 || 1)) * 100));
    const aheadUser = rankedUsers[currentUserRank - 2];
    const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
    return {
      badge: `⚡ Rank #${currentUserRank}`,
      text: `Better than ${percentile}% of mechanics (${gap} QP to reach #${currentUserRank - 1}).`,
    };
  }, [currentUserRank, currentUserPoints, rankedUsers, timeframe, totalUsersCount]);

  // Podium 1, 2, 3
  const rank1 = rankedUsers[0];
  const rank2 = rankedUsers[1];
  const rank3 = rankedUsers[2];
  const remainingUsers = rankedUsers.slice(3);

  const formatPoints = (pts: number) => {
    if (pts >= 1000) return (pts / 1000).toFixed(1) + 'k QP';
    return Number.isInteger(pts) ? `${pts} QP` : `${pts.toFixed(1)} QP`;
  };

  const getInitials = (name: string) => {
    return (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0d1117] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-5 py-4 space-y-4">
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 hover:border-amber-400/40 shadow-xs active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            Leaderboard
          </h1>

          <div className="w-8" />
        </div>

        {/* ── Timeframe Tabs ── */}
        <div className="bg-zinc-200/70 dark:bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl flex items-center border border-zinc-300/50 dark:border-zinc-800 shadow-inner">
          {(['day', 'week', 'month', 'year', 'all'] as Timeframe[]).map((tf) => {
            const label = tf === 'day' ? 'Daily' : tf === 'week' ? 'Weekly' : tf === 'month' ? 'Monthly' : tf === 'year' ? 'Yearly' : 'All Time';
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`relative flex-1 py-1.5 rounded-lg text-xs font-black transition-all capitalize tracking-wide ${
                  isActive
                    ? 'text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="leaderboard-tf-pill"
                    className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Dynamic Performance Insight Banner (Medium/Compact Size) ── */}
        <motion.div
          key={`${timeframe}-${currentUserRank}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-3.5 py-2.5 text-white shadow-md shadow-amber-500/10"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md font-black text-sm border border-white/30 shadow-inner">
              {currentUserRank ? `#${currentUserRank}` : '—'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {dynamicInsight.badge}
              </span>
              <p className="text-xs font-bold leading-snug text-white truncate">
                {dynamicInsight.text}
              </p>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-lg pointer-events-none" />
        </motion.div>

        {/* ── Podium Arena ── */}
        <div className="relative pt-2 pb-1">
          {/* Season timer tag */}
          <div className="flex justify-end mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-900/90 border border-zinc-300/60 dark:border-zinc-800 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>{timeRemainingText}</span>
            </span>
          </div>

          {/* Stepped 3D Podium Container */}
          <div className="relative flex items-end justify-center gap-2 pt-12 px-1">
            {/* ── #2 Silver (Left) ── */}
            <motion.div
              key={`podium-2-${timeframe}`}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 22 }}
              className="flex-1 flex flex-col items-center max-w-[110px]"
            >
              {/* Avatar + Info */}
              <div className="flex flex-col items-center mb-1.5 text-center w-full">
                <div className="relative">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-tr from-slate-400 to-slate-200 shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-white font-black text-xs">
                      {rank2?.profileImageUrl ? (
                        <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank2?.name || '2')
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-slate-300 text-slate-800 text-[9px] font-black flex items-center justify-center shadow-md border border-white dark:border-zinc-900">
                    2
                  </span>
                </div>

                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-full mt-1.5">
                  {rank2 ? rank2.name : '—'}
                </p>
                <div className="mt-0.5 px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-[10px] font-black text-slate-700 dark:text-slate-300">
                  {rank2 ? formatPoints(rank2.points) : '0 QP'}
                </div>
              </div>

              {/* Podium Block 2 */}
              <div className="w-full h-24 sm:h-28 rounded-t-xl bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 border-t border-x border-slate-200 dark:border-zinc-600 flex flex-col items-center justify-start pt-2 shadow-md">
                <span className="text-2xl sm:text-3xl font-black text-white/90 drop-shadow-sm">2</span>
              </div>
            </motion.div>

            {/* ── #1 Gold (Center) ── */}
            <motion.div
              key={`podium-1-${timeframe}`}
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.02, type: 'spring', stiffness: 260, damping: 22 }}
              className="flex-1 flex flex-col items-center max-w-[125px] z-10"
            >
              {/* Avatar + Crown + Info */}
              <div className="flex flex-col items-center mb-1.5 text-center w-full relative">
                {/* Crown Icon */}
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="mb-0.5"
                >
                  <div className="p-1 rounded-full bg-amber-400/20 text-amber-500 dark:text-yellow-400 border border-amber-400/40 shadow-xs">
                    <Crown className="w-4 h-4 fill-amber-400" />
                  </div>
                </motion.div>

                <div className="relative">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-400 shadow-lg shadow-amber-500/20">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-white font-black text-sm">
                      {rank1?.profileImageUrl ? (
                        <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank1?.name || '1')
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-md border border-white dark:border-zinc-900">
                    1
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white truncate w-full mt-1.5">
                  {rank1 ? rank1.name : '—'}
                </p>
                <div className="mt-0.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-400/20 border border-amber-400/30 text-[10px] font-black text-amber-700 dark:text-amber-300">
                  {rank1 ? formatPoints(rank1.points) : '0 QP'}
                </div>
              </div>

              {/* Podium Block 1 */}
              <div className="w-full h-32 sm:h-38 rounded-t-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 dark:from-amber-600 dark:via-zinc-800 dark:to-zinc-900 border-t border-x border-amber-300 dark:border-amber-500/50 flex flex-col items-center justify-start pt-2 shadow-xl shadow-amber-500/15">
                <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">1</span>
              </div>
            </motion.div>

            {/* ── #3 Bronze (Right) ── */}
            <motion.div
              key={`podium-3-${timeframe}`}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, type: 'spring', stiffness: 260, damping: 22 }}
              className="flex-1 flex flex-col items-center max-w-[110px]"
            >
              {/* Avatar + Info */}
              <div className="flex flex-col items-center mb-1.5 text-center w-full">
                <div className="relative">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-700 to-orange-400 shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-white font-black text-xs">
                      {rank3?.profileImageUrl ? (
                        <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank3?.name || '3')
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-700 text-white text-[9px] font-black flex items-center justify-center shadow-md border border-white dark:border-zinc-900">
                    3
                  </span>
                </div>

                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-full mt-1.5">
                  {rank3 ? rank3.name : '—'}
                </p>
                <div className="mt-0.5 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-zinc-800 text-[10px] font-black text-orange-700 dark:text-orange-300">
                  {rank3 ? formatPoints(rank3.points) : '0 QP'}
                </div>
              </div>

              {/* Podium Block 3 */}
              <div className="w-full h-18 sm:h-22 rounded-t-xl bg-gradient-to-b from-orange-300 via-amber-600 to-amber-800 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 border-t border-x border-orange-200 dark:border-zinc-600 flex flex-col items-center justify-start pt-2 shadow-md">
                <span className="text-2xl sm:text-3xl font-black text-white/90 drop-shadow-sm">3</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Bottom Sheet List: Rank #4 Onwards ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Standings
            </span>
            <span className="text-[10px] font-bold text-zinc-400 font-mono">
              {rankedUsers.length} Mechanics
            </span>
          </div>

          {isLeaderboardLoading || isJobsLoading ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Loading standings...</p>
            </div>
          ) : remainingUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No other mechanics ranked for this period.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[340px] overflow-y-auto no-scrollbar">
              {remainingUsers.map((u, idx) => {
                const actualRank = idx + 4;
                const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);

                return (
                  <motion.div
                    key={`${u.id}-${timeframe}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isMe
                        ? 'bg-amber-500/10 dark:bg-amber-400/10 border-l-3 border-amber-500'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Rank Circle */}
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 dark:text-zinc-400 shrink-0">
                      {actualRank}
                    </div>

                    {/* Avatar (Clean minimal, no wrench emoji) */}
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 text-zinc-600 dark:text-zinc-300">
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(u.name)
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-bold truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                        {u.name} {isMe && <span className="text-[11px] font-normal text-amber-500">(You)</span>}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">
                        {u.role || 'Mechanic'}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="shrink-0 text-right">
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
      </main>
    </div>
  );
};
