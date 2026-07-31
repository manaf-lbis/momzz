import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery } from '../api/jobApi';
import { useGetLeaderboardQuery } from '../api/authApi';
import { VehicleCard } from '../components/jobCard/VehicleCard';
import {
  Wrench,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trophy,
  ClipboardList,
  User,
  Filter,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';

export const MechanicHome: React.FC = () => {
  const { user } = useAuth();
  const { data: jobsData, isLoading, isError, refetch } = useGetJobCardsQuery();
  const { data: leaderboardData } = useGetLeaderboardQuery();
  const [filterMyJobs, setFilterMyJobs] = useState(false);

  const jobs = jobsData?.data || [];
  const leaderboard = leaderboardData?.data || [];

  // Filter jobs where mechanic has claimed/completed tasks if filterMyJobs is active
  const filteredJobs = filterMyJobs
    ? jobs.filter((job) =>
        job.tasks.some(
          (t) =>
            t.completedBy &&
            (t.completedBy.id === user?.id || (t.completedBy as any)._id === user?.id)
        )
      )
    : jobs;

  // Calculate my completed task count
  let myActiveTasksCount = 0;
  jobs.forEach((j) => {
    j.tasks.forEach((t) => {
      if (
        t.status === 'COMPLETED' &&
        t.completedBy &&
        (t.completedBy.id === user?.id || (t.completedBy as any)._id === user?.id)
      ) {
        myActiveTasksCount++;
      }
    });
  });

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
                TECHNICIAN: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span>
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
        <div className="grid grid-cols-2 gap-3">
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
              <h3 className="text-xs font-extrabold uppercase tracking-wide">My Active Jobs</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {myActiveTasksCount} Tasks Completed Today
              </p>
            </div>
          </button>

          {/* Card D: My Profile */}
          <Link
            to="/profile"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all space-y-2 shadow-lg"
          >
            <User className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-zinc-100">My Profile</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">View Lifetime Stats</p>
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
                  : 'There are currently no active vehicle job cards in the garage.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <VehicleCard key={job.id || job._id} job={job} compact={true} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
