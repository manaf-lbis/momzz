import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { useGetPendingWorkersQuery } from '../api/authApi';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  PlusCircle,
  ShieldAlert,
  ChevronRight,
  Clock,
  CheckCircle2,
  Car,
  Trophy,
  Package,
  ShoppingCart,
  Flame,
  ArrowRight,
  Activity,
  Zap,
  Sparkles,
} from 'lucide-react';
import { PageShimmer } from '../components/common/PageShimmer';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { BlurFade } from '../components/magicui/BlurFade';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { AnimatedList } from '../components/magicui/AnimatedList';
import { ProgressBarBeam } from '../components/magicui/AnimatedBeam';
import { formatDeliveryDate, getDeliveryStatusInfo } from '../utils/dateUtils';

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });

  const allJobs: JobCardData[] = Array.isArray(jobsResponse?.data)
    ? (jobsResponse!.data as unknown as JobCardData[])
    : ((jobsResponse?.data as any)?.jobs || []);

  const activeJobs = allJobs.filter(
    (j) => j.status === 'IN_PROGRESS' && j.tasks?.some((t) => t.status === 'OPEN')
  );
  const activeCount = activeJobs.length;

  const pendingVerificationJobs = allJobs.filter(
    (job) => !job.verifiedAt && job.tasks?.length > 0 && job.tasks.every((task) => task.status === 'COMPLETED')
  );
  const pendingVerificationCount = pendingVerificationJobs.length;

  const totalCompletedTasks = allJobs.reduce((acc, job) => {
    return acc + (job.tasks?.filter((t) => t.status === 'COMPLETED').length || 0);
  }, 0);

  const pendingWorkersCount = pendingResponse?.data?.length || 0;

  if (isJobsLoading) {
    return (
      <div className="glass-page text-zinc-900 dark:text-zinc-100 flex flex-col min-h-screen">
        <Navbar glass />
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-28">
          <PageShimmer label="Loading Bento Dashboard" cards={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="glass-page text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors min-h-screen">
      {/* Subtle ambient background glow */}
      <div className="glass-orb w-72 sm:w-96 h-72 sm:h-96 -top-20 -left-20 bg-amber-500/10 dark:bg-amber-500/10" aria-hidden />
      <div className="glass-orb w-80 sm:w-[30rem] h-80 sm:h-[30rem] top-1/3 -right-32 bg-sky-400/10 dark:bg-sky-500/10" aria-hidden />

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24 sm:pb-28">
        
        {/* ── 1. ULTRA-MODERN CLEAN DASHBOARD HEADER (NO CLUTTERED STATS) ── */}
        <BlurFade delay={0.02} duration={0.3}>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              
              {/* Left: User Welcome & Garage Status */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Garage
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {user?.role}
                  </span>
                </div>

                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Welcome, <span className="text-amber-500 dark:text-amber-400">{user?.name}</span>
                </h1>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Right: Modern Quick Garage Status Indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <div className="text-right font-mono">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Workshop Active</p>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    <NumberTicker value={activeCount} /> Vehicles In Service
                  </p>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Pending Approval Banner */}
        {!isApproved && !isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs bg-amber-500/10 border border-amber-500/25 dark:bg-amber-400/10 dark:border-amber-400/20"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-yellow-400 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-mono font-bold text-amber-700 dark:text-yellow-400 uppercase text-[11px] sm:text-xs tracking-wide">
                  Account Pending Approval
                </h4>
                <p className="text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-400">
                  Profile under review. Full workspace privileges will unlock once verified.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 dark:bg-yellow-400/15 text-amber-700 dark:text-yellow-400 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase shrink-0 border border-amber-500/30">
              Pending
            </span>
          </motion.div>
        )}

        {/* ── 2. BENTO GRID: COHESIVE UNIFIED THEME ── */}
        <BlurFade delay={0.06} duration={0.35}>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            
            {/* ── TOP ROW ITEM 1: CREATE JOB (IF ADMIN) ── */}
            {isAdmin && (
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/jobs/create')}
                className="relative col-span-1 rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-white/90 dark:to-slate-900/90 border border-amber-400/50 dark:border-amber-500/40 shadow-sm dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[160px] sm:min-h-[190px] group backdrop-blur-md"
              >
                <BorderBeam size={160} duration={6} colorFrom="#f59e0b" colorTo="#fbbf24" borderWidth={2} />
                <div className="flex items-start justify-between">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-400 text-slate-950 shadow-sm group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="px-2 py-0.5 bg-amber-400/20 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold uppercase rounded-full border border-amber-400/30">
                    Quick Action
                  </span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    Create Job
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                    New vehicle intake
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>New Job</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TOP ROW ITEM 2: MY JOBS (SHOWN NEXT TO CREATE JOB) ── */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/jobs')}
              className={`relative ${isAdmin ? 'col-span-1' : 'col-span-2 sm:col-span-1'} rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[160px] sm:min-h-[190px] group backdrop-blur-md`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                  <NumberTicker value={activeCount} /> Active
                </span>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  My Jobs
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                  Assigned checklist & tasks
                </p>
                <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>

            {/* ── TOP ROW ITEM 3: LIVE VEHICLES STREAM (SPANS 2 COLS) ── */}
            <div className={`${isAdmin ? 'col-span-2' : 'col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-3'} rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between backdrop-blur-md min-h-[160px] sm:min-h-[190px]`}>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                      Live Vehicle Workflow
                    </h3>
                    <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400">Real-time progress & deadlines</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/jobs')}
                  className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>All ({allJobs.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-2 flex-1 overflow-hidden">
                {activeJobs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-4 text-center text-slate-400">
                    <Car className="w-6 h-6 opacity-40 mb-1" />
                    <p className="text-[11px] font-mono">No active vehicle jobs in workshop.</p>
                  </div>
                ) : (
                  <AnimatedList delay={2400} className="w-full">
                    {activeJobs.slice(0, 3).map((job) => {
                      const total = job.tasks?.length || 0;
                      const done = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
                      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                      const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, done === total);

                      return (
                        <div
                          key={job.id || job._id}
                          onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                          className="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400/50 cursor-pointer transition-all flex items-center justify-between gap-2.5 group shadow-2xs"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white uppercase truncate group-hover:text-amber-500 transition-colors">
                                {job.vehicleName}
                              </span>
                              <span className="text-[9px] font-mono font-black text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                {job.vehicleNumber}
                              </span>
                              {job.expectedDeliveryDate && (
                                <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${deliveryInfo.badgeClass}`}>
                                  {deliveryInfo.shortLabel}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <ProgressBarBeam progress={progress} />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-500 shrink-0">
                                {progress}%
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      );
                    })}
                  </AnimatedList>
                )}
              </div>
            </div>

            {/* ── CARD 4: POS COUNTER SALES ── */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/sales')}
              className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                  POS
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Counter Sales
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                  Instant parts billing
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Register</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>

            {/* ── CARD 5: PENDING VERIFICATION ── */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/jobs', { state: { view: 'verify' } })}
              className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {pendingVerificationCount > 0 ? (
                  <span className="px-2 py-0.5 bg-amber-400/20 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold uppercase rounded-full border border-amber-400/30 animate-pulse">
                    <NumberTicker value={pendingVerificationCount} /> Ready
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                    Done
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Verification
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                  Quality pass & check
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Review</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>

            {/* ── CARD 6: LEADERBOARD PODIUM ── */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/leaderboard')}
              className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                  Podium
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Leaderboard
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                  Mechanic rankings
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Podium</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>

            {/* ── CARD 7: WORK LOGS ── */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/work-logs')}
              className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                  Logs
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Work Logs
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                  Activity timeline
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Timeline</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>

            {/* ── CARD 8: INVENTORY (ADMIN) ── */}
            {isAdmin && (
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/inventory')}
                className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                    Catalog
                  </span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    Inventory
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                    Parts & pricing
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CARD 9: PENDING APPROVALS (ADMIN) ── */}
            {isAdmin && (
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/admin/approvals')}
                className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                    <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  {pendingWorkersCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-mono text-[9px] font-black uppercase rounded-full shadow-xs animate-pulse">
                      <NumberTicker value={pendingWorkersCount} />
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    Approvals
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                    User requests
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Review</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CARD 10: VEHICLE HISTORY ── */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/jobs', { state: { view: 'all' } })}
              className="relative col-span-1 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl cursor-pointer flex flex-col justify-between min-h-[140px] sm:min-h-[170px] group backdrop-blur-md"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-500 text-white shadow-xs group-hover:scale-110 transition-transform">
                  <Car className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[9px] font-bold uppercase rounded-full border border-blue-500/20">
                  <NumberTicker value={allJobs.length} />
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                  History
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 line-clamp-1">
                  Archives & records
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Archives</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          </div>
        </BlurFade>
      </main>
    </div>
  );
};
