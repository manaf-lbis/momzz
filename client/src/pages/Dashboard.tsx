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
  Activity,
  Sparkles,
  History,
  CheckCheck,
  DollarSign,
} from 'lucide-react';
import { PageShimmer } from '../components/common/PageShimmer';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { AnimatedList } from '../components/magicui/AnimatedList';
import { ProgressBarBeam } from '../components/magicui/AnimatedBeam';
import { BentoGrid, BentoCard } from '../components/magicui/BentoGrid';
import { getDeliveryStatusInfo } from '../utils/dateUtils';

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
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6 pb-28 sm:pb-32">
          <PageShimmer label="Loading Bento Dashboard" cards={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="glass-page text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors min-h-screen">
      {/* Subtle ambient background glow */}
      <div className="glass-orb w-64 sm:w-96 h-64 sm:h-96 -top-20 -left-20 bg-amber-500/10 dark:bg-amber-500/10" aria-hidden />
      <div className="glass-orb w-64 sm:w-[30rem] h-64 sm:h-[30rem] top-1/3 -right-32 bg-sky-400/10 dark:bg-sky-500/10" aria-hidden />

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 pb-28 sm:pb-32">
        
        {/* ── 1. MOBILE-FRIENDLY MODERN DASHBOARD HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 shadow-xs backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-bl from-amber-400/15 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Left: User Welcome & Workshop Status */}
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Garage
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                  {user?.role}
                </span>
              </div>

              <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600 dark:from-yellow-400 dark:to-amber-300">{user?.name}</span>
              </h1>
              <p className="text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Right: Quick Stat Chips */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-1 sm:flex-initial flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md shadow-2xs">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Activity className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 animate-pulse" />
                </div>
                <div className="text-left font-mono">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Bay</p>
                  <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    <NumberTicker value={activeCount} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">Vehicles</span>
                  </p>
                </div>
              </div>

              <div className="flex-1 sm:flex-initial flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md shadow-2xs">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <CheckCheck className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="text-left font-mono">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Done Tasks</p>
                  <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    <NumberTicker value={totalCompletedTasks} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tasks</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Pending Approval Banner */}
        {!isApproved && !isAdmin && (
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex items-center justify-between gap-3 shadow-xs bg-amber-500/10 border border-amber-500/25 dark:bg-amber-400/10 dark:border-amber-400/20 backdrop-blur-md">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-yellow-400 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-mono font-bold text-amber-700 dark:text-yellow-400 uppercase text-[10px] sm:text-xs tracking-wider">
                  Account Pending Approval
                </h4>
                <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Profile under review. Full workspace privileges will unlock once verified.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 dark:bg-yellow-400/15 text-amber-700 dark:text-yellow-400 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase shrink-0 border border-amber-500/30">
              Pending
            </span>
          </div>
        )}

        {/* ── 2. MOBILE-OPTIMIZED RESPONSIVE BENTO GRID ── */}
        <BentoGrid className="grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-2.5 sm:gap-4">
          
          {/* ── HERO 1: LIVE VEHICLE SERVICING FLOW (FULL WIDTH ON MOBILE: COL-SPAN-2) ── */}
          <div
            className="col-span-2 md:col-span-3 lg:col-span-7 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 shadow-xs dark:shadow-xl hover:border-amber-400/40 dark:hover:border-amber-400/30 transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[260px] sm:min-h-[300px] group"
          >
            {/* Header inside stream card */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300 shadow-2xs shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
                    <span>Live Vehicle Workflow</span>
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400">Diagnosis progress & deadlines</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/jobs')}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-400/10 transition-colors flex items-center gap-1 cursor-pointer border border-amber-400/20 shrink-0"
              >
                <span>All ({allJobs.length})</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Body: Live vehicle items */}
            <div className="py-2.5 flex-1 overflow-hidden flex flex-col justify-center">
              {activeJobs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center text-slate-400">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                    <Car className="w-5 h-5 sm:w-6 sm:h-6 opacity-40 text-amber-500" />
                  </div>
                  <p className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">No active vehicles in service.</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Create a job or assign open tasks to begin.</p>
                </div>
              ) : (
                <AnimatedList delay={2400} className="w-full space-y-2">
                  {activeJobs.slice(0, 3).map((job) => {
                    const total = job.tasks?.length || 0;
                    const done = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
                    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                    const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, done === total);

                    return (
                      <div
                        key={job.id || job._id}
                        onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                        className="w-full p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400/60 dark:hover:border-amber-400/40 hover:bg-white dark:hover:bg-slate-900 cursor-pointer transition-all duration-200 flex items-center justify-between gap-2.5 sm:gap-3 group/item shadow-2xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase truncate max-w-[120px] sm:max-w-[200px] group-hover/item:text-amber-500 transition-colors">
                                {job.vehicleName}
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-mono font-black text-slate-800 dark:text-slate-200 bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-300/60 dark:border-slate-700">
                                {job.vehicleNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {job.expectedDeliveryDate && (
                                <span className={`text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${deliveryInfo.badgeClass}`}>
                                  {deliveryInfo.shortLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex-1">
                              <ProgressBarBeam progress={progress} />
                            </div>
                            <span className="text-[10px] sm:text-xs font-mono font-black text-amber-600 dark:text-amber-400 shrink-0">
                              {progress}%
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover/item:text-amber-500 group-hover/item:translate-x-1 transition-all shrink-0" />
                      </div>
                    );
                  })}
                </AnimatedList>
              )}
            </div>

            {/* Bottom stats footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500">
              <span>{activeCount} Active vehicles</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer" onClick={() => navigate('/jobs')}>
                View all jobs →
              </span>
            </div>
          </div>

          {/* ── CARD 2: QUICK INTAKE / CREATE JOB (COL-SPAN-2 ON MOBILE OR COL-SPAN-1) ── */}
          {isAdmin ? (
            <BentoCard
              name="Create Job"
              subtitle="Vehicle Intake"
              description="Register new customer vehicle, assign mechanics & create checklist."
              Icon={PlusCircle}
              accent="amber"
              featured={true}
              cta="New Intake"
              onClick={() => navigate('/jobs/create')}
              className="col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-5 min-h-[145px] sm:min-h-[160px] bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-white/90 dark:to-slate-900/90 border-amber-400/50 dark:border-amber-500/40"
              badge={
                <span className="px-2 sm:px-2.5 py-0.5 bg-amber-400/20 text-amber-800 dark:text-amber-300 font-mono text-[9px] sm:text-[10px] font-bold uppercase rounded-full border border-amber-400/40 shadow-2xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  Quick Action
                </span>
              }
              background={
                <BorderBeam size={180} duration={6} colorFrom="#f59e0b" colorTo="#fbbf24" borderWidth={2} />
              }
            />
          ) : (
            <BentoCard
              name="My Assigned Jobs"
              subtitle="Active Tasks"
              description="View your active checklist items, update status & upload photos."
              Icon={ClipboardList}
              accent="amber"
              cta="View My Tasks"
              onClick={() => navigate('/jobs')}
              className="col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-5 min-h-[145px] sm:min-h-[160px]"
              badge={
                <span className="px-2 sm:px-2.5 py-0.5 bg-amber-400/20 text-amber-800 dark:text-amber-300 font-mono text-[9px] sm:text-[10px] font-bold uppercase rounded-full border border-amber-400/40 flex items-center gap-1">
                  <NumberTicker value={activeCount} /> Active
                </span>
              }
            />
          )}

          {/* ── CARD 3: POS EXPRESS COUNTER SALES (COL-SPAN-1 ON MOBILE) ── */}
          <BentoCard
            name="Counter POS"
            subtitle="Express Billing"
            description="Instant spare parts billing & direct counter checkout receipts."
            Icon={ShoppingCart}
            accent="emerald"
            cta="Open POS"
            onClick={() => navigate('/sales')}
            className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[140px] sm:min-h-[165px]"
            badge={
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" />
                POS
              </span>
            }
          />

          {/* ── CARD 4: QUALITY VERIFICATION (COL-SPAN-1 ON MOBILE) ── */}
          <BentoCard
            name="Verification"
            subtitle="Quality Pass"
            description="Supervisor QA sign-off & road test verification before delivery."
            Icon={CheckCircle2}
            accent="purple"
            cta="Review Ready"
            onClick={() => navigate('/jobs', { state: { view: 'verify' } })}
            className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[140px] sm:min-h-[165px]"
            badge={
              pendingVerificationCount > 0 ? (
                <span className="px-2 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-purple-500/30 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <NumberTicker value={pendingVerificationCount} />
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                  Passed
                </span>
              )
            }
          />

          {/* ── CARD 5: MECHANIC LEADERBOARD (COL-SPAN-1 ON MOBILE) ── */}
          <BentoCard
            name="Leaderboard"
            subtitle="Rankings"
            description="Mechanic speed rankings, podium trophies & task points."
            Icon={Trophy}
            accent="amber"
            cta="View Podium"
            onClick={() => navigate('/leaderboard')}
            className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[140px] sm:min-h-[165px]"
            badge={
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-amber-500/20 flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5 text-amber-500" />
                Podium
              </span>
            }
          />

          {/* ── CARD 6: WORK LOGS & TIMELINE (COL-SPAN-1 ON MOBILE) ── */}
          <BentoCard
            name="Work Logs"
            subtitle="Activity Stream"
            description="Real-time task timestamps, labor shift logs & audit records."
            Icon={Flame}
            accent="rose"
            cta="Open Logs"
            onClick={() => navigate('/work-logs')}
            className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[140px] sm:min-h-[165px]"
            badge={
              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-rose-500/20">
                Timeline
              </span>
            }
          />

          {/* ── CARD 7: PARTS INVENTORY (ADMIN) (COL-SPAN-1 ON MOBILE) ── */}
          {isAdmin && (
            <BentoCard
              name="Inventory"
              subtitle="Parts Matrix"
              description="Spare parts catalog, stock levels, reorder alerts & pricing."
              Icon={Package}
              accent="blue"
              cta="Manage Stock"
              onClick={() => navigate('/inventory')}
              className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[140px] sm:min-h-[165px]"
              badge={
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-blue-500/20">
                  Parts
                </span>
              }
            />
          )}

          {/* ── CARD 8: WORKER APPROVALS (ADMIN) (COL-SPAN-1 ON MOBILE) ── */}
          {isAdmin && (
            <BentoCard
              name="Approvals"
              subtitle="User Access"
              description="Technician account registrations & pending privilege requests."
              Icon={ShieldAlert}
              accent="rose"
              cta="Manage Access"
              onClick={() => navigate('/admin/approvals')}
              className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[140px] sm:min-h-[165px]"
              badge={
                pendingWorkersCount > 0 ? (
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-mono text-[8px] sm:text-[9px] font-black uppercase rounded-full shadow-2xs animate-pulse">
                    <NumberTicker value={pendingWorkersCount} /> Alert
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-slate-200 dark:border-slate-700">
                    Verified
                  </span>
                )
              }
            />
          )}

          {/* ── CARD 9: VEHICLE LIFETIME ARCHIVE (FULL WIDTH COL-SPAN-2 ON MOBILE) ── */}
          <BentoCard
            name="Vehicle History"
            subtitle="Lifetime Archives"
            description="Search complete past service records, inspection checklists & customer records."
            Icon={History}
            accent="cyan"
            cta="Search History"
            onClick={() => navigate('/jobs', { state: { view: 'all' } })}
            className="col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-4 min-h-[135px] sm:min-h-[165px]"
            badge={
              <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-mono text-[8px] sm:text-[9px] font-bold uppercase rounded-full border border-cyan-500/20">
                <NumberTicker value={allJobs.length} /> Completed
              </span>
            }
          />

        </BentoGrid>
      </main>
    </div>
  );
};
