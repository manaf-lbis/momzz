import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  CheckCircle2,
  Clock,
  Users,
  Car,
  UserCheck,
  TrendingUp,
  Zap,
  ArrowLeft,
  Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { useGetLeaderboardQuery } from '../api/authApi';
import { Navbar } from '../components/navbar/Navbar';

type Timeframe = 'today' | 'week' | 'month' | 'year';

const formatCompletedAt = (isoString?: string) => {
  if (!isoString) return 'Recently';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Recently';
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  if (diffHours < 24 && d.getDate() === now.getDate()) return `Today, ${timeStr}`;
  if (diffHours < 48) return `Yesterday, ${timeStr}`;
  return `${dateStr}, ${timeStr}`;
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 100 });
  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } = useGetLeaderboardQuery();
  const allTimeLeaderboard: any[] = leaderboardResponse?.data || [];

  const jobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if ((jobsResponse.data as any).jobs) return (jobsResponse.data as any).jobs;
    return [];
  }, [jobsResponse]);

  const filterDate = useMemo(() => {
    const now = new Date();
    if (timeframe === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (timeframe === 'week') { const d = new Date(); d.setDate(now.getDate() - 7); return d.getTime(); }
    if (timeframe === 'month') { const d = new Date(); d.setMonth(now.getMonth() - 1); return d.getTime(); }
    if (timeframe === 'year') { const d = new Date(); d.setFullYear(now.getFullYear() - 1); return d.getTime(); }
    return 0;
  }, [timeframe]);

  const filteredCompletedTasks = useMemo(() => {
    const list: Array<{
      taskId: string; workTitle: string; vehicleName: string; vehicleNumber: string;
      completedByName: string; completedAtIso: string; completedAtFormatted: string;
      elapsedMins: number; durationText: string;
    }> = [];
    jobs.forEach((job) => {
      const jobCreatedTime = new Date(job.createdAt).getTime();
      (job.tasks || []).forEach((t) => {
        if (t.status === 'COMPLETED' && t.completedAt) {
          const compTime = new Date(t.completedAt).getTime();
          if (compTime >= filterDate) {
            const elapsedMins = Math.max(1, Math.round((compTime - jobCreatedTime) / 60000));
            const hours = Math.floor(elapsedMins / 60);
            const mins = elapsedMins % 60;
            list.push({
              taskId: t.id || (t as any)._id || Math.random().toString(),
              workTitle: t.title,
              vehicleName: job.vehicleName || 'Vehicle',
              vehicleNumber: job.vehicleNumber || 'N/A',
              completedByName: t.completedBy?.name || 'Technician',
              completedAtIso: t.completedAt,
              completedAtFormatted: formatCompletedAt(t.completedAt),
              elapsedMins,
              durationText: hours > 0 ? `${hours}h ${mins}m` : `${elapsedMins}m`,
            });
          }
        }
      });
    });
    return list.sort((a, b) => new Date(b.completedAtIso).getTime() - new Date(a.completedAtIso).getTime());
  }, [jobs, filterDate]);

  const workerStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalElapsedMins: number }> = {};
    filteredCompletedTasks.forEach((t) => {
      const key = t.completedByName || 'Technician';
      if (!map[key]) map[key] = { name: key, count: 0, totalElapsedMins: 0 };
      map[key].count += 1;
      map[key].totalElapsedMins += t.elapsedMins || 15;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredCompletedTasks]);

  const personalTaskCount = useMemo(() => {
    if (!user?.name) return 0;
    return filteredCompletedTasks.filter(
      (t) => t.completedByName.toLowerCase() === user.name.toLowerCase()
    ).length;
  }, [filteredCompletedTasks, user?.name]);

  const avgCompletionTime = useMemo(() => {
    if (!filteredCompletedTasks.length) return 0;
    return Math.round(filteredCompletedTasks.reduce((acc, t) => acc + (t.elapsedMins || 0), 0) / filteredCompletedTasks.length);
  }, [filteredCompletedTasks]);

  const TIMEFRAMES: Timeframe[] = ['today', 'week', 'month', 'year'];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Performance
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Garage analytics & rankings</p>
            </div>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm self-start sm:self-auto">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  timeframe === tf
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                {timeframe === tf && (
                  <motion.div
                    layoutId="tf-pill"
                    className="absolute inset-0 bg-amber-400/20 dark:bg-amber-500/20 border border-amber-400/40 dark:border-amber-500/30 rounded-lg"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{tf}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Stat Strip ── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          {[
            {
              label: 'Completed',
              value: filteredCompletedTasks.length,
              unit: 'tasks',
              icon: CheckCircle2,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
            },
            {
              label: isAdmin ? 'Active Techs' : 'My Tasks',
              value: isAdmin ? workerStats.length : personalTaskCount,
              unit: isAdmin ? 'workers' : 'done',
              icon: Users,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
            },
            {
              label: 'Avg Time',
              value: avgCompletionTime,
              unit: 'min / task',
              icon: Zap,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10',
            },
          ].map(({ label, value, unit, icon: Icon, color, bg }) => (
            <motion.div
              key={label}
              variants={item}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm"
            >
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{label}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{value}</span>
                  <span className="text-[10px] text-zinc-400 font-semibold">{unit}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Leaderboard ── */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden h-full">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Leaderboard</span>
                <span className="ml-auto text-[10px] font-bold text-zinc-400 uppercase tracking-widest">All Time</span>
              </div>

              {isLeaderboardLoading ? (
                <div className="py-12 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-500">Loading...</p>
                </div>
              ) : allTimeLeaderboard.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-400">No data yet.</p>
                </div>
              ) : (
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[440px] overflow-y-auto no-scrollbar"
                >
                  {(() => {
                    const maxPts = allTimeLeaderboard[0]?.taskCount || 1;
                    return allTimeLeaderboard.map((w: any, idx: number) => {
                      const pts = Number(w.taskCount || 0).toFixed(1);
                      const pct = maxPts > 0 ? ((w.taskCount || 0) / maxPts) * 100 : 0;
                      const initials = (w.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                      const isFirst = idx === 0;

                      return (
                        <motion.div
                          key={w._id || w.id}
                          variants={item}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isFirst ? 'bg-amber-50/60 dark:bg-amber-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                        >
                          {/* Medal / Rank */}
                          <span className="w-5 text-center text-sm shrink-0">{medal || <span className="text-xs font-bold text-zinc-400">{idx + 1}</span>}</span>

                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : idx === 1 ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            : idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {initials}
                          </div>

                          {/* Name + bar */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{w.name}</p>
                            <div className="mt-1 h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                                className={`h-full rounded-full ${
                                  idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-400' : 'bg-zinc-300 dark:bg-zinc-600'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Points */}
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-black leading-none ${isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-200'}`}>{pts}</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">pts</p>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Activity Log ── */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden h-full">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Activity Log</span>
                {filteredCompletedTasks.length > 0 && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {filteredCompletedTasks.length} tasks
                  </span>
                )}
              </div>

              {isJobsLoading ? (
                <div className="py-12 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-500">Loading activity...</p>
                </div>
              ) : filteredCompletedTasks.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-500">No activity this period.</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Try a wider timeframe above.</p>
                  </div>
                </div>
              ) : (
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[440px] overflow-y-auto no-scrollbar"
                >
                  {filteredCompletedTasks.map((log, idx) => (
                    <motion.div
                      key={`${log.taskId}-${idx}`}
                      variants={item}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Icon */}
                      <div className="mt-0.5 w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-snug truncate">{log.workTitle}</p>
                          <span className="shrink-0 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-0.5">{log.durationText}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5">
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <Car className="w-3 h-3 shrink-0" />
                            <span className="truncate">{log.vehicleName}</span>
                            <span className="text-zinc-400 dark:text-zinc-600">· {log.vehicleNumber}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <UserCheck className="w-3 h-3 shrink-0" />
                            {log.completedByName}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{log.completedAtFormatted}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
