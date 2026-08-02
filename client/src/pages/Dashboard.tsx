import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { useGetPendingWorkersQuery } from '../api/authApi';
import { CreateJobModal } from '../components/jobCard/CreateJobModal';
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
  Sparkles,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Live queries
  const { data: jobsResponse } = useGetJobCardsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, {
    skip: !isAdmin,
  });

  const jobs = jobsResponse?.data || [];
  const openJobsCount = Array.isArray(jobs)
    ? jobs.filter((j: JobCardData) => j.status === 'IN_PROGRESS').length
    : (jobs.jobs || []).filter((j: JobCardData) => j.status === 'IN_PROGRESS').length;

  const pendingWorkersCount = pendingResponse?.data?.length || 0;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner Alert for Pending Worker Approval */}
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
                  Profile under review by garage admin. Once approved, full work access will unlock.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-yellow-400 rounded-full text-[10px] font-mono font-bold uppercase shrink-0">
              PENDING
            </span>
          </motion.div>
        )}

        {/* GARAGE HUB Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-zinc-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
                  MOMZ'Z AUTO GARAGE
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase">
                  ONLINE
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                USER: <span className="text-amber-600 dark:text-yellow-400 font-bold uppercase">{user?.name}</span> ({user?.role})
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: JOBS MANAGEMENT */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Wrench className="w-4 h-4 text-yellow-400" />
            <span>SECTION 1: JOBS MANAGEMENT</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 📋 My Jobs Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/jobs')}
              className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                  📋 My Jobs
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {openJobsCount} Active Vehicles
                </p>
              </div>
            </motion.div>

            {/* ➕ Create Job Card (ADMIN ONLY) */}
            {isAdmin && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsCreateModalOpen(true)}
                className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    ➕ Create Job
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    New Vehicle Job Card
                  </p>
                </div>
              </motion.div>
            )}

            {/* 🚘 Active Cars Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/jobs')}
              className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Car className="w-6 h-6" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                  🚘 Active Cars
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  Garage Workroom View
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: USER & TEAM MANAGEMENT (Admin Only) */}
        {isAdmin && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Users className="w-4 h-4 text-yellow-400" />
              <span>SECTION 2: USER & TEAM MANAGEMENT (ADMIN ONLY)</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* 🛡️ Pending Approvals Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/admin/approvals')}
                className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  {pendingWorkersCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-mono font-black animate-pulse shadow-md">
                      {pendingWorkersCount} PENDING
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    🛡️ Pending Approvals
                  </h3>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold mt-0.5">
                    {pendingWorkersCount} Registration Requests
                  </p>
                </div>
              </motion.div>

              {/* ⚙️ Manage Users Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/admin/users')}
                className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    ⚙️ Manage Users
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    Roles &amp; Status Controls
                  </p>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* SECTION 3: ANALYTICS & PERFORMANCE */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>SECTION 3: ANALYTICS & PERFORMANCE</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 📊 Top Performers / Work Log Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/analytics')}
              className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4 col-span-2 md:col-span-1"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded text-[10px] font-mono font-bold">
                  ANALYTICS
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                  📊 Top Performers &amp; Work Log
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  Time Filters &amp; Leaderboard
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 4: ACCOUNT */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <UserCheck className="w-4 h-4 text-yellow-400" />
            <span>SECTION 4: ACCOUNT</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 👤 My Profile Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/profile')}
              className="industrial-card p-4 sm:p-5 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                  👤 My Profile
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                  {user?.name} ({user?.mobile})
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Modal for Creating Job (Admin Only) */}
        <CreateJobModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </main>
    </div>
  );
};
