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
  Calendar,
  Award,
  Timer,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useGetJobCardsQuery, JobCardData } from '../../jobs/api/jobApi';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';

type Timeframe = 'day' | 'week' | 'month' | 'year' | 'all';

interface LogEntry {
  taskId: string;
  workTitle: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  completedByName: string;
  completedByProfileImageUrl?: string;
  partnerNames: string[];
  partners?: { name: string; profileImageUrl?: string }[];
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
  if (diffHours < 1) return `${Math.max(1, Math.floor((now.getTime() - d.getTime()) / 60000))}m ago`;
  if (diffHours < 24 && d.getDate() === now.getDate()) return `Today · ${timeStr}`;
  if (diffHours < 48) return `Yesterday · ${timeStr}`;
  return `${dateStr} · ${timeStr}`;
};

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

export const WorkLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Timeframe boundaries
  const { startTimestamp, endTimestamp, periodLabel } = useMemo(() => {
    const now = new Date();

    if (timeframe === 'day') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { startTimestamp: start, endTimestamp: end, periodLabel: now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) };
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

  // Build log entries
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
            const partnerList = ((t as any).partners || [])
              .map((p: any) => ({ name: p.name || 'Technician', profileImageUrl: p.profileImageUrl }))
              .filter(Boolean);
            const partnerNames = partnerList.map((p: any) => p.name);

            list.push({
              taskId: t.id || (t as any)._id || Math.random().toString(),
              workTitle: t.title,
              vehicleName: job.vehicleName || 'Vehicle',
              vehicleNumber: job.vehicleNumber || 'N/A',
              vehicleColor: job.vehicleColor,
              customerName: job.customerName,
              completedByName: t.completedBy?.name || 'Technician',
              completedByProfileImageUrl: t.completedBy?.profileImageUrl,
              partnerNames,
              partners: partnerList,
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

  // Aggregate stats
  const stats = useMemo(() => {
    const uniqueVehicles = new Set(allLogs.map((l) => l.vehicleNumber)).size;
    const uniqueTechs = new Set(allLogs.map((l) => l.completedByName)).size;
    const totalMins = allLogs.reduce((acc, l) => acc + l.elapsedMins, 0);
    const avgMins = allLogs.length ? Math.round(totalMins / allLogs.length) : 0;
    const sharedTasks = allLogs.filter((l) => l.isShared).length;

    return { uniqueVehicles, uniqueTechs, avgMins, sharedTasks };
  }, [allLogs]);

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
      else label = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

      if (!seen.has(label)) {
        seen.set(label, []);
        groups.push({ date: label, logs: seen.get(label)! });
      }
      seen.get(label)!.push(log);
    });

    return groups;
  }, [filteredLogs]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-16">
        {/* ── Top Header & Navigation ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 px-3 py-1 rounded-full shadow-xs">
              {periodLabel}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame className="w-4 h-4" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Work Logs & History
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Live chronological ledger of garage tasks and technician operations.
              </p>
            </div>

            {/* Timeframe Filter Tabs (Mobile Scrollable) */}
            <div className="w-full sm:w-auto overflow-x-auto no-scrollbar flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs shrink-0">
              {TIMEFRAMES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeframe(key)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all whitespace-nowrap ${
                    timeframe === key
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Key Metrics Cards (2x2 on Mobile, 4x1 on Tablet/Desktop) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Total Tasks */}
          <div className="bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Completed</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {allLogs.length}
              </p>
            </div>
          </div>

          {/* Vehicles */}
          <div className="bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Vehicles</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {stats.uniqueVehicles}
              </p>
            </div>
          </div>

          {/* Technicians */}
          <div className="bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Mechanics</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {stats.uniqueTechs}
              </p>
            </div>
          </div>

          {/* Avg Duration */}
          <div className="bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Avg Time</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {stats.avgMins < 60 ? `${stats.avgMins}m` : `${Math.floor(stats.avgMins / 60)}h ${stats.avgMins % 60}m`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, vehicle, license plate, or mechanic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 shadow-xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Log Cards Timeline Feed ── */}
        {isJobsLoading ? (
          <PageShimmer label="Loading work logs..." cards={4} />
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 px-4 rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No logs found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? 'No completed tasks match your search filter.' : 'No completed work records found for this period.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedLogs.map(({ date, logs }) => (
              <div key={date} className="space-y-2.5">
                {/* Date Group Header */}
                <div className="flex items-center gap-2.5 px-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {date}
                  </span>
                  <div className="flex-1 h-px bg-slate-200/70 dark:bg-slate-800" />
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    {logs.length} task{logs.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Log Item Cards */}
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <motion.div
                      key={`${log.taskId}-${idx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setSelectedLog(log)}
                      className="bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-amber-400/60 dark:hover:border-amber-500/40 transition cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkmark Icon Pill */}
                        <div className="mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                        </div>

                        {/* Middle Content */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                              {log.workTitle}
                            </h3>
                            <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                              {log.durationText}
                            </span>
                          </div>

                          {/* Vehicle Details Pill */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-bold flex items-center gap-1">
                              <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {log.vehicleName}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                              {log.vehicleNumber}
                            </span>
                            {log.vehicleColor && (
                              <span className="text-[11px] text-slate-400">• {log.vehicleColor}</span>
                            )}
                          </div>

                          {/* Technician Profile Image + Name & Timestamp */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              {/* Stacked Worker Avatar(s) */}
                              <div className="flex -space-x-1.5 overflow-visible shrink-0">
                                {/* Primary Technician Avatar */}
                                <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-500/20 border border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black text-emerald-700 dark:text-emerald-300 shrink-0 z-10 shadow-2xs">
                                  {log.completedByProfileImageUrl ? (
                                    <img src={log.completedByProfileImageUrl} alt={log.completedByName} className="w-full h-full object-cover" />
                                  ) : (
                                    log.completedByName.charAt(0).toUpperCase()
                                  )}
                                </div>

                                {/* Partner Avatars if shared */}
                                {log.isShared && (log.partners || []).map((partner, pi) => (
                                  <div
                                    key={pi}
                                    className="w-5 h-5 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-500/20 border border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black text-amber-700 dark:text-amber-300 shrink-0 shadow-2xs"
                                    style={{ zIndex: 9 - pi }}
                                    title={partner.name}
                                  >
                                    {partner.profileImageUrl ? (
                                      <img src={partner.profileImageUrl} alt={partner.name} className="w-full h-full object-cover" />
                                    ) : (
                                      partner.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                ))}
                              </div>

                              <span className="font-bold text-slate-900 dark:text-slate-100">{log.completedByName}</span>
                              {log.isShared && log.partnerNames.length > 0 && (
                                <span className="text-slate-400">
                                  + {log.partnerNames.join(', ')}
                                </span>
                              )}
                              {log.isShared && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[9px] font-mono font-bold">
                                  🤝 Shared
                                </span>
                              )}
                            </div>

                            <span className="font-mono text-slate-400 text-[10px]">
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

            <p className="text-center text-[10px] font-mono text-slate-400 py-3">
              ── End of logs ({filteredLogs.length} entries) ──
            </p>
          </div>
        )}
      </main>

      {/* ── Log Detail Popup Modal ── */}
      <AnimatePresence>
        {selectedLog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Task Audit Log
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {selectedLog.workTitle}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Vehicle</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLog.vehicleName} {selectedLog.vehicleColor ? `(${selectedLog.vehicleColor})` : ''}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Registration</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedLog.vehicleNumber}</span>
                </div>
                {selectedLog.customerName && (
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                    <span className="text-slate-400">Customer</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedLog.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Technician</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedLog.completedByName}</span>
                </div>
                {selectedLog.isShared && selectedLog.partnerNames.length > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                    <span className="text-slate-400">Shared With</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{selectedLog.partnerNames.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-400">Elapsed Time</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{selectedLog.durationText}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Completed At</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">{selectedLog.completedAtFormatted}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs active:scale-95 transition"
              >
                Close Audit Detail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
