import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Users,
  Car,
  UserCheck,
  Search,
  Zap,
  Calendar,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';

type Timeframe = 'today' | 'week' | 'month' | 'year' | 'all';

const formatCompletedAt = (isoString?: string) => {
  if (!isoString) return 'Recently';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Recently';
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
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
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export const WorkLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 200 });

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

  const allCompletedTasks = useMemo(() => {
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

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allCompletedTasks;
    return allCompletedTasks.filter(
      (t) =>
        t.workTitle.toLowerCase().includes(q) ||
        t.vehicleName.toLowerCase().includes(q) ||
        t.vehicleNumber.toLowerCase().includes(q) ||
        t.completedByName.toLowerCase().includes(q)
    );
  }, [allCompletedTasks, searchQuery]);

  const uniqueTechsCount = useMemo(() => {
    const set = new Set(allCompletedTasks.map((t) => t.completedByName));
    return set.size;
  }, [allCompletedTasks]);

  const avgCompletionTime = useMemo(() => {
    if (!allCompletedTasks.length) return 0;
    return Math.round(allCompletedTasks.reduce((acc, t) => acc + (t.elapsedMins || 0), 0) / allCompletedTasks.length);
  }, [allCompletedTasks]);

  const TIMEFRAMES: Timeframe[] = ['today', 'week', 'month', 'year', 'all'];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 shadow-sm active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Work Logs &amp; Activity
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Completed garage tasks &amp; execution timeline
              </p>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm self-start sm:self-auto">
            {TIMEFRAMES.map((tf) => {
              const label = tf === 'today' ? 'Day' : tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : tf === 'year' ? 'Year' : 'All';
              const isActive = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    isActive
                      ? 'text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="worklogs-tf-pill"
                      className="absolute inset-0 bg-amber-400/20 dark:bg-amber-500/20 border border-amber-400/40 dark:border-amber-500/30 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          <motion.div
            variants={item}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Completed</p>
              <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none mt-0.5">
                {allCompletedTasks.length}
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={item}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Technicians</p>
              <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none mt-0.5">
                {uniqueTechsCount}
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={item}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Avg Duration</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">
                  {avgCompletionTime}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold">min</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by task title, vehicle plate, or technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-sm transition-all"
          />
        </div>

        {/* ── Activity Feed List ── */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Activity Stream
            </span>
            <span className="text-[11px] font-mono font-bold text-zinc-400">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} recorded
            </span>
          </div>

          {isJobsLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Loading work logs...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Clock className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">No activity found</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {searchQuery ? 'Try matching another search keyword.' : 'Try selecting a wider timeframe.'}
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="divide-y divide-zinc-100 dark:divide-zinc-800"
            >
              {filteredTasks.map((log, idx) => (
                <motion.div
                  key={`${log.taskId}-${idx}`}
                  variants={item}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="mt-0.5 w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {log.workTitle}
                      </p>
                      <span className="shrink-0 text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg px-2.5 py-0.5 shadow-xs">
                        {log.durationText}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Car className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{log.vehicleName}</span>
                        <span className="font-mono text-zinc-400">({log.vehicleNumber})</span>
                      </span>

                      <span className="flex items-center gap-1.5 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Completed by <strong className="text-zinc-800 dark:text-zinc-200">{log.completedByName}</strong></span>
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {log.completedAtFormatted}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};
