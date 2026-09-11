import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobCardByIdQuery,
  useSetTaskStatusMutation,
  useUpdateTaskMutation,
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
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { SlideToSignoff } from '../components/SlideToSignoff';
import { triggerSubTaskConfetti, triggerVehicleReadyConfetti } from '../../../shared/utils/confetti';
import {
  ArrowUp,
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
  Globe,
  ShieldCheck,
  Mail,
  Wrench,
  Package,
  Maximize2,
} from 'lucide-react';
import { getDeliveryStatusInfo } from '../../../shared/utils/dateUtils';
import { ProgressBarBeam } from '../../../shared/components/magicui/AnimatedBeam';
import { ImageViewerModal, ViewerImage } from '../../../shared/components/common/ImageViewerModal';

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

  // Lightbox Image Viewer State
  const [viewerImages, setViewerImages] = useState<ViewerImage[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const openImageViewer = (imgs: ViewerImage[], startIndex = 0) => {
    setViewerImages(imgs);
    setViewerIndex(startIndex);
    setIsViewerOpen(true);
  };

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

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<{
    isOpen: boolean;
    task: TaskItem | null;
    title: string;
    quantityUsed: number;
    unitPrice: number;
    discountAmount: number;
  }>({
    isOpen: false,
    task: null,
    title: '',
    quantityUsed: 1,
    unitPrice: 0,
    discountAmount: 0,
  });

  // Pin & Edit Job Modal States
  const [isPinJobModalOpen, setIsPinJobModalOpen] = useState(false);
  const [isExpandedHeader, setIsExpandedHeader] = useState(false);

  // API Hooks
  const { data: jobResponse, isLoading, isError, refetch } = useGetJobCardByIdQuery(id!, { skip: !id });
  const { data: allUsersResponse } = useGetAllUsersQuery();
  const [setTaskStatus] = useSetTaskStatusMutation();
  const [updateTask, { isLoading: isUpdatingTask }] = useUpdateTaskMutation();
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

  const vehicleViewerImages: ViewerImage[] = React.useMemo(() => {
    if (!currentJob) return [];
    const list: ViewerImage[] = [];
    if (Array.isArray(currentJob.photos) && currentJob.photos.length > 0) {
      currentJob.photos.forEach((p: any) => {
        if (p?.url) {
          list.push({
            url: p.url,
            title: currentJob.vehicleName,
            subtitle: currentJob.vehicleNumber,
            timestamp: p.capturedAt || currentJob.createdAt,
            remarks: p.remarks,
            isThumbnail: Boolean(p.isThumbnail || p.url === currentJob.thumbnailUrl),
          });
        }
      });
    }
    if (currentJob.thumbnailUrl && !list.some((img) => img.url === currentJob.thumbnailUrl)) {
      list.unshift({
        url: currentJob.thumbnailUrl,
        title: currentJob.vehicleName,
        subtitle: currentJob.vehicleNumber,
        timestamp: currentJob.createdAt,
        isThumbnail: true,
      });
    }
    return list;
  }, [currentJob]);

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

  const handleSaveTaskEdit = async () => {
    if (!editingTask.task) return;
    const taskId = editingTask.task.id || editingTask.task._id!;
    setErrorMessage('');
    try {
      await updateTask({
        taskId,
        title: editingTask.title.trim(),
        quantityUsed: editingTask.quantityUsed,
        unitPrice: editingTask.unitPrice,
        discountAmount: editingTask.discountAmount,
      }).unwrap();
      setEditingTask({ isOpen: false, task: null, title: '', quantityUsed: 1, unitPrice: 0, discountAmount: 0 });
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to update task.');
    }
  };

  const handleVerify = async () => {
    if (!currentJob) return;
    try {
      await verifyJobCard({ jobCardId: currentJob.id || currentJob._id! }).unwrap();
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
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* ── TOP NAV / CLEAN HEADER ── */}
        <PageHeader
          backTo="/jobs"
          title={currentJob.vehicleName || 'Vehicle'}
          badge={
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] sm:text-xs font-black tracking-wider text-amber-700 dark:text-amber-300 bg-amber-400/20 border border-amber-400/35 px-2 py-0.5 rounded-md uppercase">
                {currentJob.vehicleNumber}
              </span>
              {currentJob.status && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase border ${
                  currentJob.status === 'COMPLETED'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                }`}>
                  {currentJob.status.replace('_', ' ')}
                </span>
              )}
            </div>
          }
        />

        {/* ── VEHICLE HERO ── */}
        <section className="glass-head-card relative overflow-hidden rounded-3xl p-4 sm:p-5 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_44px_-8px_rgba(0,0,0,0.7)]">
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

            {/* Row 2 — Vehicle Name + Ops + Vehicle Photo Thumbnail */}
            <div className="pt-0.5 flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  {currentJob.vehicleName || 'Vehicle Service'}
                </h1>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                  {totalTasks > 0 ? `${totalTasks} operations` : 'No operations yet'}
                </p>
              </div>

              {/* Vehicle Photo Thumbnail (Click to expand in Lightbox) */}
              {currentJob.thumbnailUrl ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageViewer(vehicleViewerImages, 0);
                  }}
                  className="group/photo relative w-16 h-12 sm:w-20 sm:h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200/90 dark:border-white/10 shadow-sm cursor-pointer hover:border-amber-400/80 transition active:scale-95"
                  title="Click to view vehicle photo fullscreen"
                >
                  <img
                    src={currentJob.thumbnailUrl}
                    alt={currentJob.vehicleName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/photo:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
                  className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-500 hover:bg-amber-400/20 flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
                  title="Capture vehicle photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
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
            {/* Quick Primary Actions Toolbar */}
            <div className="col-span-1 md:col-span-2 p-4 sm:p-5 rounded-3xl glass-modern-card border border-amber-400/25 dark:border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] via-transparent to-sky-500/[0.05] shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                      Job Actions & Operations Hub
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Vehicle camera inspections, card editing, priority pin & deletion
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {/* Photo Studio Button */}
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl sm:rounded-2xl glass-ghost-btn text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-200/90 dark:border-white/10 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 text-xs font-mono font-bold shadow-2xs"
                    title="Vehicle Inspection Photos"
                  >
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Photos ({vehicleViewerImages.length})</span>
                  </button>

                  {/* Pin Priority Button */}
                  <button
                    type="button"
                    onClick={() => setIsPinJobModalOpen(true)}
                    className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl sm:rounded-2xl border text-xs font-mono font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                      isPinned
                        ? 'bg-amber-400/20 border-amber-400/40 text-amber-700 dark:text-amber-300'
                        : 'glass-ghost-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Pin Priority"
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current text-amber-500' : ''}`} />
                    <span>{isJobPinnedForAll ? 'Garage Pin' : isJobPinnedForMe ? 'Pinned' : 'Pin Priority'}</span>
                  </button>

                  {/* Edit Job Button (Admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/edit/${currentJob.id || currentJob._id}`)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl sm:rounded-2xl glass-gold-btn text-slate-950 shadow-sm active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 text-xs font-mono font-black"
                      title="Edit Job Card"
                    >
                      <Edit2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Edit Card</span>
                    </button>
                  )}

                  {/* Delete Job Button (Admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })}
                      className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 text-xs font-mono font-bold shadow-2xs"
                      title="Delete Job Card"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

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
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] space-y-2.5 shadow-2xs">
                    <div
                      onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}/photo`)}
                      className="group flex items-center justify-between gap-3 cursor-pointer"
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
                            {vehicleViewerImages.length > 0
                              ? `${vehicleViewerImages.length} inspection photo${vehicleViewerImages.length > 1 ? 's' : ''} • Studio ready`
                              : 'Capture & upload multi-angle photos'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-amber-400/10 dark:bg-amber-400/15 border border-amber-400/20 text-amber-700 dark:text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors flex items-center gap-1">
                          <span>Studio</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Photo Strip (Click to open Lightbox) */}
                    {vehicleViewerImages.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                        {vehicleViewerImages.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              openImageViewer(vehicleViewerImages, idx);
                            }}
                            className="group/thumb relative w-14 h-11 sm:w-16 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200/90 dark:border-white/10 cursor-pointer hover:border-amber-400 transition active:scale-95 shadow-2xs"
                            title="Click to view photo fullscreen"
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                            {img.isThumbnail && (
                              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                            )}
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-3 h-3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
            ) : isAllCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-emerald-500/5 border border-emerald-500/30 space-y-4 shadow-lg backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                        All Service Operations Complete
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAdmin
                          ? 'Vehicle is ready for QA inspection. Slide the control below to certify sign-off.'
                          : 'Ready for Quality Assurance inspection and manager sign-off.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0 hidden sm:inline">
                    QA Ready
                  </span>
                </div>

                {isAdmin && (
                  <div className="pt-1">
                    <SlideToSignoff
                      onSignoff={handleVerify}
                      isLoading={isVerifying}
                      isVerified={Boolean(currentJob.verifiedAt)}
                      verifierName={currentJob.verifiedBy?.name}
                    />
                  </div>
                )}
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
                    const isService = task.itemType === 'SERVICE';
                    const thumbnailUrl = task.inventoryItem?.thumbnailUrl;
                    const categoryName = task.inventoryItem?.category?.name || (isService ? 'Workshop Service' : task.itemType === 'PRODUCT' ? 'Spares & Parts' : 'Workshop Operation');
                    const unitPrice = task.unitPrice ?? task.finalPrice ?? 0;
                    const finalPrice = task.finalPrice ?? (unitPrice * (task.quantityUsed || 1) - (task.discountAmount || 0));

                    return (
                      <motion.div
                        key={taskId}
                        layout
                        onClick={() => promptTaskStatusChange(task)}
                        className={`group relative rounded-2xl sm:rounded-3xl glass-modern-card p-3 sm:p-3.5 flex gap-3.5 transition-all duration-200 hover:border-amber-400/50 hover:shadow-md overflow-hidden cursor-pointer ${
                          isCompleted ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : ''
                        }`}
                      >
                        {/* -- LEFT SIDE: SQUARE IMAGE / THUMBNAIL (Fixed Square Size matching InventoryPage) -- */}
                        <div
                          onClick={(e) => {
                            if (thumbnailUrl) {
                              e.stopPropagation();
                              openImageViewer([{ url: thumbnailUrl, title: task.title, subtitle: task.itemType === 'PRODUCT' ? 'Spares & Parts' : 'Workshop Service' }], 0);
                            }
                          }}
                          className={`relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 self-center flex items-center justify-center ${
                            thumbnailUrl ? 'cursor-zoom-in group/thumb' : ''
                          }`}
                          title={thumbnailUrl ? 'Click to expand image' : undefined}
                        >
                          {thumbnailUrl ? (
                            <>
                              <img
                                src={thumbnailUrl}
                                alt={task.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-4 h-4" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isService ? (
                                <Wrench className="w-8 h-8 text-violet-400/70" />
                              ) : (
                                <Package className="w-8 h-8 text-amber-500/70" />
                              )}
                            </div>
                          )}

                          {/* Left overlay chip: Type */}
                          <span
                            className={`absolute top-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-md ${
                              isService
                                ? 'bg-violet-500/80 text-white'
                                : task.itemType === 'PRODUCT'
                                ? 'bg-amber-400/90 text-slate-950 font-black'
                                : 'bg-slate-700/80 text-white'
                            }`}
                          >
                            {isService ? 'SVC' : task.itemType === 'PRODUCT' ? 'PART' : 'TASK'}
                          </span>
                        </div>

                        {/* -- RIGHT SIDE: TASK & WORKSHOP DETAILS -- */}
                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            {/* Top Row: Product Name in Colored Text Yellow + Status Action Pill Button */}
                            <div className="flex items-start justify-between gap-1.5">
                              <h4
                                className={`text-xs sm:text-sm font-black transition-colors line-clamp-2 text-amber-500 dark:text-amber-400 tracking-tight max-w-[150px] sm:max-w-[240px] ${
                                  isCompleted ? 'line-through opacity-70' : ''
                                }`}
                              >
                                {task.title}
                              </h4>

                              {/* Status Action Pill Button */}
                              {isCompleted ? (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    promptTaskStatusChange(task);
                                  }}
                                  className="shrink-0 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                  title="Click to reopen task"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  )}
                                  <span>Completed</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    promptTaskStatusChange(task);
                                  }}
                                  className="shrink-0 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-400/15 hover:bg-amber-400/25 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                  title="Click to mark complete"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                                  )}
                                  <span>In Progress</span>
                                </button>
                              )}
                            </div>

                            {/* Completed Details: Avatar + Shared Partner Team */}
                            {isCompleted && completedUser && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <div className="flex items-center -space-x-1.5 shrink-0">
                                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border-2 border-white dark:border-[#080810] flex items-center justify-center text-[9px] font-bold text-emerald-300 shadow-xs">
                                    {completedUser.profileImageUrl ? (
                                      <img src={completedUser.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      completedUser.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
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

                          {/* Bottom Row: SKU/Qty details on left, Action Icons on right (No price, no edit button) */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06] mt-2">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 flex-wrap">
                              {task.inventoryItem?.sku ? (
                                <span className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-white/5 truncate max-w-[130px]">
                                  SKU: {task.inventoryItem.sku}
                                </span>
                              ) : (task.inventoryItem?.id || task.inventoryItem?._id) ? (
                                <span>ID: {(task.inventoryItem.id || task.inventoryItem._id)!.slice(-6).toUpperCase()}</span>
                              ) : null}

                              {task.quantityUsed && task.quantityUsed > 1 && (
                                <span className="bg-amber-400/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-400/20">
                                  Qty: {task.quantityUsed}
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* View Audit Logs */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivityTask(task);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-90 cursor-pointer"
                                title="View Task Audit Logs"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Pin Task */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTaskPin(taskId, isPinnedTask);
                                }}
                                className={`p-1.5 rounded-lg border transition active:scale-90 cursor-pointer ${
                                  isPinnedTask
                                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-600 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                }`}
                                title="Pin task to top"
                              >
                                <Pin className={`w-3 h-3 ${isPinnedTask ? 'fill-current' : ''}`} />
                              </button>

                              {/* Delete Task (Admin) */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteModal({ isOpen: true, type: 'TASK', taskId });
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 transition active:scale-90 cursor-pointer"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}

                {/* Bottom QA Sign-off Action Bar (visible when scrolled down through checklist) */}
                {isAllCompleted && !currentJob.verifiedAt && isAdmin && (
                  <div className="pt-4 pb-2">
                    <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-3 shadow-xl backdrop-blur-xl max-w-md mx-auto">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-xs font-black uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Ready for QA Sign-Off</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Slide below to approve and certify vehicle completion
                      </p>
                      <SlideToSignoff
                        onSignoff={handleVerify}
                        isLoading={isVerifying}
                        isVerified={Boolean(currentJob.verifiedAt)}
                        verifierName={currentJob.verifiedBy?.name}
                      />
                    </div>
                  </div>
                )}

                {/* Move to Top Button at the end of checklist */}
                {sortedTasks.length > 0 && (
                  <div className="pt-3 pb-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-ghost-btn text-xs font-mono font-bold text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200/80 dark:border-white/10 active:scale-95 transition cursor-pointer shadow-xs"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Move to Top</span>
                    </button>
                  </div>
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

      {/* ── EDIT CHECKLIST TASK MODAL (Admin) ── */}
      <AnimatePresence>
        {editingTask.isOpen && (
          <div
            className="fixed inset-0 z-[75] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md"
            onClick={() => setEditingTask({ isOpen: false, task: null, title: '', quantityUsed: 1, unitPrice: 0, discountAmount: 0 })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-[#0b0b14] border border-white/[0.09] shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/20">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">Edit Checklist Task</h3>
                    <p className="text-[10px] font-mono text-slate-400">Update item details & billing</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingTask({ isOpen: false, task: null, title: '', quantityUsed: 1, unitPrice: 0, discountAmount: 0 })}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition active:scale-90"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                    Task / Item Title
                  </label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:border-sky-400 outline-none transition"
                    placeholder="Task title"
                  />
                </div>

                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingTask.quantityUsed}
                      onChange={(e) => setEditingTask((prev) => ({ ...prev, quantityUsed: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono font-bold focus:border-sky-400 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                      Rate / Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingTask.unitPrice}
                      onChange={(e) => setEditingTask((prev) => ({ ...prev, unitPrice: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono font-bold focus:border-sky-400 outline-none transition"
                    />
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingTask.discountAmount}
                    onChange={(e) => setEditingTask((prev) => ({ ...prev, discountAmount: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono font-bold focus:border-sky-400 outline-none transition"
                  />
                </div>

                {/* Total Preview Pill */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Total Calculated:</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    ₹{Math.max(0, (editingTask.unitPrice * editingTask.quantityUsed) - editingTask.discountAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTask({ isOpen: false, task: null, title: '', quantityUsed: 1, unitPrice: 0, discountAmount: 0 })}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingTask || !editingTask.title.trim()}
                  onClick={handleSaveTaskEdit}
                  className="py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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



      {/* ── LIGHTBOX IMAGE VIEWER MODAL ── */}
      <ImageViewerModal
        isOpen={isViewerOpen}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};
