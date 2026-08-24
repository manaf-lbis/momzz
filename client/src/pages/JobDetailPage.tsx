import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobCardsQuery,
  useGetJobCardByIdQuery,
  useSetTaskStatusMutation,
  useAddTaskMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
  useUpdateJobMutation,
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
import { TaskAutoComplete } from '../components/common/TaskAutoComplete';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';
import { triggerSubTaskConfetti, triggerVehicleReadyConfetti } from '../utils/confetti';
import { playCompletionSound, playReopenSound } from '../utils/completionSound';
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  Palette,
  Users,
  UserPlus,
  X,
  Edit2,
  Phone,
  MessageCircle,
  User as UserIcon,
  Pin,
  ChevronDown,
  Calendar,
  Camera,
  Plus,
} from 'lucide-react';
import { getDeliveryStatusInfo } from '../utils/dateUtils';
import { ProgressBarBeam } from '../components/magicui/AnimatedBeam';

type TaskFilterType = 'ALL' | 'PENDING' | 'COMPLETED';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskFilterType>('ALL');
  const [activityTask, setActivityTask] = useState<TaskItem | null>(null);
  const longPressTimer = useRef<number | null>(null);

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
  const [addTask, { isLoading: isAddingTask }] = useAddTaskMutation();
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
  const allWorkers = (allUsersResponse?.data || []).filter(
    (u: any) => u.id !== user?.id && u._id !== user?.id && u._id !== (user as any)?._id
  );

  const tasks = currentJob?.tasks || [];
  const completedTasks = tasks.filter((t: TaskItem) => t.status === 'COMPLETED');
  const completedCount = completedTasks.length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isAllCompleted = totalTasks > 0 && completedCount === totalTasks;
  const deliveryInfo = getDeliveryStatusInfo(currentJob?.expectedDeliveryDate, isAllCompleted);

  const isJobPinnedForMe =
    Array.isArray(currentJob?.pinnedBy) &&
    currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id));
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

  const handleAddTask = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || !currentJob) return;
    try {
      await addTask({
        jobCardId: currentJob.id || currentJob._id!,
        title: trimmed,
      }).unwrap();
      setNewTaskTitle('');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to add task.');
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

            {/* Delete Action (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-90 transition cursor-pointer"
                title="Delete Job"
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
                <span className="text-xs font-mono font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 px-2.5 py-0.5 rounded-lg tracking-wider shadow-xs">
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

        {/* ── QA SIGN-OFF BUTTON (When all tasks completed & not verified) ── */}
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

        {/* ── ADD SUB-TASK AUTOCOMPLETE ── */}
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <TaskAutoComplete
                value={newTaskTitle}
                onChange={setNewTaskTitle}
                onAddTask={(title: string) => handleAddTask(title)}
                placeholder="Type new service checklist item..."
              />
            </div>
            <button
              type="button"
              disabled={isAddingTask || !newTaskTitle.trim()}
              onClick={() => handleAddTask(newTaskTitle)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
            >
              {isAddingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* ── TASKS CHECKLIST ── */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <p className="text-sm font-bold text-slate-300">No tasks in this view</p>
              <p className="text-xs font-mono text-slate-500">Add checklist items or switch filter</p>
            </div>
          ) : (
            sortedTasks.map((task: TaskItem) => {
              const taskId = task.id || task._id!;
              const isCompleted = task.status === 'COMPLETED';
              const isPinnedTask = optimisticPins[taskId] !== undefined ? optimisticPins[taskId] : !!task.isPinned;
              const isUpdating = updatingTaskId === taskId;

              return (
                <motion.div
                  key={taskId}
                  layout
                  className={`group relative overflow-hidden rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                      : 'bg-white/[0.035] backdrop-blur-2xl border-white/[0.08] hover:border-amber-400/40 text-white shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status Toggle Button */}
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

                    {/* Task Title & Worker Audit Info */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCompleted ? 'line-through text-slate-400' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {isCompleted && task.completedBy && (
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                          Completed by {task.completedBy.name || 'Technician'}
                          {task.isShared && task.partners?.length ? ` + ${task.partners.length} shared` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Task Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
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

                    {/* Delete Task (Admin) */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'TASK', taskId })}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-white/10 transition active:scale-90 cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </main>

      {/* Complete Task / Multi-Worker Modal */}
      <AnimatePresence>
        {completeTaskModal.isOpen && completeTaskModal.task && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl p-5 space-y-4"
            >
              <h3 className="text-base font-black text-white">Complete Checklist Task</h3>
              <p className="text-xs text-slate-300 font-bold">{completeTaskModal.task.title}</p>

              {/* Multi-Worker Shared Toggle */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Shared with co-workers?
                  </span>
                  <input
                    type="checkbox"
                    checked={completeTaskModal.isShared}
                    onChange={(e) => setCompleteTaskModal({ ...completeTaskModal, isShared: e.target.checked })}
                    className="rounded accent-amber-400"
                  />
                </label>

                {completeTaskModal.isShared && (
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <p className="text-[10px] font-mono text-slate-400">Select partner technicians:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {allWorkers.map((w: any) => {
                        const isSelected = completeTaskModal.partnerIds.includes(w.id || w._id);
                        return (
                          <button
                            key={w.id || w._id}
                            type="button"
                            onClick={() => {
                              const id = w.id || w._id;
                              setCompleteTaskModal((prev) => ({
                                ...prev,
                                partnerIds: isSelected
                                  ? prev.partnerIds.filter((p) => p !== id)
                                  : [...prev.partnerIds, id],
                              }));
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>{w.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={executeCompleteTask}
                  disabled={isCompletingTask}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-1.5"
                >
                  {isCompletingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Mark Complete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-bold text-xs hover:bg-white/10"
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
          currentUserId={user?.id || (user as any)?._id}
          isAdmin={isAdmin}
          onTogglePin={handleToggleJobPin}
        />
      )}
    </div>
  );
};
