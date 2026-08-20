import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetJobCardsQuery, useToggleJobPinMutation, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';
import { PinJobModal } from '../components/jobCard/PinJobModal';
import { VehiclePhotoModal } from '../components/jobCard/VehiclePhotoModal';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pin,
  Camera,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageShimmer } from '../components/common/PageShimmer';

type TimeFilter = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
type JobsView = 'MY_JOBS' | 'PENDING_VERIFICATION' | 'ALL_VEHICLES';

export const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const initialView: JobsView =
    location.state?.view === 'verify'
      ? 'PENDING_VERIFICATION'
      : location.state?.view === 'all'
      ? 'ALL_VEHICLES'
      : 'MY_JOBS';

  const [jobsView, setJobsView] = useState<JobsView>(initialView);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [accumulatedJobs, setAccumulatedJobs] = useState<JobCardData[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedPinJob, setSelectedPinJob] = useState<JobCardData | null>(null);
  const [photoModalJob, setPhotoModalJob] = useState<JobCardData | null>(null);
  const [pinningJobMode, setPinningJobMode] = useState<'ALL' | 'ME' | null>(null);
  // Optimistic pin overrides: map of jobId -> { isPinnedForAll?, pinnedByMe? }
  const [optimisticPins, setOptimisticPins] = useState<Record<string, { isPinnedForAll: boolean; pinnedByMe: boolean }>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.id || (user as any)?._id;
  const [toggleJobPin] = useToggleJobPinMutation();

  const isJobPinnedForMe = (job: JobCardData) => {
    if (!currentUserId) return false;
    const opt = optimisticPins[job.id || job._id!];
    if (opt !== undefined) return opt.pinnedByMe;
    return (
      Array.isArray(job.pinnedBy) &&
      job.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === currentUserId)
    );
  };

  const isJobPinnedForAll = (job: JobCardData) => {
    const opt = optimisticPins[job.id || job._id!];
    if (opt !== undefined) return opt.isPinnedForAll;
    return !!job.isPinnedForAll;
  };

  const isJobPinned = (job: JobCardData) => isJobPinnedForAll(job) || isJobPinnedForMe(job);

  // Optimistic-first toggle — used for both modal pin and direct unpin
  const handleToggleJobPin = async (jobCardId: string, mode: 'ALL' | 'ME', closeModal?: () => void) => {
    const job = [...accumulatedJobs, ...rawJobs].find(j => (j.id || j._id) === jobCardId);
    if (!job) return;

    const curPinnedForAll = isJobPinnedForAll(job);
    const curPinnedForMe = isJobPinnedForMe(job);

    // Apply optimistic state immediately
    setOptimisticPins(prev => ({
      ...prev,
      [jobCardId]: {
        isPinnedForAll: mode === 'ALL' ? !curPinnedForAll : curPinnedForAll,
        pinnedByMe: mode === 'ME' ? !curPinnedForMe : curPinnedForMe,
      },
    }));

    setPinningJobMode(mode);
    if (closeModal) closeModal();

    try {
      await toggleJobPin({ jobCardId, mode }).unwrap();
    } catch (err: any) {
      // Roll back optimistic state on error
      setOptimisticPins(prev => {
        const next = { ...prev };
        delete next[jobCardId];
        return next;
      });
      console.error('Failed to toggle pin:', err);
    } finally {
      setPinningJobMode(null);
      // Clear optimistic override once server responds (RTK Query cache updates)
      setTimeout(() => {
        setOptimisticPins(prev => {
          const next = { ...prev };
          delete next[jobCardId];
          return next;
        });
      }, 1500);
    }
  };

  // Smart pin button handler:
  // - If already pinned → directly unpin (no modal)
  // - If not pinned → open modal to choose pin mode
  const handlePinButtonClick = (e: React.MouseEvent, job: JobCardData) => {
    e.stopPropagation();
    const jobId = job.id || job._id!;
    if (isJobPinned(job)) {
      // Determine which mode to unpin
      const mode: 'ALL' | 'ME' = isJobPinnedForAll(job) ? 'ALL' : 'ME';
      handleToggleJobPin(jobId, mode);
    } else {
      setSelectedPinJob(job);
    }
  };

  const { data: jobsResponse, isLoading, isError, refetch } = useGetJobCardsQuery({
    page,
    limit: 10,
    timeframe: timeFilter.toLowerCase(),
  });

  const responseData = jobsResponse?.data;
  const rawJobs: JobCardData[] = Array.isArray(responseData)
    ? responseData
    : responseData?.jobs || [];
  const pagination = !Array.isArray(responseData) ? responseData?.pagination : undefined;
  const totalPages = pagination?.totalPages || 1;
  const hasMore = page < totalPages;

  // Reset on filter change
  useEffect(() => {
    setPage(1);
    setAccumulatedJobs([]);
  }, [timeFilter, jobsView]);

  // Accumulate jobs across pages
  useEffect(() => {
    if (!rawJobs.length) return;
    if (page === 1) {
      setAccumulatedJobs(rawJobs);
    } else {
      setAccumulatedJobs((prev) => {
        const existingIds = new Set(prev.map((j) => j.id || j._id));
        const newUnique = rawJobs.filter((j) => !existingIds.has(j.id || j._id));
        return [...prev, ...newUnique];
      });
    }
    setIsFetchingMore(false);
  }, [rawJobs, page]);

  // Infinite scroll — clean observer wired to sentinel
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && !isFetchingMore) {
      setIsFetchingMore(true);
      setPage((p) => p + 1);
    }
  }, [hasMore, isLoading, isFetchingMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  const displayJobs = accumulatedJobs.length > 0 ? accumulatedJobs : rawJobs;

  const getGarageDuration = (createdAt: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
    return `${Math.floor(minutes / 10080)}w ${Math.floor((minutes % 10080) / 1440)}d`;
  };

  const filteredJobs = displayJobs
    .filter((job) => {
      if (jobsView === 'MY_JOBS' && !job.tasks?.some((t) => t.status === 'OPEN')) return false;
      if (
        jobsView === 'PENDING_VERIFICATION' &&
        (!job.tasks?.length ||
          job.tasks.some((t) => t.status !== 'COMPLETED') ||
          job.verifiedAt)
      )
        return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        job.vehicleName.toLowerCase().includes(q) ||
        job.vehicleNumber.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aPinned = isJobPinned(a);
      const bPinned = isJobPinned(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      return jobsView === 'MY_JOBS'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const myJobsCount = displayJobs.filter((j) => j.tasks?.some((t) => t.status === 'OPEN')).length;
  const pendingCount = displayJobs.filter(
    (j) => j.tasks?.length && j.tasks.every((t) => t.status === 'COMPLETED') && !j.verifiedAt
  ).length;
  const allCount = displayJobs.length;

  const VIEWS: { key: JobsView; label: string; count: number }[] = [
    { key: 'MY_JOBS', label: 'My Jobs', count: myJobsCount },
    { key: 'PENDING_VERIFICATION', label: 'Pending', count: pendingCount },
    { key: 'ALL_VEHICLES', label: 'History', count: allCount },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-amber-500" />
                Active Vehicle Jobs
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} · scroll to load more
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => navigate('/jobs/create')}
              className="px-3 py-2 bg-amber-500 dark:bg-amber-400 text-zinc-950 font-black text-xs uppercase rounded-xl hover:bg-amber-400 dark:hover:bg-amber-300 transition active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Job</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>

        {/* ── Sticky Filter & Search Control Tray ── */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-md border-y border-zinc-200/60 dark:border-zinc-800/60 shadow-xs space-y-2.5">
          {/* ── View Tabs ── */}
          <div className="flex gap-1.5 p-1 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs backdrop-blur-sm">
            {VIEWS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setJobsView(key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  jobsView === key
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {jobsView === key && (
                  <motion.div
                    layoutId="jobs-view-pill"
                    className="absolute inset-0 bg-amber-400/20 dark:bg-amber-500/20 border border-amber-400/40 dark:border-amber-500/30 rounded-lg"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 font-black">{label}</span>
                {count > 0 && (
                  <span className={`relative z-10 text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                    jobsView === key ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Search ── */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by vehicle name or plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-xs transition-all"
            />
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading && page === 1 ? (
          <PageShimmer label="Loading vehicle job cards" cards={6} />
        ) : isError ? (
          <div className="p-6 text-center bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
            <p className="text-xs font-mono text-red-500">Failed to load vehicle job cards.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Car className="w-7 h-7 text-zinc-400 dark:text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">No Vehicles Found</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {jobsView === 'MY_JOBS' ? 'No vehicles with pending tasks.' : 'No vehicle job cards in this range.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Job Cards Grid ── */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            >
              {filteredJobs.map((job) => {
                const totalTasks = job.tasks?.length || 0;
                const completedTasks = job.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
                const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const isReady = totalTasks > 0 && completedTasks === totalTasks;
                const durationStr = getGarageDuration(job.createdAt);
                const pinnedForAll = isJobPinnedForAll(job);
                const pinnedForMe = isJobPinnedForMe(job);
                const isPinned = pinnedForAll || pinnedForMe;

                return (
                  <motion.div
                    key={job.id || job._id}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.97 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
                    }}
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                    className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between min-h-[175px] transition-all border ${
                      pinnedForAll
                        ? 'border-amber-400/90 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                        : pinnedForMe
                        ? 'border-blue-400/90 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10'
                        : isReady
                        ? 'border-emerald-500/50 shadow-md shadow-emerald-500/10'
                        : 'border-zinc-800/90 hover:border-zinc-700/90 shadow-lg shadow-black/40'
                    } bg-[#0b132b]`}
                  >
                    {/* Background Image with Clean Left-to-Right Medium Gradient Overlay (Matching Screenshot!) */}
                    {job.thumbnailUrl ? (
                      <>
                        <img
                          src={job.thumbnailUrl}
                          alt={job.vehicleName}
                          className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Clean left-to-right medium gradient tone */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1328] via-[#0b1328]/80 via-42% to-transparent z-0" />
                        {/* Subtle soft vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1328]/60 via-transparent to-black/25 z-0" />
                      </>
                    ) : (
                      <>
                        {/* Elegant Dark Backdrop when no vehicle image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#121c33] via-[#0d1629] to-[#070d1e] z-0" />
                        <div className="absolute right-2 -bottom-2 opacity-5 pointer-events-none z-0">
                          <Car className="w-36 h-36 text-white" />
                        </div>
                      </>
                    )}

                    {/* Content Container (Layered on top of gradient) */}
                    <div className="relative z-10 flex flex-col justify-between flex-1 gap-3.5">
                      {/* ── Top Row: Vehicle Name & Color, Pinned Badges, Pin Button, Status Pill ── */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate flex items-center gap-1.5 drop-shadow-xs">
                              <Car className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="truncate">{job.vehicleName}</span>
                              {job.vehicleColor && (
                                <span className="text-amber-400 font-bold text-xs shrink-0">
                                  · {job.vehicleColor}
                                </span>
                              )}
                            </h3>

                            {/* Pin Badges (Matching Screenshot Pill Style) */}
                            {pinnedForMe && !pinnedForAll && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono font-black text-[9px] uppercase tracking-wider shadow-sm shadow-blue-500/20 shrink-0">
                                <Pin className="w-2.5 h-2.5 fill-white" />
                                Pinned for You
                              </span>
                            )}
                            {pinnedForAll && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider shadow-sm shadow-amber-400/20 shrink-0">
                                <Pin className="w-2.5 h-2.5 fill-zinc-950" />
                                Pinned for All
                              </span>
                            )}
                          </div>

                          {/* Registration Plate Badge */}
                          <div>
                            <span className="inline-block text-[11px] font-mono font-black text-slate-200 bg-slate-950/85 border border-slate-700/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                              {job.vehicleNumber}
                            </span>
                          </div>
                        </div>

                        {/* Right Action: Yellow Pin Button & Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Yellow Pin Button (Square with rounded corners) */}
                          <button
                            type="button"
                            onClick={(e) => handlePinButtonClick(e, job)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md ${
                              isPinned
                                ? 'bg-amber-400 text-zinc-950 shadow-amber-400/25 ring-1 ring-amber-400'
                                : 'bg-black/40 text-slate-400 hover:text-amber-400 border border-white/10 hover:border-amber-400/40 backdrop-blur-xs'
                            }`}
                            title={isPinned ? 'Tap to unpin' : 'Pin Job Card'}
                          >
                            <Pin className={`w-4 h-4 ${isPinned ? 'fill-zinc-950 stroke-[2.5]' : ''}`} />
                          </button>

                          {/* Status Badge (Pill with icon matching screenshot) */}
                          {isReady ? (
                            <span className="shrink-0 flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Ready
                            </span>
                          ) : (
                            <span className="shrink-0 flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Middle: Tasks Progress Row ── */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-300 uppercase tracking-wider font-bold text-[10px]">
                            TASKS
                          </span>
                          <span className="font-black text-amber-400">
                            {completedTasks}/{totalTasks}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                          />
                        </div>
                      </div>

                      {/* ── Bottom Row: Garage Duration & Date ── */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {durationStr}
                        </span>
                        <span className="font-bold text-slate-300">
                          {new Date(job.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ── Infinite Scroll Sentinel ── */}
            <div ref={sentinelRef} className="h-4" />

            {/* ── Load More Indicator ── */}
            <AnimatePresence>
              {(isLoading && page > 1) || isFetchingMore ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-6 text-xs font-mono text-amber-500"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more vehicles...
                </motion.div>
              ) : !hasMore && displayJobs.length > 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[11px] font-mono text-zinc-400 py-4"
                >
                  ── All {displayJobs.length} vehicles loaded ──
                </motion.p>
              ) : null}
            </AnimatePresence>

            {/* ── Manual Pagination (in case scroll is blocked) ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  disabled={page <= 1}
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); setAccumulatedJobs([]); }}
                  className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono flex items-center gap-1 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs font-mono font-bold text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono flex items-center gap-1 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Pin Job Card Modal */}
        <PinJobModal
          isOpen={selectedPinJob !== null}
          onClose={() => setSelectedPinJob(null)}
          job={selectedPinJob}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onTogglePin={(jobCardId, mode) =>
            handleToggleJobPin(jobCardId, mode, () => setSelectedPinJob(null))
          }
          isPinningMode={pinningJobMode}
        />

        {/* Vehicle Photo Upload & Crop Modal */}
        {photoModalJob && (
          <VehiclePhotoModal
            isOpen={photoModalJob !== null}
            job={photoModalJob}
            onClose={() => setPhotoModalJob(null)}
            onSuccess={() => refetch()}
          />
        )}
      </main>
    </div>
  );
};

