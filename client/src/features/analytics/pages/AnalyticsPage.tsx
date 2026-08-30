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
  ChevronLeft,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../../jobs/api/jobApi';
import { useGetLeaderboardQuery } from '../../auth/api/authApi';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { PageShimmer, BentoCardSkeleton } from '../../../shared/components/common/PageShimmer';

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.1)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06)_0%,transparent_65%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 pb-32 space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Workshop Analytics
              </h1>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Performance insights, throughput, and rankings
              </p>
            </div>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xs self-start sm:self-auto backdrop-blur-xl">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'text-slate-950 font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {timeframe === tf && (
                  <motion.div
                    layoutId="analytics-tf-pill"
                    style={{
                      background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)',
                      boxShadow: '0 2px 10px rgba(251, 191, 36, 0.4)',
                    }}
                    className="absolute inset-0 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{tf}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bento Stat Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Completed Tasks */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completed Tasks
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  <NumberTicker value={filteredCompletedTasks.length} />
                </span>
                <span className="text-xs font-mono text-slate-400">tasks</span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Technicians or Personal Tasks */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAdmin ? 'Active Technicians' : 'My Output'}
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  <NumberTicker value={isAdmin ? workerStats.length : personalTaskCount} />
                </span>
                <span className="text-xs font-mono text-slate-400">{isAdmin ? 'technicians' : 'tasks done'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Average Speed */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Avg Duration
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  <NumberTicker value={avgCompletionTime} />
                </span>
                <span className="text-xs font-mono text-slate-400">min / task</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Bento Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Leaderboard Bento Card (4 cols) */}
          <div className="lg:col-span-5 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">All-Time Standings</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Top Techs</span>
            </div>

            {isLeaderboardLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : allTimeLeaderboard.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono text-slate-400">No score records found.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[380px] overflow-y-auto no-scrollbar">
                {(() => {
                  const maxPts = allTimeLeaderboard[0]?.taskCount || 1;
                  return allTimeLeaderboard.map((w: any, idx: number) => {
                    const pts = Number(w.taskCount || 0).toFixed(1);
                    const pct = maxPts > 0 ? ((w.taskCount || 0) / maxPts) * 100 : 0;
                    const initials = (w.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

                    return (
                      <div
                        key={w._id || w.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          idx === 0 ? 'bg-amber-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="w-5 text-center text-sm font-bold font-mono text-slate-400 shrink-0">
                          {medal || idx + 1}
                        </span>

                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{w.name}</p>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full transition-all duration-700 ${
                                idx === 0 ? 'bg-amber-400' : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-400">{pts}</p>
                          <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">QP</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Activity Log Bento Card (7 cols) */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Recent Task Activity</span>
              </div>
              {filteredCompletedTasks.length > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {filteredCompletedTasks.length} Completed
                </span>
              )}
            </div>

            {isJobsLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredCompletedTasks.length === 0 ? (
              <div className="py-16 text-center space-y-1">
                <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No completed tasks in this timeframe.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[380px] overflow-y-auto no-scrollbar">
                {filteredCompletedTasks.map((log, idx) => (
                  <div
                    key={`${log.taskId}-${idx}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {log.workTitle}
                        </p>
                        <span className="shrink-0 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-0.5">
                          {log.durationText}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <Car className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">{log.vehicleName}</span>
                          <span className="text-slate-400">({log.vehicleNumber})</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <UserCheck className="w-3 h-3 text-sky-500 shrink-0" />
                          {log.completedByName}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-mono text-slate-400">
                        {log.completedAtFormatted}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

