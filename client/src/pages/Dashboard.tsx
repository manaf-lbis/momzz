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
  UserCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
  Users,
  Car,
  Trophy,
  Wrench,
  Package,
  ShoppingCart,
  Flame,
} from 'lucide-react';
import { PageShimmer } from '../components/common/PageShimmer';

const DashCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  badge?: React.ReactNode;
  wide?: boolean;
  accent?: 'yellow' | 'orange' | 'emerald' | 'red';
}> = ({ icon, title, subtitle, onClick, badge, wide, accent = 'yellow' }) => {
  const accentMap = {
    yellow: 'text-amber-600 dark:text-yellow-400 group-hover:text-amber-600 dark:group-hover:text-yellow-400',
    orange: 'text-orange-500 group-hover:text-orange-400',
    emerald: 'text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500',
    red: 'text-red-500 group-hover:text-red-400',
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass-card p-4 sm:p-5 rounded-2xl cursor-pointer group flex flex-col justify-between gap-4 min-h-[120px] ${wide ? 'col-span-2 md:col-span-1' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl glass-icon-wrap ${accentMap[accent]} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        {badge || (
          <div className="p-1.5 rounded-lg bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-yellow-400" />
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xs sm:text-sm font-bold tracking-wide text-zinc-800 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
          {title}
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1 truncate leading-relaxed">{subtitle}</p>
      </div>
    </motion.div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2.5">
    <div className="glass-section-label inline-flex items-center gap-2 px-3 py-1.5 rounded-full">
      <span className="text-yellow-500 dark:text-yellow-400">{icon}</span>
      <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
    </div>
    <div className="flex-1 h-px bg-gradient-to-r from-white/40 dark:from-white/10 to-transparent" />
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();

  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });

  const allJobs: JobCardData[] = Array.isArray(jobsResponse?.data)
    ? jobsResponse!.data as unknown as JobCardData[]
    : ((jobsResponse?.data as any)?.jobs || []);

  const activeCount = allJobs.filter(
    (j) => j.status === 'IN_PROGRESS' && j.tasks?.some((t) => t.status === 'OPEN')
  ).length;
  const pendingVerificationCount = allJobs.filter(
    (job) => !job.verifiedAt && job.tasks?.length > 0 && job.tasks.every((task) => task.status === 'COMPLETED')
  ).length;

  const pendingWorkersCount = pendingResponse?.data?.length || 0;

  if (isJobsLoading) {
    return (
      <div className="glass-page text-zinc-900 dark:text-zinc-100 flex flex-col">
        <div className="glass-orb w-72 h-72 -top-20 -left-20 bg-indigo-400/30 dark:bg-indigo-500/20" />
        <div className="glass-orb w-96 h-96 top-1/3 -right-32 bg-sky-400/25 dark:bg-sky-500/15" />
        <Navbar glass />
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
          <PageShimmer label="Loading dashboard" cards={5} />
        </main>
      </div>
    );
  }

  return (
    <div className="glass-page text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors min-h-screen">
      {/* Ambient background light orbs */}
      <div className="glass-orb w-96 h-96 -top-24 -left-24 bg-indigo-500/25 dark:bg-indigo-600/20" aria-hidden />
      <div className="glass-orb w-[32rem] h-[32rem] top-1/4 -right-40 bg-sky-400/30 dark:bg-sky-500/20" aria-hidden />
      <div className="glass-orb w-80 h-80 bottom-10 left-1/4 bg-amber-400/20 dark:bg-amber-500/15" aria-hidden />

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Pending Approval Banner */}
        {!isApproved && !isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-banner p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl glass-icon-wrap">
                <Clock className="w-5 h-5 text-amber-600 dark:text-yellow-400 animate-pulse flex-shrink-0" />
              </div>
              <div>
                <h4 className="font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase text-xs tracking-wide">
                  Account Pending Approval
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Profile under review. Once approved, full work access will unlock.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-amber-500/15 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 border border-amber-500/25 dark:border-yellow-400/20 shadow-xs">
              Pending
            </span>
          </motion.div>
        )}

        {/* Pure Clean White Greeting Card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/95 dark:bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back, <span className="font-extrabold">{user?.name}</span>
            </h1>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">
              <span className="font-bold text-amber-600 dark:text-amber-400">{user?.role}</span> workspace · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase()}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 font-mono text-[10px] font-bold uppercase shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </motion.div>

        {/* Job Management */}
        <section className="space-y-4">
          <SectionHeader icon={<Wrench className="w-3.5 h-3.5" />} label="Job Management" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <DashCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="My Jobs"
              subtitle={`${activeCount} active vehicles`}
              onClick={() => navigate('/jobs')}
            />
            {isAdmin && (
              <DashCard
                icon={<PlusCircle className="w-6 h-6" />}
                title="Create Job"
                subtitle="New vehicle job card"
                onClick={() => navigate('/jobs/create')}
              />
            )}
            <DashCard
              icon={<ShoppingCart className="w-6 h-6" />}
              title="POS Sales"
              subtitle="Direct sales counter"
              onClick={() => navigate('/sales')}
            />
            <DashCard
              icon={<Car className="w-6 h-6" />}
              title="All Vehicles & History"
              subtitle="Completed and active job cards"
              onClick={() => navigate('/jobs', { state: { view: 'all' } })}
            />
            <DashCard
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="Pending Verification"
              subtitle={`${pendingVerificationCount} vehicle${pendingVerificationCount === 1 ? '' : 's'} to cross-check`}
              onClick={() => navigate('/jobs', { state: { view: 'verify' } })}
            />
          </div>
        </section>

        {/* User Management (Admin) */}
        {isAdmin && (
          <section className="space-y-4">
            <SectionHeader icon={<Users className="w-3.5 h-3.5" />} label="User & Team Management" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <DashCard
                icon={<ShieldAlert className="w-6 h-6" />}
                title="Pending Approvals"
                subtitle={`${pendingWorkersCount} registration requests`}
                onClick={() => navigate('/admin/approvals')}
                accent="red"
                badge={
                  pendingWorkersCount > 0 ? (
                    <span className="px-2.5 py-1 bg-red-500/90 text-white rounded-full text-[10px] font-mono font-black animate-pulse shadow-lg shadow-red-500/30 backdrop-blur-sm">
                      {pendingWorkersCount} new
                    </span>
                  ) : undefined
                }
              />
              <DashCard
                icon={<Users className="w-6 h-6" />}
                title="Manage Users"
                subtitle="Roles & status controls"
                onClick={() => navigate('/admin/users')}
              />
            </div>
          </section>
        )}

        {/* Performance & Inventory */}
        <section className="space-y-4">
          <SectionHeader icon={<Trophy className="w-3.5 h-3.5" />} label="Performance & Inventory" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <DashCard
              icon={<Trophy className="w-6 h-6" />}
              title="Top Performers"
              subtitle="Mechanic podium & ranks"
              onClick={() => navigate('/leaderboard')}
              badge={
                <span className="px-2 py-0.5 bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 border border-yellow-400/25 rounded-full text-[10px] font-mono font-bold backdrop-blur-sm">
                  Podium
                </span>
              }
            />
            <DashCard
              icon={<Flame className="w-6 h-6" />}
              title="Work Logs"
              subtitle="Completed tasks & timeline"
              onClick={() => navigate('/work-logs')}
              accent="orange"
              badge={
                <span className="px-2 py-0.5 bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 rounded-full text-[10px] font-mono font-bold backdrop-blur-sm">
                  Logs
                </span>
              }
            />
            {isAdmin && (
              <DashCard
                icon={<Package className="w-6 h-6" />}
                title="Inventory"
                subtitle="Auto-suggestion dictionary"
                onClick={() => navigate('/inventory')}
                accent="emerald"
                badge={
                  <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] font-mono font-bold backdrop-blur-sm">
                    Master
                  </span>
                }
              />
            )}
          </div>
        </section>

        {/* Account */}
        <section className="space-y-4">
          <SectionHeader icon={<UserCheck className="w-3.5 h-3.5" />} label="Account" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <DashCard
              icon={<UserCheck className="w-6 h-6" />}
              title="My Profile"
              subtitle={`${user?.name} · ${user?.mobile}`}
              onClick={() => navigate('/profile')}
            />
          </div>
        </section>
      </main>
    </div>
  );
};
