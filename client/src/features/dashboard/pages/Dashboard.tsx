import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  History,
  Package,
  PlusCircle,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { useGetJobCardsQuery, useGetJobStatsQuery, JobCardData } from '../../jobs/api/jobApi';
import { useGetPendingWorkersQuery, useGetAllUsersQuery, useGetLeaderboardQuery } from '../../auth/api/authApi';
import { useGetCatalogQuery } from '../../catalog/api/catalogApi';
import { DashboardBentoSkeleton } from '../../../shared/components/common/PageShimmer';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { IosNotificationStack, StackJobCardItem } from '../../../shared/components/magicui/IosNotificationStack';
import { GlobalSearchModal } from '../../../shared/components/common/GlobalSearchModal';
import { TopSearchBar } from '../../../shared/components/common/TopSearchBar';

/* ─── Fade-up entry animation wrapper ─── */
const FadeUp: React.FC<{ delay?: number; children: React.ReactNode; className?: string }> = ({
  delay = 0,
  children,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchInputVal, setSearchInputVal] = useState('');

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery();
  const { data: statsResponse } = useGetJobStatsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });
  const { data: usersResponse } = useGetAllUsersQuery(undefined, { skip: !isAdmin });
  const { data: leaderboardResponse } = useGetLeaderboardQuery();
  const { data: catalogResponse } = useGetCatalogQuery();

  const activeJobs: JobCardData[] = Array.isArray(jobsResponse?.data)
    ? (jobsResponse!.data as unknown as JobCardData[])
    : ((jobsResponse?.data as any)?.jobs || []);

  const stats = statsResponse?.data;
  const activeCount = stats?.activeCount ?? activeJobs.filter(
    (j) => j.status === 'IN_PROGRESS' && j.tasks?.some((t) => t.status === 'OPEN')
  ).length;

  const totalCount = stats?.totalCount ?? activeJobs.length;

  const pendingVerificationCount = stats?.pendingVerificationCount ?? activeJobs.filter(
    (job) => !job.verifiedAt && job.tasks?.length > 0 && job.tasks.every((task) => task.status === 'COMPLETED')
  ).length;

  const totalCompletedTasks = stats?.totalCompletedTasks ?? activeJobs.reduce((acc, job) => {
    return acc + (job.tasks?.filter((t) => t.status === 'COMPLETED').length || 0);
  }, 0);

  const pendingWorkersCount = pendingResponse?.data?.length || 0;
  const totalUsersCount = usersResponse?.data?.length || 0;
  const catalogItemsCount = catalogResponse?.data?.length || 0;

  // Top technician from real leaderboard
  const topTech = leaderboardResponse?.data?.[0];
  const topTechScore = (topTech as any)?.totalPoints || (topTech as any)?.score || 0;

  const currentUserId = user?.id || (user as any)?._id;
  const stackJobCards: StackJobCardItem[] = activeJobs.map((job) => {
    const total = job.tasks?.length || 0;
    const done = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const isJobPinned = !!(
      job.isPinnedForAll ||
      (Array.isArray(job.pinnedBy) &&
        currentUserId &&
        job.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === currentUserId))
    );
    return {
      id: job.id || job._id!,
      vehicleName: job.vehicleName || 'Vehicle',
      vehicleNumber: job.vehicleNumber || '---',
      vehicleColor: job.vehicleColor,
      totalTasks: total,
      completedTasks: done,
      progressPercent: progress,
      expectedDeliveryDate: job.expectedDeliveryDate || undefined,
      isPinned: isJobPinned,
      createdAt: job.createdAt,
    };
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInputVal.trim()) {
      setIsSearchModalOpen(true);
    }
  };

  if (isJobsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col transition-colors duration-200">
        <Navbar glass />
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 pb-28">
          <DashboardBentoSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/30 transition-colors duration-200">
      {/* ── Ambient luxury light aura & Meteors ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.12)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[300px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
        <Meteors number={12} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 pb-28 sm:pb-32 space-y-3.5 sm:space-y-4.5">
        {/* ── TOP ATTACHED GLOBAL SEARCH BAR ── */}
        <TopSearchBar />

        {/* ── GREETING HEADER ── */}
        <FadeUp delay={0}>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/60 p-4 sm:p-6 transition-colors">
            <BorderBeam size={220} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-bl from-amber-400/15 dark:from-amber-400/12 to-transparent blur-2xl" />
            
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    Live Garage
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-400">
                    {user?.role}
                  </span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Hey,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-400 drop-shadow-sm">
                    {user?.name}
                  </span>{' '}
                  👋
                </h1>
                <p className="text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stat cluster — desktop */}
              <div className="hidden sm:flex items-center gap-5 bg-slate-100/90 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 shrink-0 shadow-sm">
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-500 dark:text-amber-400 tabular-nums leading-none">
                    <NumberTicker value={activeCount} />
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">Active</p>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                    <NumberTicker value={totalCount} />
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">Total</p>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums leading-none">
                    <NumberTicker value={totalCompletedTasks} />
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">Done</p>
                </div>
              </div>
            </div>

            {/* Stat cluster — mobile */}
            <div className="sm:hidden mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-around">
              <div className="text-center">
                <p className="text-xl font-black text-amber-500 dark:text-amber-400 tabular-nums"><NumberTicker value={activeCount} /></p>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Active</p>
              </div>
              <div className="w-px h-7 bg-slate-200 dark:bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums"><NumberTicker value={totalCount} /></p>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Total</p>
              </div>
              <div className="w-px h-7 bg-slate-200 dark:bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-emerald-500 dark:text-emerald-400 tabular-nums"><NumberTicker value={totalCompletedTasks} /></p>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Done</p>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Pending Worker Warning (If Unapproved) */}
        {!isApproved && !isAdmin && (
          <FadeUp delay={0.03}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-400/15 border border-amber-400/30 backdrop-blur-xl">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-amber-700 dark:text-amber-300">Account Pending Verification</p>
                <p className="text-[11px] text-amber-600/90 dark:text-amber-200/70">Awaiting admin authorization to unlock garage actions.</p>
              </div>
            </div>
          </FadeUp>
        )}

        {/* ━━━━━━━━ MASTER BENTO GRID (Mobile-First, 12-Col Responsive) ━━━━━━━━ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">

          {/* ── BENTO 1: LIVE WORKFLOW HERO (Col 12 on mobile, Col 8 on desktop) ── */}
          <FadeUp delay={0.05} className="col-span-1 sm:col-span-2 lg:col-span-8">
            <div className="group relative overflow-hidden rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/50 shadow-xl dark:shadow-2xl dark:shadow-black/40 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between min-h-[280px] sm:min-h-[300px]">
              <BorderBeam size={220} duration={9} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />
              
              {/* Header */}
              <div className="flex items-center justify-between gap-3 shrink-0 mb-3 z-10">
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={() => navigate('/jobs')}
                >
                  <div className="w-9 h-9 rounded-2xl bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300 shadow-xs">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                      Live Vehicle Workflow
                    </h2>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Active garage bays • Swipe cards or tap to open
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/jobs')}
                  className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 border border-amber-400/30 px-3 py-1 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 transition-colors shrink-0 cursor-pointer active:scale-95"
                >
                  <span>All ({activeCount})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stack Carousel or Empty State */}
              <div className="flex-1 flex flex-col justify-center overflow-hidden z-10 my-1">
                {stackJobCards.length > 0 ? (
                  <IosNotificationStack jobs={stackJobCards} />
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">All Bays Clear</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">No active vehicles currently in workshop</p>
                  </div>
                )}
              </div>

              {/* Bottom Quick Jump Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono z-10">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Real-time status synced
                </span>
                <span
                  onClick={() => navigate('/jobs')}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  Manage active list <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </FadeUp>

          {/* ── BENTO 2: ACTION STATION (Col 12 on mobile, Col 4 on desktop) ── */}
          <FadeUp delay={0.08} className="col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="h-full flex flex-col justify-between gap-2.5 sm:gap-3">
              
              {/* Primary Intake Button */}
              {isAdmin ? (
                <div
                  onClick={() => navigate('/jobs/create')}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-amber-400 via-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-black/15 px-2 py-0.5 rounded-full inline-block">
                      Intake Wizard
                    </span>
                    <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                      New Job Card
                    </h3>
                    <p className="text-xs font-medium opacity-90">Vehicle registration & service tasks</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => navigate('/jobs')}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-amber-400 via-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-400/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-black/15 px-2 py-0.5 rounded-full inline-block">
                      Technician Queue
                    </span>
                    <h3 className="text-base sm:text-lg font-black tracking-tight">My Active Tasks</h3>
                    <p className="text-xs font-medium opacity-90">{activeCount} vehicles in garage</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <Wrench className="w-5 h-5" />
                  </div>
                </div>
              )}

              {/* POS Billing Card */}
              <div
                onClick={() => navigate('/sales')}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-400/50 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shadow-2xs">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Counter POS Billing</h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Direct parts & counter sales</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* QA Verification Pass */}
              <div
                onClick={() => navigate('/jobs', { state: { view: 'verify' } })}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-purple-400/50 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors shadow-2xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">QA Quality Check</h3>
                      {pendingVerificationCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[9px] font-mono font-black animate-pulse">
                          {pendingVerificationCount} Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Final inspection & vehicle signoff</p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-colors">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

            </div>
          </FadeUp>

          {/* ── BENTO 3: TOP TECHNICIAN SPOTLIGHT (Col 12 on mobile, Col 4 on desktop) ── */}
          <FadeUp delay={0.1} className="col-span-1 sm:col-span-1 lg:col-span-4">
            <div
              onClick={() => navigate('/leaderboard')}
              className="group relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/50 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" /> #1 Top Performer
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {topTech?.name || 'Top Technician'}
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-mono font-black">
                  <NumberTicker value={topTechScore} /> pts
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Daily workshop standings
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  View Podium <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </FadeUp>

          {/* ── BENTO 4: LIVE WORK ACTIVITY (Col 12 on mobile, Col 4 on desktop) ── */}
          <FadeUp delay={0.12} className="col-span-1 sm:col-span-1 lg:col-span-4">
            <div
              onClick={() => navigate('/work-logs')}
              className="group relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-rose-400/50 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Live Stream
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Work Ledger
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono font-black">
                  <NumberTicker value={totalCompletedTasks} /> Done
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Chronological task activity
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  Open Stream <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </FadeUp>

          {/* ── BENTO 5: INVENTORY & STOCK (Col 12 on mobile, Col 4 on desktop) ── */}
          <FadeUp delay={0.14} className="col-span-1 sm:col-span-2 lg:col-span-4">
            <div
              onClick={() => navigate('/inventory')}
              className="group relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-blue-400/50 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Catalog & Parts
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Garage Inventory
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-mono font-black">
                  <NumberTicker value={catalogItemsCount} /> Items
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Products & service list
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                  Manage Parts <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </FadeUp>

          {/* ── BENTO 6: LIFETIME VEHICLE ARCHIVES (Full 12 cols) ── */}
          <FadeUp delay={0.16} className="col-span-1 sm:col-span-2 lg:col-span-12">
            <div
              className="group relative overflow-hidden rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-cyan-400/50 shadow-sm transition-all duration-300 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div
                className="flex items-center gap-3.5 cursor-pointer min-w-0"
                onClick={() => navigate('/jobs', { state: { view: 'all' } })}
              >
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors shrink-0 shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      Vehicle Archives & History
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-bold">
                      <NumberTicker value={totalCount} /> Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Look up past vehicle services, customer histories, and warranty logs
                  </p>
                </div>
              </div>

              {/* Instant Search Bar inside Archive Card */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2 w-full md:w-auto shrink-0"
              >
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchInputVal}
                    onChange={(e) => setSearchInputVal(e.target.value)}
                    placeholder="Search plate number..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold rounded-xl transition cursor-pointer active:scale-95 shrink-0"
                >
                  Search
                </button>
              </form>
            </div>
          </FadeUp>

          {/* ── BENTO 7: ADMIN STAFF APPROVALS (Only shown if pending > 0 or for Admin team) ── */}
          {isAdmin && (
            <FadeUp delay={0.18} className="col-span-1 sm:col-span-2 lg:col-span-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Staff Matrix */}
                <div
                  onClick={() => navigate('/admin/users')}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-purple-400/50 shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors shadow-2xs">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Staff Matrix</h3>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <NumberTicker value={totalUsersCount} /> Registered mechanics & staff
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Technician Approvals Queue */}
                <div
                  onClick={() => navigate('/admin/approvals')}
                  className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    pendingWorkersCount > 0
                      ? 'border-rose-500/50 bg-rose-500/[0.04]'
                      : 'border-slate-200/80 dark:border-white/[0.08] hover:border-rose-400/40'
                  }`}
                >
                  {pendingWorkersCount > 0 && <BorderBeam size={160} duration={4} colorFrom="#ef4444" colorTo="#f97316" borderWidth={1.5} />}
                  <div className="flex items-center gap-3 z-10">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
                      pendingWorkersCount > 0
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white'
                    }`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Approvals Queue</h3>
                        {pendingWorkersCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse">
                            {pendingWorkersCount} Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Authorize new mechanic signups</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-rose-500 transition-colors z-10">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </FadeUp>
          )}

        </div>
      </main>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </div>
  );
};
