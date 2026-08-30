import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetJobCardsQuery, useGetJobStatsQuery, useToggleJobPinMutation, JobCardData } from '../../jobs/api/jobApi';

import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PinJobModal } from '../../../shared/components/jobCard/PinJobModal';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import {
  ChevronLeft,
  Calendar,
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
  X,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { PageShimmer, JobsListSkeleton } from '../../../shared/components/common/PageShimmer';
import { getDeliveryStatusInfo } from '../../../shared/utils/dateUtils';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { ProgressBarBeam } from '../../../shared/components/magicui/AnimatedBeam';

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
  { value: 'DELIVERY_SOONEST', label: 'Delivery: Soonest', shortLabel: 'Soonest Delivery', icon: <Clock className="w-3.5 h-3.5 text-amber-300" /> },
  { value: 'DELIVERY_LATEST', label: 'Delivery: Latest', shortLabel: 'Latest Delivery', icon: <Calendar className="w-3.5 h-3.5 text-amber-300" /> },
  { value: 'CREATED_NEWEST', label: 'Created: Newest', shortLabel: 'Newest First', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> },
  { value: 'CREATED_OLDEST', label: 'Created: Oldest', shortLabel: 'Oldest First', icon: <Clock className="w-3.5 h-3.5 text-slate-400" /> },
  { value: 'VEHICLE_AZ', label: 'Vehicle: A to Z', shortLabel: 'Model A-Z', icon: <Sparkles className="w-3.5 h-3.5 text-sky-400" /> },
  { value: 'VEHICLE_ZA', label: 'Vehicle: Z to A', shortLabel: 'Model Z-A', icon: <Sparkles className="w-3.5 h-3.5 text-sky-400" /> },
  { value: 'PROGRESS_LOWEST', label: 'Progress: Lowest', shortLabel: 'Low Progress', icon: <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" /> },
  { value: 'PROGRESS_HIGHEST', label: 'Progress: Highest', shortLabel: 'High Progress', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam === 'all' || viewParam === 'ALL_VEHICLES' || location.state?.view === 'all') {
      setJobsView('ALL_VEHICLES');
    } else if (viewParam === 'verify' || location.state?.view === 'verify') {
      setJobsView('PENDING_VERIFICATION');
    } else if (viewParam === 'my_jobs' || location.state?.view === 'my_jobs') {
      setJobsView('MY_JOBS');
    }
  }, [location.search, location.state]);

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
  const [optimisticPins, setOptimisticPins] = useState<Record<string, { isPinnedForAll: boolean; pinnedByMe: boolean }>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && window.scrollY <= 5) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.45, 80));
        setIsPulling(true);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 55) {
      setPullDistance(50);
      try {
        await refetch();
      } finally {
        setTimeout(() => {
          setPullDistance(0);
          setIsPulling(false);
        }, 400);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
    touchStartY.current = 0;
  };

  const [toggleJobPin] = useToggleJobPinMutation();

  const { data: statsResponse } = useGetJobStatsQuery();
  const stats = statsResponse?.data;

  const myJobsCount = stats?.activeCount ?? 0;
  const pendingCount = stats?.pendingVerificationCount ?? 0;
  const allCount = stats?.totalCount ?? 0;

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
    const job = accumulatedJobs.find((j) => (j.id || j._id) === jobCardId);
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

    try {
      const res = await toggleJobPin({ jobCardId, mode }).unwrap();
      if (res?.data) {
        setAccumulatedJobs((prev) =>
          prev.map((j) => ((j.id || j._id) === jobCardId ? { ...j, ...res.data } : j))
        );
      }
      refetch();
    } catch {
      setOptimisticPins((prev) => ({
        ...prev,
        [jobCardId]: { isPinnedForAll: curPinnedForAll, pinnedByMe: curPinnedForMe },
      }));
    } finally {
      if (closeModal) closeModal();
      setSelectedPinJob(null);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close sort dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const queryParams = {
    page,
    limit: 15,
    timeframe: timeFilter !== 'ALL' ? timeFilter.toLowerCase() : undefined,
    tab: jobsView,
    search: debouncedSearch.trim() || undefined,
  };

  const { data: responseData, isLoading, refetch } = useGetJobCardsQuery(queryParams);

  const rawJobs: JobCardData[] = Array.isArray(responseData?.data)
    ? (responseData!.data as unknown as JobCardData[])
    : ((responseData?.data as any)?.jobs || []);

  const pagination = !Array.isArray(responseData?.data) ? (responseData?.data as any)?.pagination : undefined;
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
    { key: 'PENDING_VERIFICATION', label: 'Pending QA', count: pendingCount },
    { key: 'ALL_VEHICLES', label: 'Vehicle History', count: allCount },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Soft subtle ambient light (reduced intensity to eliminate eye stress) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.04)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[260px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.04)_0%,transparent_70%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {isPulling && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: pullDistance }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center overflow-hidden bg-slate-200/60 dark:bg-white/5 text-amber-600 dark:text-amber-300 font-mono text-xs font-bold gap-2"
          >
            <Loader2 className={`w-4 h-4 ${pullDistance >= 50 ? 'animate-spin' : ''}`} />
            <span>{pullDistance >= 50 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 pb-28 space-y-3">
        {/* ── TOP BAR: Header & New Button ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Active Vehicles
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-300/90">
                  <NumberTicker value={filteredJobs.length} /> Live
                </span>
              </h1>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => navigate('/jobs/create')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-400/20 hover:opacity-95 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Vehicle</span>
            </button>
          )}
        </div>

        {/* ── STICKY TOP CONTROLS (Tabs & Search/Sort) ── */}
        <div className="sticky top-0 sm:top-14 z-30 bg-slate-50/90 dark:bg-[#080810]/85 backdrop-blur-2xl py-2 -mx-3 px-3 sm:-mx-6 sm:px-6 space-y-2 border-b border-slate-200/80 dark:border-white/[0.06] shadow-sm dark:shadow-xl dark:shadow-black/40 transition-colors">
          {/* ── LEADERBOARD-STYLE TABS (Gentle soft amber/gold glow) ── */}
          <div className="flex gap-1 p-1 bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/8 shadow-xs">
            {VIEWS.map(({ key, label, count }) => {
              const isActive = jobsView === key;
              return (
                <button
                  key={key}
                  onClick={() => setJobsView(key)}
                  className={`relative flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isActive ? 'text-slate-900 font-black' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="jobs-view-tab"
                      className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-xl shadow-md shadow-amber-500/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                  <span
                    className={`relative z-10 text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── SEARCH & SORT CONTROLS ── */}
          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vehicle model, reg plate (e.g. KL 01)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/20 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0" ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">
                  {SORT_CONFIG.find((s) => s.value === sortBy)?.shortLabel || 'Sort'}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl bg-white/95 dark:bg-[#0f0f1e]/98 backdrop-blur-2xl border border-slate-200/90 dark:border-white/12 shadow-2xl shadow-black/15 dark:shadow-black/80 overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.06] p-1"
                  >
                    {SORT_CONFIG.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                          sortBy === opt.value
                            ? 'bg-amber-400/15 text-amber-700 dark:text-amber-300'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {opt.icon}
                          {opt.label}
                        </span>
                        {sortBy === opt.value && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── COMPACT VEHICLE CARDS GRID (Reduced Height) ── */}
        {isLoading && page === 1 ? (
          <JobsListSkeleton />
        ) : filteredJobs.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <p className="text-sm font-bold text-slate-300">No vehicles found</p>
            <p className="text-xs font-mono text-slate-500">
              {searchQuery ? 'Try clearing your search terms' : 'All jobs in this category are clear'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredJobs.map((job) => {
              const jobId = job.id || job._id!;
              const totalTasks = job.tasks?.length || 0;
              const completedTasks = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
              const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              const isReady = totalTasks > 0 && completedTasks === totalTasks;
              const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);
              const pinned = isJobPinned(job);

              return (
                <motion.div
                  key={jobId}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => navigate(`/jobs/${jobId}`)}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/50 shadow-sm dark:shadow-xl dark:shadow-black/50 p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer"
                >
                  {pinned && <BorderBeam size={160} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={0.75} />}

                  <div>
                    {/* Top Row: Model Title, Reg Plate & Action Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white tracking-tight truncate group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                            {job.vehicleName || 'Vehicle'}
                          </h3>
                          {isReady && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-black text-slate-950 dark:text-amber-300 bg-amber-400/20 dark:bg-white/[0.08] px-2 py-0.5 rounded-lg border border-amber-400/30 dark:border-white/10 tracking-wider">
                            {job.vehicleNumber}
                          </span>
                          {job.vehicleColor && (
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                              • {job.vehicleColor}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pin button & Delivery pill */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedPinJob(job)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                            pinned
                              ? 'bg-amber-400/20 border-amber-400/40 text-amber-600 dark:text-amber-300 shadow-xs'
                              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                          }`}
                          title="Pin vehicle"
                        >
                          <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
                        </button>

                        {job.expectedDeliveryDate && (
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border ${deliveryInfo.badgeClass}`}>
                            {deliveryInfo.shortLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Beam */}
                    <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
                          Service Progress
                        </span>
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            isReady
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-white/5 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {completedTasks}/{totalTasks} ({progressPercent}%)
                        </span>
                      </div>
                      <ProgressBarBeam progress={progressPercent} />
                    </div>
                  </div>

                  {/* Card Bottom CTA Strip */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {job.expectedDeliveryDate ? deliveryInfo.label : 'In Garage Service'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold transition-colors shrink-0 group-hover:translate-x-0.5">
                      <span>View Job Card</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 text-amber-300 animate-spin" />
          </div>
        )}
      </main>

      {/* Pin Job Modal */}
      {selectedPinJob && (
        <PinJobModal
          isOpen={!!selectedPinJob}
          onClose={() => setSelectedPinJob(null)}
          job={selectedPinJob}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onTogglePin={async (jobCardId, mode) => handleToggleJobPin(jobCardId, mode)}
        />
      )}
    </div>
  );
};
