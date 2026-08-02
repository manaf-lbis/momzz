import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Calendar, ChevronLeft, CheckCircle2, Clock, Users, Wrench, Car, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { useGetLeaderboardQuery } from '../api/authApi';

type Timeframe = 'today' | 'week' | 'month' | 'year';

const formatCompletedAt = (isoString?: string) => {
  if (!isoString) return 'Recently';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return `Today at ${timeStr}`;
  } else if (diffHours < 48 && (now.getDate() - d.getDate() === 1 || diffHours < 36)) {
    return `Yesterday at ${timeStr}`;
  }
  return `${dateStr} at ${timeStr}`;
};

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('week');

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 100 });
  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } = useGetLeaderboardQuery();

  // Parse actual jobs array from server (no dummy fallback)
  const jobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if (jobsResponse.data.jobs) return jobsResponse.data.jobs;
    return [];
  }, [jobsResponse]);

  // Compute timeframe date boundary
  const filterDate = useMemo(() => {
    const now = new Date();
    if (timeframe === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return today.getTime();
    }
    if (timeframe === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return weekAgo.getTime();
    }
    if (timeframe === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return monthAgo.getTime();
    }
    if (timeframe === 'year') {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      return yearAgo.getTime();
    }
    return 0;
  }, [timeframe]);

  // Extract actual completed tasks with full vehicle name, vehicle number, work done, completedAt, and duration
  const filteredCompletedTasks = useMemo(() => {
    const list: Array<{
      taskId: string;
      workTitle: string;
      vehicleName: string;
      vehicleNumber: string;
      completedByName: string;
      completedAtIso: string;
      completedAtFormatted: string;
      elapsedMins: number;
      durationText: string;
    }> = [];

    jobs.forEach((job) => {
      const jobCreatedTime = new Date(job.createdAt).getTime();
      (job.tasks || []).forEach((t) => {
        if (t.status === 'COMPLETED' && t.completedAt) {
          const compTime = new Date(t.completedAt).getTime();
          if (compTime >= filterDate) {
            const elapsedMins = Math.max(1, Math.round((compTime - jobCreatedTime) / 60000));
            const hours = Math.floor(elapsedMins / 60);
            const remainingMins = elapsedMins % 60;
            const durationText = hours > 0 ? `${hours}h ${remainingMins}m` : `${elapsedMins} mins`;

            list.push({
              taskId: t.id || (t as any)._id || Math.random().toString(),
              workTitle: t.title,
              vehicleName: job.vehicleName || 'Vehicle',
              vehicleNumber: job.vehicleNumber || 'N/A',
              completedByName: t.completedBy?.name || 'Technician',
              completedAtIso: t.completedAt,
              completedAtFormatted: formatCompletedAt(t.completedAt),
              elapsedMins,
              durationText,
            });
          }
        }
      });
    });

    // Sort by most recently completed first
    return list.sort((a, b) => new Date(b.completedAtIso).getTime() - new Date(a.completedAtIso).getTime());
  }, [jobs, filterDate]);

  // Calculate worker stats ranked by total tasks completed
  const workerStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalElapsedMins: number }> = {};

    filteredCompletedTasks.forEach((t) => {
      const key = t.completedByName || 'Technician';
      if (!map[key]) {
        map[key] = { name: key, count: 0, totalElapsedMins: 0 };
      }
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
    const total = filteredCompletedTasks.reduce((acc, curr) => acc + (curr.elapsedMins || 0), 0);
    return Math.round(total / filteredCompletedTasks.length);
  }, [filteredCompletedTasks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 transition-colors"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
                <h1 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight">
                  ANALYTICS & TOP PERFORMERS
                </h1>
              </div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                GARAGE WORK LOG & PERFORMANCE LEADERBOARD
              </p>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm self-stretch sm:self-auto">
            {(['today', 'week', 'month', 'year'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  timeframe === tf
                    ? 'bg-yellow-400 text-zinc-950 shadow-md'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="industrial-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Completed Tasks
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {filteredCompletedTasks.length}
            </p>
            <p className="text-[11px] font-mono text-zinc-400">
              Actual work completed ({timeframe})
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="industrial-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                {isAdmin ? 'Active Technicians' : 'My Completed Tasks'}
              </span>
              <Users className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {isAdmin ? workerStats.length : personalTaskCount}
            </p>
            <p className="text-[11px] font-mono text-zinc-400">
              {isAdmin ? 'Contributing workers' : `Logged in as ${user?.name}`}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="industrial-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Avg Task Time
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {avgCompletionTime} <span className="text-base font-normal text-zinc-400">mins</span>
            </p>
            <p className="text-[11px] font-mono text-zinc-400">Average time taken per job sub-task</p>
          </motion.div>
        </div>

        {/* Main Content Grid: Leaderboard & Work Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers Leaderboard */}
          <div className="industrial-card rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  Top Performers Leaderboard
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                RANKINGS
              </span>
            </div>

            {isLeaderboardLoading || isJobsLoading ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-400 animate-pulse">
                Loading analytics leaderboard...
              </div>
            ) : workerStats.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-400">
                No tasks completed in this time filter yet.
              </div>
            ) : (
              <div className="space-y-2">
                {workerStats.map((w, idx) => (
                  <motion.div
                    key={w.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-extrabold text-xs shadow-sm ${
                          idx === 0
                            ? 'bg-yellow-400 text-zinc-950 ring-2 ring-yellow-400/50'
                            : idx === 1
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-950 dark:text-zinc-100'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-extrabold text-xs uppercase text-zinc-900 dark:text-zinc-100">
                          {w.name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400">
                          Avg: {Math.round(w.totalElapsedMins / (w.count || 1))} mins/task
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-sm text-amber-600 dark:text-yellow-400">
                        {w.count}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                        Tasks
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Work Log */}
          <div className="industrial-card rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  Detailed Work Log
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                ACTUAL LOGS
              </span>
            </div>

            {filteredCompletedTasks.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-400">
                No work completed in this time range.
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
                {filteredCompletedTasks.map((log, idx) => (
                  <div
                    key={`${log.taskId}-${idx}`}
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 space-y-2"
                  >
                    {/* Work / Task Title & Elapsed Time */}
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase truncate">
                          {log.workTitle}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-600 dark:text-yellow-400 border border-amber-400/20 font-mono text-[10px] font-bold shrink-0">
                        Took {log.durationText}
                      </span>
                    </div>

                    {/* Vehicle Details & Completion Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Car className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          Vehicle: <strong className="text-zinc-800 dark:text-zinc-200 uppercase">{log.vehicleName}</strong> ({log.vehicleNumber})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>
                          Completed by: <strong className="text-zinc-800 dark:text-zinc-200">{log.completedByName}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Completion Date/Time */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-200/40 dark:border-zinc-800/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" /> Finished: {log.completedAtFormatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
