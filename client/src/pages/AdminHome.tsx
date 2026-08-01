import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, useCreateJobMutation } from '../api/jobApi';
import { useGetPendingWorkersQuery, useGetLeaderboardQuery } from '../api/authApi';
import { VehicleCard } from '../components/jobCard/VehicleCard';
import {
  Shield,
  Plus,
  Wrench,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Trophy,
  ClipboardList,
  UserCheck,
  User,
  Filter,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';

export const AdminHome: React.FC = () => {
  const { user } = useAuth();
  const { data: jobsData, isLoading, isError, refetch } = useGetJobCardsQuery();
  const { data: pendingData } = useGetPendingWorkersQuery();
  const { data: leaderboardData } = useGetLeaderboardQuery();
  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();

  const [showModal, setShowModal] = useState(false);
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterMyJobs, setFilterMyJobs] = useState(false);

  const jobs = jobsData?.data || [];
  const pendingCount = pendingData?.data?.length || 0;
  const leaderboard = leaderboardData?.data || [];

  // Filter jobs where admin has claimed/completed tasks if filterMyJobs is active
  const filteredJobs = filterMyJobs
    ? jobs.filter((job: any) =>
        job.tasks?.some(
          (t: any) =>
            t.completedBy &&
            (t.completedBy.id === user?.id || t.completedBy._id === user?.id)
        )
      )
    : jobs;

  // Calculate my active claimed task count
  let myActiveTasksCount = 0;
  jobs.forEach((j: any) => {
    j.tasks?.forEach((t: any) => {
      if (
        t.status === 'COMPLETED' &&
        t.completedBy &&
        (t.completedBy.id === user?.id || (t.completedBy as any)._id === user?.id)
      ) {
        myActiveTasksCount++;
      }
    });
  });

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    setTasks([...tasks, taskInput.trim()]);
    setTaskInput('');
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehicleName.trim() || !vehicleNumber.trim()) {
      setErrorMsg('Vehicle Name and Number are required.');
      return;
    }

    if (tasks.length === 0) {
      setErrorMsg('Please add at least one task for this job card.');
      return;
    }

    try {
      await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        tasks,
      }).unwrap();

      setVehicleName('');
      setVehicleNumber('');
      setTasks([]);
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to create job card.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* SECTION 1: GARAGE HUB BANNER */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-zinc-950 shadow-yellow-glow">
              <Wrench className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100 uppercase">
                MOMZZ GARAGE HUB
              </h1>
              <p className="text-xs font-mono text-zinc-400">
                ADMIN: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* SECTION 2: WORKER LEADERBOARD WIDGET */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-100">
                TOP MECHANICS LEADERBOARD
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              Live Work Done
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 italic text-center py-2">
              No task completions recorded yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {leaderboard.slice(0, 3).map((mechanic, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div
                    key={mechanic.id || (mechanic as any)._id}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{medals[idx] || `#${idx + 1}`}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-100 truncate">{mechanic.name}</p>
                        <p className="text-[10px] font-mono text-yellow-400 uppercase">{mechanic.role}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-zinc-200 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                      {mechanic.taskCount || 0} Jobs
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: QUICK ACTION CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card A: My Active Jobs */}
          <button
            onClick={() => setFilterMyJobs(!filterMyJobs)}
            className={`p-4 rounded-2xl border text-left transition-all space-y-2 relative overflow-hidden ${
              filterMyJobs
                ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <ClipboardList className="w-5 h-5 text-yellow-400" />
              {filterMyJobs && <Filter className="w-4 h-4 text-yellow-400" />}
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide">My Jobs Filter</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {myActiveTasksCount} Tasks Completed
              </p>
            </div>
          </button>

          {/* Card B: Create Job Card (Admin Only) */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-zinc-900 border border-zinc-800 hover:border-yellow-400/60 rounded-2xl p-4 text-left transition-all space-y-2 group shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-400 group-hover:text-zinc-950 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-100">Create Job</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">Publish New Car</p>
            </div>
          </button>

          {/* Card C: Pending Approvals (Admin Only) */}
          <Link
            to="/admin/approvals"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all space-y-2 relative overflow-hidden shadow-lg"
          >
            <div className="flex items-center justify-between">
              <UserCheck className="w-5 h-5 text-yellow-400" />
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-zinc-950 text-[10px] font-mono font-bold animate-pulse">
                  ⚡ {pendingCount} Pending
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-100">Approvals</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {pendingCount > 0 ? `${pendingCount} Workers Waiting` : 'No Pending Users'}
              </p>
            </div>
          </Link>

          {/* Card D: My Profile */}
          <Link
            to="/profile"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all space-y-2 shadow-lg"
          >
            <User className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-100">My Profile</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">View Account Stats</p>
            </div>
          </Link>
        </div>

        {/* SECTION 4: ACTIVE GARAGE VEHICLES */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-100">
              ACTIVE GARAGE VEHICLES ({filteredJobs.length})
            </h2>
            {filterMyJobs && (
              <span className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                Showing Filtered My Jobs{' '}
                <button onClick={() => setFilterMyJobs(false)} className="underline hover:text-zinc-200">
                  Reset
                </button>
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="industrial-card p-8 text-center text-zinc-400 font-mono text-xs sm:text-sm">
              Loading active garage job cards...
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              Failed to retrieve job cards. Please check backend connection.
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="industrial-card p-8 text-center space-y-3 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-yellow-400 mx-auto opacity-75" />
              <h3 className="text-base font-bold uppercase tracking-wider text-zinc-200">
                {filterMyJobs ? 'NO JOBS MATCHED YOUR FILTER' : 'NO ACTIVE VEHICLE JOBS'}
              </h3>
              <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto">
                {filterMyJobs
                  ? 'You have not claimed or completed tasks on any active job cards yet.'
                  : 'Click "Create Job" above to publish a new vehicle repair job card.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job: any) => (
                <VehicleCard key={job.id || job._id} job={job} compact={true} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Job Card Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-extrabold uppercase text-zinc-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-yellow-400" /> New Vehicle Job Card
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-100 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">VEHICLE NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Maruti Swift"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-yellow-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">VEHICLE REGISTRATION NUMBER</label>
                <input
                  type="text"
                  placeholder="e.g. KL-02-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:border-yellow-400 outline-none uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-zinc-400">ADD REPAIR SUB-TASKS</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Tyre Changing"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-yellow-400 outline-none"
                  />
                  <Button type="button" variant="outline" onClick={handleAddTask} className="px-3 py-2 text-xs">
                    Add
                  </Button>
                </div>

                {tasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2">
                    {tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono"
                      >
                        <span>{task}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreating}
                  className="flex-1 text-xs shadow-yellow-glow"
                >
                  Publish Job Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
