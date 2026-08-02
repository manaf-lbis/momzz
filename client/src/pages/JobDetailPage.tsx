import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobCardsQuery,
  useSetTaskStatusMutation,
  useAddTaskMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
  useUpdateJobMutation,
  JobCardData,
  TaskItem,
} from '../api/jobApi';
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
} from 'lucide-react';

type TaskFilterType = 'ALL' | 'PENDING' | 'COMPLETED';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskFilterType>('ALL');

  // Confirmation Modals State
  const [confirmTaskModal, setConfirmTaskModal] = useState<{
    isOpen: boolean;
    task: TaskItem | null;
    action: 'COMPLETE' | 'REOPEN';
  }>({
    isOpen: false,
    task: null,
    action: 'COMPLETE',
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
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDetails, setEditDetails] = useState<Partial<JobCardData>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: jobsResponse, isLoading, isError } = useGetJobCardsQuery();
  const [setTaskStatus] = useSetTaskStatusMutation();
  const [addTask] = useAddTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [deleteJobCard] = useDeleteJobCardMutation();
  const [updateJob, { isLoading: isUpdatingDetails }] = useUpdateJobMutation();

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
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
        <Navbar />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-4">
          {[0, 1, 2, 3].map((item) => <motion.div key={item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-2xl h-20 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300/50 dark:border-zinc-800"><motion.div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 dark:via-zinc-700/50 to-transparent" animate={{ x: ['-120%', '260%'] }} transition={{ duration: 1.25, repeat: Infinity, delay: item * 0.12, ease: 'linear' }} /></motion.div>)}
          <div className="flex justify-center items-center gap-2 text-xs font-mono text-amber-600 dark:text-yellow-400"><span className="w-5 h-5 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-amber-400/30 border-l-transparent animate-spin shadow-lg shadow-amber-400/20" />SYNCING WORKROOM</div>
        </div>
      </div>
    );
  }

  if (isError || !currentJob) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-6 industrial-card rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 dark:text-yellow-400 mx-auto" />
          <h2 className="text-sm font-bold uppercase">Job Card Not Found</h2>
          <button
            onClick={() => navigate('/jobs')}
            className="px-3 py-1.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs rounded-xl"
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

  const saveJobDetails = async () => {
    try {
      await updateJob({ jobCardId: currentJob.id || currentJob._id!, ...editDetails }).unwrap();
      setIsEditingDetails(false);
    } catch (err: any) { setErrorMessage(err?.data?.message || 'Failed to update job details.'); }
  };

  // Filter tasks based on selected status filter
  const filteredTasks = tasks.filter((t: TaskItem) => {
    if (statusFilter === 'PENDING') return t.status === 'OPEN';
    if (statusFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  // Sorted: OPEN first, COMPLETED at bottom
  const sortedTasks = [...filteredTasks].sort((a: TaskItem, b: TaskItem) => {
    if (a.status === b.status) return 0;
    return a.status === 'OPEN' ? -1 : 1;
  });

  const getAuditText = (task: TaskItem) => {
    if (!task.completedAt || !currentJob.createdAt) return null;
    const created = new Date(currentJob.createdAt).getTime();
    const completed = new Date(task.completedAt).getTime();
    const elapsedMins = Math.max(1, Math.round((completed - created) / (1000 * 60)));
    return `Done by ${task.completedBy?.name || 'Technician'} • ${elapsedMins} mins after arrival`;
  };

  // Always show confirmation modal before any status change (COMPLETE or REOPEN)
  const promptTaskStatusChange = (task: TaskItem) => {
    const action = task.status === 'COMPLETED' ? 'REOPEN' : 'COMPLETE';
    if (action === 'REOPEN') {
      playReopenSound();
    }
    setConfirmTaskModal({ isOpen: true, task, action });
  };

  const executeTaskStatusChange = async (task: TaskItem, action: 'COMPLETE' | 'REOPEN') => {
    setErrorMessage('');
    const taskId = task.id || task._id!;
    setUpdatingTaskId(taskId);
    try {
      await setTaskStatus({
        taskId,
        action,
        currentUserName: user?.name,
        currentUserId: user?.id,
      }).unwrap();

      if (action === 'COMPLETE') {
        // Start both celebration effects together after the task is confirmed.
        playCompletionSound();
        triggerSubTaskConfetti();

        // Check if completing this task finishes all tasks on the car
        if (completedCount + 1 === totalTasks) {
          setTimeout(() => {
            triggerVehicleReadyConfetti();
          }, 300);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.data?.message || `Failed to set task status.`);
    } finally {
      setUpdatingTaskId(null);
      setConfirmTaskModal({ isOpen: false, task: null, action: 'COMPLETE' });
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
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 space-y-3">
        {/* Header */}
        <div className="industrial-card rounded-2xl p-3.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              onClick={() => navigate('/jobs')}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Car className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
                  {currentJob.vehicleName} {currentJob.vehicleColor && <span className="text-amber-500 dark:text-yellow-400">({currentJob.vehicleColor})</span>}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-yellow-400 border border-amber-500/20 px-2 py-0.5 rounded-full">⏱ {getGarageDuration()}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">REG: <b className="uppercase">{currentJob.vehicleNumber}</b>{!isAdmin && currentJob.customerMobile ? ` • ${currentJob.customerMobile}` : ''}</span>
                {isAllCompleted ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full font-mono text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Delivery
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-pulse" /> In Workroom
                  </span>
                )}
              </div>
            </div>
          </div>

          {isAdmin && <div className="flex gap-2"><button onClick={() => { setEditDetails({ vehicleName: currentJob.vehicleName, vehicleNumber: currentJob.vehicleNumber, vehicleColor: currentJob.vehicleColor, customerName: currentJob.customerName, customerMobile: currentJob.customerMobile, customerEmail: currentJob.customerEmail }); setIsEditingDetails(true); }} className="px-2 py-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-600 dark:text-yellow-400 text-xs font-mono rounded-xl">Edit</button><button onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'JOB_CARD' })} className="p-2 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-xs font-mono rounded-xl transition-all active:scale-95" title="Delete Job Card"><Trash2 className="w-4 h-4" /></button></div>}
        </div>

        {isAdmin && (currentJob.customerName || currentJob.customerMobile || currentJob.customerEmail) && <div className="text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 p-3 text-zinc-600 dark:text-zinc-300">Customer: {currentJob.customerName || '—'} · {currentJob.customerMobile || '—'} · {currentJob.customerEmail || '—'}</div>}

        {isEditingDetails && <div className="industrial-card rounded-2xl p-4 space-y-3"><h2 className="text-sm font-bold">Edit vehicle and customer details</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['vehicleName', 'vehicleNumber', 'vehicleColor', 'customerName', 'customerMobile', 'customerEmail'] as const).map((field) => <input key={field} value={(editDetails[field] as string) || ''} onChange={(e) => setEditDetails((prev) => ({ ...prev, [field]: e.target.value }))} placeholder={field.replace(/([A-Z])/g, ' $1')} className="industrial-input rounded-xl p-2 text-sm" />)}</div><div className="flex gap-2"><button onClick={() => setIsEditingDetails(false)} className="px-3 py-2 text-xs">Cancel</button><button disabled={isUpdatingDetails} onClick={saveJobDetails} className="px-3 py-2 rounded-xl bg-amber-400 text-zinc-950 text-xs font-bold">{isUpdatingDetails ? 'Saving...' : 'Save changes'}</button></div></div>}

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Progress Bar & Vehicle Ready Banner */}
        <div className="industrial-card p-3.5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-zinc-400 font-bold uppercase flex items-center gap-1.5">
              Service Progress Checklist
            </span>
            <span className="text-amber-600 dark:text-yellow-400 font-extrabold">
              {completedCount} / {totalTasks} Completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Unified Task List Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500 dark:text-yellow-400" />
            <h2 className="text-xs font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400">
              TASK STATUS FILTER
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {(['ALL', 'PENDING', 'COMPLETED'] as TaskFilterType[]).map((ft) => (
              <button
                key={ft}
                onClick={() => setStatusFilter(ft)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                  statusFilter === ft
                    ? 'bg-yellow-400 text-zinc-950 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        {/* Admin: Add Sub-task with Inventory Auto-Complete */}
        {isAdmin && (
          <div className="industrial-card p-2.5 rounded-2xl max-w-md mx-auto w-full">
            <TaskAutoComplete
              value={newTaskTitle}
              onChange={setNewTaskTitle}
              onAddTask={handleAddTask}
              placeholder="Search or type a sub-task..."
              disabled={false}
            />
          </div>
        )}

        {/* Sub-Task Checklist */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="p-8 industrial-card rounded-2xl text-center text-zinc-500 text-xs font-mono space-y-1">
              <p className="uppercase font-bold">No tasks match filter ({statusFilter})</p>
              <p className="text-[11px] text-zinc-400">Select 'ALL' to view all job card sub-tasks.</p>
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
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    className={`bg-white/70 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-sm ${
                      isCompleted
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Interactive Checkbox */}
                      <button
                        type="button"
                        disabled={isTaskUpdating}
                        onClick={() => promptTaskStatusChange(task)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'border-2 border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-yellow-400 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {isTaskUpdating ? (
                          <Loader2 className="w-4 h-4 text-amber-500 dark:text-yellow-400 animate-spin" />
                        ) : (
                          isCompleted && <Check className="w-4 h-4 stroke-[3]" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <p
                          className={`text-xs sm:text-sm font-bold transition-all ${
                            isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {task.title}
                        </p>

                        {/* Task Audit Metadata */}
                        {isCompleted && auditText && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="w-3 h-3 shrink-0 text-emerald-500" />
                            <span className="font-semibold">{auditText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {!isCompleted ? (
                        <button
                          disabled={isTaskUpdating}
                          onClick={() => promptTaskStatusChange(task)}
                          className="px-3 py-1.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-60"
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
                          disabled={isTaskUpdating}
                          onClick={() => promptTaskStatusChange(task)}
                          className="px-2.5 py-1 bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 text-[10px] font-mono font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
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

                      {isAdmin && (
                        <button
                          onClick={() => setConfirmDeleteModal({ isOpen: true, type: 'TASK', taskId })}
                          className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
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

        {/* Task Status Confirmation Modal (COMPLETE & REOPEN) */}
        <ConfirmationModal
          isOpen={confirmTaskModal.isOpen}
          isLoading={!!updatingTaskId}
          onClose={() => setConfirmTaskModal({ isOpen: false, task: null, action: 'COMPLETE' })}
          onConfirm={() =>
            confirmTaskModal.task &&
            executeTaskStatusChange(confirmTaskModal.task, confirmTaskModal.action)
          }
          title={confirmTaskModal.action === 'COMPLETE' ? 'Complete Sub-Task?' : 'Reopen Sub-Task?'}
          message={
            confirmTaskModal.action === 'COMPLETE'
              ? `Mark "${confirmTaskModal.task?.title}" as completed for ${currentJob.vehicleName}?`
              : `Reopen "${confirmTaskModal.task?.title}" — this will unmark it and decrement the worker's task count.`
          }
          confirmText={confirmTaskModal.action === 'COMPLETE' ? 'Yes, Complete' : 'Yes, Reopen'}
          variant={confirmTaskModal.action === 'REOPEN' ? 'warning' : 'primary'}
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
