import React, { useState } from 'react';
import {
  JobCardData,
  useSetTaskStatusMutation,
} from '../../api/jobApi';

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
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { playReopenSound } from '../../utils/completionSound';
import { getDeliveryStatusInfo, formatDeliveryDate } from '../../utils/dateUtils';

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

  return (
    <div className="relative bg-[#0b132b] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all space-y-4 overflow-hidden">
      {/* Background Image with Dark Smooth Gradient Overlay */}
      {job.thumbnailUrl ? (
        <>
          <img
            src={job.thumbnailUrl}
            alt={job.vehicleName || 'Vehicle'}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
          />
          {/* Horizontal Dark Gradient Overlay on Left for 100% Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070d1e]/95 via-[#070d1e]/85 to-[#070d1e]/20 z-0" />
          {/* Subtle Vertical Vignette Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070d1e]/95 via-transparent to-black/40 z-0" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#121c33] via-[#0d1629] to-[#070d1e] z-0" />
        </>
      )}

      {/* Visual Accent Top Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 z-10 ${isReady ? 'bg-emerald-500' : 'bg-yellow-400'}`}></div>

      {/* Content wrapper */}
      <div className="relative z-10 space-y-4">
        {/* Header: Vehicle Name & Status Tag */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="space-y-1 min-w-0 flex-1 cursor-pointer" onClick={() => compact && setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-yellow-400 shrink-0" />
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white uppercase truncate">
                {job.vehicleName}{!isAdmin && job.vehicleColor ? ` ${job.vehicleColor}` : ''}
              </h3>
              {compact && (
                <span className="text-zinc-400 hover:text-yellow-400">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-mono text-zinc-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 inline-block">
                {job.vehicleNumber}{!isAdmin && job.customerMobile ? ` • ${job.customerMobile}` : ''}
              </p>
              {job.expectedDeliveryDate && (() => {
                const deliveryInfo = getDeliveryStatusInfo(job.expectedDeliveryDate, isReady);
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border backdrop-blur-xs ${deliveryInfo.badgeClass}`}>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{deliveryInfo.label}</span>
                  </span>
                );
              })()}
            </div>
            <p className="text-[11px] font-mono text-zinc-500">⏱ {getElapsedTime(job.createdAt)} in garage</p>
          </div>

          {/* Visual Status Headers */}
          <div className="flex items-center gap-2">
            {isReady ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold tracking-wider uppercase">
                <Clock className="w-3.5 h-3.5 animate-pulse" /> In Progress
              </span>
            )}
          </div>
        </div>

      {/* Task Error Banner */}
      {taskError && (
        <div className="p-2.5 bg-red-950/70 border border-red-800 rounded-xl flex items-center gap-2 text-[11px] font-mono text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          {taskError}
        </div>
      )}

      {/* Live Dynamic Progress Bar & Fractional Counter */}
      <div className="space-y-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-400">Task Completion</span>
          <span className="font-bold text-yellow-400">
            {completedTasks} / {totalTasks} Tasks Done ({progressPercent}%)
          </span>
        </div>

        <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isReady ? 'bg-emerald-500 shadow-emerald-glow' : 'bg-yellow-400 shadow-yellow-glow'
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Smart Quick-Stats (Assigned Workers & Elapsed Time) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-zinc-500">Mechanics:</span>
          {assignedWorkers.length === 0 ? (
            <span className="text-zinc-500 italic">None yet</span>
          ) : (
            assignedWorkers.map((workerName, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[11px] font-bold"
              >
                ⚡ {workerName}
              </span>
            ))
          )}
        </div>

        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[11px]">
          ⏱️ {getElapsedTime(job.createdAt)}
        </div>
      </div>

      {/* Expanded vehicle checklist. Task changes are managed from the job card editor. */}
      {isExpanded && (
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
              VEHICLE WORKROOM CHECKLIST
            </p>
            {compact && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300"
              >
                Collapse Room
              </button>
            )}
          </div>

          {/* Interactive Checklist */}
          <div className="space-y-2">
            {job.tasks.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 italic text-center py-2">No tasks added yet.</p>
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
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-zinc-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-100 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-zinc-100' : 'text-zinc-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      {isCompleted && getTaskAudit(task) && (
                        <p className="text-[11px] font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {getTaskAudit(task)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCompleted ? (
                        <button
                          disabled={isTaskUpdating}
                          onClick={() => promptReopen(taskId, task.title)}
                          className="px-3 py-2 rounded-xl text-xs font-bold font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-yellow-400 hover:border-yellow-400 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isTaskUpdating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Reopening...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reopen</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          disabled={isTaskUpdating}
                          onClick={() => handleToggle(taskId, task.status)}
                          className="px-3 py-2 rounded-xl text-xs font-bold font-mono bg-yellow-400 text-zinc-950 hover:bg-yellow-300 active:scale-95 shadow-yellow-glow transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isTaskUpdating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Claim & Complete</span>
                            </>
                          )}
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
        message={`Reopen "${confirmReopen?.title}"? This will unmark it as completed and decrement the worker's task count.`}
        confirmText="Yes, Reopen"
        variant="warning"
      />
    </div>
  );
};
