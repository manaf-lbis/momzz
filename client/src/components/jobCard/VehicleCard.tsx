import React from 'react';
import { JobCardData, useToggleTaskMutation } from '../../api/jobApi';
import { CheckCircle2, Clock, Check, Plus, Wrench, UserCheck, Car } from 'lucide-react';
import { Badge } from '../common/Badge';

interface VehicleCardProps {
  job: JobCardData;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ job }) => {
  const [toggleTask, { isLoading: isToggling }] = useToggleTaskMutation();

  const totalTasks = job.tasks.length;
  const completedTasks = job.tasks.filter((t) => t.status === 'COMPLETED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isReady = totalTasks > 0 && completedTasks === totalTasks;

  // Extract unique active mechanics working/completed tasks on this car
  const assignedWorkersMap = new Map<string, string>();
  job.tasks.forEach((t) => {
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

  const handleToggle = async (taskId: string) => {
    try {
      await toggleTask({ taskId }).unwrap();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all space-y-4 relative overflow-hidden">
      {/* Visual Accent Top Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${isReady ? 'bg-emerald-500' : 'bg-yellow-400'}`}></div>

      {/* Header: Vehicle Name & Status Tag */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-yellow-400 shrink-0" />
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-100 uppercase truncate">
              {job.vehicleName}
            </h3>
          </div>
          <p className="text-xs font-mono text-zinc-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 inline-block">
            {job.vehicleNumber}
          </p>
        </div>

        {/* Visual Status Headers */}
        <div>
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

      {/* One-Tap Interactive Task Checklist */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
          Task Checklist
        </p>

        <div className="space-y-2">
          {job.tasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <div
                key={task.id || task._id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-zinc-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-100 hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted ? 'line-through text-zinc-400 decoration-emerald-500' : 'text-zinc-100'
                    }`}
                  >
                    {task.title}
                  </p>
                  {isCompleted && task.completedBy && (
                    <p className="text-[11px] font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Done by {task.completedBy.name}
                    </p>
                  )}
                </div>

                <button
                  disabled={isToggling}
                  onClick={() => handleToggle(task.id || (task as any)._id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-yellow-400 text-zinc-950 hover:bg-yellow-300 active:scale-95 shadow-yellow-glow'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Completed
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Claim & Complete
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
