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
  useVerifyJobCardMutation,
  JobCardData,
  TaskItem,
} from '../api/jobApi';
import { useGetAllUsersQuery } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
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
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });

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
        {/* ── CLEAN HEADER ── */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col gap-4">
            {/* Top Row: Back & Status */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/jobs')}
                className="group flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {getGarageDuration()}
                </span>
                {isAllCompleted ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    In Work
                  </span>
                )}
              </div>
            </div>

            {/* Title & Info */}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {currentJob.vehicleName}
                </h1>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditDetails({
                        vehicleName: currentJob.vehicleName,
                        vehicleNumber: currentJob.vehicleNumber,
                        vehicleColor: currentJob.vehicleColor,
                        customerName: currentJob.customerName,
                        customerMobile: currentJob.customerMobile,
                        customerEmail: currentJob.customerEmail,
                      });
                      setIsEditingDetails(true);
                    }}
                    className="p-2 rounded-full text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:shadow-sm border border-transparent hover:border-amber-200 dark:hover:border-amber-500/30 transition-all"
                    title="Edit Details"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 dark:text-white">
                  {currentJob.vehicleNumber}
                </span>
                {currentJob.vehicleColor && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Palette className="h-3.5 w-3.5 text-slate-400" />
                    {currentJob.vehicleColor}
                  </span>
                )}
                {currentJob.verifiedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* Customer Details Line */}
            {(currentJob.customerName || currentJob.customerMobile || currentJob.customerEmail) && (
              <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 dark:text-slate-400">
                  {currentJob.customerName && (
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      {currentJob.customerName}
                    </span>
                  )}
                  {currentJob.customerMobile && (
                    <a href={`tel:${currentJob.customerMobile}`} className="flex items-center gap-1.5 font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {currentJob.customerMobile}
                    </a>
                  )}
                  {currentJob.customerEmail && (
                    <a href={`mailto:${currentJob.customerEmail}`} className="flex items-center gap-1.5 font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {currentJob.customerEmail}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

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

        {/* ── FINAL VERIFICATION CARD / PENDING APPROVAL CARD ── */}
        {currentJob.verifiedAt ? (
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Final Verification Complete
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                    Verified by <span className="font-bold text-slate-900 dark:text-white">{currentJob.verifiedBy?.name || 'Garage Admin'}</span> on{' '}
                    <span className="font-mono font-bold">
                      {new Intl.DateTimeFormat(undefined, {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(currentJob.verifiedAt))}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAdmin ? 'Administrators can still adjust tasks if needed.' : 'This job card is verified and locked for editing.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isAllCompleted ? (
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-slate-900/40 p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                  <Sparkles className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Pending Approval & Final Quality Check
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold animate-pulse">
                      READY FOR VERIFICATION
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                    All sub-tasks completed! Inspect vehicle work before signing off.
                  </p>
                </div>
              </div>

              <button
                disabled={isVerifying}
                onClick={handleVerify}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-60 shrink-0"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  '✓ Final Verify Job Card'
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

        {/* Unified Task List Filter Tabs with Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
              Task Status Filter
            </h2>
          </div>

          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'ALL', label: 'ALL', count: totalTasks },
                { id: 'PENDING', label: 'PENDING', count: totalTasks - completedCount },
                { id: 'COMPLETED', label: 'COMPLETED', count: completedCount },
              ] as const
            ).map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as TaskFilterType)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white shadow-xs">
                    {tab.count}
                  </span>
                </button>
              );
            })}
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
                const auditText = getAuditText(task);

                return (
                  <motion.div
                    key={taskId}
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    onPointerDown={() => startLongPress(task)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    className={`bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Checkbox Button */}
                      <button
                        type="button"
                        disabled={isTaskUpdating || (!!currentJob.verifiedAt && !isAdmin)}
                        onClick={() => promptTaskStatusChange(task)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 active:scale-90 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'border-2 border-slate-300 dark:border-slate-700 hover:border-amber-400 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isTaskUpdating ? (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        ) : (
                          isCompleted && <Check className="w-4 h-4 stroke-[3]" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs sm:text-sm font-bold transition-all ${
                              isCompleted
                                ? 'text-slate-700 dark:text-slate-200'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>

                          {/* Shared Work Badge */}
                          {task.isShared && task.partners && task.partners.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              🤝 Shared ({(1 / (1 + task.partners.length)).toFixed(2)} pt)
                            </span>
                          )}
                        </div>

                        {/* Audit Info */}
                        {isCompleted && auditText && (
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                            {/* Stacked Avatars for all workers */}
                            <div className="flex -space-x-1.5 overflow-visible shrink-0">
                              {/* Primary worker */}
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-emerald-100 font-bold text-emerald-700 dark:border-slate-900 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] z-10">
                                {task.completedBy?.profileImageUrl ? (
                                  <img src={task.completedBy.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  task.completedBy?.name?.charAt(0).toUpperCase() || 'W'
                                )}
                              </div>
                              {/* Partner avatars */}
                              {(task.partners || []).map((partner, pi) => (
                                <div
                                  key={partner.id || partner._id || pi}
                                  className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-amber-100 font-bold text-amber-700 dark:border-slate-900 dark:bg-amber-500/20 dark:text-amber-300 text-[10px]"
                                  style={{ zIndex: 9 - pi }}
                                  title={partner.name}
                                >
                                  {partner.profileImageUrl ? (
                                    <img src={partner.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    partner.name?.charAt(0).toUpperCase() || 'P'
                                  )}
                                </div>
                              ))}
                            </div>
                            <span className="truncate">{auditText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isCompleted ? (
                        <button
                          disabled={isTaskUpdating || (!!currentJob.verifiedAt && !isAdmin)}
                          onClick={() => promptTaskStatusChange(task)}
                          className="px-3 py-1.5 bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shadow-xs disabled:opacity-60"
                        >
                          {isTaskUpdating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          disabled={isTaskUpdating || (!!currentJob.verifiedAt && !isAdmin)}
                          onClick={() => promptTaskStatusChange(task)}
                          className="px-2.5 py-1 bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 text-[10px] font-mono font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60"
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

                      {isAdmin && isEditingDetails && (
                        <button
                          onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'TASK', taskId })}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete Sub-task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Activity Modal */}
        {activityTask && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={() => setActivityTask(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">Task activity log</h2>
                  <p className="text-xs text-slate-500">{activityTask.title}</p>
                </div>
                <button onClick={() => setActivityTask(null)} className="text-xs text-slate-500">
                  Close
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {activityTask.activityLog?.length ? (
                  [...activityTask.activityLog].reverse().map((entry, index) => (
                    <div key={`${entry.at}-${index}`} className="border-l-2 border-amber-400 pl-3 text-xs">
                      <b>{entry.action === 'COMPLETED' ? 'Completed' : 'Reopened'}</b> by{' '}
                      {entry.user?.name || 'Team member'}
                      <p className="text-slate-500 mt-0.5">
                        {new Intl.DateTimeFormat(undefined, {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        }).format(new Date(entry.at))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No activity recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

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
      </main>
    </div>
  );
};
