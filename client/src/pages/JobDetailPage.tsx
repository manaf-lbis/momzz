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
import { VehiclePhotoModal } from '../components/jobCard/VehiclePhotoModal';
import { TaskAutoComplete } from '../components/common/TaskAutoComplete';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';
import { BlurFade } from '../components/magicui/BlurFade';
import { triggerSubTaskConfetti, triggerVehicleReadyConfetti } from '../utils/confetti';
import { playCompletionSound, playReopenSound } from '../utils/completionSound';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  Trash2,
  UserCheck,
  Wrench,
  AlertTriangle,
  Sparkles,
  Check,
  RotateCcw,
  Filter,
  Loader2,
  Palette,
  Users,
  UserPlus,
  X,
  Edit2,
  Phone,
  Mail,
  User as UserIcon,
  Pin,
  ChevronDown,
  Calendar,
  Camera,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { getDeliveryStatusInfo, formatDeliveryDate, toDateTimeLocal, getDeliveryPreset } from '../utils/dateUtils';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { ProgressBarBeam } from '../components/magicui/AnimatedBeam';
import { ModernDateTimePicker } from '../components/common/ModernDateTimePicker';

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

  // Complete Sub-Task Modal State (Multi-Worker Shared Work Support)
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
    type: 'JOB_CARD' | 'TASK';
    taskId?: string;
  }>({
    isOpen: false,
    type: 'TASK',
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isExpandedHeader, setIsExpandedHeader] = useState(false);
  const [isPinJobModalOpen, setIsPinJobModalOpen] = useState(false);
  const [isVehiclePhotoModalOpen, setIsVehiclePhotoModalOpen] = useState(false);
  const [pinningJobMode, setPinningJobMode] = useState<'ALL' | 'ME' | null>(null);
  const [optimisticPins, setOptimisticPins] = useState<Record<string, boolean>>({});
  const [pinningTaskIds, setPinningTaskIds] = useState<Record<string, boolean>>({});
  const [editDetails, setEditDetails] = useState<Partial<JobCardData>>({});
  const [isAddingQuickTask, setIsAddingQuickTask] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: jobResponse, isLoading: isSingleLoading, isError: isSingleError } = useGetJobCardByIdQuery(id!, { skip: !id });
  const { data: listResponse, isLoading: isListLoading } = useGetJobCardsQuery(undefined, { skip: !!jobResponse?.data });

  const rawList = listResponse?.data;
  const jobsList: JobCardData[] = Array.isArray(rawList) ? rawList : rawList?.jobs || [];
  const fallbackJob = jobsList.find((j: JobCardData) => j.id === id || j._id === id);

  const currentJob: JobCardData | undefined = jobResponse?.data || fallbackJob;
  const isLoading = (isSingleLoading && !currentJob) || (isListLoading && !currentJob);
  const isError = isSingleError && !currentJob;

  useEffect(() => {
    if (currentJob) {
      setEditDetails({
        vehicleName: currentJob.vehicleName || '',
        vehicleNumber: currentJob.vehicleNumber || '',
        vehicleColor: currentJob.vehicleColor || '',
        customerName: currentJob.customerName || '',
        customerMobile: currentJob.customerMobile || '',
        customerEmail: currentJob.customerEmail || '',
        expectedDeliveryDate: toDateTimeLocal(currentJob.expectedDeliveryDate),
      });
    }
  }, [currentJob]);

  const { data: usersData } = useGetAllUsersQuery();
  const allTeamMembers = (usersData?.data || []).filter(
    (u) => (u.id || u._id) !== (user?.id || user?._id)
  );

  const [setTaskStatus] = useSetTaskStatusMutation();
  const [addTask] = useAddTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [deleteJobCard] = useDeleteJobCardMutation();
  const [updateJob, { isLoading: isUpdatingDetails }] = useUpdateJobMutation();
  const [toggleTaskPin] = useToggleTaskPinMutation();
  const [toggleJobPin, { isLoading: isTogglingJobPin }] = useToggleJobPinMutation();
  const [verifyJobCard, { isLoading: isVerifying }] = useVerifyJobCardMutation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white flex flex-col transition-colors">
        <Navbar />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-4">
          {[0, 1, 2, 3].map((item) => (
            <motion.div
              key={item}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative overflow-hidden rounded-2xl h-20 bg-slate-200 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50"
            >
              <motion.div
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 dark:via-slate-700/50 to-transparent"
                animate={{ x: ['-120%', '260%'] }}
                transition={{ duration: 1.25, repeat: Infinity, delay: item * 0.12, ease: 'linear' }}
              />
            </motion.div>
          ))}
          <div className="flex justify-center items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400">
            <span className="w-5 h-5 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-amber-400/30 border-l-transparent animate-spin shadow-lg shadow-amber-400/20" />
            SYNCING WORKROOM
          </div>
        </div>
      </div>
    );
  }

  if (isError || !currentJob) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white flex flex-col transition-colors">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-mono">Job Card Not Found</h2>
          <p className="text-sm text-slate-400 max-w-sm">The job card you are looking for does not exist or has been deleted.</p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-xl hover:bg-amber-300 transition"
          >
            ← Return to Jobs List
          </button>
        </div>
      </div>
    );
  }

  const tasks = currentJob.tasks || [];
  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t: TaskItem) => t.status === 'COMPLETED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isAllCompleted = totalTasks > 0 && completedCount === totalTasks;

  const getGarageDuration = () => {
    const totalMinutes = Math.max(0, Math.floor((now - new Date(currentJob.createdAt).getTime()) / 60000));
    if (totalMinutes < 60) return `${Math.max(1, totalMinutes)}m in garage`;
    const hours = Math.floor(totalMinutes / 60);
    if (hours < 24) return `${hours}h ${totalMinutes % 60}m in garage`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h in garage`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
    return `${Math.floor(minutes / 10080)}w ${Math.floor((minutes % 10080) / 1440)}d`;
  };

  const saveJobDetails = async () => {
    try {
      await updateJob({
        jobCardId: currentJob.id || currentJob._id!,
        vehicleName: editDetails.vehicleName,
        vehicleNumber: editDetails.vehicleNumber,
        vehicleColor: editDetails.vehicleColor,
        customerName: editDetails.customerName,
        customerMobile: editDetails.customerMobile,
        customerEmail: editDetails.customerEmail,
        expectedDeliveryDate: editDetails.expectedDeliveryDate ? new Date(editDetails.expectedDeliveryDate).toISOString() : null,
      }).unwrap();
      setIsEditingDetails(false);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to update job details.');
    }
  };

  // Filter tasks based on selected status filter
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

    // 1. Pinned tasks first (with optimistic support)
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    // 2. Alphabetical
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

  const handleToggleJobPin = async (jobCardId: string, mode: 'ALL' | 'ME') => {
    // Optimistic: immediately show loading mode & close modal after small delay
    setPinningJobMode(mode);
    try {
      await toggleJobPin({ jobCardId, mode }).unwrap();
      setIsPinJobModalOpen(false); // auto-close on success
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to update job card pin.');
    } finally {
      setPinningJobMode(null);
    }
  };

  const getAuditText = (task: TaskItem) => {
    if (!task.completedAt) return null;
    const created = new Date(task.createdAt || currentJob.createdAt).getTime();
    const completed = new Date(task.completedAt).getTime();
    const elapsedMins = Math.max(1, Math.round((completed - created) / (1000 * 60)));
    const finishedAt = new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(task.completedAt));

    const workerName = task.completedBy?.name || 'Technician';
    const partners = task.partners || [];
    if (task.isShared && partners.length > 0) {
      const totalWorkers = 1 + partners.length;
      const pts = (1 / totalWorkers).toFixed(2);
      const partnerNames = partners.map((p) => p.name).join(', ');
      return `${workerName} & ${partnerNames} • ${pts} pts each • Took ${formatDuration(elapsedMins)} • ${finishedAt}`;
    }
    return `${workerName} • 1.0 pt • Took ${formatDuration(elapsedMins)} • ${finishedAt}`;
  };

  const handleVerify = async () => {
    try {
      await verifyJobCard({ jobCardId: currentJob.id || currentJob._id! }).unwrap();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Unable to verify this job card.');
    }
  };

  const startLongPress = (task: TaskItem) => {
    longPressTimer.current = window.setTimeout(() => setActivityTask(task), 1000);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  // Open status modal
  const promptTaskStatusChange = (task: TaskItem) => {
    if (task.status === 'COMPLETED') {
      // playReopenSound is called in executeReopenTask after confirmation
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

  // Execute complete task
  const executeCompleteTask = async () => {
    const task = completeTaskModal.task;
    if (!task) return;

    setErrorMessage('');
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

  // Execute reopen task
  const executeReopenTask = async () => {
    const task = confirmReopenModal.task;
    if (!task) return;

    setErrorMessage('');
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

  const handleAddTask = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
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

  const executeDelete = async () => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      if (confirmDeleteModal.type === 'JOB_CARD') {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-white flex flex-col transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* ── VEHICLE HERO HEADER ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className={`relative overflow-hidden rounded-3xl border select-none transition-colors ${
            currentJob.isPinnedForAll
              ? 'border-amber-400/60 shadow-lg shadow-amber-500/10'
              : (Array.isArray(currentJob.pinnedBy) && currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id)))
              ? 'border-indigo-400/60 shadow-lg shadow-indigo-500/10'
              : isAllCompleted
              ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/30'
          } ${currentJob.thumbnailUrl ? 'bg-slate-950' : 'bg-white dark:bg-[#0c1525]'}`}
        >
          {/* BorderBeam */}
          {currentJob.isPinnedForAll && (
            <BorderBeam size={300} duration={5} colorFrom="#facc15" colorTo="#f59e0b" borderWidth={1.5} />
          )}
          {!currentJob.isPinnedForAll && (Array.isArray(currentJob.pinnedBy) && currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id))) && (
            <BorderBeam size={300} duration={5} colorFrom="#818cf8" colorTo="#6366f1" borderWidth={1.5} />
          )}
          {!currentJob.isPinnedForAll && isAllCompleted && (
            <BorderBeam size={300} duration={8} colorFrom="#10b981" colorTo="#34d399" borderWidth={1.5} />
          )}

          {/* Background Image */}
          {currentJob.thumbnailUrl ? (
            <>
              <img
                src={currentJob.thumbnailUrl}
                alt={currentJob.vehicleName || 'Vehicle'}
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                className="absolute inset-0 w-full h-full object-cover object-center z-0"
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
            </>
          ) : (
            <div className="absolute right-0 bottom-0 opacity-[0.035] dark:opacity-[0.06] pointer-events-none z-0">
              <Car className="w-56 h-56" />
            </div>
          )}

          {/* ── CONTENT ── */}
          <div className="relative z-10">

            {/* ── TOP NAV BAR ── */}
            <div className={`flex items-center justify-between px-3 pt-3 pb-0 sm:px-4 sm:pt-4`}>
              {/* Back */}
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border ${
                  currentJob.thumbnailUrl
                    ? 'bg-black/50 hover:bg-black/70 border-white/15 text-zinc-300 backdrop-blur-sm'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Jobs</span>
              </button>

              {/* Label */}
              <span className={`text-[10px] font-mono font-black uppercase tracking-[0.2em] ${
                currentJob.thumbnailUrl ? 'text-zinc-400' : 'text-slate-400 dark:text-slate-500'
              }`}>
                Job Card
              </span>

              {/* Action cluster */}
              <div className="flex items-center gap-1.5">
                {/* Pin */}
                <button
                  type="button"
                  onClick={() => setIsPinJobModalOpen(true)}
                  title="Pin / Unpin"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition active:scale-90 cursor-pointer ${
                    currentJob.isPinnedForAll
                      ? 'bg-amber-400 border-amber-400 text-zinc-950 shadow-sm shadow-amber-400/30'
                      : (Array.isArray(currentJob.pinnedBy) && currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id)))
                      ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm shadow-indigo-500/30'
                      : currentJob.thumbnailUrl
                      ? 'bg-black/50 border-white/15 text-zinc-400 hover:text-amber-400 backdrop-blur-sm'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${
                    currentJob.isPinnedForAll || (Array.isArray(currentJob.pinnedBy) && currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id)))
                      ? 'fill-current' : ''
                  }`} />
                </button>

                {/* Camera */}
                <button
                  type="button"
                  onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
                  title="Vehicle Photo"
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-zinc-950 border border-amber-400 shadow-sm shadow-amber-400/20 transition active:scale-90 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Status dot */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  isAllCompleted
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                    : 'bg-amber-400/10 border-amber-400/30 text-amber-500'
                }`} title={isAllCompleted ? 'Ready for delivery' : 'In progress'}>
                  {isAllCompleted
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <Clock className="w-3.5 h-3.5 animate-pulse" />
                  }
                </div>
              </div>
            </div>

            {/* ── MAIN HERO CONTENT ── */}
            <div className="px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5 space-y-3">

              {/* ── VEHICLE NAME — big, dominant ── */}
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none uppercase ${
                  currentJob.thumbnailUrl ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}>
                  {currentJob.vehicleName}
                </h1>
                {/* Sub-label: Plate · Color · Time */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Plate */}
                  <span className="font-mono text-[12px] font-black px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 tracking-widest">
                    {currentJob.vehicleNumber}
                  </span>
                  {/* Color */}
                  {currentJob.vehicleColor && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border ${
                      currentJob.thumbnailUrl
                        ? 'bg-white/10 border-white/15 text-zinc-300 backdrop-blur-sm'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Palette className="w-3 h-3 text-amber-400 shrink-0" />
                      {currentJob.vehicleColor}
                    </span>
                  )}
                  {/* Garage time */}
                  <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                    currentJob.thumbnailUrl ? 'text-zinc-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    {getGarageDuration()}
                  </span>
                  {/* Edit pencil (admin only) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/edit/${currentJob.id || currentJob._id}`)}
                      title="Edit Job"
                      className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition active:scale-90 cursor-pointer ${
                        currentJob.thumbnailUrl
                          ? 'bg-white/10 border-white/15 text-zinc-400 hover:text-white backdrop-blur-sm'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* ── PROGRESS ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                    currentJob.thumbnailUrl ? 'text-zinc-500' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    Service Progress
                  </span>
                  <span className={`text-xs font-black font-mono tabular-nums ${
                    isAllCompleted ? 'text-emerald-400' : 'text-amber-500 dark:text-amber-400'
                  }`}>
                    {progressPercent}%
                  </span>
                </div>
                <ProgressBarBeam progress={progressPercent} />
              </div>

              {/* ── DELIVERY + OVERDUE ── */}
              {(() => {
                const deliveryInfo = getDeliveryStatusInfo(currentJob.expectedDeliveryDate, isAllCompleted);
                return (
                  <>
                    {currentJob.expectedDeliveryDate && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border ${deliveryInfo.badgeClass}`}>
                          <Calendar className="w-3 h-3 shrink-0" />
                          {deliveryInfo.label}
                        </span>
                        {currentJob.isPinnedForAll && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-600 dark:text-amber-300 text-[10px] font-mono font-bold">
                            <Pin className="w-2.5 h-2.5 fill-current shrink-0" /> All
                          </span>
                        )}
                        {Array.isArray(currentJob.pinnedBy) && currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id)) && !currentJob.isPinnedForAll && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-400/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-mono font-bold">
                            <Pin className="w-2.5 h-2.5 fill-current shrink-0" /> Me
                          </span>
                        )}
                      </div>
                    )}
                    {deliveryInfo.isOverdue && !isAllCompleted && (
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl text-[11px] font-mono font-bold border ${
                        currentJob.thumbnailUrl
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 backdrop-blur-sm'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" />
                        <span>Overdue · {formatDeliveryDate(currentJob.expectedDeliveryDate)}</span>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── MORE / LESS toggle ── */}
              <button
                type="button"
                onClick={() => setIsExpandedHeader((prev) => !prev)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-widest transition active:scale-[0.98] cursor-pointer ${
                  isExpandedHeader
                    ? 'bg-amber-400 text-zinc-950 border-amber-400'
                    : currentJob.thumbnailUrl
                    ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 backdrop-blur-sm'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isExpandedHeader ? 'Hide details' : 'Show creator & customer'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpandedHeader ? 'rotate-180' : ''}`} />
              </button>

              {/* ── EXPANDABLE DRAWER ── */}
              <AnimatePresence>
                {isExpandedHeader && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-0.5">
                      {/* Creator row */}
                      <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border ${
                        currentJob.thumbnailUrl
                          ? 'bg-black/60 border-white/10 backdrop-blur-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xs font-black text-amber-600 dark:text-amber-300 shrink-0">
                            {currentJob.createdBy?.profileImageUrl
                              ? <img src={currentJob.createdBy.profileImageUrl} alt="" className="w-full h-full object-cover" />
                              : currentJob.createdBy?.name?.charAt(0).toUpperCase() || 'SA'
                            }
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[10px] font-mono uppercase tracking-wider ${currentJob.thumbnailUrl ? 'text-zinc-500' : 'text-slate-400'}`}>
                              Created by
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-bold truncate max-w-[120px] sm:max-w-none ${currentJob.thumbnailUrl ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                {currentJob.createdBy?.name || 'Service Advisor'}
                              </span>
                              {currentJob.createdBy?.role && (
                                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 bg-amber-400/15 border border-amber-400/30 text-amber-600 dark:text-amber-400 rounded-md">
                                  {currentJob.createdBy.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={`text-[10px] font-mono text-right shrink-0 ${currentJob.thumbnailUrl ? 'text-zinc-500' : 'text-slate-400'}`}>
                          {new Date(currentJob.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {' · '}
                          {new Date(currentJob.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Customer row */}
                      {(currentJob.customerName || currentJob.customerMobile || currentJob.customerEmail) && (
                        <div className={`px-3 py-2.5 rounded-2xl border ${
                          currentJob.thumbnailUrl
                            ? 'bg-black/60 border-white/10 backdrop-blur-sm'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <UserIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <div>
                                <p className={`text-[10px] font-mono uppercase tracking-wider ${currentJob.thumbnailUrl ? 'text-zinc-500' : 'text-slate-400'}`}>
                                  Customer
                                </p>
                                <p className={`text-xs font-bold truncate max-w-[130px] sm:max-w-none ${currentJob.thumbnailUrl ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                  {currentJob.customerName || '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {currentJob.customerMobile && (
                                <a href={`tel:${currentJob.customerMobile}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-mono text-[11px] font-bold transition active:scale-95">
                                  <Phone className="w-3 h-3 text-emerald-500" />
                                  <span className="hidden sm:inline">{currentJob.customerMobile}</span>
                                  <span className="sm:hidden">Call</span>
                                </a>
                              )}
                              {currentJob.customerEmail && (
                                <a href={`mailto:${currentJob.customerEmail}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-600 dark:text-sky-300 font-mono text-[11px] font-bold transition active:scale-95">
                                  <Mail className="w-3 h-3 text-sky-500" />
                                  <span className="hidden sm:inline">{currentJob.customerEmail}</span>
                                  <span className="sm:hidden">Mail</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </motion.section>

        {/* ── EDIT DETAILS MODAL / INLINE FORM ── */}
        <AnimatePresence>
          {isEditingDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Job Details</h2>
                <p className="text-sm text-slate-500 mt-1">Update vehicle specifications or customer contact information.</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Field: Vehicle Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Vehicle Name
                    </label>
                    <input
                      value={(editDetails.vehicleName as string) || ''}
                      onChange={(e) => setEditDetails((prev) => ({ ...prev, vehicleName: e.target.value }))}
                      placeholder="e.g. BMW M4 Competition"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                  
                  {/* Field: License Plate */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      License Plate Number
                    </label>
                    <input
                      value={(editDetails.vehicleNumber as string) || ''}
                      onChange={(e) => setEditDetails((prev) => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                      placeholder="e.g. MH 01 AB 1234"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                  
                  {/* Field: Vehicle Color */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Vehicle Color
                    </label>
                    <input
                      value={(editDetails.vehicleColor as string) || ''}
                      onChange={(e) => setEditDetails((prev) => ({ ...prev, vehicleColor: e.target.value }))}
                      placeholder="e.g. Black"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
                  
                  {/* Field: Customer Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Customer Name
                    </label>
                    <input
                      value={(editDetails.customerName as string) || ''}
                      onChange={(e) => setEditDetails((prev) => ({ ...prev, customerName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  
                  {/* Field: Customer Mobile */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Customer Mobile
                    </label>
                    <input
                      value={(editDetails.customerMobile as string) || ''}
                      onChange={(e) => setEditDetails((prev) => ({ ...prev, customerMobile: e.target.value }))}
                      placeholder="e.g. +1 234 567 8900"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  
                  {/* Field: Customer Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={(editDetails.customerEmail as string) || ''}
                      onChange={(e) => setEditDetails((prev) => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="e.g. john@example.com"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>

                  {/* Field: Modern Expected Delivery Date & Time Calendar */}
                  <div className="md:col-span-2">
                    <ModernDateTimePicker
                      value={(editDetails.expectedDeliveryDate as string) || ''}
                      onChange={(val) => setEditDetails((prev) => ({ ...prev, expectedDeliveryDate: val }))}
                      label="Expected Date & Time of Delivery"
                      placeholder="Click to pick delivery date & time"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Job Card
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsEditingDetails(false)} 
                      className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isUpdatingDetails}
                      onClick={saveJobDetails}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 dark:bg-amber-500 px-5 py-2 text-sm font-bold text-slate-900 hover:bg-amber-400 transition-colors shadow-sm active:scale-95 disabled:opacity-70"
                    >
                      {isUpdatingDetails ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Add New Task Section */}
              <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Add New Task
                </label>
                <TaskAutoComplete
                  value={newTaskTitle}
                  onChange={setNewTaskTitle}
                  onAddTask={handleAddTask}
                  placeholder="Search or type a new sub-task..."
                  disabled={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* ── STATUS BANNERS ── */}
        {currentJob.verifiedAt ? (
          /* Verified / Signed-off banner */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent p-4 flex items-center gap-3"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-400/15 blur-2xl" />
            </div>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 relative z-10">
              <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono">
                Quality Verified ✓
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Signed off on{' '}
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(currentJob.verifiedAt))}
                </span>
              </p>
            </div>
          </motion.div>
        ) : isAllCompleted ? (
          /* All tasks done — ready for QA banner */
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 dark:border-amber-400/40 bg-gradient-to-br from-amber-500/12 via-amber-400/6 to-emerald-500/8 p-4"
          >
            {/* Glow blobs */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="absolute -bottom-6 left-4 w-20 h-20 rounded-full bg-emerald-400/15 blur-xl" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-400/30">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-amber-800 dark:text-amber-300">
                      All Done! 🎉
                    </span>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-amber-400/25 border border-amber-400/40 text-amber-800 dark:text-amber-200 animate-pulse">
                      QA READY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Every task is complete — sign off when ready
                  </p>
                </div>
              </div>

              <button
                disabled={isVerifying}
                onClick={handleVerify}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all disabled:opacity-60 shrink-0 cursor-pointer"
              >
                {isVerifying ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Verifying...</span></>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /><span>Sign Off</span></>
                )}
              </button>
            </div>
          </motion.div>
        ) : null}




        {/* Unified Task List Filter Tabs with Badges */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-slate-50/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-y border-slate-200/60 dark:border-slate-800/60 shadow-xs">
          <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            {(
              [
                { key: 'ALL', label: 'All Tasks', count: totalTasks },
                { key: 'PENDING', label: 'In Work', count: totalTasks - completedCount },
                { key: 'COMPLETED', label: 'Done', count: completedCount },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key as TaskFilterType)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  statusFilter === key
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {statusFilter === key && (
                  <motion.div
                    layoutId="task-filter-pill"
                    className="absolute inset-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 font-extrabold tracking-tight">{label}</span>
                <span
                  className={`relative z-10 text-[10px] font-black rounded-md px-1.5 py-0.5 min-w-[20px] text-center tabular-nums leading-none ${
                    statusFilter === key
                      ? 'bg-amber-400 text-zinc-950 shadow-sm'
                      : count > 0
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Task Checklist List */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="p-8 industrial-card rounded-2xl text-center text-slate-500 text-xs font-mono space-y-1">
              <p className="uppercase font-bold">No tasks match filter ({statusFilter})</p>
              <p className="text-[11px] text-slate-400">Select 'ALL' to view all job card sub-tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task: TaskItem) => {
                const taskId = task.id || task._id!;
                const isCompleted = task.status === 'COMPLETED';
                const isTaskUpdating = updatingTaskId === taskId;
                const isExpanded = expandedTaskId === taskId;
                const effectiveIsPinned = optimisticPins[taskId] !== undefined ? optimisticPins[taskId] : !!task.isPinned;
                const isTaskPinning = !!pinningTaskIds[taskId];
                const ptsText = task.isShared && task.partners && task.partners.length > 0
                  ? `${(1 / (1 + task.partners.length)).toFixed(2)} pt`
                  : '1 pt';

                return (
                  <motion.div
                    key={taskId}
                    layout
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    className={`relative bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs cursor-pointer select-none overflow-hidden ${
                      effectiveIsPinned
                        ? 'border-amber-400/80 dark:border-amber-500/70 ring-1.5 ring-amber-400/20'
                        : isCompleted
                        ? 'border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10'
                        : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    onClick={() => setExpandedTaskId((prev) => (prev === taskId ? null : taskId))}
                  >
                    {/* Animated BorderBeam for Pinned Tasks */}
                    {effectiveIsPinned && (
                      <BorderBeam size={90} duration={6} colorFrom="#f59e0b" colorTo="#fbbf24" borderWidth={1.5} />
                    )}

                    {/* Top Row: Checkbox, Title & Points (Line 1), Avatars & Time (Line 2) */}
                    <div className="p-3.5 sm:p-4 flex items-start gap-3">
                      {/* Left: 44px Thumb-Friendly Touch Target Checkbox */}
                      <button
                        type="button"
                        disabled={isTaskUpdating}
                        onClick={(e) => {
                          e.stopPropagation();
                          promptTaskStatusChange(task);
                        }}
                        className="w-11 h-11 -my-2.5 -ml-1.5 flex items-center justify-center shrink-0 active:scale-85 transition-transform cursor-pointer"
                        title={isCompleted ? 'Tap to reopen task' : 'Tap to complete task'}
                      >

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-xs ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                              : 'border-2 border-amber-400 dark:border-amber-400/90 hover:border-amber-500 bg-amber-50/60 dark:bg-amber-400/10'
                          }`}
                        >
                          {isTaskUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                          ) : isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : null}
                        </div>
                      </button>

                      {/* Content: Exactly 2 Lines */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Line 1: Title + Points / Handshake / Pin */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-xs sm:text-sm font-bold leading-tight break-words truncate max-w-[260px] sm:max-w-md ${
                              isCompleted
                                ? 'text-slate-600 dark:text-slate-400 line-through opacity-85'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>

                          {/* Interactive Pin Toggle Button on Top Line */}
                          <button
                            type="button"
                            disabled={isTaskPinning}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const nextPinned = !effectiveIsPinned;
                              setOptimisticPins((prev) => ({ ...prev, [taskId]: nextPinned }));
                              setPinningTaskIds((prev) => ({ ...prev, [taskId]: true }));
                              try {
                                await toggleTaskPin({ taskId }).unwrap();
                              } catch (err: any) {
                                setOptimisticPins((prev) => ({ ...prev, [taskId]: !nextPinned }));
                                setErrorMessage(err?.data?.message || 'Failed to toggle pin.');
                              } finally {
                                setPinningTaskIds((prev) => ({ ...prev, [taskId]: false }));
                              }
                            }}
                            className={`p-1 rounded-md transition-all active:scale-90 ${
                              effectiveIsPinned
                                ? 'bg-amber-400 text-slate-950 shadow-2xs'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={effectiveIsPinned ? 'Pinned task (tap to unpin)' : 'Pin task to top'}
                          >
                            {isTaskPinning ? (
                              <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                            ) : (
                              <Pin className={`w-3 h-3 ${effectiveIsPinned ? 'fill-slate-950 stroke-[2.5]' : ''}`} />
                            )}
                          </button>

                          {/* Point distribution badge with handshake icon */}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:border-slate-400 text-[10px] font-mono font-bold shrink-0">
                            {task.isShared && <span>🤝</span>}
                            <span>{ptsText}</span>
                          </span>
                        </div>

                        {/* Line 2: Profile Pictures (No names) + Green dot-separated completion info */}
                        {isCompleted && task.completedAt && (
                          <div className="flex items-center gap-2 text-[11px] leading-none">
                            {/* Stacked Worker Profile Picture Avatars */}
                            <div className="flex -space-x-1.5 overflow-visible shrink-0">
                              {/* Primary Technician Avatar */}
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-500/20 border border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black text-emerald-700 dark:text-emerald-300 shrink-0 z-10 shadow-2xs">
                                {task.completedBy?.profileImageUrl ? (
                                  <img src={task.completedBy.profileImageUrl} alt={task.completedBy.name} className="w-full h-full object-cover" />
                                ) : (
                                  task.completedBy?.name?.charAt(0).toUpperCase() || 'W'
                                )}
                              </div>

                              {/* Partner Avatars */}
                              {(task.partners || []).map((partner, pi) => (
                                <div
                                  key={partner.id || partner._id || pi}
                                  className="w-5 h-5 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-500/20 border border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black text-amber-700 dark:text-amber-300 shrink-0 shadow-2xs"
                                  style={{ zIndex: 9 - pi }}
                                  title={partner.name}
                                >
                                  {partner.profileImageUrl ? (
                                    <img src={partner.profileImageUrl} alt={partner.name} className="w-full h-full object-cover" />
                                  ) : (
                                    partner.name?.charAt(0).toUpperCase() || 'P'
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Green dot-separated: Date • Took Duration */}
                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {new Intl.DateTimeFormat(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }).format(new Date(task.completedAt))}
                              {' • Took '}
                              {formatDuration(Math.max(1, Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt || currentJob.createdAt).getTime()) / (1000 * 60))))}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expand Chevron Icon */}
                      <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform p-0.5">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-500' : ''}`} />
                      </div>
                    </div>

                    {/* Expandable Action Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2.5 space-y-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Expanded: Name + pts + duration, green dot-separated (no avatars) */}
                          {isCompleted && task.completedAt && (
                            <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 px-2.5 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-xl">
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                                {task.completedBy?.name || 'Technician'}
                                {task.isShared && task.partners && task.partners.length > 0 && (
                                  <> &amp; {task.partners.map((p) => p.name).join(', ')}</>
                                )}
                              </span>
                              <span className="text-emerald-500/70 text-[10px]">•</span>
                              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {task.isShared && task.partners && task.partners.length > 0
                                  ? `${(1 / (1 + task.partners.length)).toFixed(2)} pts each`
                                  : '1.0 pt'}
                              </span>
                              <span className="text-emerald-500/70 text-[10px]">•</span>
                              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                Took {formatDuration(Math.max(1, Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt || currentJob.createdAt).getTime()) / (1000 * 60))))}
                              </span>
                            </div>
                          )}


                          {/* Action Buttons Row */}
                          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                            {/* Single Line: Pin Icon, Activity, Complete/Reopen, Delete */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Icon-Only Pin Button with Optimistic State and Loading Animation */}
                              <button
                                type="button"
                                title={effectiveIsPinned ? 'Unpin Task' : 'Pin Task'}
                                disabled={isTaskPinning}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const nextPinned = !effectiveIsPinned;
                                  // Immediate optimistic state update
                                  setOptimisticPins((prev) => ({ ...prev, [taskId]: nextPinned }));
                                  setPinningTaskIds((prev) => ({ ...prev, [taskId]: true }));
                                  try {
                                    await toggleTaskPin({ taskId }).unwrap();
                                  } catch (err: any) {
                                    // Rollback on error
                                    setOptimisticPins((prev) => ({ ...prev, [taskId]: !nextPinned }));
                                    setErrorMessage(err?.data?.message || 'Failed to toggle pin.');
                                  } finally {
                                    setPinningTaskIds((prev) => ({ ...prev, [taskId]: false }));
                                  }
                                }}
                                className={`p-2 rounded-xl transition-all active:scale-90 ${
                                  effectiveIsPinned
                                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500'
                                }`}
                              >
                                {isTaskPinning ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                                    className="flex items-center justify-center"
                                  >
                                    <Pin className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                                  </motion.div>
                                ) : (
                                  <Pin className={`w-3.5 h-3.5 ${effectiveIsPinned ? 'fill-slate-950' : ''}`} />
                                )}
                              </button>

                              {/* Activity Logs Button */}
                              <button
                                type="button"
                                onClick={() => setActivityTask(task)}
                                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Logs</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Complete / Reopen Button */}
                              {!isCompleted ? (
                                <button
                                  type="button"
                                  disabled={isTaskUpdating || (!!currentJob.verifiedAt && !isAdmin)}
                                  onClick={() => promptTaskStatusChange(task)}
                                  className="px-3.5 py-2 bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 transition-all active:scale-95 flex items-center gap-1 shadow-sm disabled:opacity-60"
                                >
                                  {isTaskUpdating ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3" />
                                      <span>Complete</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isTaskUpdating || (!!currentJob.verifiedAt && !isAdmin)}
                                  onClick={() => promptTaskStatusChange(task)}
                                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-mono font-bold rounded-xl transition-colors flex items-center gap-1 disabled:opacity-60"
                                >
                                  {isTaskUpdating ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Reopening...</span>
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reopen</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Delete Button */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'TASK', taskId })}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                                  title="Delete Sub-task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Sticky Quick Add Task Floating Bar */}
        {isAdmin && !currentJob.verifiedAt && (
          <div className="sm:hidden fixed bottom-18 inset-x-3 z-40">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-2 shadow-2xl flex items-center gap-2 ring-1 ring-black/5 dark:ring-white/10">
              <input
                type="text"
                placeholder="Quick add sub-task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskTitle.trim()) {
                    handleAddTask(newTaskTitle.trim());
                    setNewTaskTitle('');
                  }
                }}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium"
              />
              <button
                type="button"
                disabled={!newTaskTitle.trim()}
                onClick={() => {
                  if (newTaskTitle.trim()) {
                    handleAddTask(newTaskTitle.trim());
                    setNewTaskTitle('');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs uppercase disabled:opacity-40 active:scale-95 transition flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}

        {/* Task Activity Modal with Scrollable View */}
        <AnimatePresence>
          {activityTask && (
            <div

              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
              onClick={() => setActivityTask(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-md max-h-[80vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-white">Task Activity Log</h2>
                      <p className="text-xs text-slate-400 truncate max-w-[220px]">{activityTask.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivityTask(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Log Timeline */}
                <div className="p-4 sm:p-5 overflow-y-auto max-h-[55vh] space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {activityTask.activityLog?.length ? (
                    [...activityTask.activityLog].reverse().map((entry, index) => (
                      <div key={`${entry.at}-${index}`} className="pt-3 first:pt-0 flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                            entry.action === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {entry.action === 'COMPLETED' ? '✓' : '↺'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            <span
                              className={
                                entry.action === 'COMPLETED'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }
                            >
                              {entry.action === 'COMPLETED' ? 'Completed' : 'Reopened'}
                            </span>{' '}
                            by <span className="font-semibold">{entry.user?.name || 'Technician'}</span>
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {new Intl.DateTimeFormat(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }).format(new Date(entry.at))}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No activity recorded for this task yet.
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <button
                    onClick={() => setActivityTask(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs active:scale-95 transition"
                  >
                    Close Log
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── TASK COMPLETE MODAL (MULTI-WORKER SHARED WORK SUPPORT) ── */}
        <AnimatePresence>
          {completeTaskModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase text-slate-900 dark:text-white">Complete Task</h3>
                      <p className="text-xs text-slate-500 truncate max-w-[220px]">{completeTaskModal.task?.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Work Mode Toggle */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Work Assignment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCompleteTaskModal((prev) => ({ ...prev, isShared: false, partnerIds: [] }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                        !completeTaskModal.isShared
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <UserIcon className="w-5 h-5 mb-1 text-amber-500" />
                      <span>Solo Work</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">1.0 Full Point</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompleteTaskModal((prev) => ({ ...prev, isShared: true }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                        completeTaskModal.isShared
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Users className="w-5 h-5 mb-1 text-amber-500" />
                      <span>Shared Work 🤝</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">Points Split Equally</span>
                    </button>
                  </div>
                </div>

                {/* Multi-worker partner picker */}
                {completeTaskModal.isShared && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Points preview */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {1 + completeTaskModal.partnerIds.length} worker{completeTaskModal.partnerIds.length > 0 ? 's' : ''} total
                      </span>
                      <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">
                        {(1 / (1 + completeTaskModal.partnerIds.length)).toFixed(2)} pts each
                      </span>
                    </div>

                    {/* Selected partners chips */}
                    {completeTaskModal.partnerIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {completeTaskModal.partnerIds.map((pid) => {
                          const m = allTeamMembers.find((u) => (u.id || u._id) === pid);
                          if (!m) return null;
                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-700 dark:text-amber-300 text-xs font-bold"
                            >
                              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-black">
                                {m.name.charAt(0).toUpperCase()}
                              </span>
                              {m.name}
                              <button
                                type="button"
                                onClick={() =>
                                  setCompleteTaskModal((prev) => ({
                                    ...prev,
                                    partnerIds: prev.partnerIds.filter((id) => id !== pid),
                                  }))
                                }
                                className="ml-0.5 text-amber-500 hover:text-red-500 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Team member list to tap/add */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Co-Workers
                      </label>
                      <div
                        className="max-h-44 overflow-y-auto space-y-1 pr-1"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        {allTeamMembers
                          .filter((m) => !completeTaskModal.partnerIds.includes(m.id || m._id || ''))
                          .map((member) => {
                            const mid = member.id || member._id || '';
                            return (
                              <button
                                key={mid}
                                type="button"
                                onClick={() =>
                                  setCompleteTaskModal((prev) => ({
                                    ...prev,
                                    partnerIds: [...prev.partnerIds, mid],
                                  }))
                                }
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition text-left group"
                              >
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0 group-hover:bg-amber-400 group-hover:text-slate-900 transition overflow-hidden">
                                  {member.profileImageUrl ? (
                                    <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    member.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{member.mobile}</p>
                                </div>
                                <span className="text-[10px] font-bold text-amber-500 opacity-0 group-hover:opacity-100 transition">+ Add</span>
                              </button>
                            );
                          })}
                        {allTeamMembers.filter((m) => !completeTaskModal.partnerIds.includes(m.id || m._id || '')).length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-3">All team members added</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompleteTaskModal({ isOpen: false, task: null, isShared: false, partnerIds: [] })}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isCompletingTask || (completeTaskModal.isShared && completeTaskModal.partnerIds.length === 0)}
                    onClick={executeCompleteTask}
                    className="flex-1 py-3 rounded-2xl bg-amber-400 text-slate-950 font-mono font-extrabold text-xs uppercase shadow-md hover:bg-amber-300 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCompletingTask ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        Completing...
                      </>
                    ) : (
                      'Confirm Complete'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Task Reopen Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmReopenModal.isOpen}
          isLoading={!!updatingTaskId}
          onClose={() => setConfirmReopenModal({ isOpen: false, task: null })}
          onConfirm={executeReopenTask}
          title="Reopen Sub-Task?"
          message={`Reopen "${confirmReopenModal.task?.title}"? This will unmark it as completed and adjust the worker task points accordingly.`}
          confirmText="Yes, Reopen Task"
          variant="warning"
        />

        {/* Delete Confirmation Modal (Admin Only) */}
        <ConfirmationModal
          isOpen={confirmDeleteModal.isOpen}
          onClose={() => setConfirmDeleteModal({ isOpen: false, type: 'TASK' })}
          onConfirm={executeDelete}
          isLoading={isDeleting}
          title={confirmDeleteModal.type === 'JOB_CARD' ? 'Delete Vehicle Job Card' : 'Delete Sub-task'}
          message={
            confirmDeleteModal.type === 'JOB_CARD'
              ? `Are you sure you want to permanently delete vehicle card "${currentJob.vehicleName}"? This action cannot be undone.`
              : 'Are you sure you want to delete this sub-task?'
          }
          confirmText="Delete Permanently"
          variant="danger"
        />

        {/* Pin Job Card Modal */}
        <PinJobModal
          isOpen={isPinJobModalOpen}
          onClose={() => setIsPinJobModalOpen(false)}
          job={currentJob || null}
          currentUserId={user?.id || (user as any)?._id}
          isAdmin={isAdmin}
          onTogglePin={handleToggleJobPin}
          isPinningMode={isTogglingJobPin ? pinningJobMode : null}
        />

        {/* Vehicle Photo Upload & Crop Modal */}
        {isVehiclePhotoModalOpen && currentJob && (
          <VehiclePhotoModal
            isOpen={isVehiclePhotoModalOpen}
            job={currentJob}
            onClose={() => setIsVehiclePhotoModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

