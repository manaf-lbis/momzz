import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Calendar, ChevronLeft, CheckCircle2, Clock, Users, ArrowUpRight, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { useGetLeaderboardQuery } from '../api/authApi';

type Timeframe = 'today' | 'week' | 'month' | 'year';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('week');

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 100 });
  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } = useGetLeaderboardQuery();

  const jobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if (jobsResponse.data.jobs) return jobsResponse.data.jobs;
    return [];
  }, [jobsResponse]);

  const leaderboardUsers = useMemo(() => {
    return leaderboardResponse?.data || [];
  }, [leaderboardResponse]);

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

  // Extract completed tasks in the timeframe
  const filteredCompletedTasks = useMemo(() => {
    const list: Array<{
      taskId: string;
      title: string;
      vehicleName: string;
      completedByName: string;
      completedById?: string;
      completedAt: string;
      elapsedMins?: number;
    }> = [];

    jobs.forEach((job) => {
      const jobCreatedTime = new Date(job.createdAt).getTime();
      (job.tasks || []).forEach((t) => {
        if (t.status === 'COMPLETED' && t.completedAt) {
          const compTime = new Date(t.completedAt).getTime();
          if (compTime >= filterDate) {
            const elapsed = Math.max(1, Math.round((compTime - jobCreatedTime) / 60000));
            list.push({
              taskId: t.id || (t as any)._id || Math.random().toString(),
              title: t.title,
              vehicleName: `${job.vehicleName} (${job.vehicleNumber})`,
              completedByName: t.completedBy?.name || 'Technician',
              completedById: t.completedBy?.id || (t.completedBy as any)?._id,
              completedAt: t.completedAt,
              elapsedMins: elapsed,
            });
          }
        }
      });
    });

    return list;
  }, [jobs, filterDate]);

  // Calculate stats by worker
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
              In selected time filter ({timeframe})
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
            <p className="text-[11px] font-mono text-zinc-400">Average time per job sub-task</p>
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-extrabold text-xs shadow-sm ${
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

          {/* Recent Task Completion Work Log */}
          <div className="industrial-card rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  Live Task Completion Log
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                LOGS
              </span>
            </div>

            {filteredCompletedTasks.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-400">
                No recent activity logged for this time range.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                {filteredCompletedTasks.slice(0, 15).map((log, idx) => (
                  <div
                    key={`${log.taskId}-${idx}`}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {log.title}
                      </span>
                      <span className="font-mono text-[10px] text-amber-600 dark:text-yellow-400 font-bold">
                        {log.elapsedMins} mins elapsed
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                      <span>Vehicle: {log.vehicleName}</span>
                      <span>By: {log.completedByName}</span>
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
