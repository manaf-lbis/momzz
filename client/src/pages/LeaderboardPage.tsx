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
  TrendingUp,
  Target,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetLeaderboardQuery } from '../api/authApi';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';
import { BlurFade } from '../components/magicui/BlurFade';

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

const triggerGalaPopper = () => {
  try {
    confetti({
      particleCount: 45,
      spread: 70,
      origin: { y: 0.45 },
      colors: ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff', '#10b981', '#38bdf8'],
      ticks: 180,
      gravity: 1.1,
      scalar: 0.9,
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
  const { startTimestamp, endTimestamp, timeRemainingText, periodLabel } = useMemo(() => {
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
        timeRemainingText: `${hours}h ${mins}m remaining today`,
        periodLabel: 'Today’s Race',
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
        periodLabel: 'Weekly Championship',
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
        timeRemainingText: `${days}d remaining this month`,
        periodLabel: 'Monthly Gala',
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
        timeRemainingText: `${days}d left in ${now.getFullYear()}`,
        periodLabel: 'Annual Trophy',
      };
    }

    return {
      startTimestamp: 0,
      endTimestamp: Infinity,
      timeRemainingText: 'All-Time Record Hall of Fame',
      periodLabel: 'All-Time Hall of Fame',
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
        triggerGalaPopper();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLeaderboardLoading]);

  const dynamicInsight = useMemo(() => {
    if (!currentUserRank) {
      return {
        badge: 'Garage Standings',
        text: 'Verified task completions recorded live from workshop floor.',
        targetGap: 0,
      };
    }

    if (currentUserPoints === 0) {
      return {
        badge: 'Ready to Climb',
        text: `Complete your first task this ${timeframe} to get on the podium!`,
        targetGap: 1,
      };
    }

    if (currentUserRank === 1) {
      const runnerUp = rankedUsers[1];
      const leadGap = runnerUp ? parseFloat((currentUserPoints - runnerUp.points).toFixed(1)) : 0;
      return {
        badge: '👑 Defending Champion #1',
        text: leadGap > 0
          ? `You lead the workshop by +${leadGap} QP ahead of 2nd place!`
          : `You are holding 1st place on the podium!`,
        targetGap: 0,
      };
    }

    if (currentUserRank === 2 || currentUserRank === 3) {
      const aheadUser = rankedUsers[currentUserRank - 2];
      const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
      return {
        badge: `Podium Star (#${currentUserRank})`,
        text: `Only ${gap} QP needed to overtake #${currentUserRank - 1} (${aheadUser?.name || 'Top'})!`,
        targetGap: gap,
      };
    }

    const aheadUser = rankedUsers[currentUserRank - 2];
    const gap = aheadUser ? parseFloat((aheadUser.points - currentUserPoints).toFixed(1)) : 0;
    return {
      badge: `Challenger (#${currentUserRank})`,
      text: `${gap} QP away from overtaking #${currentUserRank - 1} (${aheadUser?.name || 'Next'})!`,
      targetGap: gap,
    };
  }, [currentUserRank, currentUserPoints, rankedUsers, timeframe]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950 transition-colors duration-200">
      {/* Background Awards Gala Ambient Light & Star Meteors */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-amber-400/15 via-yellow-500/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute bottom-10 -right-32 w-80 h-80 rounded-full bg-emerald-500/8 blur-3xl" />
        <Meteors number={12} />
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-6 space-y-4 pb-28 sm:pb-32">
        {/* ── LUXURY HEADER WITH BACK BUTTON ── */}
        <BlurFade delay={0.05}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-400/40 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center shrink-0"
                title="Go back"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    Leaderboard
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-mono font-black uppercase">
                    Live
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {periodLabel} • Verified task points
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-amber-400 text-xs font-mono font-bold shadow-sm shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeRemainingText}</span>
            </div>
          </div>
        </BlurFade>

        {/* ── LIQUID GLASS TIMEFRAME CAPSULE ── */}
        <BlurFade delay={0.1}>
          <div className="grid grid-cols-5 p-1 bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-lg">
            {TIMEFRAMES.map(({ key, label }) => {
              const isActive = timeframe === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTimeframe(key);
                    triggerGalaPopper();
                  }}
                  className={`relative py-2 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer ${
                    isActive
                      ? 'text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-gala-pill"
                      className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-300 rounded-xl shadow-md shadow-amber-400/30"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>
        </BlurFade>

        {/* ── VIP WORKER LIVE STATUS CARD ── */}
        <BlurFade delay={0.15}>
          <motion.div
            key={`${timeframe}-${currentUserRank}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-amber-400/30 p-4 sm:p-5 shadow-xl shadow-black/40"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-400/10 blur-2xl" />

            <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* User Rank Circle */}
                <div
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-400/25 shrink-0 cursor-pointer active:scale-95 transition-transform"
                  onClick={triggerGalaPopper}
                >
                  {currentUserRank ? `#${currentUserRank}` : '—'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      {dynamicInsight.badge}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {user?.name} (You)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-1 truncate">
                    {dynamicInsight.text}
                  </p>
                </div>
              </div>

              {/* Quality Points Display */}
              <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-xl sm:text-2xl font-black text-amber-400 font-mono leading-none">
                    <Flame className="w-5 h-5 text-amber-400 fill-current" />
                    <NumberTicker value={currentUserPoints} decimalPlaces={1} />
                  </div>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Quality Points
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </BlurFade>

        {/* ── THE GRAND PODIUM CEREMONY ── */}
        <BlurFade delay={0.2}>
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800/90 p-4 sm:p-6 shadow-2xl space-y-4">
            <BorderBeam size={240} duration={8} colorFrom="#facc15" colorTo="#f59e0b" borderWidth={1.5} />

            <div className="text-center relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-[11px] font-mono font-black uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 fill-current" />
                Workshop Podium Champions
              </span>
            </div>

            {/* 3-Pillar Olympic Ceremony Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-1 relative z-10">
              {/* 🥈 #2 SILVER CHAMPION (Left) */}
              <motion.div
                key={`podium-2-${timeframe}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  triggerGalaPopper();
                  if (rank2) setSelectedUserModal(rank2);
                }}
              >
                <div className="relative mb-2">
                  <div className="w-15 h-15 sm:w-18 sm:h-18 rounded-2xl p-1 bg-gradient-to-b from-slate-200 via-slate-400 to-slate-600 shadow-lg ring-2 ring-slate-400/60 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-[12px] overflow-hidden bg-slate-800 flex items-center justify-center text-slate-200 font-black text-sm">
                      {rank2?.profileImageUrl ? (
                        <img src={rank2.profileImageUrl} alt={rank2.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank2?.name || '2')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-slate-300 text-slate-950 text-[9px] font-mono font-black shadow-md border border-slate-900">
                    🥈 #2
                  </div>
                </div>

                <div className="w-full text-center">
                  <p className="text-xs font-bold text-slate-100 truncate w-full group-hover:text-amber-400 transition-colors">
                    {rank2 ? rank2.name : '—'}
                  </p>
                  <p className="text-[11px] font-mono font-black text-slate-400 mt-0.5">
                    {rank2 ? <><NumberTicker value={rank2.points} decimalPlaces={1} /> QP</> : '0 QP'}
                  </p>
                </div>

                {/* Silver Pedestal */}
                <div className="w-full h-16 sm:h-20 mt-3 rounded-2xl bg-gradient-to-b from-slate-800 via-slate-800/80 to-slate-900 border border-slate-700/80 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider">2nd</span>
                  <span className="text-[9px] font-mono text-slate-500 font-bold">SILVER</span>
                </div>
              </motion.div>

              {/* 👑 #1 GOLD CHAMPION (Center Topper - Grand & Celebrated) */}
              <motion.div
                key={`podium-1-${timeframe}`}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex flex-col items-center z-20 cursor-pointer group"
                onClick={() => {
                  triggerGalaPopper();
                  if (rank1) setSelectedUserModal(rank1);
                }}
              >
                <div className="relative mb-2">
                  {/* Floating 3D Gold Crown */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 z-30"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-400/50">
                      <Crown className="w-4 h-4 fill-current" />
                    </div>
                  </motion.div>

                  {/* Topper Large Distinct Avatar (96px) with Radiant Halo */}
                  <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-3xl p-1 bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-600 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-900 flex items-center justify-center text-amber-300 font-black text-2xl">
                      {rank1?.profileImageUrl ? (
                        <img src={rank1.profileImageUrl} alt={rank1.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank1?.name || '1')
                      )}
                    </div>
                  </div>

                  <div className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-mono font-black shadow-lg border border-slate-900 flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" />
                    #1 Top
                  </div>
                </div>

                <div className="w-full text-center">
                  <p className="text-sm sm:text-base font-black text-white truncate w-full group-hover:text-amber-400 transition-colors">
                    {rank1 ? rank1.name : '—'}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-xs font-mono font-black text-amber-300">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    {rank1 ? <><NumberTicker value={rank1.points} decimalPlaces={1} /> QP</> : '0 QP'}
                  </div>
                </div>

                {/* Gold Pedestal (Tallest) */}
                <div className="w-full h-24 sm:h-32 mt-3 rounded-2xl bg-gradient-to-b from-amber-400/30 via-amber-500/20 to-slate-900 border border-amber-400/50 flex flex-col items-center justify-center shadow-xl shadow-amber-500/20">
                  <span className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider">1st Champion</span>
                  <span className="text-[10px] font-mono text-amber-300 font-black tracking-widest">GOLD MASTER</span>
                </div>
              </motion.div>

              {/* 🥉 #3 BRONZE CONTENDER (Right) */}
              <motion.div
                key={`podium-3-${timeframe}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 22 }}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  triggerGalaPopper();
                  if (rank3) setSelectedUserModal(rank3);
                }}
              >
                <div className="relative mb-2">
                  <div className="w-15 h-15 sm:w-18 sm:h-18 rounded-2xl p-1 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 shadow-lg ring-2 ring-amber-700/60 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-[12px] overflow-hidden bg-slate-800 flex items-center justify-center text-amber-200 font-black text-sm">
                      {rank3?.profileImageUrl ? (
                        <img src={rank3.profileImageUrl} alt={rank3.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(rank3?.name || '3')
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-mono font-black shadow-md border border-slate-900">
                    🥉 #3
                  </div>
                </div>

                <div className="w-full text-center">
                  <p className="text-xs font-bold text-slate-100 truncate w-full group-hover:text-amber-400 transition-colors">
                    {rank3 ? rank3.name : '—'}
                  </p>
                  <p className="text-[11px] font-mono font-black text-slate-400 mt-0.5">
                    {rank3 ? <><NumberTicker value={rank3.points} decimalPlaces={1} /> QP</> : '0 QP'}
                  </p>
                </div>

                {/* Bronze Pedestal */}
                <div className="w-full h-12 sm:h-16 mt-3 rounded-2xl bg-gradient-to-b from-amber-950/60 via-slate-800 to-slate-900 border border-amber-800/50 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider">3rd</span>
                  <span className="text-[9px] font-mono text-amber-500 font-bold">BRONZE</span>
                </div>
              </motion.div>
            </div>
          </div>
        </BlurFade>

        {/* ── ALL TECHNICIANS STANDINGS TABLE (#4+) ── */}
        <BlurFade delay={0.25}>
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Workshop Roster Standings
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                {rankedUsers.length} Mechanics Ranked
              </span>
            </div>

            {isLeaderboardLoading || isJobsLoading ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Syncing verified task scores...</p>
              </div>
            ) : remainingUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                No other mechanics ranked for this timeframe.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {remainingUsers.map((u, idx) => {
                  const actualRank = idx + 4;
                  const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);
                  const pct = maxPoints > 0 ? (u.points / maxPoints) * 100 : 0;

                  return (
                    <motion.div
                      key={`${u.id}-${timeframe}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-all cursor-pointer ${
                        isMe
                          ? 'bg-amber-400/15 border border-amber-400/40 shadow-md'
                          : 'hover:bg-slate-800/60'
                      }`}
                      onClick={() => {
                        triggerGalaPopper();
                        setSelectedUserModal(u);
                      }}
                    >
                      {/* Rank Position */}
                      <div className="w-7 text-center text-sm font-black text-slate-400 font-mono shrink-0">
                        #{actualRank}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-slate-200 shadow-sm">
                        {u.profileImageUrl ? (
                          <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(u.name)
                        )}
                      </div>

                      {/* Name & Progress Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isMe ? 'text-amber-300' : 'text-slate-100'}`}>
                            {u.name} {isMe && <span className="text-xs font-normal text-amber-400">(You)</span>}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 uppercase hidden sm:inline">
                            {u.role || 'Mechanic'}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, pct)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.02 }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                          />
                        </div>
                      </div>

                      {/* Points */}
                      <div className="shrink-0 text-right pl-2">
                        <span className="text-sm sm:text-base font-black text-white font-mono">
                          {u.points}
                        </span>
                        <p className="text-[9px] font-bold text-amber-400 font-mono uppercase tracking-widest leading-none">
                          QP
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </BlurFade>
      </main>

      {/* ── LUXURY USER PROFILE CEREMONY MODAL ── */}
      <AnimatePresence>
        {selectedUserModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedUserModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="relative w-full max-w-xs overflow-hidden rounded-[32px] bg-slate-900 border border-amber-400/40 shadow-2xl p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <BorderBeam size={180} duration={6} colorFrom="#facc15" colorTo="#f59e0b" borderWidth={1.5} />

              <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />

              <div className="relative w-22 h-22 mx-auto rounded-3xl p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/50">
                <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-950 flex items-center justify-center text-amber-300 text-2xl font-black">
                  {selectedUserModal.profileImageUrl ? (
                    <img src={selectedUserModal.profileImageUrl} alt={selectedUserModal.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(selectedUserModal.name)
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">
                  {selectedUserModal.name}
                </h3>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-amber-400/15 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider border border-amber-400/30">
                  {selectedUserModal.role || 'Mechanic'}
                </span>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  {timeframe.toUpperCase()} QUALITY SCORE
                </span>
                <span className="text-3xl font-black text-amber-300 font-mono block tracking-tight">
                  <NumberTicker value={selectedUserModal.points || 0} decimalPlaces={1} />{' '}
                  <span className="text-xs font-bold text-slate-400 font-sans">QP</span>
                </span>
                <p className="text-[10px] font-mono text-slate-400">
                  Verified garage standing
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer"
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
