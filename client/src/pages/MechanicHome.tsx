import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
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
import { PageShimmer } from '../components/common/PageShimmer';

export const MechanicHome: React.FC = () => {
  const { user } = useAuth();
  const [filterMyJobs, setFilterMyJobs] = useState(false);
  const [page, setPage] = useState(1);
  const [accumulatedJobs, setAccumulatedJobs] = useState<JobCardData[]>([]);

  const {
    data: jobsData,
    isLoading,
    isError,
    refetch,
  } = useGetJobCardsQuery({ page, limit: 10 });

  const { data: leaderboardData } = useGetLeaderboardQuery();
  const leaderboard = leaderboardData?.data || [];

  const responseData = jobsData?.data;
  const rawJobs: JobCardData[] = Array.isArray(responseData)
    ? responseData
    : responseData?.jobs || [];
  const pagination = !Array.isArray(responseData) ? responseData?.pagination : undefined;
  const totalPages = pagination?.totalPages || 1;

  // Accumulate jobs for infinite scroll
  useEffect(() => {
    if (rawJobs.length > 0) {
      if (page === 1) {
        setAccumulatedJobs(rawJobs);
      } else {
        setAccumulatedJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.id || j._id));
          const newUnique = rawJobs.filter((j) => !existingIds.has(j.id || j._id));
          return [...prev, ...newUnique];
        });
      }
    }
  }, [rawJobs, page]);

  // Infinite Scroll sentinel
  const observerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isLoading || page >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [isLoading, page, totalPages]);

  const handleRefetch = () => {
    setPage(1);
    setAccumulatedJobs([]);
    refetch();
  };

  const displayJobs = accumulatedJobs.length > 0 ? accumulatedJobs : rawJobs;

  // Filter active garage vehicles (strictly cars with pending works currently in garage)
  const activeGarageJobs = displayJobs.filter((job: any) => {
    const isPendingInGarage = job.status === 'IN_PROGRESS' || (job.tasks || []).some((t: any) => t.status === 'OPEN');
    if (!isPendingInGarage) return false;
    if (filterMyJobs) {
      return job.tasks?.some(
        (t: any) =>
          t.completedBy &&
          (t.completedBy.id === user?.id || t.completedBy._id === user?.id)
      );
    }
    return true;
  });

  const filteredJobs = activeGarageJobs;


  // Calculate my completed task count
  let myActiveTasksCount = 0;
  displayJobs.forEach((j: any) => {
    j.tasks?.forEach((t: any) => {
      if (
        t.status === 'COMPLETED' &&
        t.completedBy &&
        (t.completedBy.id === user?.id || t.completedBy._id === user?.id)
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
                MOMZ'Z AUTO GARAGE
              </h1>
              <p className="text-xs font-mono text-zinc-400">
                TECHNICIAN: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleRefetch}
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

        {/* SECTION 3: QUICK ACTION CARDS GRID (Worker-Only) */}
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
                {myActiveTasksCount} Tasks Completed
              </p>
            </div>
          </button>

          {/* Card B: My Profile */}
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
                My Jobs Filter{' '}
                <button onClick={() => setFilterMyJobs(false)} className="underline hover:text-zinc-200">
                  Reset
                </button>
              </span>
            )}
          </div>

          {isLoading && page === 1 ? (
            <PageShimmer label="Loading active garage jobs" cards={3} />
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
              {filteredJobs.map((job: any) => (
                <VehicleCard key={job.id || job._id} job={job} compact={true} />
              ))}

              {/* Infinite Scroll Sentinel */}
              <div ref={observerRef} className="py-4 text-center">
                {isLoading && page > 1 && (
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-yellow-400">
                    <Wrench className="w-4 h-4 animate-spin" /> Loading more vehicles...
                  </div>
                )}
                {page >= totalPages && accumulatedJobs.length > 10 && (
                  <p className="text-[11px] font-mono text-zinc-600">— All vehicles loaded —</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
