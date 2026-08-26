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
} from '../api/jobApi';
import { useGetAllUsersQuery } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { PinJobModal } from '../components/jobCard/PinJobModal';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';
import { triggerSubTaskConfetti, triggerVehicleReadyConfetti } from '../utils/confetti';
import { playCompletionSound, playReopenSound } from '../utils/completionSound';
import {
  ChevronLeft,
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
} from 'lucide-react';
import { getDeliveryStatusInfo } from '../utils/dateUtils';
import { ProgressBarBeam } from '../components/magicui/AnimatedBeam';

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
  const { data: jobResponse, isLoading, refetch } = useGetJobCardByIdQuery(id!, { skip: !id });
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

  const isJobPinnedForMe =
    Array.isArray(currentJob?.pinnedBy) &&
    currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === currentUserId);
  const isJobPinnedForAll = !!currentJob?.isPinnedForAll;
  const isPinned = isJobPinnedForAll || isJobPinnedForMe;

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
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Unable to verify this job card.');
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

  if (isLoading || !currentJob) {
    return (
      <div className="min-h-screen bg-[#080810] text-white flex flex-col">
        <Navbar glass />
        <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-32">
          <div className="space-y-4">
            <div className="h-48 rounded-3xl bg-white/[0.03] animate-pulse" />
            <div className="h-12 rounded-2xl bg-white/[0.03] animate-pulse" />
            <div className="h-64 rounded-3xl bg-white/[0.03] animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20">
      {/* Ambient background aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[260px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.04)_0%,transparent_70%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 pb-32 space-y-3.5">
        {/* ── TOP NAV BAR ── */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Vehicles</span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Pin Action */}
            <button
              type="button"
              onClick={() => setIsPinJobModalOpen(true)}
              className={`p-2 rounded-xl border transition active:scale-90 cursor-pointer ${
                isPinned
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 shadow-sm'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Pin Vehicle"
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Photo Action */}
            <button
              type="button"
              onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white active:scale-90 transition cursor-pointer"
              title="Vehicle Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Edit Action (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate(`/jobs/edit/${currentJob.id || currentJob._id}`)}
                className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20 active:scale-90 transition cursor-pointer"
                title="Edit Job Card"
              >
                <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}

            {/* Delete Job Action (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-90 transition cursor-pointer"
                title="Delete Job Card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── VEHICLE HERO CARD ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] shadow-2xl p-4 sm:p-5 space-y-3"
        >
          {isPinned && <BorderBeam size={220} duration={7} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />}

          {/* Vehicle Name, Plate & Ready status */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight truncate">
                {currentJob.vehicleName || 'Vehicle'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-amber-300 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-lg tracking-wider">
                  {currentJob.vehicleNumber}
                </span>
                {currentJob.vehicleColor && (
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-amber-400" />
                    {currentJob.vehicleColor}
                  </span>
                )}
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider border shrink-0 flex items-center gap-1.5 ${
              isAllCompleted
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-400/15 border-amber-400/30 text-amber-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAllCompleted ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>{isAllCompleted ? 'Ready for Delivery' : 'In Service'}</span>
            </div>
          </div>

          {/* Progress Bar Beam */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">
                {completedCount} of {totalTasks} tasks completed
              </span>
              <span className={`font-black ${isAllCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                {progressPercent}%
              </span>
            </div>
            <ProgressBarBeam progress={progressPercent} />
          </div>

          {/* Expandable Specs Accordion Button */}
          <button
            type="button"
            onClick={() => setIsExpandedHeader((prev) => !prev)}
            className="w-full py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>{isExpandedHeader ? 'Hide Specs' : 'View Customer & Delivery Specs'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpandedHeader ? 'rotate-180' : ''}`} />
          </button>

          {/* Expandable Details Drawer */}
          <AnimatePresence>
            {isExpandedHeader && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2 border-t border-white/[0.06]"
              >
                {/* Customer Contact Row */}
                {(currentJob.customerName || currentJob.customerMobile) && (
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-slate-500">Customer</p>
                        <p className="text-xs font-bold text-white">{currentJob.customerName || 'Walk-in Customer'}</p>
                      </div>
                    </div>

                    {currentJob.customerMobile && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${currentJob.customerMobile}`}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{currentJob.customerMobile}</span>
                        </a>
                        <a
                          href={`https://wa.me/${currentJob.customerMobile.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline & Delivery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-mono uppercase text-slate-500">Duration in Garage</p>
                    <p className="text-xs font-bold text-slate-300 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {getGarageDuration()}
                    </p>
                  </div>

                  {currentJob.expectedDeliveryDate && (
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] font-mono uppercase text-slate-500">Expected Delivery</p>
                      <p className="text-xs font-bold text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {new Date(currentJob.expectedDeliveryDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── VERIFIED STATUS BANNER ── */}
        {currentJob.verifiedAt && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-300 font-mono uppercase">Quality Assurance Passed</p>
              <p className="text-[11px] text-emerald-200/80">Vehicle is verified and cleared for customer handover.</p>
            </div>
          </div>
        )}

        {/* ── QA SIGN-OFF BUTTON ── */}
        {isAllCompleted && !currentJob.verifiedAt && isAdmin && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 hover:opacity-95 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4.5 h-4.5" />}
            <span>Sign-off & Verify Vehicle</span>
          </button>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* ── LEADERBOARD-STYLE TASK FILTER TABS ── */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-2xl border border-white/8">
          {(
            [
              { key: 'ALL', label: 'All Tasks', count: totalTasks },
              { key: 'PENDING', label: 'In Progress', count: totalTasks - completedCount },
              { key: 'COMPLETED', label: 'Completed', count: completedCount },
            ] as const
          ).map(({ key, label, count }) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`relative flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isActive ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="task-filter-tab"
                    className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-xl shadow-md shadow-amber-500/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
                <span
                  className={`relative z-10 text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── TASKS CHECKLIST (With Technician Avatars, Partner Badges & Logs Sheet) ── */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <p className="text-sm font-bold text-slate-300">No tasks in this view</p>
              <p className="text-xs font-mono text-slate-500">All tasks in this category are clear</p>
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
                  className={`group relative overflow-hidden rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-white/[0.02] border-white/[0.06]'
                      : 'bg-white/[0.035] backdrop-blur-2xl border-white/[0.08] hover:border-amber-400/40 shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status Checkbox Button */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => promptTaskStatusChange(task)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs'
                          : 'bg-white/5 border-white/20 text-transparent hover:border-amber-400 hover:text-amber-400'
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
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
                          isCompleted ? 'line-through text-slate-400' : 'text-white'
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
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border-2 border-[#080810] flex items-center justify-center text-[9px] font-bold text-emerald-300 shadow-xs">
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
                                className="w-5 h-5 rounded-full overflow-hidden bg-amber-900 border-2 border-[#080810] flex items-center justify-center text-[9px] font-bold text-amber-300 shadow-xs"
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
                          <span className="text-[10px] font-mono text-emerald-400 font-bold truncate">
                            {completedUser.name}
                            {isShared ? ` & ${partners.map((p: any) => p.name).join(', ')}` : ''}
                          </span>

                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-amber-300">
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
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition active:scale-90 cursor-pointer"
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
                          ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
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

              {/* Minimalist Activity Timeline */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Timeline</p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
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

      {/* ── COMPLETE TASK & MULTI-WORKER POINTS SHARING MODAL ── */}
      <AnimatePresence>
        {completeTaskModal.isOpen && completeTaskModal.task && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md"
            onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl p-5 space-y-4 overflow-hidden"
            >
              <BorderBeam size={180} duration={8} colorFrom="#10b981" colorTo="#fbbf24" borderWidth={1} />

              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">Complete Sub-Task</h3>
                    <p className="text-[10px] font-mono text-slate-400">Award points & log work</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Title Banner */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300/80">
                  {currentJob.vehicleNumber} • Checklist Item
                </span>
                <p className="text-xs sm:text-sm font-black text-white">{completeTaskModal.task.title}</p>
              </div>

              {/* Primary Completer Card */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-emerald-400 flex items-center justify-center text-xs font-bold text-white">
                    {user?.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{user?.name || 'You'}</p>
                    <p className="text-[9px] font-mono text-emerald-400">Primary Technician (Lead)</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-black text-emerald-300">
                  {pointsPerWorker} QP
                </span>
              </div>

              {/* Shared Task Toggle */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setCompleteTaskModal((prev) => ({
                      ...prev,
                      isShared: !prev.isShared,
                      partnerIds: !prev.isShared ? prev.partnerIds : [],
                    }))
                  }
                  className={`w-full p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    completeTaskModal.isShared
                      ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Work with partners?</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      completeTaskModal.isShared
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {completeTaskModal.isShared ? 'SHARED ENABLED' : 'SOLO'}
                  </span>
                </button>

                {/* Partner Workers Selection List with Avatars */}
                {completeTaskModal.isShared && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Select co-workers to split points:</span>
                      <span className="text-amber-300 font-bold">
                        {completeTaskModal.partnerIds.length} selected
                      </span>
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {allWorkers.length === 0 ? (
                        <p className="text-[11px] text-slate-500 font-mono py-2 text-center">
                          No other registered technicians found
                        </p>
                      ) : (
                        allWorkers.map((w: any) => {
                          const wId = w.id || w._id;
                          const isSelected = completeTaskModal.partnerIds.includes(wId);

                          return (
                            <button
                              key={wId}
                              type="button"
                              onClick={() => {
                                setCompleteTaskModal((prev) => ({
                                  ...prev,
                                  partnerIds: isSelected
                                    ? prev.partnerIds.filter((p) => p !== wId)
                                    : [...prev.partnerIds, wId],
                                }));
                              }}
                              className={`w-full p-2 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400/20 border-amber-400/50 text-white'
                                  : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-amber-300 shrink-0">
                                  {w.profileImageUrl ? (
                                    <img src={w.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (w.name || 'W').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold truncate text-white">{w.name}</p>
                                  <p className="text-[9px] font-mono text-slate-400 uppercase">{w.role || 'Mechanic'}</p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {isSelected && (
                                  <span className="text-[9px] font-mono font-bold text-amber-300">
                                    +{pointsPerWorker} QP
                                  </span>
                                )}
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'border border-white/20'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Points Allocation Summary */}
              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  {completeTaskModal.isShared && completeTaskModal.partnerIds.length > 0
                    ? `Equal Split (1/${totalParticipating})`
                    : 'Full 1.0 QP Award'}
                </span>
                <span className="font-black text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {pointsPerWorker} QP / Person
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={executeCompleteTask}
                  disabled={isCompletingTask}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCompletingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Complete & Award ({pointsPerWorker} QP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
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
    </div>
  );
};
