import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobCardsQuery,
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
  Camera,
} from 'lucide-react';

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: jobsResponse, isLoading, isError } = useGetJobCardsQuery();
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

  // Handle flat vs paginated response shape
  const rawData = jobsResponse?.data;
  const jobsList: JobCardData[] = Array.isArray(rawData)
    ? rawData
    : rawData?.jobs || [];

  const currentJob = jobsList.find(
    (j: JobCardData) => j.id === id || j._id === id
  );

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
        <div className="max-w-md mx-auto my-16 p-6 industrial-card rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-sm font-bold uppercase">Job Card Not Found</h2>
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
      await updateJob({ jobCardId: currentJob.id || currentJob._id!, ...editDetails }).unwrap();
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
        {/* ── ULTRA-MODERN VEHICLE HERO HEADER ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl border border-zinc-800/80 shadow-2xl bg-[#060b17] min-h-[220px] sm:min-h-[250px] flex flex-col justify-between p-4 sm:p-5 select-none"
        >
          {/* Background Vehicle Image with Clean Left-to-Right Medium Gradient Overlay (Matching Screenshot) */}
          {currentJob.thumbnailUrl ? (
            <>
              <img
                src={currentJob.thumbnailUrl}
                alt={currentJob.vehicleName}
                className="absolute inset-0 w-full h-full object-cover object-center z-0 scale-[1.01]"
              />
              {/* Clean left-to-right medium gradient tone */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b1328] via-[#0b1328]/80 via-42% to-transparent z-0" />
              {/* Subtle top/bottom soft vignette to ground buttons & corners */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1328]/60 via-transparent to-black/25 z-0" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#101b33] via-[#0b1324] to-[#060b17] z-0" />
              <div className="absolute right-4 bottom-2 opacity-5 pointer-events-none z-0">
                <Car className="w-52 h-52 text-white" />
              </div>
            </>
          )}

          {/* Top Row: Back Arrow Button (Left) + Pinned / Edit Photo / In Work Badges (Right) */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black/70 hover:bg-black/90 border border-white/15 text-white flex items-center justify-center backdrop-blur-md transition active:scale-95 shadow-md shrink-0"
              title="Back to Jobs List"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Right Action Badges & Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              {/* Pinned Pill Button */}
              <button
                type="button"
                onClick={() => setIsPinJobModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-black text-[11px] sm:text-xs uppercase tracking-wider backdrop-blur-md transition active:scale-95 border ${
                  currentJob.isPinnedForAll ||
                  (Array.isArray(currentJob.pinnedBy) &&
                    currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id)))
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-400/25 ring-1 ring-amber-400'
                    : 'bg-black/60 text-amber-300 border-amber-400/40 hover:bg-black/80'
                }`}
                title="Pin Job Card (Workshop or Personal)"
              >
                <Pin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                  currentJob.isPinnedForAll ||
                  (Array.isArray(currentJob.pinnedBy) &&
                    currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id)))
                    ? 'fill-zinc-950 stroke-[2.5]'
                    : 'fill-amber-300 stroke-[2.5]'
                }`} />
                <span>
                  {currentJob.isPinnedForAll
                    ? 'PINNED'
                    : Array.isArray(currentJob.pinnedBy) &&
                      currentJob.pinnedBy.some((p: any) => (typeof p === 'string' ? p : p.id || p._id) === (user?.id || (user as any)?._id))
                    ? 'PINNED'
                    : 'PIN'}
                </span>
              </button>

              {/* EDIT PHOTO Glowing Amber Button */}
              <button
                type="button"
                onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition active:scale-95 shrink-0"
                title="Edit Vehicle Photo in Studio"
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                <span>EDIT PHOTO</span>
              </button>

              {/* IN WORK / READY Status Badge */}
              {isAllCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-mono font-black text-[11px] sm:text-xs uppercase tracking-wider backdrop-blur-md shadow-xs shrink-0">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  READY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 font-mono font-black text-[11px] sm:text-xs uppercase tracking-wider backdrop-blur-md shadow-xs shrink-0">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  IN WORK
                </span>
              )}
            </div>
          </div>

          {/* Bottom Info: Vehicle Name, Plate, Color, Garage Duration & Icon-only Expand Toggle */}
          <div className="relative z-10 space-y-2.5 pt-4">
            {/* Title Row: SWIFT + Edit Pencil */}
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {currentJob.vehicleName}
              </h1>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate(`/jobs/edit/${currentJob.id || currentJob._id}`)}
                  className="p-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-zinc-300 hover:text-white transition active:scale-95 backdrop-blur-md shadow-sm"
                  title="Edit Job Card"
                >
                  <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Sub Row: Plate Pill, Color Pill, Garage Time & Icon-only Expand/Collapse Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Plate Badge */}
                <span className="inline-block text-xs font-mono font-black text-white bg-black/90 border border-white/15 px-2.5 py-1 rounded-xl backdrop-blur-md shadow-md">
                  {currentJob.vehicleNumber}
                </span>

                {/* Color Badge */}
                {currentJob.vehicleColor && (
                  <span className="inline-flex items-center gap-1.5 bg-black/70 border border-white/15 text-zinc-200 font-mono text-xs px-2.5 py-1 rounded-xl backdrop-blur-md shadow-sm">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    {currentJob.vehicleColor}
                  </span>
                )}

                {/* Garage Time */}
                <span className="text-xs font-mono text-zinc-200 font-bold flex items-center gap-1 pl-0.5 drop-shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {getGarageDuration()}
                </span>
              </div>

              {/* Icon-Only Expand/Collapse Toggle Button */}
              <button
                type="button"
                onClick={() => setIsExpandedHeader((prev) => !prev)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-md backdrop-blur-md ${
                  isExpandedHeader
                    ? 'bg-amber-400 text-zinc-950 border-amber-400'
                    : 'bg-black/70 hover:bg-black/90 text-zinc-200 hover:text-white border-white/15'
                }`}
                title={isExpandedHeader ? 'Collapse Creator & Customer Details' : 'Expand Creator & Customer Details'}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpandedHeader ? 'rotate-180 text-zinc-950' : 'text-zinc-200'
                  }`}
                />
              </button>
            </div>

            {/* Expandable Collapsible Drawer: Shows Creator Info & Customer Contact Info */}
            <AnimatePresence>
              {isExpandedHeader && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-white/15 pt-3 mt-2 space-y-2.5"
                >
                  {/* Creator Info & Date Strip */}
                  <div className="p-3 rounded-2xl bg-black/75 border border-white/15 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs font-black text-amber-300 shrink-0">
                        {currentJob.createdBy?.profileImageUrl ? (
                          <img
                            src={currentJob.createdBy.profileImageUrl}
                            alt={currentJob.createdBy.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          currentJob.createdBy?.name?.charAt(0).toUpperCase() || 'SA'
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono text-zinc-400">Created by</span>
                          <span className="font-bold text-xs text-white truncate">
                            {currentJob.createdBy?.name || 'Service Advisor'}
                          </span>
                          {currentJob.createdBy?.role && (
                            <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                              {currentJob.createdBy.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] font-mono text-zinc-300 shrink-0">
                      <span className="font-semibold text-white">
                        {new Date(currentJob.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-zinc-400 ml-1.5">
                        {new Date(currentJob.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Customer Contact Strip */}
                  {(currentJob.customerName || currentJob.customerMobile || currentJob.customerEmail) && (
                    <div className="p-2.5 rounded-2xl bg-black/75 border border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-200 backdrop-blur-md shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold text-white">
                          {currentJob.customerName || 'Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentJob.customerMobile && (
                          <a
                            href={`tel:${currentJob.customerMobile}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold transition active:scale-95"
                            title="Call Customer"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{currentJob.customerMobile}</span>
                          </a>
                        )}
                        {currentJob.customerEmail && (
                          <a
                            href={`mailto:${currentJob.customerEmail}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-mono text-xs font-semibold transition active:scale-95"
                            title="Email Customer"
                          >
                            <Mail className="w-3 h-3 text-sky-400" />
                            <span>{currentJob.customerEmail}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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

        {/* ── FINAL VERIFICATION CARD / STATUS BANNER ── */}
        {currentJob.verifiedAt ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 p-4 sm:p-5 shadow-xs backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono">
                      Quality Verified & Passed
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                      DELIVERY READY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Verified on{' '}
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(currentJob.verifiedAt))}
                    </span>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-mono text-slate-400 block">
                  {isAdmin ? 'Admin task adjustments enabled' : 'Job card is locked'}
                </span>
              </div>
            </div>
          </div>
        ) : isAllCompleted ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-emerald-500/10 border-2 border-amber-400/50 dark:border-amber-400/40 p-4 sm:p-5 shadow-lg shadow-amber-500/10 backdrop-blur-md">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-400/30">
                  <Sparkles className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 font-mono">
                      All Tasks Completed
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold animate-pulse">
                      READY FOR FINAL QA
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Vehicle service is 100% complete. Perform final quality check to sign off.
                  </p>
                </div>
              </div>

              <button
                disabled={isVerifying}
                onClick={handleVerify}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 shrink-0 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Final Verify Job Card</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}

        {/* Progress Bar & Counter */}
        <div className="industrial-card p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase flex items-center gap-1.5">
              Service Progress Checklist
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold">
              {completedCount} / {totalTasks} Completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Unified Task List Filter Tabs with Badges (Matching Active Jobs Page) */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-slate-50/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-y border-slate-200/60 dark:border-slate-800/60 shadow-xs">
          <div className="flex gap-1.5 p-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs backdrop-blur-sm">
            {(
              [
                { key: 'ALL', label: 'All Tasks', count: totalTasks },
                { key: 'PENDING', label: 'In Work', count: totalTasks - completedCount },
                { key: 'COMPLETED', label: 'Completed', count: completedCount },
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
                    className="absolute inset-0 bg-amber-400/20 dark:bg-amber-500/20 border border-amber-400/40 dark:border-amber-500/30 rounded-lg"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 font-black">{label}</span>
                {count > 0 && (
                  <span
                    className={`relative z-10 text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                      statusFilter === key
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
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
                    className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs cursor-pointer select-none overflow-hidden ${
                      effectiveIsPinned
                        ? 'border-amber-400/80 dark:border-amber-500/70 ring-1.5 ring-amber-400/20'
                        : isCompleted
                        ? 'border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10'
                        : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    onClick={() => setExpandedTaskId((prev) => (prev === taskId ? null : taskId))}
                  >
                    {/* Top Row: Checkbox, Title & Points (Line 1), Avatars & Time (Line 2) */}
                    <div className="p-3.5 sm:p-4 flex items-start gap-3">
                      {/* Checkbox Button with Yellow Ring for non-completed */}
                      <button
                        type="button"
                        disabled={isTaskUpdating || (!!currentJob.verifiedAt && !isAdmin)}
                        onClick={(e) => {
                          e.stopPropagation();
                          promptTaskStatusChange(task);
                        }}
                        className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 active:scale-90 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'border-2 border-amber-400 dark:border-amber-400/90 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-400/10'
                        }`}
                      >
                        {isTaskUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        ) : (
                          isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
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

