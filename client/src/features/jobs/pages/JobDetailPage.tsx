import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobCardByIdQuery,
  useSetTaskStatusMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
  useToggleTaskPinMutation,
  useToggleJobPinMutation,
  useVerifyJobCardMutation,
  JobCardData,
  TaskItem,
} from '../../jobs/api/jobApi';
import { useGetAllUsersQuery } from '../../auth/api/authApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { ConfirmationModal } from '../../../shared/components/common/ConfirmationModal';
import { PinJobModal } from '../../../shared/components/jobCard/PinJobModal';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { MagicTabs } from '../../../shared/components/magicui/MagicTabs';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { SlideToSignoff } from '../components/SlideToSignoff';
import { triggerSubTaskConfetti, triggerVehicleReadyConfetti } from '../../../shared/utils/confetti';
import { playCompletionSound, playReopenSound } from '../../../shared/utils/completionSound';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Trash2,
  Check,
  Loader2,
  Palette,
  Users,
  X,
  Edit2,
  Phone,
  MessageCircle,
  User as UserIcon,
  Pin,
  ChevronDown,
  Calendar,
  Camera,
  History,
  Sparkles,
  UserPlus,
  AlertTriangle,
  Car,
  Globe,
  ShieldCheck,
  Mail,
  Wrench,
} from 'lucide-react';
import { getDeliveryStatusInfo } from '../../../shared/utils/dateUtils';
import { ProgressBarBeam } from '../../../shared/components/magicui/AnimatedBeam';

type TaskFilterType = 'ALL' | 'PENDING' | 'COMPLETED';

const formatTaskDateTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} ${month} ${time}`;
};

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [errorMessage, setErrorMessage] = useState('');
  const [activeDetailView, setActiveDetailView] = useState<'CHECKLIST' | 'ACTIONS'>('CHECKLIST');
  const [statusFilter, setStatusFilter] = useState<TaskFilterType>('ALL');
  const [activityTask, setActivityTask] = useState<TaskItem | null>(null);

  // Complete Sub-Task Modal State
  const [completeTaskModal, setCompleteTaskModal] = useState<{
    isOpen: boolean;
    task: TaskItem | null;
    isShared: boolean;
    partnerIds: string[];
  }>({
    isOpen: false,
    task: null,
    isShared: false,
    partnerIds: [],
  });

  // Generic Reopen & Delete Modals State
  const [confirmReopenModal, setConfirmReopenModal] = useState<{
    isOpen: boolean;
    task: TaskItem | null;
  }>({
    isOpen: false,
    task: null,
  });

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: 'TASK' | 'JOB_CARD';
    taskId?: string;
  }>({
    isOpen: false,
    type: 'TASK',
  });

  // Pin & Edit Job Modal States
  const [isPinJobModalOpen, setIsPinJobModalOpen] = useState(false);
  const [isExpandedHeader, setIsExpandedHeader] = useState(false);

  // API Hooks
  const { data: jobResponse, isLoading, isError, refetch } = useGetJobCardByIdQuery(id!, { skip: !id });
  const { data: allUsersResponse } = useGetAllUsersQuery();
  const [setTaskStatus] = useSetTaskStatusMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [deleteJobCard] = useDeleteJobCardMutation();
  const [toggleJobPin] = useToggleJobPinMutation();
  const [toggleTaskPin] = useToggleTaskPinMutation();
  const [verifyJobCard, { isLoading: isVerifying }] = useVerifyJobCardMutation();

  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optimisticPins, setOptimisticPins] = useState<Record<string, boolean>>({});

  const currentJob: JobCardData | undefined = jobResponse?.data;
  const currentUserId = user?.id || (user as any)?._id;

  const allWorkers = (allUsersResponse?.data || []).filter(
    (u: any) => (u.id || u._id) !== currentUserId
  );

  const tasks = currentJob?.tasks || [];
  const completedTasks = tasks.filter((t: TaskItem) => t.status === 'COMPLETED');
  const completedCount = completedTasks.length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isAllCompleted = totalTasks > 0 && completedCount === totalTasks;

  const isMatchingUserId = (p: any, targetId: any): boolean => {
    if (!p || !targetId) return false;
    const pStr = typeof p === 'string' ? p : p?._id ? p._id.toString() : p?.id ? p.id.toString() : p.toString();
    const targetStr = typeof targetId === 'string' ? targetId : targetId?._id ? targetId._id.toString() : targetId?.id ? targetId.id.toString() : targetId.toString();
    return pStr.trim().toLowerCase() === targetStr.trim().toLowerCase();
  };

  const isJobPinnedForMe =
    Array.isArray(currentJob?.pinnedBy) &&
    currentJob.pinnedBy.some((p: any) => isMatchingUserId(p, currentUserId));
  const isJobPinnedForAll = !!currentJob?.isPinnedForAll;
  const isPinned = isJobPinnedForAll || isJobPinnedForMe;

  const deliveryInfo = getDeliveryStatusInfo(currentJob?.expectedDeliveryDate, isAllCompleted);

  const filteredTasks = tasks.filter((t: TaskItem) => {
    if (statusFilter === 'PENDING') return t.status === 'OPEN';
    if (statusFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a: TaskItem, b: TaskItem) => {
    const aId = a.id || a._id!;
    const bId = b.id || b._id!;
    const aPinned = optimisticPins[aId] !== undefined ? optimisticPins[aId] : !!a.isPinned;
    const bPinned = optimisticPins[bId] !== undefined ? optimisticPins[bId] : !!b.isPinned;

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  const handleToggleJobPin = async (jobCardId: string, mode: 'ALL' | 'ME') => {
    try {
      await toggleJobPin({ jobCardId, mode }).unwrap();
      refetch();
      setIsPinJobModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to update job pin.');
    }
  };

  const handleToggleTaskPin = async (taskId: string, currentVal: boolean) => {
    setOptimisticPins((prev) => ({ ...prev, [taskId]: !currentVal }));
    try {
      await toggleTaskPin({ taskId }).unwrap();
    } catch {
      setOptimisticPins((prev) => ({ ...prev, [taskId]: currentVal }));
    }
  };

  const promptTaskStatusChange = (task: TaskItem) => {
    if (task.status === 'COMPLETED') {
      setConfirmReopenModal({ isOpen: true, task });
    } else {
      setCompleteTaskModal({
        isOpen: true,
        task,
        isShared: false,
        partnerIds: [],
      });
    }
  };

  const executeCompleteTask = async () => {
    const task = completeTaskModal.task;
    if (!task) return;

    const taskId = task.id || task._id!;
    setUpdatingTaskId(taskId);
    setIsCompletingTask(true);

    try {
      await setTaskStatus({
        taskId,
        action: 'COMPLETE',
        partnerIds: completeTaskModal.isShared ? completeTaskModal.partnerIds : undefined,
        currentUserName: user?.name,
        currentUserId: user?.id,
      }).unwrap();

      playCompletionSound();
      triggerSubTaskConfetti();

      if (completedCount + 1 === totalTasks) {
        setTimeout(() => triggerVehicleReadyConfetti(), 300);
      }
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to complete task.');
    } finally {
      setUpdatingTaskId(null);
      setIsCompletingTask(false);
      setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] });
    }
  };

  const executeReopenTask = async () => {
    const task = confirmReopenModal.task;
    if (!task) return;

    const taskId = task.id || task._id!;
    setUpdatingTaskId(taskId);

    try {
      await setTaskStatus({
        taskId,
        action: 'REOPEN',
        currentUserName: user?.name,
        currentUserId: user?.id,
      }).unwrap();
      playReopenSound();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to reopen task.');
    } finally {
      setUpdatingTaskId(null);
      setConfirmReopenModal({ isOpen: false, task: null });
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      if (confirmDeleteModal.type === 'JOB_CARD' && currentJob) {
        await deleteJobCard({ jobCardId: currentJob.id || currentJob._id! }).unwrap();
        navigate('/jobs');
      } else if (confirmDeleteModal.type === 'TASK' && confirmDeleteModal.taskId) {
        await deleteTask({ taskId: confirmDeleteModal.taskId }).unwrap();
      }
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Delete operation failed.');
    } finally {
      setIsDeleting(false);
      setConfirmDeleteModal({ isOpen: false, type: 'TASK' });
    }
  };

  const handleVerify = async () => {
    if (!currentJob) return;
    try {
      await verifyJobCard({ jobCardId: currentJob.id || currentJob._id! }).unwrap();
      playCompletionSound();
      triggerVehicleReadyConfetti();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Unable to verify this job card.');
      throw err;
    }
  };

  const getGarageDuration = () => {
    if (!currentJob?.createdAt) return '—';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(currentJob.createdAt).getTime()) / 60000));
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  // Live points split calculations for completion modal
  const totalParticipating = 1 + (completeTaskModal.isShared ? completeTaskModal.partnerIds.length : 0);
  const pointsPerWorker = (1 / totalParticipating).toFixed(2);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col transition-colors duration-200">
        <Navbar glass />
        <main className="app-container relative z-10 flex-1 py-6 pb-32">
          <div className="space-y-4">
            <div className="h-48 rounded-3xl bg-slate-200/60 dark:bg-white/[0.03] animate-pulse" />
            <div className="h-12 rounded-2xl bg-slate-200/60 dark:bg-white/[0.03] animate-pulse" />
            <div className="h-64 rounded-3xl bg-slate-200/60 dark:bg-white/[0.03] animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !currentJob) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col transition-colors duration-200">
        <Navbar glass />
        <main className="app-container relative z-10 flex-1 py-20 text-center space-y-4">
          <div className="max-w-md mx-auto relative overflow-hidden rounded-3xl bg-white/80 dark:bg-white/[0.035] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-8 shadow-xl space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Job Card Not Found
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              The requested vehicle record could not be found or may have been deleted.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="mt-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase rounded-xl hover:opacity-95 shadow-md shadow-amber-400/20 active:scale-95 transition cursor-pointer"
            >
              ← Back to Active Jobs
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col overflow-x-clip selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* ── TOP NAV / ACTION BAR ── */}
        <PageHeader
          backTo="/jobs"
          title={currentJob.vehicleName || 'Vehicle'}
          count={currentJob.vehicleNumber}
          actions={
            <div className="flex items-center gap-1.5">
            {/* Pin Action */}
            <button
              type="button"
              onClick={() => setIsPinJobModalOpen(true)}
              className={`p-2 rounded-xl border transition active:scale-90 cursor-pointer flex items-center gap-1.5 ${
                isPinned
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'glass-ghost-btn text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Pin Priority / Garage Global Pin"
            >
              {isJobPinnedForAll ? (
                <Globe className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current text-amber-500' : ''}`} />
              )}
              <span className="text-[11px] font-mono font-bold hidden md:inline">
                {isJobPinnedForAll ? 'Garage Pin' : isJobPinnedForMe ? 'Pinned' : 'Pin'}
              </span>
            </button>

            {/* Photo Action */}
            <button
              type="button"
              onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
              className="p-2 rounded-xl glass-ghost-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition cursor-pointer flex items-center gap-1.5"
              title="Vehicle Inspection Photos"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono font-bold hidden md:inline">Photos</span>
            </button>

            {/* Edit Action (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate(`/jobs/edit/${currentJob.id || currentJob._id}`)}
                className="p-2 rounded-xl glass-gold-btn text-slate-950 shadow-md active:scale-90 transition cursor-pointer flex items-center gap-1.5"
                title="Edit Job Card"
              >
                <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[11px] font-mono font-black hidden md:inline">Edit</span>
              </button>
            )}

            {/* Delete Job Action (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 active:scale-90 transition cursor-pointer"
                title="Delete Job Card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      />

        {/* ── VEHICLE HERO ── */}
        <section className="glass-head-card relative overflow-hidden rounded-3xl p-4 sm:p-5 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_44px_-8px_rgba(0,0,0,0.7)]">
          {/* Top edge accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 dark:via-amber-400/40 to-transparent pointer-events-none" />
          {/* Ambient orbs */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-amber-500/[0.08] dark:bg-amber-400/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-cyan-500/[0.07] dark:bg-cyan-400/[0.05] blur-3xl pointer-events-none" />
          {isPinned && <BorderBeam size={220} duration={7} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />}

          <div className="relative z-10 space-y-2.5">

            {/* Row 1 — Registration + Color + Status (all in one line on mobile) */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: plate + color */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] sm:text-xs font-mono font-black text-slate-900 dark:text-amber-300 bg-amber-400/20 dark:bg-amber-400/10 border border-amber-400/40 px-2.5 py-0.5 rounded-lg tracking-wider shrink-0">
                  {currentJob.vehicleNumber}
                </span>
                {currentJob.vehicleColor && (
                  <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                    <Palette className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span className="capitalize truncate max-w-[80px]">{currentJob.vehicleColor}</span>
                  </span>
                )}
              </div>

              {/* Right: status pill — always visible, compact */}
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wide border shrink-0 ${
                isAllCompleted
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-400/10 border-amber-400/30 text-amber-800 dark:text-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAllCompleted ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                <span>
                  {isAllCompleted
                    ? (currentJob.verifiedAt ? 'Verified' : 'Sign-Off')
                    : 'In Service Bay'}
                </span>
              </div>
            </div>

            {/* Overdue alert — only shown when overdue, full width, subtle */}
            {deliveryInfo.isOverdue && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/8 dark:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-pulse">
                <AlertTriangle className="w-3 h-3 shrink-0 stroke-[2.5]" />
                <span>Overdue — {deliveryInfo.shortLabel}</span>
              </div>
            )}

            {/* Row 2 — Avatar + Vehicle Name + Ops */}
            <div className="flex items-center gap-3 pt-0.5">
              <div className="relative shrink-0">
                {currentJob.thumbnailUrl ? (
                  <img
                    src={currentJob.thumbnailUrl}
                    alt={currentJob.vehicleName}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200/80 dark:border-white/10 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                    <Car className="w-5 h-5" />
                  </div>
                )}
                {isPinned && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-xs border border-white dark:border-slate-900 text-[8px]">
                    📌
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  {currentJob.vehicleName || 'Vehicle Service'}
                </h1>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                  {totalTasks > 0 ? `${totalTasks} operations` : 'No operations yet'}
                </p>
              </div>
            </div>

            {/* Row 3 — Progress */}
            {totalTasks > 0 && (
              <div className="pt-2.5 border-t border-slate-200/50 dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {completedCount} of {totalTasks} done
                  </span>
                  <span className={`font-black text-sm ${isAllCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {progressPercent}%
                  </span>
                </div>
                <ProgressBarBeam progress={progressPercent} />
              </div>
            )}
          </div>
        </section>

        {/* ── DETAIL VIEW SUBPAGE SWITCHER (Universal MagicTabs) ── */}
        <MagicTabs
          items={[
            {
              key: 'CHECKLIST',
              label: 'Service Checklist',
              count: `${completedCount}/${totalTasks}`,
              icon: <Wrench className="w-3.5 h-3.5" />,
            },
            {
              key: 'ACTIONS',
              label: 'Client & Actions',
              icon: <UserIcon className="w-3.5 h-3.5" />,
            },
          ]}
          activeKey={activeDetailView}
          onChange={(key) => setActiveDetailView(key as 'CHECKLIST' | 'ACTIONS')}
          layoutId="job-detail-main-tab"
        />

        {/* ── CONDITIONAL SUBPAGE CONTENT ── */}
        {activeDetailView === 'ACTIONS' ? (
          /* ── SUBPAGE 2: CLIENT & VEHICLE ACTIONS ── */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Left Column: QA Verification Log + Client Contact */}
            <div className="space-y-4">
              {/* QA Sign-off Audit & Verification Log */}
              <div className="relative overflow-hidden rounded-3xl glass-modern-card p-5 sm:p-6 space-y-3.5">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/20 to-transparent pointer-events-none" />

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                      QA Sign-Off Audit
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      Inspection & Clearance Log
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    currentJob.verifiedAt
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : isAllCompleted
                      ? 'bg-amber-400/15 border-amber-400/30 text-amber-600 dark:text-amber-400 animate-pulse'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                  }`}>
                    {currentJob.verifiedAt ? 'QA Verified' : isAllCompleted ? 'Ready for Sign-Off' : 'In Progress'}
                  </span>
                </div>

                {currentJob.verifiedAt ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300 font-bold">
                          Verified & Signed Off By
                        </p>
                        <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                          <span>{currentJob.verifiedBy?.name || 'Authorized Supervisor'}</span>
                          {currentJob.verifiedBy?.role && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                              {currentJob.verifiedBy.role}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300 font-bold">
                          Timestamp
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white mt-0.5">
                          {formatTaskDateTime(currentJob.verifiedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Checklist fully inspected and vehicle cleared for customer handover.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.025] border border-slate-200/70 dark:border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Operations Status</span>
                      <span className="font-mono text-amber-500 font-black">{completedCount} / {totalTasks} Tasks</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAllCompleted
                        ? 'All operations completed. Use the slide button docked below to sign off QA inspection.'
                        : 'Complete all checklist operations to enable QA sign-off and vehicle handover.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Client & Fast Communications Hub */}
              <div className="relative overflow-hidden rounded-3xl glass-modern-card p-5 sm:p-6 space-y-4">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 dark:via-amber-400/20 to-transparent pointer-events-none" />

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                      Client Contact Info
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Direct Contact & Communications</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                    {currentJob.customerMobile ? 'Verified' : 'Walk-in'}
                  </span>
                </div>

                {/* Client Profile Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.025] border border-slate-200/70 dark:border-white/[0.05] space-y-2.5">
                  <div>
                    <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Client Name</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {currentJob.customerName || 'Walk-in Customer'}
                    </p>
                  </div>
                  {currentJob.customerMobile && (
                    <div>
                      <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Mobile Phone</p>
                      <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                        {currentJob.customerMobile}
                      </p>
                    </div>
                  )}
                  {currentJob.customerEmail && (
                    <div>
                      <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Email Address</p>
                      <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                        {currentJob.customerEmail}
                      </p>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-slate-200/60 dark:border-white/[0.06]" />

                  {/* Created By */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Card Created By</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5 truncate">
                        {currentJob.createdBy?.name || 'Unknown'}
                      </p>
                      {currentJob.createdAt && (
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatTaskDateTime(currentJob.createdAt)}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {currentJob.createdBy?.profileImageUrl ? (
                        <img
                          src={currentJob.createdBy.profileImageUrl}
                          alt={currentJob.createdBy.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-white/10"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </div>
                      )}
                      {currentJob.createdBy?.role && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/20 text-amber-700 dark:text-amber-400">
                          {currentJob.createdBy.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1-Click Fast Actions: WhatsApp, Call, Email */}
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">1-Click Fast Actions</p>
                  {currentJob.customerMobile && (
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://wa.me/${currentJob.customerMobile.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`tel:${currentJob.customerMobile}`}
                        className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
                      >
                        <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Call</span>
                      </a>
                    </div>
                  )}

                  {currentJob.customerEmail && (
                    <a
                      href={`mailto:${currentJob.customerEmail}`}
                      className="w-full py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-sky-500 shrink-0" />
                      <span className="truncate">Email {currentJob.customerEmail}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Handover & Vehicle Management Hub */}
            <div className="space-y-4">
              {/* Delivery & Timeline Card */}
              <div className="relative overflow-hidden rounded-3xl glass-modern-card p-5 sm:p-6 space-y-3">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 dark:via-amber-400/20 to-transparent pointer-events-none" />

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                      Timeline & Delivery
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Service Bay Duration</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/10 dark:bg-amber-400/15 border border-amber-400/20 text-amber-600 dark:text-amber-400">
                    Schedule
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.025] border border-slate-200/70 dark:border-white/[0.05]">
                    <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Garage Duration</p>
                    <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{getGarageDuration()}</span>
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    deliveryInfo.isOverdue
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-slate-50 dark:bg-white/[0.025] border-slate-200/70 dark:border-white/[0.05]'
                  }`}>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Target Handover</p>
                      {deliveryInfo.isOverdue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-500 stroke-[2.5]" />
                          <span>Overdue</span>
                        </span>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-black mt-0.5 truncate ${
                      deliveryInfo.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'
                    }`}>
                      {currentJob.expectedDeliveryDate
                        ? new Date(currentJob.expectedDeliveryDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Operational Actions */}
              <div className="relative overflow-hidden rounded-3xl glass-modern-card p-5 sm:p-6 space-y-4">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 dark:via-amber-400/20 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                      Vehicle Actions
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      Inspections & Controls
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-400/10 dark:bg-amber-400/15 border border-amber-400/20 text-amber-600 dark:text-amber-400">
                    Workshop Hub
                  </span>
                </div>

                {/* Actions Bento Stack */}
                <div className="space-y-2.5">
                  {/* 1. Vehicle Inspection Photos */}
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
                    className="group w-full p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/[0.07] hover:border-amber-400/40 dark:hover:border-amber-400/40 transition-all duration-200 text-left flex items-center justify-between gap-3 cursor-pointer shadow-2xs active:scale-[0.985]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors truncate">
                          Vehicle Inspection Photos
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {currentJob.thumbnailUrl ? 'Photo attached • Studio ready' : 'Capture & upload multi-angle photos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-amber-400/10 dark:bg-amber-400/15 border border-amber-400/20 text-amber-700 dark:text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors flex items-center gap-1">
                        <span>Studio</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>

                  {/* 2. Pin Priority Configuration */}
                  <button
                    type="button"
                    onClick={() => setIsPinJobModalOpen(true)}
                    className="group w-full p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/[0.07] hover:border-amber-400/40 dark:hover:border-amber-400/40 transition-all duration-200 text-left flex items-center justify-between gap-3 cursor-pointer shadow-2xs active:scale-[0.985]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs ${
                        isJobPinnedForAll
                          ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                          : isJobPinnedForMe
                          ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                      }`}>
                        <Pin className={`w-5 h-5 ${isPinned ? 'fill-current' : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors truncate">
                          Pin Priority Configuration
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {isJobPinnedForAll
                            ? 'Highlighted across all garage screens'
                            : isJobPinnedForMe
                            ? 'Pinned to your active technician view'
                            : 'Standard queue • Tap to spotlight'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                        isJobPinnedForAll
                          ? 'bg-amber-400/15 border-amber-400/30 text-amber-700 dark:text-amber-300'
                          : isJobPinnedForMe
                          ? 'bg-yellow-400/15 border-yellow-400/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                      }`}>
                        <span>{isJobPinnedForAll ? 'Garage Pin' : isJobPinnedForMe ? 'Priority Pin' : 'Configure'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>

                  {/* 3. Edit Vehicle & Job Information (Admin Only) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/edit/${currentJob.id || currentJob._id}`)}
                      className="group w-full p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/[0.07] hover:border-sky-400/40 dark:hover:border-sky-400/40 transition-all duration-200 text-left flex items-center justify-between gap-3 cursor-pointer shadow-2xs active:scale-[0.985]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Edit2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-500 dark:group-hover:text-sky-300 transition-colors truncate">
                              Edit Vehicle & Job Specs
                            </h4>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase">
                              Admin
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Update plate, color, client & delivery target
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 text-sky-600 dark:text-sky-300 group-hover:bg-sky-500 group-hover:text-white transition-colors flex items-center gap-1">
                          <span>Edit</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* 4. Danger Zone: Delete Vehicle Job Card (Admin Only) */}
                {isAdmin && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })}
                      className="group w-full p-3 rounded-2xl bg-rose-500/[0.05] hover:bg-rose-500/[0.12] border border-rose-500/20 hover:border-rose-500/40 transition-all duration-200 text-left flex items-center justify-between gap-3 cursor-pointer shadow-2xs active:scale-[0.985]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 transition-colors truncate">
                            Delete Vehicle Job Card
                          </h4>
                          <p className="text-[10px] font-mono text-rose-500/70 dark:text-rose-400/60 truncate">
                            Permanent removal • Cannot be undone
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                          Delete
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── SUBPAGE 1: SERVICE CHECKLIST (WORKBENCH) ── */
          <div className="space-y-3.5">
            {/* QA Verification Banner / Sign-off Button */}
            {currentJob.verifiedAt ? (
              <div className="p-4 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm shadow-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-300 font-mono uppercase tracking-tight">
                      Quality Assurance Passed & Signed Off
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-200/80 truncate">
                      Vehicle is verified and cleared for customer handover
                      {currentJob.verifiedBy?.name ? ` by ${currentJob.verifiedBy.name}` : ''}.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-300 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 shrink-0 hidden sm:inline">
                  Verified
                </span>
              </div>
            ) : isAllCompleted && isAdmin ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/25">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-300 uppercase tracking-tight">
                      All Service Operations Complete
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Ready for Quality Assurance inspection and manager sign-off.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Sign-off QA Inspection</span>
                </button>
              </motion.div>
            ) : null}

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Service Operations Workbench */}
            <section className="space-y-3 pt-1">
              {/* Section Header with Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white tracking-tight">
                    Service Operations
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                    {totalTasks}
                  </span>
                </div>

                {/* Filter Tabs */}
                <MagicTabs
                  items={[
                    { key: 'ALL', label: 'All Operations', count: totalTasks },
                    { key: 'PENDING', label: 'In Progress', count: totalTasks - completedCount },
                    { key: 'COMPLETED', label: 'Completed', count: completedCount },
                  ]}
                  activeKey={statusFilter}
                  onChange={(key) => setStatusFilter(key as TaskFilterType)}
                  layoutId="task-filter-tab"
                  size="sm"
                />
              </div>

              {/* Tasks Cards Deck */}
              <div className="space-y-2">
                {sortedTasks.length === 0 ? (
                  <div className="py-14 text-center rounded-3xl glass-modern-card p-6 space-y-1.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No tasks in this view</p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">All tasks in this category are clear</p>
                  </div>
                ) : (
                  sortedTasks.map((task: TaskItem) => {
                    const taskId = task.id || task._id!;
                    const isCompleted = task.status === 'COMPLETED';
                    const isPinnedTask = optimisticPins[taskId] !== undefined ? optimisticPins[taskId] : !!task.isPinned;
                    const isUpdating = updatingTaskId === taskId;
                    const completedUser = task.completedBy;
                    const partners = task.partners || [];
                    const isShared = task.isShared && partners.length > 0;

                    return (
                      <motion.div
                        key={taskId}
                        layout
                        className={`group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-200 flex items-center justify-between gap-3 glass-modern-card ${
                          isCompleted ? 'border-emerald-500/30 opacity-90' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Status Checkbox Button */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => promptTaskStatusChange(task)}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs'
                                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/20 text-transparent hover:border-amber-400 hover:text-amber-500'
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            ) : (
                              <Check className="w-4 h-4 stroke-[3]" />
                            )}
                          </button>

                          {/* Task Title & Worker Avatars / Shared Team */}
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => setActivityTask(task)}
                          >
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isCompleted ? 'line-through text-slate-400 dark:text-slate-400' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {task.title}
                            </h4>

                            {/* Completed Details: Avatar + Shared Partner Team */}
                            {isCompleted && completedUser && (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {/* Avatars Stack */}
                                <div className="flex items-center -space-x-1.5 shrink-0">
                                  {/* Primary Worker Avatar */}
                                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border-2 border-white dark:border-[#080810] flex items-center justify-center text-[9px] font-bold text-emerald-300 shadow-xs">
                                    {completedUser.profileImageUrl ? (
                                      <img src={completedUser.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      completedUser.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  {/* Shared Partner Avatars */}
                                  {partners.map((p: any, pIdx: number) => (
                                    <div
                                      key={p.id || p._id || pIdx}
                                      className="w-5 h-5 rounded-full overflow-hidden bg-amber-900 border-2 border-white dark:border-[#080810] flex items-center justify-center text-[9px] font-bold text-amber-300 shadow-xs"
                                      title={p.name}
                                    >
                                      {p.profileImageUrl ? (
                                        <img src={p.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        (p.name || 'W').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Technician Names & Split Share */}
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate">
                                  {completedUser.name}
                                  {isShared ? ` & ${partners.map((p: any) => p.name).join(', ')}` : ''}
                                </span>

                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-300">
                                  {isShared ? `${(1 / (1 + partners.length)).toFixed(2)} pts each` : '1.0 pt'}
                                </span>

                                {task.completedAt && (
                                  <span className="text-[9px] font-mono text-slate-400 truncate">
                                    • {formatTaskDateTime(task.completedAt)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Task Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* View Logs / Audit Icon */}
                          <button
                            type="button"
                            onClick={() => setActivityTask(task)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-90 cursor-pointer"
                            title="View Task Audit Logs"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Pin Task */}
                          <button
                            type="button"
                            onClick={() => handleToggleTaskPin(taskId, isPinnedTask)}
                            className={`p-1.5 rounded-lg border transition active:scale-90 cursor-pointer ${
                              isPinnedTask
                                ? 'bg-amber-400/20 border-amber-400/40 text-amber-600 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                            }`}
                            title="Pin task to top"
                          >
                            <Pin className={`w-3 h-3 ${isPinnedTask ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ── TASK ACTIVITY LOGS MODAL (Clean, Modern & Minimal) ── */}
      <AnimatePresence>
        {activityTask && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md"
            onClick={() => setActivityTask(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-[#0b0b14] border border-white/[0.09] shadow-2xl p-5 sm:p-5.5 space-y-4 overflow-hidden"
            >
              <BorderBeam size={180} duration={8} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={0.75} />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">Task Activity</h3>
                    <p className="text-[10px] font-mono text-slate-400">Audit trail & staff breakdown</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivityTask(null)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition active:scale-90"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Title & Status Hero */}
              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{activityTask.title}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      activityTask.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                    }`}
                  >
                    {activityTask.status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'}
                  </span>
                  {activityTask.isShared && (
                    <span className="text-[9px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      <Users className="w-2.5 h-2.5" /> Shared
                    </span>
                  )}
                  {activityTask.completedAt && (
                    <span className="text-[9px] font-mono text-slate-400">
                      • {formatTaskDateTime(activityTask.completedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned Staff Breakdown */}
              {activityTask.completedBy && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Technicians</p>
                  
                  <div className="space-y-1.5">
                    {/* Primary Lead */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-emerald-400/50 flex items-center justify-center text-[10px] font-bold text-emerald-300 shrink-0">
                          {activityTask.completedBy.profileImageUrl ? (
                            <img src={activityTask.completedBy.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            activityTask.completedBy.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{activityTask.completedBy.name}</p>
                          <p className="text-[8px] font-mono text-slate-400">Primary Lead</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-300 px-1.5 py-0.2 rounded bg-white/5 border border-white/10 shrink-0">
                        {activityTask.isShared && activityTask.partners?.length
                          ? `${(1 / (1 + activityTask.partners.length)).toFixed(2)} pts`
                          : '1.0 pt'}
                      </span>
                    </div>

                    {/* Shared Co-Workers */}
                    {activityTask.partners?.map((p: any) => (
                      <div
                        key={p.id || p._id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-950 border border-amber-400/40 flex items-center justify-center text-[10px] font-bold text-amber-300 shrink-0">
                            {p.profileImageUrl ? (
                              <img src={p.profileImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (p.name || 'W').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{p.name}</p>
                            <p className="text-[8px] font-mono text-amber-400">Partner</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-300 px-1.5 py-0.2 rounded bg-white/5 border border-white/10 shrink-0">
                          {(1 / (1 + (activityTask.partners?.length || 0))).toFixed(2)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Minimalist Activity Timeline (Handled for long log histories) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">
                    Timeline {activityTask.activityLog?.length ? `(${activityTask.activityLog.length})` : ''}
                  </span>
                  {activityTask.activityLog && activityTask.activityLog.length > 3 && (
                    <span className="text-slate-500 text-[9px]">Scroll for more</span>
                  )}
                </div>

                <div className="max-h-44 sm:max-h-48 overflow-y-auto overscroll-contain space-y-1.5 pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {activityTask.activityLog && activityTask.activityLog.length > 0 ? (
                    activityTask.activityLog.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.015] border border-white/[0.04] text-xs">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            log.action === 'COMPLETED' ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-amber-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-[11px]">
                            {log.action === 'COMPLETED' ? 'Completed' : 'Reopened'}
                          </p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                            by {log.user?.name || 'Technician'} • {formatTaskDateTime(log.at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] font-mono text-slate-500 py-1">No previous state changes recorded</p>
                  )}
                </div>
              </div>

              {/* Guarded Delete Task for Admin */}
              {isAdmin && (
                <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const tid = activityTask.id || activityTask._id;
                      setActivityTask(null);
                      setConfirmDeleteModal({ isOpen: true, type: 'TASK', taskId: tid });
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Task</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COMPLETE SUB-TASK MODAL (Sleek, Amber-Themed & Scalable) ── */}
      <AnimatePresence>
        {completeTaskModal.isOpen && completeTaskModal.task && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/85 backdrop-blur-md"
            onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-[#090912] border border-white/[0.08] shadow-2xl p-5 sm:p-5.5 space-y-3.5 overflow-hidden"
            >
              <BorderBeam size={160} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={0.75} />

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300/80 uppercase tracking-wider mb-0.5">
                    <span>{currentJob.vehicleNumber}</span>
                    <span>•</span>
                    <span>Checklist</span>
                  </div>
                  <h3 className="text-sm font-black text-white leading-snug truncate">
                    {completeTaskModal.task.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition active:scale-90 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Theme-Matched Points Highlight */}
              <div className="py-2.5 px-3 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-center space-y-0.5">
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-tight">
                  +{pointsPerWorker} <span className="text-xs font-sans font-bold uppercase text-amber-400/80">QP</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {completeTaskModal.partnerIds.length > 0
                    ? `Split between ${totalParticipating} staff (${pointsPerWorker} QP each)`
                    : 'Awarded directly to your score'}
                </p>
              </div>

              {/* Scalable Staff Selector (Handles 1 to 50+ employees smoothly) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="font-bold uppercase tracking-wider">Assign Workers</span>
                  <span className="text-amber-300 font-bold">
                    {completeTaskModal.partnerIds.length > 0 ? `${totalParticipating} staff selected` : 'Solo (You)'}
                  </span>
                </div>

                {/* Horizontal Scrollable Avatar Roster (Ultra-compact & scalable) */}
                <div
                  className="flex gap-2.5 overflow-x-auto py-2 px-1 touch-pan-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {/* Current Active User (Always pre-selected Lead) */}
                  <div className="flex flex-col items-center gap-1 shrink-0 cursor-default">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border-2 border-amber-400 shadow-md shadow-amber-400/20 flex items-center justify-center text-xs font-bold text-amber-300">
                        {user?.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[8px] font-black shadow-xs">
                        ✓
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 truncate max-w-[56px]">
                      You
                    </span>
                  </div>

                  {/* Other Workshop Staff */}
                  {allWorkers.map((w: any) => {
                    const wId = w.id || w._id;
                    const isSelected = completeTaskModal.partnerIds.includes(wId);

                    return (
                      <button
                        key={wId}
                        type="button"
                        onClick={() => {
                          setCompleteTaskModal((prev) => {
                            const newPartners = isSelected
                              ? prev.partnerIds.filter((p) => p !== wId)
                              : [...prev.partnerIds, wId];
                            return {
                              ...prev,
                              isShared: newPartners.length > 0,
                              partnerIds: newPartners,
                            };
                          });
                        }}
                        className="flex flex-col items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition"
                      >
                        <div className="relative">
                          <div
                            className={`w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? 'border-2 border-amber-400 shadow-md shadow-amber-400/30 text-amber-300 scale-105'
                                : 'border border-white/10 text-slate-400 hover:border-white/25 hover:text-white opacity-70 hover:opacity-100'
                            }`}
                          >
                            {w.profileImageUrl ? (
                              <img src={w.profileImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (w.name || 'W').charAt(0).toUpperCase()
                            )}
                          </div>
                          {isSelected && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[8px] font-black shadow-xs">
                              ✓
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-mono truncate max-w-[56px] ${
                            isSelected ? 'text-amber-300 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {w.name?.split(' ')[0] || 'Staff'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Gold Theme Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={executeCompleteTask}
                  disabled={isCompletingTask}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-105 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-400/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCompletingTask ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Complete Task (+{pointsPerWorker} QP)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Reopen Modal */}
      <ConfirmationModal
        isOpen={confirmReopenModal.isOpen}
        onClose={() => setConfirmReopenModal({ isOpen: false, task: null })}
        onConfirm={executeReopenTask}
        title="Reopen Task?"
        message={`Are you sure you want to mark "${confirmReopenModal.task?.title}" back as open?`}
        confirmText="Reopen"
        variant="danger"
      />

      {/* Confirm Delete Modal */}
      <ConfirmationModal
        isOpen={confirmDeleteModal.isOpen}
        onClose={() => setConfirmDeleteModal({ isOpen: false, type: 'TASK' })}
        onConfirm={executeDelete}
        title={confirmDeleteModal.type === 'JOB_CARD' ? 'Delete Vehicle Job?' : 'Delete Task?'}
        message={
          confirmDeleteModal.type === 'JOB_CARD'
            ? 'This will permanently remove the vehicle job card and all its tasks.'
            : 'Are you sure you want to delete this checklist task?'
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />

      {/* Pin Job Modal */}
      {isPinJobModalOpen && currentJob && (
        <PinJobModal
          isOpen={isPinJobModalOpen}
          onClose={() => setIsPinJobModalOpen(false)}
          job={currentJob}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onTogglePin={handleToggleJobPin}
        />
      )}

      {/* ── SLIDE TO SIGNOFF PILL DOCK (Fixed Bottom) ── */}
      <AnimatePresence>
        {isAllCompleted && !currentJob.verifiedAt && (
          <SlideToSignoff
            onSignoff={handleVerify}
            isLoading={isVerifying}
            isVerified={Boolean(currentJob.verifiedAt)}
            verifierName={currentJob.verifiedBy?.name}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
