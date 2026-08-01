import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobCardsQuery,
  useToggleTaskMutation,
  useAddTaskMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
  TaskItem,
  JobCardData,
} from '../api/jobApi';

import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  UserCheck,
  Wrench,
  AlertTriangle,
  Sparkles,
  Check,
} from 'lucide-react';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  const { data: jobsResponse, isLoading, isError } = useGetJobCardsQuery();
  const [toggleTask] = useToggleTaskMutation();
  const [addTask, { isLoading: isAddingTask }] = useAddTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [deleteJobCard] = useDeleteJobCardMutation();

  const jobsData = jobsResponse?.data;
  const jobsList: JobCardData[] = Array.isArray(jobsData) ? jobsData : jobsData?.jobs || [];
  const currentJob = jobsList.find(
    (j: JobCardData) => j.id === id || j._id === id
  );

  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    if (currentJob?.tasks) {
      setLocalTasks(currentJob.tasks);
    }
  }, [currentJob?.tasks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Wrench className="w-6 h-6 text-amber-500 dark:text-yellow-400 animate-spin" />
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">LOADING WORKROOM...</p>
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

  const tasksToDisplay = localTasks.length > 0 ? localTasks : (currentJob.tasks || []);

  // Sorted list: OPEN tasks first, COMPLETED tasks moved to bottom
  const sortedTasks = [...tasksToDisplay].sort((a: TaskItem, b: TaskItem) => {
    if (a.status === b.status) return 0;
    return a.status === 'OPEN' ? -1 : 1;
  });

  const totalTasks = tasksToDisplay.length;
  const completedCount = tasksToDisplay.filter((t: TaskItem) => t.status === 'COMPLETED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isAllCompleted = totalTasks > 0 && completedCount === totalTasks;

  // Format duration elapsed between job creation and task completion
  const formatDuration = (task: TaskItem) => {
    if (!task.completedAt || !currentJob.createdAt) return null;
    const created = new Date(currentJob.createdAt).getTime();
    const completed = new Date(task.completedAt).getTime();
    const diffMins = Math.max(1, Math.round((completed - created) / (1000 * 60)));
    if (diffMins < 60) return `Took ${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `Took ${hours}h ${remainingMins}m`;
  };

  // Handle Task Action (Optimistic Update)
  const handleCompleteTask = async (taskId: string) => {
    setErrorMessage('');
    const previousTasks = [...localTasks];

    // Optimistically update local task state immediately
    setLocalTasks((prev) =>
      prev.map((task) => {
        if ((task.id || task._id) === taskId) {
          const isCompleted = task.status === 'COMPLETED';
          return {
            ...task,
            status: isCompleted ? 'OPEN' : 'COMPLETED',
            completedBy: isCompleted
              ? undefined
              : {
                  name: user?.name || 'Worker',
                  mobile: user?.mobile || '',
                  role: user?.role || 'WORKER',
                },
            completedAt: isCompleted ? undefined : new Date().toISOString(),
          } as TaskItem;
        }
        return task;
      })
    );

    try {
      await toggleTask({
        taskId,
        currentUserName: user?.name,
      }).unwrap();
    } catch (err: any) {
      setLocalTasks(previousTasks);
      setErrorMessage(err?.data?.message || 'Failed to update task status. Rolled back.');
    }
  };

  // Handle Add Sub-Task (Admin Only)
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await addTask({
        jobCardId: currentJob.id || currentJob._id!,
        title: newTaskTitle.trim(),
      }).unwrap();
      setNewTaskTitle('');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to add task.');
    }
  };

  // Handle Delete Sub-Task (Admin Only)
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask({ taskId }).unwrap();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to delete task.');
    }
  };

  // Handle Delete Job Card (Admin Only)
  const handleDeleteJobCard = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this job card?')) {
      return;
    }
    setIsDeletingJob(true);
    try {
      await deleteJobCard({ jobCardId: currentJob.id || currentJob._id! }).unwrap();
      navigate('/jobs');
    } catch (err: any) {
      setIsDeletingJob(false);
      setErrorMessage(err?.data?.message || 'Failed to delete job card.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/jobs')}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95"
              title="Back to Jobs List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Car className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
                  {currentJob.vehicleName}
                </h1>
                {isAllCompleted ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-pulse" /> In Progress
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                REG: <span className="text-amber-600 dark:text-yellow-400 font-bold uppercase">{currentJob.vehicleNumber}</span>
              </p>
            </div>
          </div>

          {/* Admin Only Delete Button */}
          {isAdmin && (
            <button
              onClick={handleDeleteJobCard}
              disabled={isDeletingJob}
              className="p-2 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-xs font-mono rounded-xl transition-all active:scale-95 flex items-center gap-1"
              title="Delete Job Card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        {/* Compact Service Progress Bar */}
        <div className="industrial-card p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-zinc-400 font-bold">SERVICE CHECKLIST</span>
            <span className="text-amber-600 dark:text-yellow-400 font-extrabold">
              {completedCount} / {totalTasks} Completed ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 dark:bg-yellow-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Admin Control: Add Sub-task On The Fly */}
        {isAdmin && (
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              placeholder="Add sub-task (Admin)..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl industrial-input text-xs font-medium"
            />
            <button
              type="submit"
              disabled={isAddingTask}
              className="px-3.5 py-2 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        )}

        {/* Unified Sub-Task Checklist */}
        <div className="space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 px-1">
            SUB-TASKS CHECKLIST ({completedCount}/{totalTasks})
          </h2>

          {sortedTasks.length === 0 ? (
            <div className="p-6 industrial-card rounded-2xl text-center text-zinc-500 text-xs font-mono">
              NO SUB-TASKS ASSIGNED TO THIS VEHICLE
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task: TaskItem) => {
                const taskId = task.id || task._id!;
                const isCompleted = task.status === 'COMPLETED';
                const durationText = formatDuration(task);

                return (
                  <div
                    key={taskId}
                    onClick={() => handleCompleteTask(taskId)}
                    className={`industrial-card p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                      isCompleted
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20'
                        : 'hover:border-amber-400 dark:hover:border-yellow-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Modern Custom Animated Checkbox Circle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTask(taskId);
                        }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'border-2 border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-yellow-400 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p
                          className={`text-xs sm:text-sm font-bold transition-all ${
                            isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {task.title}
                        </p>

                        {/* Completed Metadata Tag */}
                        {isCompleted && (
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            <span className="flex items-center gap-1 font-semibold">
                              <UserCheck className="w-3 h-3" /> Completed by {task.completedBy?.name || 'Worker'}
                            </span>
                            {durationText && (
                              <span className="text-zinc-400 dark:text-zinc-500 font-medium">({durationText})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Pill / Reopen & Delete Controls */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isCompleted ? (
                        <button
                          onClick={() => handleCompleteTask(taskId)}
                          className="px-3 py-1.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1 whitespace-nowrap"
                        >
                          <Sparkles className="w-3 h-3" /> [ Complete ]
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCompleteTask(taskId)}
                          className="px-2.5 py-1 bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 text-[10px] font-mono rounded-lg transition-colors"
                        >
                          Reopen
                        </button>
                      )}

                      {/* Admin Only Delete Task */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTask(taskId)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                          title="Delete Sub-task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
