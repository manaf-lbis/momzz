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
  Users,
  Car,
  Trophy,
  Wrench,
  Package,
} from 'lucide-react';

const DashCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  badge?: React.ReactNode;
  wide?: boolean;
}> = ({ icon, title, subtitle, onClick, badge, wide }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4 ${wide ? 'col-span-2 md:col-span-1' : ''}`}
  >
    <div className="flex items-center justify-between">
      <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      {badge || (
        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
      )}
    </div>
    <div>
      <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
        {title}
      </h3>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">{subtitle}</p>
    </div>
  </motion.div>
);

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();

  const { data: jobsResponse } = useGetJobCardsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });

  const allJobs: JobCardData[] = Array.isArray(jobsResponse?.data)
    ? jobsResponse!.data as unknown as JobCardData[]
    : ((jobsResponse?.data as any)?.jobs || []);

  const activeCount = allJobs.filter(
    (j) => j.status === 'IN_PROGRESS' && j.tasks?.some((t) => t.status === 'OPEN')
  ).length;

  const pendingWorkersCount = pendingResponse?.data?.length || 0;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Pending Approval Banner */}
        {!isApproved && !isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-500/10 dark:bg-yellow-500/10 border border-amber-500/30 dark:border-yellow-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-yellow-400 animate-pulse flex-shrink-0" />
              <div>
                <h4 className="font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase text-xs">
                  ACCOUNT PENDING ADMIN APPROVAL
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Profile under review. Once approved, full work access will unlock.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-yellow-400 rounded-full text-[10px] font-mono font-bold uppercase shrink-0">
              PENDING
            </span>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Welcome back, {user?.name}
              </h1>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase">
                ONLINE
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
              {user?.role} workspace
            </p>
          </div>
        </div>

        {/* ── SECTION 1: JOBS MANAGEMENT ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Wrench className="w-4 h-4 text-yellow-400" />
            <span>Job Management</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashCard
              icon={<ClipboardList className="w-6 h-6" />}
              title="📋 My Jobs"
              subtitle={`${activeCount} Active Vehicles`}
              onClick={() => navigate('/jobs')}
            />

            {/* Create Job — Admin only, navigates to /jobs/create */}
            {isAdmin && (
              <DashCard
                icon={<PlusCircle className="w-6 h-6" />}
                title="➕ Create Job"
                subtitle="New Vehicle Job Card"
                onClick={() => navigate('/jobs/create')}
              />
            )}

            <DashCard
              icon={<Car className="w-6 h-6" />}
              title="🚘 Active Cars"
              subtitle="Garage Workroom View"
              onClick={() => navigate('/jobs')}
            />
          </div>
        </section>

        {/* ── SECTION 2: USER MANAGEMENT (Admin Only) ── */}
        {isAdmin && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Users className="w-4 h-4 text-yellow-400" />
              <span>User &amp; Team Management</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DashCard
                icon={<ShieldAlert className="w-6 h-6" />}
                title="🛡️ Pending Approvals"
                subtitle={`${pendingWorkersCount} Registration Requests`}
                onClick={() => navigate('/admin/approvals')}
                badge={
                  pendingWorkersCount > 0 ? (
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-mono font-black animate-pulse shadow-md">
                      {pendingWorkersCount} NEW
                    </span>
                  ) : undefined
                }
              />

              <DashCard
                icon={<Users className="w-6 h-6" />}
                title="⚙️ Manage Users"
                subtitle="Roles & Status Controls"
                onClick={() => navigate('/admin/users')}
              />
            </div>
          </section>
        )}

        {/* ── SECTION 3: ANALYTICS & MASTER INVENTORY ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Analytics &amp; Master Inventory</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashCard
              icon={<Trophy className="w-6 h-6 text-yellow-400" />}
              title="📊 Top Performers & Work Log"
              subtitle="Time Filters & Leaderboard"
              onClick={() => navigate('/analytics')}
              badge={
                <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded text-[10px] font-mono font-bold">
                  ANALYTICS
                </span>
              }
              wide
            />

            {/* Task Inventory Master — Admin only */}
            {isAdmin && (
              <DashCard
                icon={<Package className="w-6 h-6" />}
                title="📦 Task Inventory"
                subtitle="Auto-suggestion Dictionary"
                onClick={() => navigate('/inventory')}
                badge={
                  <span className="px-2 py-0.5 bg-emerald-400/10 text-emerald-500 dark:text-emerald-400 border border-emerald-400/20 rounded text-[10px] font-mono font-bold">
                    MASTER
                  </span>
                }
              />
            )}
          </div>
        </section>

        {/* ── SECTION 4: ACCOUNT ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <UserCheck className="w-4 h-4 text-yellow-400" />
            <span>Account</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DashCard
              icon={<UserCheck className="w-6 h-6" />}
              title="👤 My Profile"
              subtitle={`${user?.name} (${user?.mobile})`}
              onClick={() => navigate('/profile')}
            />
          </div>
        </section>
      </main>
    </div>
  );
};
