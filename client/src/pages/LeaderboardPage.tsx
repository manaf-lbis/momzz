import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ArrowLeft,
  Crown,
  Sparkles,
  User as UserIcon,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
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

  // Compute timeframe cutoff timestamp
  const filterDate = useMemo(() => {
    const now = new Date();
    if (timeframe === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (timeframe === 'week') { const d = new Date(); d.setDate(now.getDate() - 7); return d.getTime(); }
    if (timeframe === 'month') { const d = new Date(); d.setMonth(now.getMonth() - 1); return d.getTime(); }
    if (timeframe === 'year') { const d = new Date(); d.setFullYear(now.getFullYear() - 1); return d.getTime(); }
    return 0; // 'all'
  }, [timeframe]);

  // Dynamic ranking based on selected timeframe
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

    // Compute points for the selected timeframe from completed tasks
    const pointsMap: Record<string, { name: string; profileImageUrl?: string; role?: string; mobile?: string; points: number }> = {};

    // Pre-populate with all known users from leaderboard
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
          if (compTime >= filterDate) {
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
  }, [timeframe, rawLeaderboard, jobs, filterDate]);

  // Current logged in user's rank calculation
  const currentUserId = String(user?.id || (user as any)?._id || '');
  const currentUserIndex = rankedUsers.findIndex((u) => u.id === currentUserId || (user?.mobile && u.mobile === user.mobile));
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
  const totalUsersCount = rankedUsers.length || 1;
  const userPercentile = currentUserRank
    ? Math.max(10, Math.round(((totalUsersCount - currentUserRank) / totalUsersCount) * 100))
    : 50;

  // Podium Positions: #1 in center, #2 on left, #3 on right
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

  const timeRemaining = useMemo(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const diffMs = endOfMonth.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h`;
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0d1117] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 hover:border-amber-400/40 shadow-sm active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            Leaderboard
          </h1>

          <div className="w-9" /> {/* balance spacer */}
        </div>

        {/* ── Timeframe Pills ── */}
        <div className="bg-zinc-200/70 dark:bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-2xl flex items-center border border-zinc-300/50 dark:border-zinc-800/80 shadow-inner">
          {(['day', 'week', 'month', 'year', 'all'] as Timeframe[]).map((tf) => {
            const label = tf === 'day' ? 'Daily' : tf === 'week' ? 'Weekly' : tf === 'month' ? 'Monthly' : tf === 'year' ? 'Yearly' : 'All Time';
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`relative flex-1 py-2 rounded-xl text-xs font-black transition-all capitalize tracking-wide ${
                  isActive
                    ? 'text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="leaderboard-tf-pill"
                    className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Motivation / Percentile Banner ── */}
        {currentUserRank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-4 text-white shadow-lg shadow-amber-500/10"
          >
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md font-black text-xl border border-white/30 shadow-inner">
                #{currentUserRank}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-100 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Performance Insight
                </p>
                <p className="text-sm font-black leading-tight text-white mt-0.5">
                  You are doing better than <span className="underline decoration-amber-300 underline-offset-2">{userPercentile}%</span> of other technicians!
                </p>
              </div>
            </div>
            {/* Subtle background flare */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </motion.div>
        )}

        {/* ── Podium Arena ── */}
        <div className="relative pt-4 pb-2">
          {/* Top season timer tag */}
          <div className="flex justify-end mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200/80 dark:bg-zinc-900/90 border border-zinc-300/60 dark:border-zinc-800 text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 shadow-xs">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Season {timeRemaining} left</span>
            </span>
          </div>

          {/* Background Circular Aura */}
          <div className="absolute inset-x-0 top-12 flex justify-center pointer-events-none opacity-30 dark:opacity-20">
            <div className="w-72 h-72 rounded-full border border-amber-500/40 animate-pulse" />
            <div className="absolute w-96 h-96 rounded-full border border-amber-500/20" />
          </div>

          {/* Stepped 3D Podium Container */}
          <div className="relative flex items-end justify-center gap-2 sm:gap-4 pt-16 px-1">
            {/* ── #2 Silver (Left) ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 20 }}
              className="flex-1 flex flex-col items-center max-w-[130px]"
            >
              {/* Avatar + Info */}
              <div className="flex flex-col items-center mb-2 text-center w-full">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-gradient-to-tr from-slate-400 to-slate-200 shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-white font-black text-sm">
                      {rank2?.profileImageUrl ? (
                        <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank2?.name || '2')
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-800 text-[10px] font-black flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900">
                    2
                  </span>
                </div>

                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-full mt-2">
                  {rank2 ? rank2.name : '—'}
                </p>
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-[11px] font-black text-slate-700 dark:text-slate-300 shadow-xs">
                  {rank2 ? formatPoints(rank2.points) : '0 QP'}
                </div>
              </div>

              {/* Podium Block 2 */}
              <div className="w-full h-28 sm:h-32 rounded-t-2xl bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 border-t-2 border-x border-slate-200 dark:border-zinc-600 flex flex-col items-center justify-start pt-3 shadow-lg shadow-slate-400/10">
                <span className="text-3xl sm:text-4xl font-black text-white/90 drop-shadow-md">2</span>
              </div>
            </motion.div>

            {/* ── #1 Gold (Center) ── */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 220, damping: 20 }}
              className="flex-1 flex flex-col items-center max-w-[140px] z-10"
            >
              {/* Avatar + Crown + Info */}
              <div className="flex flex-col items-center mb-2 text-center w-full relative">
                {/* Crown Icon */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="mb-1"
                >
                  <div className="p-1.5 rounded-full bg-amber-400/20 text-amber-500 dark:text-yellow-400 border border-amber-400/40 shadow-md">
                    <Crown className="w-5 h-5 fill-amber-400" />
                  </div>
                </motion.div>

                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-400 shadow-xl shadow-amber-500/20">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-white font-black text-base">
                      {rank1?.profileImageUrl ? (
                        <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank1?.name || '1')
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 text-xs font-black flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900">
                    1
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white truncate w-full mt-2">
                  {rank1 ? rank1.name : '—'}
                </p>
                <div className="mt-1 px-3 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-400/20 border border-amber-400/30 text-[11px] font-black text-amber-700 dark:text-amber-300 shadow-xs">
                  {rank1 ? formatPoints(rank1.points) : '0 QP'}
                </div>
              </div>

              {/* Podium Block 1 */}
              <div className="w-full h-36 sm:h-44 rounded-t-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 dark:from-amber-600 dark:via-zinc-800 dark:to-zinc-900 border-t-2 border-x border-amber-300 dark:border-amber-500/50 flex flex-col items-center justify-start pt-3 shadow-2xl shadow-amber-500/20">
                <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">1</span>
              </div>
            </motion.div>

            {/* ── #3 Bronze (Right) ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 20 }}
              className="flex-1 flex flex-col items-center max-w-[130px]"
            >
              {/* Avatar + Info */}
              <div className="flex flex-col items-center mb-2 text-center w-full">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-gradient-to-tr from-amber-700 to-orange-400 shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-white font-black text-sm">
                      {rank3?.profileImageUrl ? (
                        <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank3?.name || '3')
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] font-black flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900">
                    3
                  </span>
                </div>

                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-full mt-2">
                  {rank3 ? rank3.name : '—'}
                </p>
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-zinc-800 text-[11px] font-black text-orange-700 dark:text-orange-300 shadow-xs">
                  {rank3 ? formatPoints(rank3.points) : '0 QP'}
                </div>
              </div>

              {/* Podium Block 3 */}
              <div className="w-full h-20 sm:h-24 rounded-t-2xl bg-gradient-to-b from-orange-300 via-amber-600 to-amber-800 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 border-t-2 border-x border-orange-200 dark:border-zinc-600 flex flex-col items-center justify-start pt-3 shadow-lg shadow-orange-500/10">
                <span className="text-3xl sm:text-4xl font-black text-white/90 drop-shadow-md">3</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Bottom Sheet List: Rank #4 Onwards ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
          {/* Grab Handle */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>

          <div className="px-5 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Other Top Performers
            </span>
            <span className="text-[11px] font-bold text-zinc-400 font-mono">
              {remainingUsers.length} Mechanics
            </span>
          </div>

          {isLeaderboardLoading || isJobsLoading ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Loading standings...</p>
            </div>
          ) : remainingUsers.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">
              No other mechanics ranked for this period yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[380px] overflow-y-auto no-scrollbar">
              {remainingUsers.map((u, idx) => {
                const actualRank = idx + 4;
                const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);

                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors ${
                      isMe
                        ? 'bg-amber-500/10 dark:bg-amber-400/10 border-l-4 border-amber-500'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Rank Circle */}
                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 dark:text-zinc-400 shrink-0">
                      {actualRank}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 text-zinc-600 dark:text-zinc-300">
                        {u.profileImageUrl ? (
                          <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(u.name)
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
                        🔧
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isMe ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                        {u.name} {isMe && <span className="text-xs font-normal text-amber-500">(You)</span>}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                        {u.role || 'Mechanic'}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                        {u.points}
                      </span>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        points
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
