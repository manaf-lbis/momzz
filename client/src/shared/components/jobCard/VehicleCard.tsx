import React, { useState } from 'react';
import {
  JobCardData,
  useSetTaskStatusMutation,
} from '../../../features/jobs/api/jobApi';

import {
  CheckCircle2,
  Clock,
  Check,
  Sparkles,
  Car,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { playReopenSound } from '../../utils/completionSound';
import { getDeliveryStatusInfo } from '../../utils/dateUtils';
import { ProgressBarBeam } from '../magicui/AnimatedBeam';

interface VehicleCardProps {
  job: JobCardData;
  compact?: boolean;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ job, compact = false }) => {
  const { isAdmin } = useAuth();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [taskError, setTaskError] = useState('');
  const [confirmReopen, setConfirmReopen] = useState<{ taskId: string; title: string } | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const [setTaskStatus] = useSetTaskStatusMutation();

  const tasksList = job.tasks || [];
  const totalTasks = tasksList.length;
  const completedTasks = tasksList.filter((t) => t.status === 'COMPLETED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isReady = totalTasks > 0 && completedTasks === totalTasks;

  // Extract unique active mechanics working/completed tasks on this car
  const assignedWorkersMap = new Map<string, string>();
  tasksList.forEach((t) => {
    if (t.completedBy && t.completedBy.name) {
      assignedWorkersMap.set(t.completedBy.name, t.completedBy.name);
    }
  });
  const assignedWorkers = Array.from(assignedWorkersMap.values());

  // Format Elapsed Time
  const getElapsedTime = (createdDateStr: string) => {
    const start = new Date(createdDateStr).getTime();
    const now = new Date().getTime();
    const diffMs = Math.max(0, now - start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getTaskAudit = (task: JobCardData['tasks'][number]) => {
    if (!task.completedAt) return null;
    const startedAt = new Date(task.createdAt || job.createdAt).getTime();
    const finishedAt = new Date(task.completedAt);
    const minutes = Math.max(1, Math.round((finishedAt.getTime() - startedAt) / 60000));
    const finishedLabel = new Intl.DateTimeFormat(undefined, {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }).format(finishedAt);
    return `Completed by ${task.completedBy?.name || 'Technician'} • Took ${minutes} min • Finished ${finishedLabel}`;
  };

  const handleToggle = async (taskId: string, currentStatus: string) => {
    setTaskError('');
    setUpdatingTaskId(taskId);
    const action = currentStatus === 'COMPLETED' ? 'REOPEN' : 'COMPLETE';
    try {
      await setTaskStatus({ taskId, action }).unwrap();
    } catch (err: any) {
      const msg = err?.data?.message || `Failed to ${action === 'COMPLETE' ? 'complete' : 'reopen'} task.`;
      setTaskError(msg);
      setTimeout(() => setTaskError(''), 5000);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleReopen = async () => {
    if (!confirmReopen) return;
    setIsReopening(true);
    setUpdatingTaskId(confirmReopen.taskId);
    setTaskError('');
    try {
      await setTaskStatus({ taskId: confirmReopen.taskId, action: 'REOPEN' }).unwrap();
    } catch (err: any) {
      const msg = err?.data?.message || 'Failed to reopen task.';
      setTaskError(msg);
      setTimeout(() => setTaskError(''), 5000);
    } finally {
      setIsReopening(false);
      setUpdatingTaskId(null);
      setConfirmReopen(null);
    }
  };

  const promptReopen = (taskId: string, title: string) => {
    playReopenSound();
    setConfirmReopen({ taskId, title });
  };

  const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);

  return (
    <div className="relative bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 hover:border-amber-400/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs dark:shadow-xl transition-all space-y-4 backdrop-blur-xl">
      {/* Content wrapper */}
      <div className="relative z-10 space-y-4">
        {/* Header: Vehicle Name & Info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => compact && setIsExpanded(!isExpanded)}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isReady
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              <Car className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white uppercase truncate">
                  {job.vehicleName}
                </h3>
                {compact && (
                  <span className="text-slate-400 hover:text-amber-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-slate-950 bg-amber-400 px-2.5 py-0.5 rounded-md border border-amber-500/50 shadow-xs tracking-wider">
                  {job.vehicleNumber}
                </span>
                {job.expectedDeliveryDate && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${deliveryInfo.badgeClass}`}>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{deliveryInfo.shortLabel}</span>
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">⏱ {getElapsedTime(job.createdAt)} in garage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Error Banner */}
        {taskError && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-[11px] font-mono text-red-500">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            {taskError}
          </div>
        )}

        {/* Live Dynamic Progress Bar */}
        <div className="space-y-1.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Progress</span>
            <span className="font-black text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25">
              {completedTasks} / {totalTasks} Tasks ({progressPercent}%)
            </span>
          </div>
          <ProgressBarBeam progress={progressPercent} />
        </div>

        {/* Assigned Mechanics */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 text-[11px]">Mechanics:</span>
            {assignedWorkers.length === 0 ? (
              <span className="text-slate-500 italic text-[11px]">None assigned</span>
            ) : (
              assignedWorkers.map((workerName, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20"
                >
                  ⚡ {workerName}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Expanded Checklist */}
        {isExpanded && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                TASK CHECKLIST
              </p>
              {compact && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                >
                  Collapse
                </button>
              )}
            </div>

            <div className="space-y-2">
              {job.tasks.length === 0 ? (
                <p className="text-xs font-mono text-slate-400 italic text-center py-2">No tasks added yet.</p>
              ) : (
                [...job.tasks].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })).map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  const taskId = task.id || (task as any)._id;
                  const isTaskUpdating = updatingTaskId === taskId;
                  return (
                    <div
                      key={taskId}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-50/80 dark:bg-slate-950/70 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium">
                          {task.title}
                        </p>
                        {isCompleted && getTaskAudit(task) && (
                          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {getTaskAudit(task)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <button
                            disabled={isTaskUpdating}
                            onClick={() => promptReopen(taskId, task.title)}
                            className="min-h-[44px] min-w-[64px] px-3 py-2 rounded-xl text-xs font-bold font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 transition-all flex items-center justify-center gap-1.5 active:scale-90 disabled:opacity-50 cursor-pointer"
                          >
                            {isTaskUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Reopen</span>
                          </button>
                        ) : (
                          <button
                            disabled={isTaskUpdating}
                            onClick={() => handleToggle(taskId, task.status)}
                            className="min-h-[44px] min-w-[70px] px-3.5 py-2.5 rounded-xl text-xs font-black font-mono bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-amber-400/20 cursor-pointer"
                          >
                            {isTaskUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            <span>Done</span>
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reopen Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmReopen}
        onClose={() => setConfirmReopen(null)}
        onConfirm={handleReopen}
        isLoading={isReopening}
        title="Reopen Sub-Task?"
        message={`Reopen "${confirmReopen?.title}"?`}
        confirmText="Yes, Reopen"
        variant="warning"
      />
    </div>
  );
};
