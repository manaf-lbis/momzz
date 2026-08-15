import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  TrendingUp,
  Calendar,
  Award,
  Timer,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';

type Timeframe = 'day' | 'week' | 'month' | 'year' | 'all';

interface LogEntry {
  taskId: string;
  workTitle: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  completedByName: string;
  partnerNames: string[];
  completedAtIso: string;
  completedAtFormatted: string;
  elapsedMins: number;
  durationText: string;
  isShared: boolean;
}

const formatCompletedAt = (isoString?: string): string => {
  if (!isoString) return 'Recently';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Recently';
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  if (diffHours < 1) return `${Math.max(1, Math.floor((now.getTime() - d.getTime()) / 60000))} min ago`;
  if (diffHours < 24 && d.getDate() === now.getDate()) return `Today · ${timeStr}`;
  if (diffHours < 48) return `Yesterday · ${timeStr}`;
  return `${dateStr} · ${timeStr}`;
};

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
];

export const WorkLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 300 });

  const jobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if ((jobsResponse.data as any).jobs) return (jobsResponse.data as any).jobs;
    return [];
  }, [jobsResponse]);

  // Precise timeframe boundaries
  const { startTimestamp, endTimestamp, periodLabel } = useMemo(() => {
    const now = new Date();

    if (timeframe === 'day') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { startTimestamp: start, endTimestamp: end, periodLabel: now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }) };
    }
    if (timeframe === 'week') {
      const dow = now.getDay();
      const diffToMonday = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const saturday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5, 23, 59, 59, 999);
      return {
        startTimestamp: monday.getTime(),
        endTimestamp: saturday.getTime(),
        periodLabel: `${monday.toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${saturday.toLocaleDateString([], { day: 'numeric', month: 'short' })}`,
      };
    }
    if (timeframe === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { startTimestamp: start, endTimestamp: end, periodLabel: now.toLocaleDateString([], { month: 'long', year: 'numeric' }) };
    }
    if (timeframe === 'year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
      return { startTimestamp: start, endTimestamp: end, periodLabel: `Year ${now.getFullYear()}` };
    }
    return { startTimestamp: 0, endTimestamp: Infinity, periodLabel: 'All Time' };
  }, [timeframe]);

  // Build logs with rich info
  const allLogs: LogEntry[] = useMemo(() => {
    const list: LogEntry[] = [];

    jobs.forEach((job) => {
      const jobCreatedTime = new Date(job.createdAt).getTime();
      (job.tasks || []).forEach((t) => {
        if (t.status === 'COMPLETED' && t.completedAt) {
          const compTime = new Date(t.completedAt).getTime();
          if (compTime >= startTimestamp && compTime <= endTimestamp) {
            const elapsedMins = Math.max(1, Math.round((compTime - jobCreatedTime) / 60000));
            const hours = Math.floor(elapsedMins / 60);
            const mins = elapsedMins % 60;
            const partnerNames = ((t as any).partners || [])
              .map((p: any) => p.name || 'Technician')
              .filter(Boolean);

            list.push({
              taskId: t.id || (t as any)._id || Math.random().toString(),
              workTitle: t.title,
              vehicleName: job.vehicleName || 'Vehicle',
              vehicleNumber: job.vehicleNumber || 'N/A',
              vehicleColor: job.vehicleColor,
              customerName: job.customerName,
              completedByName: t.completedBy?.name || 'Technician',
              partnerNames,
              completedAtIso: t.completedAt,
              completedAtFormatted: formatCompletedAt(t.completedAt),
              elapsedMins,
              durationText: hours > 0 ? `${hours}h ${mins}m` : `${elapsedMins}m`,
              isShared: (t as any).isShared && partnerNames.length > 0,
            });
          }
        }
      });
    });

    return list.sort((a, b) => new Date(b.completedAtIso).getTime() - new Date(a.completedAtIso).getTime());
  }, [jobs, startTimestamp, endTimestamp]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allLogs;
    return allLogs.filter(
      (l) =>
        l.workTitle.toLowerCase().includes(q) ||
        l.vehicleName.toLowerCase().includes(q) ||
        l.vehicleNumber.toLowerCase().includes(q) ||
        l.completedByName.toLowerCase().includes(q)
    );
  }, [allLogs, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const uniqueTechs = new Set(allLogs.map((l) => l.completedByName)).size;
    const uniqueVehicles = new Set(allLogs.map((l) => l.vehicleNumber)).size;
    const totalMins = allLogs.reduce((acc, l) => acc + l.elapsedMins, 0);
    const avgMins = allLogs.length ? Math.round(totalMins / allLogs.length) : 0;
    const sharedTasks = allLogs.filter((l) => l.isShared).length;

    // Top performer this period
    const techMap: Record<string, number> = {};
    allLogs.forEach((l) => { techMap[l.completedByName] = (techMap[l.completedByName] || 0) + 1; });
    const topTech = Object.entries(techMap).sort((a, b) => b[1] - a[1])[0];

    // Avg per day
    let days = 1;
    if (timeframe === 'week') days = 6;
    if (timeframe === 'month') days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    if (timeframe === 'year') days = 365;
    if (timeframe === 'all') days = Math.max(1, Math.ceil((Date.now() - startTimestamp) / (1000 * 60 * 60 * 24)));
    const avgPerDay = allLogs.length ? (allLogs.length / days).toFixed(1) : '0';

    return { uniqueTechs, uniqueVehicles, avgMins, sharedTasks, topTech, avgPerDay };
  }, [allLogs, timeframe, startTimestamp]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { date: string; logs: LogEntry[] }[] = [];
    const seen = new Map<string, LogEntry[]>();

    filteredLogs.forEach((log) => {
      const d = new Date(log.completedAtIso);
      const now = new Date();
      let label: string;
      if (d.toDateString() === now.toDateString()) label = 'Today';
      else if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) label = 'Yesterday';
      else label = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

      if (!seen.has(label)) { seen.set(label, []); groups.push({ date: label, logs: seen.get(label)! }); }
      seen.get(label)!.push(log);
    });

    return groups;
  }, [filteredLogs]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-500 transition active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Work Logs & Activity
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{periodLabel}</p>
            </div>
          </div>

          {/* Compact timeframe pill */}
          <div className="flex items-center gap-0.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs">
            {TIMEFRAMES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeframe(key)}
                className={`relative px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  timeframe === key ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {timeframe === key && (
                  <motion.div
                    layoutId="wl-tf-pill"
                    className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tasks Completed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, type: 'spring', stiffness: 280, damping: 22 }}
            className="col-span-2 sm:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tasks Completed</p>
                <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1 leading-none">
                  {allLogs.length}
                </p>
                <p className="text-xs text-zinc-400 mt-1 font-mono">avg {stats.avgPerDay}/day</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </motion.div>

          {/* Vehicles Serviced */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, type: 'spring', stiffness: 280, damping: 22 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
              <Car className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900 dark:text-white leading-none">{stats.uniqueVehicles}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Vehicles</p>
            </div>
          </motion.div>

          {/* Active Techs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 22 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-900 dark:text-white leading-none">{stats.uniqueTechs}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Technicians</p>
            </div>
          </motion.div>
        </div>

        {/* ── Secondary Stats Row ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 dark:text-white leading-none">
                {stats.avgMins < 60
                  ? `${stats.avgMins}m`
                  : `${Math.floor(stats.avgMins / 60)}h ${stats.avgMins % 60}m`}
              </p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 truncate">Avg Duration</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 dark:text-white leading-none">{stats.sharedTasks}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 truncate">Shared Tasks</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-xs font-black text-zinc-900 dark:text-white leading-none truncate">
                {stats.topTech ? stats.topTech[0].split(' ')[0] : '—'}
              </p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 truncate">
                Top {stats.topTech ? `(${stats.topTech[1]})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by task, vehicle, plate, or technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-xs transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Activity Feed ── */}
        {isJobsLoading ? (
          <div className="py-16 flex flex-col items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Loading work logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">No Activity Found</p>
              <p className="text-xs text-zinc-400 mt-1">
                {searchQuery ? 'Try a different search keyword.' : 'Try selecting a wider timeframe.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedLogs.map(({ date, logs }) => (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                    {date}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">{logs.length} task{logs.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Log Cards */}
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <motion.div
                      key={`${log.taskId}-${idx}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02, type: 'spring', stiffness: 300, damping: 24 }}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => setSelectedLog(log)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs cursor-pointer hover:border-amber-400/50 dark:hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="mt-0.5 w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Task title + duration */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                              {log.workTitle}
                            </p>
                            <span className="shrink-0 text-[10px] font-black text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg px-2 py-0.5 font-mono">
                              {log.durationText}
                            </span>
                          </div>

                          {/* Vehicle row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {log.vehicleName}
                              {log.vehicleColor && (
                                <span className="text-zinc-400">· {log.vehicleColor}</span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-1.5 py-0.5">
                              {log.vehicleNumber}
                            </span>
                            {log.customerName && (
                              <span className="text-[10px] text-zinc-400">👤 {log.customerName}</span>
                            )}
                          </div>

                          {/* Technician row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                              <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{log.completedByName}</strong>
                                {log.isShared && log.partnerNames.length > 0 && (
                                  <span className="ml-1 text-zinc-400">
                                    + {log.partnerNames.join(', ')}
                                  </span>
                                )}
                              </span>
                              {log.isShared && (
                                <span className="text-[9px] font-black text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                  Shared
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap">
                              {log.completedAtFormatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* End of logs */}
            <p className="text-center text-[11px] font-mono text-zinc-400 py-4">
              ── {filteredLogs.length} task{filteredLogs.length !== 1 ? 's' : ''} recorded ──
            </p>
          </div>
        )}
      </main>

      {/* ── Log Detail Modal ── */}
      <AnimatePresence>
        {selectedLog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed Task</p>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{selectedLog.workTitle}</h3>
                  </div>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail rows */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                {[
                  { icon: <Car className="w-3.5 h-3.5 text-amber-500" />, label: 'Vehicle', value: `${selectedLog.vehicleName}${selectedLog.vehicleColor ? ' · ' + selectedLog.vehicleColor : ''}` },
                  { icon: <span className="font-mono text-zinc-400 text-[10px]">🔢</span>, label: 'Plate', value: selectedLog.vehicleNumber },
                  ...(selectedLog.customerName ? [{ icon: <span>👤</span>, label: 'Customer', value: selectedLog.customerName }] : []),
                  { icon: <UserCheck className="w-3.5 h-3.5 text-amber-500" />, label: 'Completed By', value: selectedLog.completedByName },
                  ...(selectedLog.isShared && selectedLog.partnerNames.length > 0
                    ? [{ icon: <Users className="w-3.5 h-3.5 text-violet-400" />, label: 'Partners', value: selectedLog.partnerNames.join(', ') }]
                    : []),
                  { icon: <Timer className="w-3.5 h-3.5 text-orange-400" />, label: 'Duration (from job open)', value: selectedLog.durationText },
                  { icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />, label: 'Completed At', value: selectedLog.completedAtFormatted },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 py-1.5 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
                    <span className="shrink-0 mt-0.5">{icon}</span>
                    <span className="text-zinc-400 w-24 shrink-0 font-semibold">{label}</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-bold flex-1 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs active:scale-95 transition"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
