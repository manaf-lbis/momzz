import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGetJobCardsQuery, JobCardData } from '../api/jobApi';
import { Navbar } from '../components/navbar/Navbar';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageShimmer } from '../components/common/PageShimmer';

type TimeFilter = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
type JobsView = 'MY_JOBS' | 'PENDING_VERIFICATION' | 'ALL_VEHICLES';

export const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [jobsView, setJobsView] = useState<JobsView>(location.state?.view === 'verify' ? 'PENDING_VERIFICATION' : location.state?.view === 'all' ? 'ALL_VEHICLES' : 'MY_JOBS');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [accumulatedJobs, setAccumulatedJobs] = useState<JobCardData[]>([]);

  const { data: jobsResponse, isLoading, isError, refetch } = useGetJobCardsQuery({
    page,
    limit: 10,
    timeframe: timeFilter.toLowerCase(),
  });

  const responseData = jobsResponse?.data;
  const rawJobs: JobCardData[] = Array.isArray(responseData)
    ? responseData
    : responseData?.jobs || [];
  const pagination = !Array.isArray(responseData) ? responseData?.pagination : undefined;
  const totalPages = pagination?.totalPages || 1;

  // Reset page & accumulated jobs when timeframe filter changes
  useEffect(() => {
    setPage(1);
    setAccumulatedJobs([]);
  }, [timeFilter]);

  // Update accumulated jobs for infinite scroll
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

  // Infinite Scroll Trigger
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

  const displayJobs = accumulatedJobs.length > 0 ? accumulatedJobs : rawJobs;

  const myJobsCount = displayJobs.filter((job) => job.tasks?.some((task) => task.status === 'OPEN')).length;
  const pendingVerificationCount = displayJobs.filter((job) => job.tasks?.length && job.tasks.every((task) => task.status === 'COMPLETED') && !job.verifiedAt).length;
  const allVehiclesCount = displayJobs.length;

  const getGarageDuration = (createdAt: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (minutes < 60) return `${Math.max(1, minutes)}m in garage`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m in garage`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h in garage`;
    return `${Math.floor(minutes / 10080)}w ${Math.floor((minutes % 10080) / 1440)}d in garage`;
  };

  const filteredJobs = displayJobs.filter((job) => {
    if (jobsView === 'MY_JOBS' && !job.tasks?.some((task) => task.status === 'OPEN')) return false;
    if (jobsView === 'PENDING_VERIFICATION' && (!job.tasks?.length || job.tasks.some((task) => task.status !== 'COMPLETED') || job.verifiedAt)) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      job.vehicleName.toLowerCase().includes(query) ||
      job.vehicleNumber.toLowerCase().includes(query)
    );
  }).sort((a, b) => jobsView === 'MY_JOBS'
    ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header & Title */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                📋 ACTIVE VEHICLE JOBS
              </h1>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => navigate('/jobs/create')}
              className="px-3 py-1.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Create Job
            </button>
          )}
        </div>

        {/* Toolbar & Filters */}
        <div className="space-y-3">
          <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-200/80 dark:bg-zinc-900/60">
            <button
              onClick={() => setJobsView('MY_JOBS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                jobsView === 'MY_JOBS'
                  ? 'bg-amber-400 dark:bg-yellow-400 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>My Jobs</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white shadow-xs">
                {myJobsCount}
              </span>
            </button>

            <button
              onClick={() => setJobsView('PENDING_VERIFICATION')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                jobsView === 'PENDING_VERIFICATION'
                  ? 'bg-amber-400 dark:bg-yellow-400 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>Pending verification</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white shadow-xs">
                {pendingVerificationCount}
              </span>
            </button>

            <button
              onClick={() => setJobsView('ALL_VEHICLES')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                jobsView === 'ALL_VEHICLES'
                  ? 'bg-amber-400 dark:bg-yellow-400 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>All Vehicles & History</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white shadow-xs">
                {allVehiclesCount}
              </span>
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Segmented Button Group */}
            <div className="flex flex-wrap gap-1 bg-zinc-200/80 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-300 dark:border-zinc-800 no-scrollbar">
              <span className="text-xs font-mono px-2 py-1 text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
              </span>
              {(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'] as TimeFilter[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeFilter(tf)}
                  className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold uppercase transition-all active:scale-95 ${
                    timeFilter === tf
                      ? 'bg-amber-400 dark:bg-yellow-400 text-zinc-950 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800/80'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl industrial-input text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Cards Grid */}
        {isLoading && page === 1 ? (
          <PageShimmer label="Loading vehicle job cards" cards={6} />
        ) : isError ? (
          <div className="p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
            <p className="text-xs font-mono text-red-500">Failed to load vehicle job cards.</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-mono rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 industrial-card rounded-2xl text-center space-y-2">
            <Car className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">No Vehicles Found</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              {jobsView === 'MY_JOBS' ? 'No vehicles with pending tasks.' : (timeFilter !== 'ALL' ? `No job cards for [ ${timeFilter} ]. Select [ ALL ].` : 'No vehicle job cards present.')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job) => {
                const totalTasks = job.tasks?.length || 0;
                const completedTasks = job.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
                const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const isReadyForDelivery = totalTasks > 0 && completedTasks === totalTasks;

                return (
                  <div
                    key={job.id || job._id}
                    onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                    className="industrial-card p-4 rounded-2xl cursor-pointer group hover:border-amber-500 dark:hover:border-yellow-400 transition-all active:scale-[0.98] flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-amber-500 dark:text-yellow-400" />
                          {job.vehicleName}{job.vehicleColor && <span className="text-amber-600 dark:text-yellow-400">({job.vehicleColor})</span>}
                        </h3>
                        <span className="inline-block mt-0.5 text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                          {job.vehicleNumber}
                        </span>
                        <p className="mt-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500 dark:text-yellow-400" /> {getGarageDuration(job.createdAt)}
                        </p>
                      </div>

                      {isReadyForDelivery ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> In Progress
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-500 dark:text-zinc-400">PROGRESS:</span>
                        <span className="text-amber-600 dark:text-yellow-400 font-bold">
                          {completedTasks}/{totalTasks} ({progressPercentage}%)
                        </span>
                      </div>

                      <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 dark:bg-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll sentinel & Touch Pagination Controls */}
            <div ref={observerRef} className="py-4 text-center">
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-500">
                  <motion.div
                    animate={{ rotate: [-18, 18, -18] }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Wrench className="w-4 h-4" />
                  </motion.div>
                  Loading more vehicles...
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 text-xs font-mono flex items-center gap-1 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 text-xs font-mono flex items-center gap-1 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
