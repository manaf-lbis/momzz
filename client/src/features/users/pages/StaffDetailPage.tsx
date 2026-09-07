import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  User as UserIcon,
  ShieldCheck,
  Phone,
  Calendar,
  Car,
  CheckCircle2,
  Trophy,
  Activity,
  Sparkles,
  Search,
  ArrowUpRight,
  Lock,
  Unlock,
  KeyRound,
  Edit2,
  X,
  Timer,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  useGetAllUsersQuery,
  useGetLeaderboardQuery,
  useUpdateUserByAdminMutation,
  useAdminResetPasswordMutation,
} from '../../auth/api/authApi';
import { useGetJobCardsQuery, JobCardData } from '../../jobs/api/jobApi';
import { User } from '../../auth/store/authSlice';

type DetailTab = 'OVERVIEW' | 'WORK_LOGS' | 'VEHICLES' | 'SECURITY';
type Timeframe = 'day' | 'week' | 'month' | 'year' | 'all';

interface StaffWorkLog {
  taskId: string;
  taskTitle: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  jobId: string;
  completedAt: string;
  completedAtFormatted: string;
  points: number;
  isShared: boolean;
  partnerNames: string[];
  durationMinutes: number;
}

const formatLastSeen = (dateString?: string) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Offline';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 2) return 'Active just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAuditDate = (dateString?: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return (
    date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
};

export const StaffDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentAuthUser } = useAuth();
  const currentAuthId = currentAuthUser?.id || (currentAuthUser as any)?._id;

  const [activeTab, setActiveTab] = useState<DetailTab>('OVERVIEW');
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [logSearch, setLogSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Modals & form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Queries
  const { data: usersData, isLoading: isUsersLoading } = useGetAllUsersQuery();
  const { data: jobsData, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 400 });
  const { data: lbData } = useGetLeaderboardQuery();

  const [updateUserByAdmin, { isLoading: isUpdatingUser }] = useUpdateUserByAdminMutation();
  const [adminResetPassword, { isLoading: isResettingPassword }] = useAdminResetPasswordMutation();

  const allUsers: User[] = usersData?.data || [];
  const staffMember = allUsers.find(
    (u) => (u.id || (u as any)._id) === id
  );

  const allJobs: JobCardData[] = useMemo(() => {
    if (!jobsData?.data) return [];
    if (Array.isArray(jobsData.data)) return jobsData.data;
    if ((jobsData.data as any).jobs) return (jobsData.data as any).jobs;
    return [];
  }, [jobsData]);

  // Leaderboard info
  const leaderboardUsers = lbData?.data || [];
  const staffRank = leaderboardUsers.findIndex((entry: any) => {
    const entryId = entry.id || entry._id || entry.user?.id || entry.user?._id;
    return entryId === id;
  }) + 1;

  // Extract all work logs performed by this staff member
  const staffWorkLogs: StaffWorkLog[] = useMemo(() => {
    if (!staffMember || !allJobs.length) return [];
    const staffId = staffMember.id || (staffMember as any)._id;
    const staffNameLower = staffMember.name.toLowerCase().trim();

    const logs: StaffWorkLog[] = [];

    for (const job of allJobs) {
      const tasks = job.tasks || [];
      const jobId = job.id || job._id || '';

      for (const task of tasks) {
        if (task.status !== 'COMPLETED' || !task.completedAt) continue;

        // Check if this staff member completed or co-worked on the task
        const completedById = (task as any).completedBy?.id || (task as any).completedBy?._id || (typeof (task as any).completedBy === 'string' ? (task as any).completedBy : '');
        const completedByName = (task as any).completedBy?.name?.toLowerCase().trim() || '';

        const partners = (task as any).partnerMechanics || [];
        const isPartner = partners.some((p: any) => {
          const pId = p.id || p._id || (typeof p === 'string' ? p : '');
          const pName = p.name?.toLowerCase().trim() || '';
          return pId === staffId || pName === staffNameLower;
        });

        const isPrimary = completedById === staffId || completedByName === staffNameLower;

        if (isPrimary || isPartner) {
          const isShared = (task as any).isShared || partners.length > 0;
          const partnerNames = partners
            .map((p: any) => p.name || 'Partner')
            .filter((name: string) => name.toLowerCase().trim() !== staffNameLower);

          const taskCompletedDate = new Date(task.completedAt);
          const taskCreatedDate = new Date(task.createdAt || job.createdAt);
          const durationMins = Math.max(
            5,
            Math.round((taskCompletedDate.getTime() - taskCreatedDate.getTime()) / 60000)
          );

          logs.push({
            taskId: (task as any).id || (task as any)._id || Math.random().toString(),
            taskTitle: task.title,
            vehicleName: job.vehicleName,
            vehicleNumber: job.vehicleNumber,
            vehicleColor: job.vehicleColor,
            customerName: job.customerName,
            jobId,
            completedAt: task.completedAt,
            completedAtFormatted: formatAuditDate(task.completedAt),
            points: isShared ? 0.5 : 1.0,
            isShared,
            partnerNames,
            durationMinutes: durationMins,
          });
        }
      }
    }

    // Sort newest first
    return logs.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  }, [staffMember, allJobs]);

  // Extract all distinct vehicles handled by this staff
  const vehiclesHandled = useMemo(() => {
    if (!staffWorkLogs.length || !allJobs.length) return [];
    const jobIdsSet = new Set(staffWorkLogs.map((l) => l.jobId));

    return allJobs
      .filter((j) => jobIdsSet.has(j.id || j._id || ''))
      .map((job) => {
        const staffTasksOnJob = staffWorkLogs.filter((l) => l.jobId === (job.id || job._id));
        const totalJobTasks = job.tasks?.length || 0;
        const completedJobTasks = job.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
        return {
          job,
          tasksDoneByStaff: staffTasksOnJob.length,
          totalJobTasks,
          completedJobTasks,
        };
      });
  }, [staffWorkLogs, allJobs]);

  // Timeframe filtered work logs for stats calculations
  const filteredLogsByTimeframe = useMemo(() => {
    const now = new Date();
    let startTimestamp = 0;

    if (timeframe === 'day') {
      startTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    } else if (timeframe === 'week') {
      const dow = now.getDay();
      const diffToMonday = dow === 0 ? -6 : 1 - dow;
      startTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0).getTime();
    } else if (timeframe === 'month') {
      startTimestamp = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    } else if (timeframe === 'year') {
      startTimestamp = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
    }

    if (startTimestamp === 0) return staffWorkLogs;
    return staffWorkLogs.filter((l) => new Date(l.completedAt).getTime() >= startTimestamp);
  }, [staffWorkLogs, timeframe]);

  // Telemetry Aggregates
  const totalTasksCompleted = staffWorkLogs.length;
  const soloTasksCompleted = staffWorkLogs.filter((l) => !l.isShared).length;
  const sharedTasksCompleted = staffWorkLogs.filter((l) => l.isShared).length;
  const totalPointsEarned = staffWorkLogs.reduce((acc, l) => acc + l.points, 0);
  const totalVehiclesCount = vehiclesHandled.length;
  const periodTasksCount = filteredLogsByTimeframe.length;
  const periodPointsCount = filteredLogsByTimeframe.reduce((acc, l) => acc + l.points, 0);

  const avgMinutesPerTask = totalTasksCompleted > 0
    ? Math.round(staffWorkLogs.reduce((acc, l) => acc + l.durationMinutes, 0) / totalTasksCompleted)
    : 0;

  // Search filtered logs
  const searchedLogs = useMemo(() => {
    if (!logSearch.trim()) return staffWorkLogs;
    const query = logSearch.toLowerCase().trim();
    return staffWorkLogs.filter(
      (l) =>
        l.taskTitle.toLowerCase().includes(query) ||
        l.vehicleName.toLowerCase().includes(query) ||
        l.vehicleNumber.toLowerCase().includes(query) ||
        (l.customerName && l.customerName.toLowerCase().includes(query))
    );
  }, [staffWorkLogs, logSearch]);

  // Search filtered vehicles
  const searchedVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehiclesHandled;
    const query = vehicleSearch.toLowerCase().trim();
    return vehiclesHandled.filter(
      ({ job }) =>
        job.vehicleName.toLowerCase().includes(query) ||
        job.vehicleNumber.toLowerCase().includes(query) ||
        (job.customerName && job.customerName.toLowerCase().includes(query))
    );
  }, [vehiclesHandled, vehicleSearch]);

  // Actions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMember) return;
    setActionErrorMsg('');
    try {
      await updateUserByAdmin({
        userId: staffMember.id || (staffMember as any)._id,
        name: editName.trim() || staffMember.name,
        mobile: editMobile.trim() || staffMember.mobile,
      }).unwrap();
      setIsEditingProfile(false);
    } catch (err: any) {
      setActionErrorMsg(err?.data?.message || 'Failed to update staff member info.');
    }
  };

  const handleToggleBlockStatus = async () => {
    if (!staffMember) return;
    setActionErrorMsg('');
    const newStatus = staffMember.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    try {
      await updateUserByAdmin({
        userId: staffMember.id || (staffMember as any)._id,
        status: newStatus,
      }).unwrap();
    } catch (err: any) {
      setActionErrorMsg(err?.data?.message || 'Failed to update user status.');
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMember || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      setActionErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setActionErrorMsg('');
    setResetSuccessMsg('');
    try {
      await adminResetPassword({
        userId: staffMember.id || (staffMember as any)._id,
        newPassword,
      }).unwrap();
      setResetSuccessMsg('Password reset successfully!');
      setNewPassword('');
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setActionErrorMsg(err?.data?.message || 'Failed to reset password.');
    }
  };

  if (isUsersLoading || isJobsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col">
        <Navbar glass />
        <main className="app-container flex-1 py-8">
          <PageShimmer label="Loading staff telemetry & logs..." cards={4} />
        </main>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col">
        <Navbar glass />
        <main className="app-container flex-1 py-20 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <UserIcon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Staff Member Not Found</h2>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            The requested staff record does not exist or was removed.
          </p>
          <button
            onClick={() => navigate('/users')}
            className="px-5 py-2.5 rounded-xl glass-gold-btn text-xs font-black text-slate-950 shadow-md active:scale-95 transition cursor-pointer"
          >
            ← Back to Staff Roster
          </button>
        </main>
      </div>
    );
  }

  const staffId = staffMember.id || (staffMember as any)._id;
  const isOnline = !!staffMember.isOnline;
  const isBlocked = staffMember.status === 'BLOCKED';
  const isSelf = staffId === currentAuthId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080e] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-300 font-sans">
      {/* Ambient background aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[340px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05)_0%,transparent_65%)]" />
        <Meteors number={12} />
      </div>

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* ── 1. TOP NAVIGATION & BREADCRUMB ── */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-ghost-btn text-xs font-bold shadow-2xs hover:border-amber-400/50 cursor-pointer active:scale-95 transition"
            title="Back to Staff Roster"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Staff Roster</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Staff ID: <span className="text-slate-700 dark:text-slate-300 font-bold">{staffId.slice(-6)}</span>
            </span>
          </div>
        </div>

        {/* ── 2. HERO PROFILE COMMAND CARD ── */}
        <div className="relative overflow-hidden rounded-3xl glass-modern-card p-5 sm:p-7 shadow-lg border border-white/90 dark:border-white/[0.08]">
          <BorderBeam size={260} duration={8} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={1} />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Avatar & Personal Info */}
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white dark:border-white/10 flex items-center justify-center font-black text-2xl text-white shadow-md">
                  {staffMember.profileImageUrl ? (
                    <img src={staffMember.profileImageUrl} alt={staffMember.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{staffMember.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#080810] ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                  }`}
                  title={isOnline ? 'Active Online' : 'Offline'}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {staffMember.name}
                  </h1>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      staffMember.role === 'ADMIN'
                        ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                        : 'bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-400/30'
                    }`}
                  >
                    {staffMember.role}
                  </span>
                  {isBlocked && (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                      Blocked
                    </span>
                  )}
                  {staffRank > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      Rank #{staffRank}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    {staffMember.mobile || 'No Mobile'}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    {formatLastSeen(staffMember.lastSeen || staffMember.lastLoginAttempt)}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                    Joined {formatAuditDate(staffMember.createdAt).split(' · ')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditName(staffMember.name);
                  setEditMobile(staffMember.mobile || '');
                  setIsEditingProfile(true);
                }}
                className="px-3.5 py-2 rounded-xl glass-ghost-btn text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs hover:border-amber-400/50"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Edit Info</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewPassword('');
                  setActionErrorMsg('');
                  setResetSuccessMsg('');
                  setIsResetModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl glass-ghost-btn text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs hover:border-amber-400/50"
              >
                <KeyRound className="w-3.5 h-3.5 text-sky-500" />
                <span>Reset Password</span>
              </button>

              <button
                type="button"
                disabled={isSelf}
                onClick={handleToggleBlockStatus}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40 shadow-2xs ${
                  isBlocked
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-300 hover:bg-rose-500/30'
                    : 'glass-ghost-btn text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:border-rose-500/40'
                }`}
                title={isSelf ? 'Cannot block your own account' : isBlocked ? 'Unblock Staff' : 'Block Staff'}
              >
                {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isBlocked ? 'Unblock' : 'Block'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. FOUR TELEMETRY STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl glass-modern-card flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Total Tasks Done
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                <NumberTicker value={totalTasksCompleted} />
              </p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                {soloTasksCompleted} solo · {sharedTasksCompleted} co-worked
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-modern-card flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Leaderboard Points
              </span>
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-3">
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {totalPointsEarned.toFixed(1)}
              </p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                {staffRank > 0 ? `Garage Rank #${staffRank}` : 'Unranked'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-modern-card flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Vehicles Serviced
              </span>
              <div className="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-3">
              <p className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
                <NumberTicker value={totalVehiclesCount} />
              </p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                unique job cards handled
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-modern-card flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Avg Task Speed
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <div className="pt-3">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {avgMinutesPerTask}<span className="text-sm font-bold text-slate-500">m</span>
              </p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                average turnaround per task
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. TAB NAVIGATION ── */}
        <div className="flex gap-1.5 p-1 bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-hide shadow-2xs">
          {[
            { id: 'OVERVIEW', label: 'Performance Analytics', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'WORK_LOGS', label: `Work & Task Logs (${totalTasksCompleted})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'VEHICLES', label: `Vehicles Handled (${totalVehiclesCount})`, icon: <Car className="w-3.5 h-3.5" /> },
            { id: 'SECURITY', label: 'Security & Audit Info', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 5. TAB PANELS ── */}
        <div className="space-y-4">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              {/* Timeframe Filter */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl glass-modern-card">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  Analytics Timeframe:
                </span>
                <div className="flex gap-1">
                  {(
                    [
                      { key: 'day', label: 'Today' },
                      { key: 'week', label: 'Week' },
                      { key: 'month', label: 'Month' },
                      { key: 'year', label: 'Year' },
                      { key: 'all', label: 'All Time' },
                    ] as const
                  ).map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeframe(tf.key)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                        timeframe === tf.key
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl glass-modern-card space-y-2">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Tasks in Timeframe</p>
                  <p className="text-3xl font-black text-amber-500">{periodTasksCount}</p>
                  <p className="text-[11px] font-mono text-slate-500">completed during selected period</p>
                </div>
                <div className="p-4 rounded-2xl glass-modern-card space-y-2">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Points in Timeframe</p>
                  <p className="text-3xl font-black text-purple-500">{periodPointsCount.toFixed(1)}</p>
                  <p className="text-[11px] font-mono text-slate-500">weighted speed score earned</p>
                </div>
                <div className="p-4 rounded-2xl glass-modern-card space-y-2">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Solo vs Co-work Ratio</p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 flex">
                      <div
                        className="h-full bg-amber-500"
                        style={{
                          width: `${totalTasksCompleted > 0 ? (soloTasksCompleted / totalTasksCompleted) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="h-full bg-purple-500"
                        style={{
                          width: `${totalTasksCompleted > 0 ? (sharedTasksCompleted / totalTasksCompleted) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Solo: {soloTasksCompleted}</span>
                    <span>Co-work: {sharedTasksCompleted}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Mini-Feed */}
              <div className="p-4 sm:p-5 rounded-3xl glass-modern-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Latest Completed Tasks
                  </h3>
                  <button
                    onClick={() => setActiveTab('WORK_LOGS')}
                    className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all logs</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {staffWorkLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.taskId}
                    onClick={() => navigate(`/jobs/${log.jobId}`)}
                    className="p-3 rounded-2xl bg-white/50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-400/50 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {log.taskTitle}
                        </p>
                        {log.isShared && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300">
                            Shared
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {log.vehicleName} ({log.vehicleNumber})
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        +{log.points} pts
                      </span>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {log.completedAtFormatted.split(' · ')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: COMPREHENSIVE WORK LOGS */}
          {activeTab === 'WORK_LOGS' && (
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs by task, vehicle name, reg number..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-modern-input text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition shadow-2xs"
                />
                {logSearch && (
                  <button
                    onClick={() => setLogSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchedLogs.length === 0 ? (
                <div className="py-16 text-center rounded-3xl glass-modern-card space-y-1.5">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No work logs found</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    No task history matches your search filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchedLogs.map((log) => (
                    <motion.div
                      key={log.taskId}
                      whileHover={{ y: -1 }}
                      onClick={() => navigate(`/jobs/${log.jobId}`)}
                      className="p-3.5 sm:p-4 rounded-2xl glass-modern-card hover:border-amber-400/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {log.taskTitle}
                            </h4>
                            {log.isShared ? (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                Co-worked ({log.partnerNames.join(', ') || 'Partner'})
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                Solo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span className="text-slate-900 dark:text-white font-bold">{log.vehicleName}</span>
                            <span>·</span>
                            <span>{log.vehicleNumber}</span>
                            {log.customerName && (
                              <>
                                <span>·</span>
                                <span>Owner: {log.customerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                            +{log.points} pts
                          </span>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {log.completedAtFormatted}
                          </p>
                        </div>
                        <span className="w-7 h-7 rounded-xl glass-ghost-btn flex items-center justify-center text-slate-400 hover:text-white">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VEHICLES HANDLED */}
          {activeTab === 'VEHICLES' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vehicles handled by model, plate, owner..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-modern-input text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition shadow-2xs"
                />
                {vehicleSearch && (
                  <button
                    onClick={() => setVehicleSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchedVehicles.length === 0 ? (
                <div className="py-16 text-center rounded-3xl glass-modern-card space-y-1.5">
                  <Car className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No vehicles found</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    This staff member hasn't worked on any matching vehicle records.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchedVehicles.map(({ job, tasksDoneByStaff, totalJobTasks, completedJobTasks }) => {
                    const jobId = job.id || job._id;
                    const progress = totalJobTasks > 0 ? Math.round((completedJobTasks / totalJobTasks) * 100) : 0;
                    return (
                      <motion.div
                        key={jobId}
                        whileHover={{ y: -2 }}
                        onClick={() => navigate(`/jobs/${jobId}`)}
                        className="p-4 rounded-2xl glass-modern-card hover:border-amber-400/50 flex flex-col justify-between gap-3 transition cursor-pointer shadow-2xs group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {job.thumbnailUrl ? (
                            <img
                              src={job.thumbnailUrl}
                              alt=""
                              className="w-13 h-12 rounded-xl object-cover shrink-0 border border-black/5 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-13 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                              <Car className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition">
                                {job.vehicleName}
                              </h4>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                {job.vehicleNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {job.customerName ? `Owner: ${job.customerName}` : 'Service Bay'}
                              {job.vehicleColor ? ` · ${job.vehicleColor}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {tasksDoneByStaff} tasks done by {staffMember.name.split(' ')[0]}
                          </span>
                          <span className="text-slate-400">
                            Overall {progress}% ({completedJobTasks}/{totalJobTasks})
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY & AUDIT INFO */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl glass-modern-card space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Account Security & Authorization
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                    <p className="text-slate-400 uppercase text-[10px]">Account Role</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{staffMember.role}</p>
                    <p className="text-[11px] text-slate-500">System authorization level</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                    <p className="text-slate-400 uppercase text-[10px]">Account Status</p>
                    <p className={`text-sm font-black ${isBlocked ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {staffMember.status || 'ACTIVE'}
                    </p>
                    <p className="text-[11px] text-slate-500">Access permission status</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                    <p className="text-slate-400 uppercase text-[10px]">Account Registered</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatAuditDate(staffMember.createdAt)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                    <p className="text-slate-400 uppercase text-[10px]">Last Login / Activity</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatAuditDate(staffMember.lastSeen || staffMember.lastLoginAttempt)}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Reset Staff Credentials</p>
                    <p className="text-[11px] font-mono text-slate-400">Issue a new secure password for this worker</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewPassword('');
                      setActionErrorMsg('');
                      setResetSuccessMsg('');
                      setIsResetModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl glass-gold-btn text-slate-950 font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── EDIT PROFILE MODAL ── */}
      <AnimatePresence>
        {isEditingProfile && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsEditingProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl glass-modern-panel p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Staff Details</h3>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-mono">
                  {actionErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl glass-modern-input text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input
                    type="text"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl glass-modern-input text-xs font-bold outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 rounded-xl glass-ghost-btn text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingUser}
                    className="flex-1 py-2.5 rounded-xl glass-gold-btn text-slate-950 font-black text-xs cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── RESET PASSWORD MODAL ── */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsResetModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl glass-modern-panel p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  Reset Staff Password
                </h3>
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-mono">
                  {actionErrorMsg}
                </div>
              )}

              {resetSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-mono">
                  {resetSuccessMsg}
                </div>
              )}

              <form onSubmit={handleAdminResetPassword} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl glass-modern-input text-xs font-bold outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl glass-ghost-btn text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex-1 py-2.5 rounded-xl glass-gold-btn text-slate-950 font-black text-xs cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isResettingPassword ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
