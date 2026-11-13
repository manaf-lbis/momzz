import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  ShieldCheck,
  Phone,
  Calendar,
  Car,
  CheckCircle2,
  Users,
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
  Wallet,
  Clock,
  Award,
  AlertCircle,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { ModernInfiniteLoader } from '../../../shared/components/common/ModernInfiniteLoader';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  useGetUserByIdQuery,
  useUpdateUserByAdminMutation,
  useAdminResetPasswordMutation,
} from '../../auth/api/authApi';
import { useGetJobCardsQuery, useGetWorkLogsQuery, JobCardData } from '../../jobs/api/jobApi';
import { useGetWorkerSingleSheetQuery } from '../../payroll/api/payrollApi';
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

  // Paginated Work Logs state
  const [logSearch, setLogSearch] = useState('');
  const [debouncedLogSearch, setDebouncedLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logRawItems, setLogRawItems] = useState<any[]>([]);
  const [logHasMore, setLogHasMore] = useState(false);
  const logSentinelRef = useRef<HTMLDivElement | null>(null);

  // Paginated Vehicles state
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [debouncedVehicleSearch, setDebouncedVehicleSearch] = useState('');
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehicleJobs, setVehicleJobs] = useState<JobCardData[]>([]);
  const [vehicleHasMore, setVehicleHasMore] = useState(false);
  const [baseVehicleTotal, setBaseVehicleTotal] = useState(0);
  const vehicleSentinelRef = useRef<HTMLDivElement | null>(null);

  // Modals & form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLogSearch(logSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [logSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedVehicleSearch(vehicleSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [vehicleSearch]);

  const lastLogSearchRef = useRef(`${id}::${debouncedLogSearch}`);
  useEffect(() => {
    const k = `${id}::${debouncedLogSearch}`;
    if (lastLogSearchRef.current !== k) {
      lastLogSearchRef.current = k;
      setLogPage(1);
      setLogRawItems([]);
      setLogHasMore(false);
    }
  }, [id, debouncedLogSearch]);

  const lastVehicleSearchRef = useRef(`${id}::${debouncedVehicleSearch}`);
  useEffect(() => {
    const k = `${id}::${debouncedVehicleSearch}`;
    if (lastVehicleSearchRef.current !== k) {
      lastVehicleSearchRef.current = k;
      setVehiclePage(1);
      setVehicleJobs([]);
      setVehicleHasMore(false);
    }
  }, [id, debouncedVehicleSearch]);

  // Queries
  const { data: userResponse, isLoading: isUsersLoading } = useGetUserByIdQuery(id || '', { skip: !id });
  const staffMember: User | undefined = userResponse?.data;

  const isWorker = staffMember?.role === 'WORKER';
  const { data: payrollSheetData } = useGetWorkerSingleSheetQuery(
    { workerId: id || '', includeSettledHistory: false },
    { skip: !id || !isWorker }
  );
  const payrollKpis = payrollSheetData?.data?.kpis;
  const payrollWorker = payrollSheetData?.data?.worker;

  // Overview logs sample + period counter
  const { data: overviewLogsData } = useGetWorkLogsQuery(
    { page: 1, limit: 25, workerId: id, timeframe: 'all' },
    { skip: !id }
  );
  const { data: periodLogsData } = useGetWorkLogsQuery(
    { page: 1, limit: 1, workerId: id, timeframe },
    { skip: !id || timeframe === 'all' }
  );

  // Server-paginated work logs for Work Logs tab
  const {
    currentData: logsPageData,
    isLoading: isLogsLoading,
    isFetching: isLogsFetching,
  } = useGetWorkLogsQuery(
    { page: logPage, limit: 20, workerId: id, q: debouncedLogSearch || undefined, timeframe: 'all' },
    { skip: !id || activeTab !== 'WORK_LOGS' }
  );

  // Server-paginated vehicles handled
  const {
    currentData: vehiclesPageData,
    isLoading: isVehiclesLoading,
    isFetching: isVehiclesFetching,
  } = useGetJobCardsQuery(
    { page: vehiclePage, limit: 12, workerId: id, search: debouncedVehicleSearch || undefined, paginated: true },
    { skip: !id }
  );

  useEffect(() => {
    const resp = logsPageData?.data;
    if (!resp?.pagination || resp.pagination.page !== logPage) return;
    const incoming = resp.logs || [];
    setLogHasMore(Boolean(resp.pagination.hasMore));
    setLogRawItems((prev) => {
      if (logPage === 1) return incoming;
      const seen = new Set(prev.map((t) => t.id || t._id));
      return [...prev, ...incoming.filter((t) => !seen.has(t.id || t._id))];
    });
  }, [logsPageData, logPage]);

  useEffect(() => {
    const resp = vehiclesPageData?.data as any;
    if (!resp?.pagination || resp.pagination.page !== vehiclePage) return;
    if (!debouncedVehicleSearch) {
      setBaseVehicleTotal(resp.pagination.total || 0);
    }
    const incoming: JobCardData[] = resp.jobs || [];
    setVehicleHasMore(Boolean(resp.pagination.hasMore));
    setVehicleJobs((prev) => {
      if (vehiclePage === 1) return incoming;
      const seen = new Set(prev.map((j) => j.id || j._id));
      return [...prev, ...incoming.filter((j) => !seen.has(j.id || j._id))];
    });
  }, [vehiclesPageData, vehiclePage, debouncedVehicleSearch]);

  useEffect(() => {
    if (activeTab !== 'WORK_LOGS') return;
    const node = logSentinelRef.current;
    if (!node || !logHasMore || isLogsFetching) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLogPage((p) => p + 1);
      },
      { rootMargin: '250px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, logHasMore, isLogsFetching, logRawItems.length]);

  useEffect(() => {
    if (activeTab !== 'VEHICLES') return;
    const node = vehicleSentinelRef.current;
    if (!node || !vehicleHasMore || isVehiclesFetching) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVehiclePage((p) => p + 1);
      },
      { rootMargin: '250px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, vehicleHasMore, isVehiclesFetching, vehicleJobs.length]);

  const [updateUserByAdmin, { isLoading: isUpdatingUser }] = useUpdateUserByAdminMutation();
  const [adminResetPassword, { isLoading: isResettingPassword }] = useAdminResetPasswordMutation();

  const staffNameLower = (staffMember?.name || '').toLowerCase().trim();
  const mapTaskToWorkLog = useMemo(() => {
    return (t: any): StaffWorkLog => {
      const job = t.jobCardId && typeof t.jobCardId === 'object' ? t.jobCardId : {};
      const jobId = job.id || job._id || (typeof t.jobCardId === 'string' ? t.jobCardId : '');
      const compIso = t.completedAt || t.updatedAt || t.createdAt;
      const startIso = job.createdAt || t.createdAt || compIso;
      const durationMins = compIso
        ? Math.max(5, Math.round((new Date(compIso).getTime() - new Date(startIso).getTime()) / 60000))
        : 5;
      const partnerList = (t.partners || t.partnerMechanics || []) as any[];
      const isShared = Boolean(t.isShared || partnerList.length > 0);
      const partnerNames = partnerList
        .map((p: any) => p?.name || 'Partner')
        .filter((name: string) => name.toLowerCase().trim() !== staffNameLower);

      return {
        taskId: t.id || t._id || String(Math.random()),
        taskTitle: t.title || 'Completed Task',
        vehicleName: job.vehicleName || 'Vehicle',
        vehicleNumber: job.vehicleNumber || 'N/A',
        vehicleColor: job.vehicleColor,
        customerName: job.customerName,
        jobId,
        completedAt: compIso,
        completedAtFormatted: formatAuditDate(compIso),
        isShared,
        partnerNames,
        durationMinutes: durationMins,
      };
    };
  }, [staffNameLower]);

  const staffWorkLogs: StaffWorkLog[] = useMemo(() => {
    return (overviewLogsData?.data?.logs || []).map(mapTaskToWorkLog);
  }, [overviewLogsData, mapTaskToWorkLog]);

  const searchedLogs: StaffWorkLog[] = useMemo(() => {
    return logRawItems.map(mapTaskToWorkLog);
  }, [logRawItems, mapTaskToWorkLog]);

  const searchedVehicles = useMemo(() => {
    const sId = staffMember?.id || (staffMember as any)?._id || id || '';
    return vehicleJobs.map((job) => {
      const tasks = job.tasks || [];
      const totalJobTasks = tasks.length;
      const completedJobTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
      const tasksDoneByStaff = tasks.filter((t: any) => {
        if (t.status !== 'COMPLETED') return false;
        const cId = t.completedBy?.id || t.completedBy?._id || (typeof t.completedBy === 'string' ? t.completedBy : '');
        const cName = t.completedBy?.name?.toLowerCase().trim() || '';
        const partners = t.partners || t.partnerMechanics || [];
        const isPartner = partners.some((p: any) => {
          const pId = p?.id || p?._id || (typeof p === 'string' ? p : '');
          const pName = p?.name?.toLowerCase().trim() || '';
          return pId === sId || (staffNameLower && pName === staffNameLower);
        });
        return cId === sId || (staffNameLower && cName === staffNameLower) || isPartner;
      }).length;
      return {
        job,
        tasksDoneByStaff: tasksDoneByStaff || 1,
        totalJobTasks,
        completedJobTasks,
      };
    });
  }, [vehicleJobs, staffMember, id, staffNameLower]);

  // Telemetry Aggregates
  const totalTasksCompleted = overviewLogsData?.data?.pagination?.total ?? staffWorkLogs.length;
  const soloTasksCompleted = staffWorkLogs.filter((l) => !l.isShared).length;
  const sharedTasksCompleted = staffWorkLogs.filter((l) => l.isShared).length;
  const totalVehiclesCount = baseVehicleTotal || (vehiclesPageData?.data as any)?.pagination?.total || vehicleJobs.length;
  const periodTasksCount =
    timeframe === 'all' ? totalTasksCompleted : (periodLogsData?.data?.pagination?.total ?? staffWorkLogs.length);

  const avgMinutesPerTask = staffWorkLogs.length > 0
    ? Math.round(staffWorkLogs.reduce((acc, l) => acc + l.durationMinutes, 0) / staffWorkLogs.length)
    : 0;

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

  if (isUsersLoading) {
    return (
      <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col">
        <div className="glass-ambient-glow" aria-hidden="true" />
        <Navbar glass />
        <main className="app-container flex-1 py-8">
          <PageShimmer label="Loading staff telemetry & logs..." cards={4} />
        </main>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col">
        <div className="glass-ambient-glow" aria-hidden="true" />
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
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            ← Back to Staff
          </button>
        </main>
      </div>
    );
  }

  const staffId = staffMember.id || (staffMember as any)._id;
  const isOnline = !!staffMember.isOnline;
  const isBlocked = staffMember.status === 'BLOCKED';
  const isSelf = staffId === currentAuthId;
  const isWorkerRole = staffMember.role === 'WORKER';

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-3 sm:py-4 pb-36 sm:pb-40 md:pb-16 space-y-3 sm:space-y-4">
        {/* ── 1. UNIFIED PAGE HEADER ── */}
        <PageHeader
          backTo="/users"
          title={staffMember.name}
          description={
            <span className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">ID: #{staffId.slice(-6)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Activity className="w-3 h-3" />
                {formatLastSeen(staffMember.lastSeen || staffMember.lastLoginAttempt)}
              </span>
            </span>
          }
          icon={
            staffMember.profileImageUrl ? (
              <img
                src={staffMember.profileImageUrl}
                alt={staffMember.name}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                {staffMember.name?.charAt(0)?.toUpperCase()}
              </div>
            )
          }
          badge={
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                  staffMember.role === 'ADMIN'
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {staffMember.role}
              </span>
              {isBlocked ? (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                  Blocked
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{isOnline ? 'Online' : 'Active'}</span>
                </span>
              )}
              {isWorkerRole && (
                <span className="hidden xs:inline-flex text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  {(staffMember.dailyWage || payrollWorker?.dailyWage || 0) > 0
                    ? `₹${staffMember.dailyWage || payrollWorker?.dailyWage}/day`
                    : 'Wage Not Decided'}
                </span>
              )}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/payroll/${staffId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Payroll</span> Ledger
              </button>
              <AnimatedThemeToggle variant="icon-only" />
            </div>
          }
        />

        {/* ── 2. HERO PROFILE COMMAND CARD ── */}
        <div className="p-4 sm:p-5 rounded-2xl glass-modern-card border-slate-200/80 dark:border-white/10 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Avatar with photo & vital contact meta */}
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500/20 to-purple-500/20 border-2 border-white/80 dark:border-white/10 flex items-center justify-center font-black text-2xl text-slate-800 dark:text-white shadow-xs">
                  {staffMember.profileImageUrl ? (
                    <img
                      src={staffMember.profileImageUrl}
                      alt={staffMember.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{staffMember.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0f1117] ${
                    isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-slate-400'
                  }`}
                  title={isOnline ? 'Active Online' : 'Offline'}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    <span>{staffMember.name}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  </h1>
                </div>

                <div className="flex items-center gap-2.5 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                  <a
                    href={`tel:${staffMember.mobile}`}
                    className="flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span>{staffMember.mobile || 'No Mobile Registered'}</span>
                  </a>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                    <span>Since {formatAuditDate(staffMember.createdAt).split(' · ')[0]}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditName(staffMember.name);
                  setEditMobile(staffMember.mobile || '');
                  setIsEditingProfile(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95 flex items-center gap-1.5 shadow-2xs"
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
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95 flex items-center gap-1.5 shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-sky-500" />
                <span>Password</span>
              </button>

              <button
                type="button"
                disabled={isSelf}
                onClick={handleToggleBlockStatus}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition active:scale-95 flex items-center gap-1.5 disabled:opacity-40 shadow-2xs ${
                  isBlocked
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border-transparent text-slate-800 dark:text-white hover:text-rose-500'
                }`}
                title={isSelf ? 'Cannot block your own account' : isBlocked ? 'Unblock Staff' : 'Block Staff'}
              >
                {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isBlocked ? 'Unblock' : 'Block'}</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Role: <strong className="text-slate-900 dark:text-white">{staffMember.role}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Tasks: <strong className="text-slate-900 dark:text-white">{totalTasksCompleted} completed</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Vehicles: <strong className="text-slate-900 dark:text-white">{totalVehiclesCount} handled</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Pace: <strong className="text-slate-900 dark:text-white">{avgMinutesPerTask}m / task</strong></span>
            </div>
          </div>
        </div>

        {/* ── 3. FOUR KPI METRICS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                Tasks Completed
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              <NumberTicker value={totalTasksCompleted} />
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              {soloTasksCompleted} solo • {sharedTasksCompleted} co-work
            </p>
          </div>

          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                Collaborative
              </span>
              <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 tracking-tight">
              <NumberTicker value={sharedTasksCompleted} />
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              {totalTasksCompleted > 0 ? Math.round((sharedTasksCompleted / totalTasksCompleted) * 100) : 0}% co-work ratio
            </p>
          </div>

          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                Vehicles Serviced
              </span>
              <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Car className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-sky-600 dark:text-sky-400 tracking-tight">
              <NumberTicker value={totalVehiclesCount} />
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              unique job cards handled
            </p>
          </div>

          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                Avg Task Speed
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              {avgMinutesPerTask}<span className="text-sm font-semibold text-slate-400">m</span>
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              turnaround pace
            </p>
          </div>
        </div>

        {/* ── 4. MODERN SEGMENTED TABS ── */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-none shadow-2xs">
          {[
            { id: 'OVERVIEW', label: 'Performance Analytics', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'WORK_LOGS', label: `Work Logs (${totalTasksCompleted})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'VEHICLES', label: `Vehicles (${totalVehiclesCount})`, icon: <Car className="w-3.5 h-3.5" /> },
            { id: 'SECURITY', label: 'Security & Access', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 5. TAB CONTENT PANELS ── */}
        <div className="space-y-3">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-3">
              {/* Worker Current Payroll Cycle Snapshot */}
              {isWorker && payrollKpis && (
                <div
                  onClick={() => navigate(`/payroll/${id}`)}
                  className="p-4 sm:p-5 rounded-2xl glass-modern-card border border-amber-500/30 hover:border-amber-500/50 space-y-3 shadow-xs cursor-pointer transition-all duration-150 active:scale-[0.99] group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Current Cycle Payroll Snapshot</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                            Live
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Wage rate:{' '}
                          {(payrollWorker?.dailyWage || staffMember?.dailyWage || 0) > 0 ? (
                            <strong className="text-slate-800 dark:text-slate-200">
                              ₹{payrollWorker?.dailyWage || staffMember?.dailyWage}/day
                              {payrollWorker?.firstPayrollDate ? ` (From ${payrollWorker.firstPayrollDate})` : ''}
                            </strong>
                          ) : (
                            <strong className="text-amber-600 dark:text-amber-400">Not Decided Yet</strong>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/payroll/${id}`);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition active:scale-95"
                    >
                      <span>Open Full Ledger & Timesheet</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Unsettled Dues</span>
                      <span className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                        ₹{Number(payrollKpis.netPayable || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Attendance Days</span>
                      <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                        {payrollKpis.unsettledWorkingDays ?? payrollKpis.totalWorkingDays ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Advances Taken</span>
                      <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                        -₹{Number(payrollKpis.totalUnsettledAdvances || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Approved OT</span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        +{payrollKpis.totalApprovedOtHours || 0}h (₹{Number(payrollKpis.totalApprovedOtAmount || 0).toLocaleString('en-IN')})
                      </span>
                    </div>
                  </div>

                  {payrollKpis.advanceOverhang && payrollKpis.advanceOverhang > 0 ? (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        Advance Overhang: <strong>-₹{Number(payrollKpis.advanceOverhang).toLocaleString('en-IN')}</strong> will carry forward to next cycle.
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Timeframe Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl glass-modern-card shadow-2xs">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Filter Telemetry Period:</span>
                </span>
                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
                        timeframe === tf.key
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe Summary Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl glass-modern-card shadow-2xs space-y-1">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Completed in Period
                  </p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {periodTasksCount}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">tasks delivered</p>
                </div>

                <div className="p-3.5 rounded-2xl glass-modern-card shadow-2xl space-y-1">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Turnaround Pace
                  </p>
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {avgMinutesPerTask}m
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">average minutes per task</p>
                </div>

                <div className="p-3.5 rounded-2xl glass-modern-card shadow-2xs space-y-1.5">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Collaboration Split
                  </p>
                  <div className="h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 flex">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${totalTasksCompleted > 0 ? (soloTasksCompleted / totalTasksCompleted) * 100 : 0}%`,
                      }}
                      title={`Solo: ${soloTasksCompleted}`}
                    />
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${totalTasksCompleted > 0 ? (sharedTasksCompleted / totalTasksCompleted) * 100 : 0}%`,
                      }}
                      title={`Co-work: ${sharedTasksCompleted}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Solo: {soloTasksCompleted}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Co-work: {sharedTasksCompleted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Completed Tasks Mini-Feed */}
              <div className="p-4 sm:p-5 rounded-2xl glass-modern-card shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Recent Completed Tasks</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('WORK_LOGS')}
                    className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all ({totalTasksCompleted})</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {staffWorkLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No completed tasks recorded yet.</p>
                ) : (
                  staffWorkLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.taskId}
                      onClick={() => navigate(`/jobs/${log.jobId}`)}
                      className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 hover:border-amber-400/50 transition cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {log.taskTitle}
                          </p>
                          {log.isShared ? (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                              Shared
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              Solo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {log.vehicleName} <span className="opacity-75">({log.vehicleNumber})</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                          {log.durationMinutes}m
                        </span>
                        <p className="text-[10px] font-mono text-slate-400">
                          {log.completedAtFormatted.split(' · ')[0]}
                        </p>
                      </div>
                    </div>
                  ))
                )}
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
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition shadow-2xs"
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

              {isLogsLoading && logPage === 1 ? (
                <PageShimmer label="Loading logs..." cards={3} />
              ) : !isLogsFetching && searchedLogs.length === 0 ? (
                <div className="py-12 text-center rounded-2xl glass-modern-card space-y-1.5">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No work logs</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    No matches
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchedLogs.map((log) => (
                    <div
                      key={log.taskId}
                      onClick={() => navigate(`/jobs/${log.jobId}`)}
                      className="p-3 sm:p-4 rounded-xl glass-modern-card hover:border-amber-400/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition cursor-pointer shadow-2xs active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
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
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="text-slate-900 dark:text-white font-bold">{log.vehicleName}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-bold text-[10px]">
                              {log.vehicleNumber}
                            </span>
                            {log.customerName && (
                              <>
                                <span>•</span>
                                <span>Customer: {log.customerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                        <div className="text-left sm:text-right font-mono">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                            {log.durationMinutes}m duration
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {log.completedAtFormatted}
                          </p>
                        </div>
                        <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                  <ModernInfiniteLoader
                    sentinelRef={logSentinelRef}
                    hasMore={logHasMore}
                    isLoading={isLogsFetching && logPage > 1}
                    totalCount={searchedLogs.length}
                    entityName="logs"
                  />
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
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition shadow-2xs"
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

              {isVehiclesLoading && vehiclePage === 1 ? (
                <PageShimmer label="Loading vehicles..." cards={4} />
              ) : !isVehiclesFetching && searchedVehicles.length === 0 ? (
                <div className="py-12 text-center rounded-2xl glass-modern-card space-y-1.5">
                  <Car className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No vehicles found</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    No matches
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchedVehicles.map(({ job, tasksDoneByStaff, totalJobTasks, completedJobTasks }) => {
                    const jobId = job.id || job._id;
                    const progress = totalJobTasks > 0 ? Math.round((completedJobTasks / totalJobTasks) * 100) : 0;
                    return (
                      <div
                        key={jobId}
                        onClick={() => navigate(`/jobs/${jobId}`)}
                        className="p-4 rounded-2xl glass-modern-card hover:border-amber-400/50 flex flex-col justify-between gap-3 transition cursor-pointer shadow-2xs active:scale-[0.99] group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {job.thumbnailUrl ? (
                            <img
                              src={job.thumbnailUrl}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-black/5 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                              <Car className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition">
                                {job.vehicleName}
                              </h4>
                            </div>
                            <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              {job.vehicleNumber}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {job.customerName ? `Owner: ${job.customerName}` : 'Service Bay'}
                              {job.vehicleColor ? ` • ${job.vehicleColor}` : ''}
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
                      </div>
                    );
                  })}
                  </div>
                  <ModernInfiniteLoader
                    sentinelRef={vehicleSentinelRef}
                    hasMore={vehicleHasMore}
                    isLoading={isVehiclesFetching && vehiclePage > 1}
                    totalCount={searchedVehicles.length}
                    entityName="vehicles"
                  />
                </>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY & AUDIT INFO */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-3">
              <div className="p-4 sm:p-5 rounded-2xl glass-modern-card shadow-2xs space-y-4">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Account Security & Authorization</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
                    <p className="text-slate-400 uppercase text-[10px] font-bold">Account Role</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{staffMember.role}</p>
                    <p className="text-[10px] text-slate-500">System authorization level</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
                    <p className="text-slate-400 uppercase text-[10px] font-bold">Account Status</p>
                    <p className={`text-sm font-black ${isBlocked ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {staffMember.status || 'ACTIVE'}
                    </p>
                    <p className="text-[10px] text-slate-500">Access permission status</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
                    <p className="text-slate-400 uppercase text-[10px] font-bold">Account Registered</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatAuditDate(staffMember.createdAt)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
                    <p className="text-slate-400 uppercase text-[10px] font-bold">Last Activity Timestamp</p>
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
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsEditingProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  Edit Staff Details
                </h3>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-mono">
                  {actionErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingUser}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs cursor-pointer disabled:opacity-50"
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsResetModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  Reset Staff Password
                </h3>
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

              <form onSubmit={handleAdminResetPassword} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs cursor-pointer disabled:opacity-50"
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
