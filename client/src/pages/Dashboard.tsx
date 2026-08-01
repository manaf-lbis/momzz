import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useTheme } from '../context/ThemeContext';
import { useGetJobCardsQuery } from '../api/jobApi';
import { useGetPendingWorkersQuery } from '../api/authApi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logout } from '../slice/authSlice';
import { CreateJobModal } from '../components/jobCard/CreateJobModal';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  PlusCircle,
  ShieldAlert,
  UserCheck,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Clock,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Live queries
  const { data: jobsResponse } = useGetJobCardsQuery();
  const { data: pendingResponse } = useGetPendingWorkersQuery(undefined, {
    skip: !isAdmin,
  });

  const jobs = jobsResponse?.data || [];
  const openJobsCount = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
  const pendingWorkersCount = pendingResponse?.data?.length || 0;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner Alert for Pending Worker Approval */}
        {!isApproved && !isAdmin && (
          <div className="p-3 bg-amber-500/10 dark:bg-yellow-500/10 border border-amber-500/30 dark:border-yellow-500/30 rounded-xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 dark:text-yellow-400 animate-pulse flex-shrink-0" />
              <div>
                <h4 className="font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase text-xs">
                  ACCOUNT PENDING APPROVAL
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Profile under review by garage admin.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-yellow-400 rounded-full text-[10px] font-mono font-bold uppercase">
              PENDING
            </span>
          </div>
        )}

        {/* Dashboard Title Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
                GARAGE OPERATIONAL HUB
              </h1>
              <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-600 dark:text-yellow-400 border border-amber-400/30 font-mono text-[10px] font-bold uppercase">
                ONLINE
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
              USER: <span className="text-amber-600 dark:text-yellow-400 font-bold uppercase">{user?.name}</span> ({user?.role})
            </p>
          </div>
        </div>

        {/* 4 Compact Mobile-First Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* TILE 1: My Jobs */}
          <div
            onClick={() => navigate('/jobs')}
            className="industrial-card p-4 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all active:scale-[0.98] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                  📋 My Jobs
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-medium">
                  {openJobsCount} Active Vehicles
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
          </div>

          {/* TILE 2: Create Job (Admin Only) */}
          {isAdmin ? (
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="industrial-card p-4 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    ➕ Create Job
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-medium">
                    New Vehicle Card
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
            </div>
          ) : (
            <div className="industrial-card p-4 rounded-2xl opacity-50 flex items-center justify-between cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-zinc-500">➕ Create Job</h3>
                  <span className="text-xs text-zinc-400 font-mono">Admin Restricted</span>
                </div>
              </div>
            </div>
          )}

          {/* TILE 3: Pending Approvals (Admin Only) */}
          {isAdmin ? (
            <div
              onClick={() => navigate('/admin/approvals')}
              className="industrial-card p-4 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    🛡️ Pending Approvals
                  </h3>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
                    ⚡ {pendingWorkersCount} Pending
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-all" />
            </div>
          ) : (
            <div className="industrial-card p-4 rounded-2xl opacity-50 flex items-center justify-between cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-zinc-500">🛡️ Pending Approvals</h3>
                  <span className="text-xs text-zinc-400 font-mono">Admin Restricted</span>
                </div>
              </div>
            </div>
          )}

          {/* TILE 4: My Profile */}
          <div className="industrial-card p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-100">
                  👤 My Profile
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {user?.mobile}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-yellow-400 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-amber-600" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal for Creating Job */}
        <CreateJobModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </main>
    </div>
  );
};
