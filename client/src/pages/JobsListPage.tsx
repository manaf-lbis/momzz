import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetJobCardsQuery, useToggleJobPinMutation, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';
import { PinJobModal } from '../components/jobCard/PinJobModal';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { BlurFade } from '../components/magicui/BlurFade';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Loader2,
  Sparkles,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Pin,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageShimmer } from '../components/common/PageShimmer';
import { getDeliveryStatusInfo } from '../utils/dateUtils';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { ProgressBarBeam } from '../components/magicui/AnimatedBeam';

type TimeFilter = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
type JobsView = 'MY_JOBS' | 'PENDING_VERIFICATION' | 'ALL_VEHICLES';
type SortOption =
  | 'DELIVERY_SOONEST'
  | 'DELIVERY_LATEST'
  | 'CREATED_NEWEST'
  | 'CREATED_OLDEST'
  | 'VEHICLE_AZ'
  | 'VEHICLE_ZA'
  | 'PROGRESS_LOWEST'
  | 'PROGRESS_HIGHEST';

const SORT_CONFIG: Array<{ value: SortOption; label: string; shortLabel: string; icon: React.ReactNode }> = [
  { value: 'DELIVERY_SOONEST', label: 'Delivery: Soonest', shortLabel: 'Soonest Delivery', icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
  { value: 'DELIVERY_LATEST', label: 'Delivery: Latest', shortLabel: 'Latest Delivery', icon: <Calendar className="w-3.5 h-3.5 text-amber-400" /> },
  { value: 'CREATED_NEWEST', label: 'Created: Newest', shortLabel: 'Newest First', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> },
  { value: 'CREATED_OLDEST', label: 'Created: Oldest', shortLabel: 'Oldest First', icon: <Clock className="w-3.5 h-3.5 text-slate-400" /> },
  { value: 'VEHICLE_AZ', label: 'Vehicle: A to Z', shortLabel: 'Model A-Z', icon: <Car className="w-3.5 h-3.5 text-sky-500" /> },
  { value: 'VEHICLE_ZA', label: 'Vehicle: Z to A', shortLabel: 'Model Z-A', icon: <Car className="w-3.5 h-3.5 text-sky-500" /> },
  { value: 'PROGRESS_LOWEST', label: 'Progress: Lowest', shortLabel: 'Low Progress', icon: <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" /> },
  { value: 'PROGRESS_HIGHEST', label: 'Progress: Highest', shortLabel: 'High Progress', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
];

export const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const currentUserId = user?.id || (user as any)?._id;

  const initialView: JobsView =
    location.state?.view === 'verify'
      ? 'PENDING_VERIFICATION'
      : location.state?.view === 'all'
      ? 'ALL_VEHICLES'
      : 'MY_JOBS';

  const [jobsView, setJobsView] = useState<JobsView>(initialView);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DELIVERY_SOONEST');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [accumulatedJobs, setAccumulatedJobs] = useState<JobCardData[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedPinJob, setSelectedPinJob] = useState<JobCardData | null>(null);
  const [pinningJobMode, setPinningJobMode] = useState<'ALL' | 'ME' | null>(null);
  const [optimisticPins, setOptimisticPins] = useState<Record<string, { isPinnedForAll: boolean; pinnedByMe: boolean }>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [toggleJobPin] = useToggleJobPinMutation();

  // Fetch true global totals for accurate tab badges
  const { data: allGlobalJobsResponse } = useGetJobCardsQuery();
  const allGlobalJobs: JobCardData[] = Array.isArray(allGlobalJobsResponse?.data)
    ? (allGlobalJobsResponse!.data as unknown as JobCardData[])
    : ((allGlobalJobsResponse?.data as any)?.jobs || []);

  const myJobsCount = allGlobalJobs.filter((j) => j.tasks?.some((t) => t.status === 'OPEN')).length;
  const pendingCount = allGlobalJobs.filter(
    (j) => j.tasks?.length && j.tasks.every((t) => t.status === 'COMPLETED') && !j.verifiedAt
  ).length;
  const allCount = allGlobalJobs.length;

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

  const handleToggleJobPin = async (jobCardId: string, mode: 'ALL' | 'ME', closeModal?: () => void) => {
    const job = [...accumulatedJobs, ...allGlobalJobs].find((j) => (j.id || j._id) === jobCardId);
    if (!job) return;

    const curPinnedForAll = isJobPinnedForAll(job);
    const curPinnedForMe = isJobPinnedForMe(job);

    setOptimisticPins((prev) => ({
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
      setOptimisticPins((prev) => {
        const next = { ...prev };
        delete next[jobCardId];
        return next;
      });
    } finally {
      setPinningJobMode(null);
      setTimeout(() => {
        setOptimisticPins((prev) => {
          const next = { ...prev };
          delete next[jobCardId];
          return next;
        });
      }, 1500);
    }
  };

  const handlePinButtonClick = (e: React.MouseEvent, job: JobCardData) => {
    e.stopPropagation();
    const jobId = job.id || job._id!;
    if (isJobPinned(job)) {
      const mode: 'ALL' | 'ME' = isJobPinnedForAll(job) ? 'ALL' : 'ME';
      handleToggleJobPin(jobId, mode);
    } else {
      setSelectedPinJob(job);
    }
  };

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: jobsResponse, isLoading, isFetching, isError, refetch } = useGetJobCardsQuery({
    page,
    limit: 12,
    timeframe: timeFilter.toLowerCase(),
    tab: jobsView,
    search: debouncedSearch,
  });

  const responseData = jobsResponse?.data;
  const rawJobs: JobCardData[] = Array.isArray(responseData)
    ? responseData
    : responseData?.jobs || [];
  const pagination = !Array.isArray(responseData) ? responseData?.pagination : undefined;
  const totalPages = pagination?.totalPages || 1;
  const hasMore = page < totalPages;

  // Reset on filter or search change
  useEffect(() => {
    setPage(1);
    setAccumulatedJobs([]);
  }, [timeFilter, jobsView, debouncedSearch]);

  // Accumulate jobs across pages
  useEffect(() => {
    if (!rawJobs.length) {
      if (page === 1) setAccumulatedJobs([]);
      setIsFetchingMore(false);
      return;
    }
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

  // Infinite scroll
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

      const aTotalTasks = a.tasks?.length || 0;
      const aCompletedTasks = (a.tasks || []).filter((t) => t.status === 'COMPLETED').length;
      const aProgress = aTotalTasks > 0 ? aCompletedTasks / aTotalTasks : 0;

      const bTotalTasks = b.tasks?.length || 0;
      const bCompletedTasks = (b.tasks || []).filter((t) => t.status === 'COMPLETED').length;
      const bProgress = bTotalTasks > 0 ? bCompletedTasks / bTotalTasks : 0;

      switch (sortBy) {
        case 'DELIVERY_SOONEST': {
          const aDate = a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate).getTime() : Infinity;
          const bDate = b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate).getTime() : Infinity;
          if (aDate !== bDate) return aDate - bDate;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case 'DELIVERY_LATEST': {
          const aDate = a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate).getTime() : -Infinity;
          const bDate = b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate).getTime() : -Infinity;
          if (aDate !== bDate) return bDate - aDate;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case 'CREATED_NEWEST':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'CREATED_OLDEST':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'VEHICLE_AZ':
          return a.vehicleName.localeCompare(b.vehicleName);
        case 'VEHICLE_ZA':
          return b.vehicleName.localeCompare(a.vehicleName);
        case 'PROGRESS_LOWEST':
          return aProgress - bProgress;
        case 'PROGRESS_HIGHEST':
          return bProgress - aProgress;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const VIEWS: { key: JobsView; label: string; count: number }[] = [
    { key: 'MY_JOBS', label: 'My Jobs', count: myJobsCount },
    { key: 'PENDING_VERIFICATION', label: 'Pending', count: pendingCount },
    { key: 'ALL_VEHICLES', label: 'History', count: allCount },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-5 space-y-4 pb-24 sm:pb-28">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition active:scale-95 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-400/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Car className="w-3.5 h-3.5" />
                </div>
                Active Vehicle Jobs
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {allCount} total vehicle{allCount !== 1 ? 's' : ''} in workshop database
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => navigate('/jobs/create')}
              className="px-3 py-2 bg-amber-500 dark:bg-amber-400 text-zinc-950 font-black text-xs uppercase rounded-xl hover:bg-amber-400 dark:hover:bg-amber-300 transition active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Job</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>

        {/* ── Sticky Filter & Search Control Tray ── */}
        <div className="sticky top-0 z-30 -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 py-2 bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-md border-y border-zinc-200/60 dark:border-zinc-800/60 shadow-xs space-y-2">
          {/* ── Accurate Global View Tabs ── */}
          <div className="flex gap-1.5 p-1 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs backdrop-blur-sm">
            {VIEWS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setJobsView(key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  jobsView === key
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {jobsView === key && (
                  <motion.div
                    layoutId="jobs-view-pill"
                    className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg shadow-xs"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 font-black">{label}</span>
                <span
                  className={`relative z-10 text-[9px] font-black rounded-full px-1.5 py-0.2 min-w-[18px] text-center shadow-2xs ${
                    jobsView === key
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <NumberTicker value={count} />
                </span>
              </button>
            ))}
          </div>

          {/* ── Search & Sort Bar ── */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search vehicle model or reg plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-xs transition-all"
              />
            </div>

            {/* Custom Modern Animated Sort Dropdown */}
            <div className="relative shrink-0" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-xs transition active:scale-95 cursor-pointer"
                title="Sort vehicle jobs"
              >
                {SORT_CONFIG.find((s) => s.value === sortBy)?.icon}
                <span className="hidden sm:inline font-mono">
                  {SORT_CONFIG.find((s) => s.value === sortBy)?.shortLabel}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180 text-amber-500' : ''}`} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-1.5 w-56 z-50 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/60 ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                      Sort Vehicles By
                    </div>
                    <div className="space-y-0.5">
                      {SORT_CONFIG.map((opt) => {
                        const isSelected = sortBy === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSortBy(opt.value);
                              setIsSortOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {opt.icon}
                              <span>{opt.label}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
            {/* ── Vehicle Cards Grid (With Thumbnail and Pin Icon restored) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredJobs.map((job, idx) => {
                const totalTasks = job.tasks?.length || 0;
                const completedTasks = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
                const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const isReady = totalTasks > 0 && completedTasks === totalTasks;
                const durationStr = getGarageDuration(job.createdAt);
                const pinnedForAll = isJobPinnedForAll(job);
                const pinnedForMe = isJobPinnedForMe(job);
                const isPinned = pinnedForAll || pinnedForMe;
                const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);

                return (
                  <BlurFade key={job.id || job._id} delay={0.02 * Math.min(idx, 10)} duration={0.25}>
                    <motion.div
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                      className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between min-h-[175px] sm:min-h-[190px] transition-all border ${
                        pinnedForAll
                          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/15'
                          : pinnedForMe
                          ? 'border-blue-400 ring-2 ring-blue-400/40 shadow-xl shadow-blue-500/15'
                          : deliveryInfo.isOverdue && !isReady
                          ? 'border-rose-500/70 shadow-lg shadow-rose-500/15'
                          : isReady
                          ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/15'
                          : 'border-slate-200/90 dark:border-zinc-800 hover:border-amber-400/50 shadow-xs dark:shadow-xl dark:shadow-black/50'
                      } ${job.thumbnailUrl ? 'bg-slate-900' : 'bg-white dark:bg-[#0b132b]'}`}
                    >
                      {/* BorderBeam for Pinned Cards */}
                      {pinnedForAll && (
                        <BorderBeam size={200} duration={6} colorFrom="#facc15" colorTo="#fbbf24" borderWidth={2} />
                      )}
                      {pinnedForMe && !pinnedForAll && (
                        <BorderBeam size={200} duration={6} colorFrom="#38bdf8" colorTo="#60a5fa" borderWidth={2} />
                      )}

                      {/* Thumbnail Background Image with Clean Gradient Overlay */}
                      {job.thumbnailUrl ? (
                        <>
                          <img
                            src={job.thumbnailUrl}
                            alt={job.vehicleName || 'Vehicle'}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                            className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1328] via-[#0b1328]/85 via-45% to-transparent z-0" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1328]/70 via-transparent to-black/30 z-0" />
                        </>
                      ) : (
                        <div className="absolute right-2 -bottom-2 opacity-5 dark:opacity-10 pointer-events-none z-0">
                          <Car className="w-36 h-36 text-slate-400 dark:text-white" />
                        </div>
                      )}

                      {/* Content Container */}
                      <div className="relative z-10 flex flex-col justify-between flex-1 gap-3">
                        {/* Top Row: Vehicle Info & Pin Button */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3
                                className={`text-sm sm:text-base font-black uppercase tracking-tight truncate flex items-center gap-1.5 ${
                                  job.thumbnailUrl ? 'text-white' : 'text-slate-900 dark:text-white'
                                } group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors`}
                              >
                                <Car className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                <span className="truncate">{job.vehicleName || 'Vehicle'}</span>
                              </h3>
                              {job.vehicleColor && (
                                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0">
                                  · {job.vehicleColor}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* High-Contrast Crisp Vehicle License Plate */}
                              <span
                                className="inline-block text-xs font-mono font-black px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 border border-amber-500/50 shadow-xs tracking-wider"
                              >
                                {job.vehicleNumber || '---'}
                              </span>

                              {job.expectedDeliveryDate && (
                                <span className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${deliveryInfo.badgeClass}`}>
                                  {deliveryInfo.shortLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Action: Pin Icon Button */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handlePinButtonClick(e, job)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-xs cursor-pointer ${
                                isPinned
                                  ? 'bg-amber-400 text-zinc-950 shadow-amber-400/25 ring-1 ring-amber-400'
                                  : job.thumbnailUrl
                                  ? 'bg-black/60 text-slate-200 hover:text-amber-400 border border-white/20 hover:border-amber-400/40 backdrop-blur-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 border border-slate-200 dark:border-slate-700'
                              }`}
                              title={isPinned ? 'Tap to unpin' : 'Pin Vehicle'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-zinc-950 stroke-[2.5]' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Middle: Progress Bar with High-Contrast Numbers */}
                        <div className="space-y-1.5 py-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span
                              className={`uppercase tracking-wider text-[10px] font-bold ${
                                job.thumbnailUrl ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Tasks Progress
                            </span>
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md border ${
                                job.thumbnailUrl
                                  ? 'bg-black/60 text-amber-300 border-amber-400/30'
                                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25'
                              }`}
                            >
                              {completedTasks}/{totalTasks} ({progressPct}%)
                            </span>
                          </div>
                          <ProgressBarBeam progress={progressPct} />
                        </div>

                        {/* Bottom Row: Garage Duration & Delivery Deadline */}
                        <div
                          className={`flex items-center justify-between text-xs font-mono pt-1.5 border-t ${
                            job.thumbnailUrl
                              ? 'border-white/15 text-slate-200 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Garage: {durationStr}</span>
                          </span>
                          <span>
                            {job.expectedDeliveryDate ? (
                              <span className={deliveryInfo.textClass}>
                                {deliveryInfo.label}
                              </span>
                            ) : (
                              new Date(job.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </BlurFade>
                );
              })}
            </div>

            {/* ── Infinite Scroll Sentinel ── */}
            <div ref={sentinelRef} className="h-6 w-full" />

            {/* ── Load More / Finished State ── */}
            <AnimatePresence>
              {(isLoading && page > 1) || isFetchingMore || isFetching ? (
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
      </main>
    </div>
  );
};
