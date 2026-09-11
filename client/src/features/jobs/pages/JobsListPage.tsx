import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetJobCardsQuery, useGetJobStatsQuery, useToggleJobPinMutation, JobCardData } from '../../jobs/api/jobApi';

import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PinJobModal } from '../../../shared/components/jobCard/PinJobModal';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { MagicTabs } from '../../../shared/components/magicui/MagicTabs';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import {
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Pin,
  Globe,
  X,
  Car,
  History,
  ArrowUpRight,
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

  const isMatchingUserId = (p: any, targetId: any): boolean => {
    if (!p || !targetId) return false;
    const pStr = typeof p === 'string' ? p : p?._id ? p._id.toString() : p?.id ? p.id.toString() : p.toString();
    const targetStr = typeof targetId === 'string' ? targetId : targetId?._id ? targetId._id.toString() : targetId?.id ? targetId.id.toString() : targetId.toString();
    return pStr.trim().toLowerCase() === targetStr.trim().toLowerCase();
  };

  const isJobPinnedForMe = (job: JobCardData) => {
    if (!currentUserId) return false;
    const opt = optimisticPins[job.id || job._id!];
    if (opt !== undefined) return opt.pinnedByMe;
    return (
      Array.isArray(job.pinnedBy) &&
      job.pinnedBy.some((p: any) => isMatchingUserId(p, currentUserId))
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
      className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Soft subtle ambient light ── */}
      <div className="glass-ambient-glow" aria-hidden="true" />

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

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* ── TOP BAR: Header & New Button ── */}
        <PageHeader
          backTo="/dashboard"
          title="Active Vehicles"
          count={filteredJobs.length}
          actions={
            isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/jobs/create')}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl glass-gold-btn text-slate-950 font-black text-xs shadow-md active:scale-95 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Vehicle</span>
              </button>
            )
          }
        />

        {/* ── TOP CONTROLS (Tabs & Search/Sort) ── */}
        <div className="space-y-2.5 py-1 bg-transparent">
          {/* ── TABS ── */}
          <MagicTabs
            items={VIEWS}
            activeKey={jobsView}
            onChange={(key) => setJobsView(key as JobsView)}
            layoutId="jobs-view-tab"
          />

          {/* ── SEARCH & SORT CONTROLS ── */}
          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vehicle model, reg plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-modern-input text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0" ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl glass-modern-input hover:border-amber-400/50 text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer shadow-2xs"
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
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl glass-modern-panel shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.06] p-1"
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

        {/* ── COMPACT VEHICLE CARDS GRID ── */}
        {isLoading && page === 1 ? (
          <JobsListSkeleton />
        ) : filteredJobs.length === 0 ? (
          <div className="py-16 text-center rounded-3xl glass-modern-card space-y-1.5">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No vehicles found</p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
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
              const pinned = isJobPinned(job);
              const isPinnedForAll = Boolean(job.isPinnedForAll);
              const isPinnedForMe = isJobPinnedForMe(job);

              const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);

              return (
                <motion.div
                  key={jobId}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => navigate(`/jobs/${jobId}`)}
                  className="group relative overflow-hidden rounded-2xl glass-modern-card p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Top Row: Vehicle Icon/Photo + Name & Badges */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {job.thumbnailUrl ? (
                          <img
                            src={job.thumbnailUrl}
                            alt=""
                            className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-white/10"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                            <Car className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white tracking-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {job.vehicleName || 'Vehicle'}
                            </h3>
                            {isReady && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                            {job.expectedDeliveryDate && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                                  deliveryInfo.isOverdue
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse shadow-xs'
                                    : deliveryInfo.badgeClass
                                }`}
                              >
                                {deliveryInfo.isOverdue ? (
                                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 stroke-[2.5]" />
                                ) : (
                                  <Clock className="w-3 h-3 shrink-0" />
                                )}
                                <span>{deliveryInfo.shortLabel}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-xs font-mono font-black text-slate-900 dark:text-amber-300 bg-amber-400/20 dark:bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30 tracking-wider">
                              {job.vehicleNumber}
                            </span>
                            {job.vehicleColor && (
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                <span>•</span>
                                <span>{job.vehicleColor}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pin button */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedPinJob(job)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                            pinned
                              ? isPinnedForAll
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300 shadow-2xs'
                                : 'bg-yellow-400/20 border-yellow-400/40 text-yellow-700 dark:text-yellow-300 shadow-2xs'
                              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                          }`}
                          title={pinned ? (isPinnedForAll ? 'Pinned for Entire Garage' : 'Pinned for You') : 'Pin vehicle'}
                        >
                          {isPinnedForAll ? (
                            <Globe className="w-3.5 h-3.5 stroke-[2.2]" />
                          ) : (
                            <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar Beam */}
                    <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06]">
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

                  {/* Card Bottom: View Details Action */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-end">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold transition-colors text-xs">
                      <span>View Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
