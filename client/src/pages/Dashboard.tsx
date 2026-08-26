import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, useGetJobStatsQuery, JobCardData } from '../api/jobApi';
import { useGetPendingWorkersQuery, useGetAllUsersQuery } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  PlusCircle,
  ShieldAlert,
  ChevronRight,
  Clock,
  CheckCircle2,
  Trophy,
  Package,
  ShoppingCart,
  Flame,
  Activity,
  Sparkles,
  History,
  DollarSign,
  Users,
  ArrowRight,
} from 'lucide-react';
import { PageShimmer } from '../components/common/PageShimmer';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';
import { IosNotificationStack, StackJobCardItem } from '../components/magicui/IosNotificationStack';
import { GlobalSearchModal } from '../components/common/GlobalSearchModal';
import { TopSearchBar } from '../components/common/TopSearchBar';

/* ─── Fade-up entry animation wrapper ─── */
const FadeUp: React.FC<{ delay?: number; children: React.ReactNode; className?: string }> = ({
  delay = 0,
  children,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.32, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery();
  const { data: statsResponse } = useGetJobStatsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });
  const { data: usersResponse } = useGetAllUsersQuery(undefined, { skip: !isAdmin });

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

  if (isJobsLoading) {
    return (
      <div className="min-h-screen bg-[#080810] text-white flex flex-col">
        <Navbar glass />
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 pb-28">
          <PageShimmer label="Loading Dashboard" cards={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col overflow-x-hidden selection:bg-amber-400/30">
      {/* ── Ambient luxury light aura & Meteors ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.11)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[300px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-amber-500/3 blur-3xl" />
        <div className="absolute top-2/3 -right-32 w-80 h-80 rounded-full bg-sky-500/3 blur-3xl" />
        <Meteors number={14} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 pb-28 sm:pb-32 space-y-3.5 sm:space-y-4.5">
        {/* ── TOP ATTACHED GLOBAL SEARCH BAR ── */}
        <TopSearchBar />

        {/* ── GREETING HEADER ── */}
        <FadeUp delay={0}>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/60 p-4 sm:p-6">
            <BorderBeam size={220} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-bl from-amber-400/12 to-transparent blur-2xl" />
            
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Garage
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-400">
                    {user?.role}
                  </span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                  Hey,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 drop-shadow-sm">
                    {user?.name}
                  </span>{' '}
                  👋
                </h1>
                <p className="text-[11px] sm:text-xs font-mono text-slate-400">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stat cluster — desktop */}
              <div className="hidden sm:flex items-center gap-5 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shrink-0 shadow-lg">
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-400 tabular-nums leading-none">
                    <NumberTicker value={activeCount} />
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mt-0.5">Active</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white tabular-nums leading-none">
                    <NumberTicker value={totalCount} />
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mt-0.5">Total</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-400 tabular-nums leading-none">
                    <NumberTicker value={totalCompletedTasks} />
                  </p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mt-0.5">Done</p>
                </div>
              </div>
            </div>

            {/* Stat cluster — mobile */}
            <div className="sm:hidden mt-4 pt-3 border-t border-white/10 flex items-center justify-around">
              <div className="text-center">
                <p className="text-xl font-black text-amber-400 tabular-nums"><NumberTicker value={activeCount} /></p>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Active</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-white tabular-nums"><NumberTicker value={totalCount} /></p>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Total</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-black text-emerald-400 tabular-nums"><NumberTicker value={totalCompletedTasks} /></p>
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">Done</p>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Pending Approval Banner */}
        {!isApproved && !isAdmin && (
          <FadeUp delay={0.05}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 backdrop-blur-xl">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-amber-300">Account Pending</p>
                <p className="text-[11px] text-amber-200/70 mt-0.5">Awaiting admin approval to unlock workspace.</p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-black uppercase">
                Pending
              </span>
            </div>
          </FadeUp>
        )}

        {/* ━━━━━━━━ BENTO GRID ━━━━━━━━ */}
        <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2.5 sm:gap-3.5">

          {/* ── LIVE WORKFLOW HERO ── col-span 7 on lg */}
          <FadeUp delay={0.07} className="col-span-2 sm:col-span-6 lg:col-span-7 row-span-1">
            <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] hover:border-amber-400/40 shadow-xl shadow-black/40 hover:shadow-amber-500/5 transition-all duration-300 p-4 sm:p-5 flex flex-col min-h-[230px] sm:min-h-[250px]">
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(380px_circle_at_60%_-10%,rgba(251,191,36,0.08),transparent_70%)]" />

              <div className="flex items-center justify-between shrink-0 mb-3">
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={() => navigate('/jobs')}
                >
                  <div className="w-9 h-9 rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300 shadow-xs">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">
                      Workflow
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">Tap card for details • Swipe to browse</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/jobs');
                  }}
                  className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 border border-amber-400/30 px-2.5 py-1 rounded-xl bg-amber-400/5 hover:bg-amber-400/15 transition-colors shrink-0 cursor-pointer"
                >
                  All Jobs ({activeCount})<ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center overflow-hidden">
                <IosNotificationStack jobs={stackJobCards} />
              </div>
            </div>
          </FadeUp>

          {/* ── CREATE JOB & MY JOBS ── col-span 5 on lg */}
          <FadeUp delay={0.1} className="col-span-2 sm:col-span-3 lg:col-span-5 row-span-1">
            {isAdmin ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 h-full">
                {/* 1. New Job Card */}
                <div
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[250px] bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] hover:border-amber-400/60 shadow-xl shadow-black/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 p-3.5 sm:p-5"
                  onClick={() => navigate('/jobs/create')}
                >
                  <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-400/10 blur-xl group-hover:bg-amber-400/20 transition-colors" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300 shadow-xs">
                      <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[8px] sm:text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 border border-amber-400/30">
                      <Sparkles className="w-2.5 h-2.5" />New
                    </span>
                  </div>
                  <div className="mt-auto pt-2 relative z-10">
                    <h2 className="text-base sm:text-2xl font-black text-white tracking-tight leading-none">New Job</h2>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug hidden sm:block">Intake & vehicle registration</p>
                    <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-400">
                      Create <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* 2. My Jobs Card */}
                <div
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[250px] bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] hover:border-amber-400/60 shadow-xl shadow-black/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 p-3.5 sm:p-5"
                  onClick={() => navigate('/jobs')}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300 shadow-xs">
                      <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[8px] sm:text-[9px] font-mono font-black">
                      <NumberTicker value={activeCount} /> Active
                    </span>
                  </div>
                  <div className="mt-auto pt-2 relative z-10">
                    <h2 className="text-base sm:text-2xl font-black text-white tracking-tight leading-none">My Jobs</h2>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug hidden sm:block">View all workshop tasks</p>
                    <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-400">
                      View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[250px] bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] hover:border-amber-400/60 shadow-xl shadow-black/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 p-3.5 sm:p-5"
                onClick={() => navigate('/jobs')}
              >
                <div className="flex items-start justify-between relative z-10">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300">
                    <ClipboardList className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[8px] sm:text-[9px] font-mono font-black">
                    <NumberTicker value={activeCount} /> Active
                  </span>
                </div>
                <div className="mt-auto pt-2 relative z-10">
                  <h2 className="text-lg sm:text-3xl font-black text-white tracking-tight leading-none">My Tasks</h2>
                  <div className="mt-2 sm:mt-3 flex items-center gap-1 text-xs font-bold text-amber-400">
                    View garage jobs <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>
              </div>
            )}
          </FadeUp>

          {/* ━━━ ROW 2: 4 compact action cards ━━━ */}

          {/* POS */}
          <FadeUp delay={0.13} className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CompactCard
              icon={<ShoppingCart className="w-4.5 h-4.5" />}
              iconBg="bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950"
              border="hover:border-emerald-400/50"
              label="Counter" title="POS Billing"
              cta="Open" ctaColor="text-emerald-400"
              badge={<span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono font-bold flex items-center gap-1"><DollarSign className="w-2.5 h-2.5" />POS</span>}
              onClick={() => navigate('/sales')}
            />
          </FadeUp>

          {/* Verification */}
          <FadeUp delay={0.15} className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CompactCard
              icon={<CheckCircle2 className="w-4.5 h-4.5" />}
              iconBg="bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white"
              border="hover:border-purple-400/50"
              label="QA Pass" title="Verify"
              cta="Review" ctaColor="text-purple-400"
              badge={
                pendingVerificationCount > 0
                  ? <span className="relative flex h-5 w-5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60" /><span className="relative inline-flex rounded-full h-5 w-5 bg-purple-500 text-white text-[9px] font-black items-center justify-center">{pendingVerificationCount}</span></span>
                  : undefined
              }
              onClick={() => navigate('/jobs', { state: { view: 'verify' } })}
            />
          </FadeUp>

          {/* Leaderboard */}
          <FadeUp delay={0.17} className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CompactCard
              icon={<Trophy className="w-4.5 h-4.5" />}
              iconBg="bg-amber-400/15 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950"
              border="hover:border-amber-400/50"
              label="Rankings" title="Leaderboard"
              cta="View" ctaColor="text-amber-400"
              badge={<span className="px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[9px] font-mono font-bold">🏆 Standings</span>}
              onClick={() => navigate('/leaderboard')}
            />
          </FadeUp>

          {/* Work Logs */}
          <FadeUp delay={0.19} className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CompactCard
              icon={<Flame className="w-4.5 h-4.5" />}
              iconBg="bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white"
              border="hover:border-rose-400/50"
              label="Activity" title="Work Logs"
              cta="Open" ctaColor="text-rose-400"
              badge={<span className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] font-mono font-bold">Stream</span>}
              onClick={() => navigate('/work-logs')}
            />
          </FadeUp>

          {/* ━━━ ROW 3: Admin cards + History ━━━ */}

          {isAdmin && (
            <FadeUp delay={0.21} className="col-span-1 sm:col-span-2 lg:col-span-4">
              <CompactCard
                icon={<Users className="w-4.5 h-4.5" />}
                iconBg="bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white"
                border="hover:border-purple-400/50"
                label="Staff Matrix" title="Team"
                cta="Manage" ctaColor="text-purple-400"
                badge={<span className="px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold"><NumberTicker value={totalUsersCount} /> Staff</span>}
                onClick={() => navigate('/admin/users')}
              />
            </FadeUp>
          )}

          {isAdmin && (
            <FadeUp delay={0.23} className="col-span-1 sm:col-span-2 lg:col-span-4">
              <CompactCard
                icon={<Package className="w-4.5 h-4.5" />}
                iconBg="bg-blue-500/15 text-blue-400 group-hover:bg-blue-500 group-hover:text-white"
                border="hover:border-blue-400/50"
                label="Stock" title="Inventory"
                cta="Manage" ctaColor="text-blue-400"
                badge={<span className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[9px] font-mono font-bold">Parts</span>}
                onClick={() => navigate('/inventory')}
              />
            </FadeUp>
          )}

          {isAdmin && (
            <FadeUp delay={0.25} className="col-span-1 sm:col-span-2 lg:col-span-4">
              <div
                className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer bg-white/[0.035] backdrop-blur-2xl border shadow-xl shadow-black/40 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 p-3.5 sm:p-4 min-h-[130px] sm:min-h-[150px] flex flex-col ${
                  pendingWorkersCount > 0 ? 'border-rose-400/50' : 'border-white/[0.08] hover:border-rose-400/40'
                }`}
                style={pendingWorkersCount > 0 ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(255,255,255,0.02))' } : undefined}
                onClick={() => navigate('/admin/approvals')}
              >
                {pendingWorkersCount > 0 && <BorderBeam size={160} duration={4} colorFrom="#ef4444" colorTo="#f97316" borderWidth={1.5} />}
                <div className="relative z-10 flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs ${
                    pendingWorkersCount > 0
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white'
                  }`}>
                    <ShieldAlert className="w-4.5 h-4.5" />
                  </div>
                  {pendingWorkersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse">
                      {pendingWorkersCount} Pending
                    </span>
                  )}
                </div>
                <div className="relative z-10 mt-auto">
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Access</p>
                  <h3 className="text-sm font-black text-white mt-0.5">Approvals</h3>
                  <div className="mt-1.5 flex items-center gap-0.5 text-[10px] font-bold text-rose-400">
                    Review <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </FadeUp>
          )}

          {/* Vehicle History — wide footer card */}
          <FadeUp delay={0.27} className={`col-span-2 ${isAdmin ? 'sm:col-span-6 lg:col-span-12' : 'sm:col-span-4 lg:col-span-6'}`}>
            <div
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] hover:border-cyan-400/50 shadow-xl shadow-black/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[110px]"
              onClick={() => navigate('/jobs', { state: { view: 'all' } })}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(300px_circle_at_0%_50%,rgba(6,182,212,0.1),transparent_70%)]" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-300 shrink-0 shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Lifetime Archives</p>
                  <h3 className="text-sm sm:text-base font-black text-white mt-0.5">Vehicle History</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">Complete past service records & customer history</p>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-black text-cyan-400 tabular-nums leading-none"><NumberTicker value={totalCount} /></p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mt-0.5">Records</p>
                </div>

                <div className="w-px h-10 bg-white/10" />
                <div className="flex items-center gap-1 text-xs font-bold text-cyan-400">
                  Search history <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </FadeUp>

        </div>
      </main>

      {/* Global Search Modal Trigger */}
      <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </div>
  );
};

/* ─── Reusable compact bento card with glassmorphism ─── */
interface CompactCardProps {
  icon: React.ReactNode;
  iconBg: string;
  border: string;
  label: string;
  title: string;
  cta: string;
  ctaColor: string;
  badge?: React.ReactNode;
  onClick: () => void;
}

const CompactCard: React.FC<CompactCardProps> = ({ icon, iconBg, border, label, title, cta, ctaColor, badge, onClick }) => (
  <div
    className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] ${border} shadow-xl shadow-black/40 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 p-3.5 sm:p-4 min-h-[130px] sm:min-h-[150px] flex flex-col`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between relative z-10">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs ${iconBg}`}>
        {icon}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>
    <div className="mt-auto relative z-10">
      <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-sm font-black text-white mt-0.5">{title}</h3>
      <div className={`mt-1.5 flex items-center gap-0.5 text-[10px] font-bold ${ctaColor}`}>
        {cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  </div>
);
