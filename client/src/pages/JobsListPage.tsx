import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { CreateJobModal } from '../components/jobCard/CreateJobModal';

type TimeFilter = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

export const JobsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: jobsResponse, isLoading, isError, refetch } = useGetJobCardsQuery();
  const jobs = jobsResponse?.data || [];

  const filterJobsByTime = (jobCards: JobCardData[]) => {
    const now = new Date();

    return jobCards.filter((job) => {
      const createdAt = new Date(job.createdAt);

      if (timeFilter === 'DAY') {
        return (
          createdAt.getDate() === now.getDate() &&
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }
      if (timeFilter === 'WEEK') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return createdAt >= sevenDaysAgo;
      }
      if (timeFilter === 'MONTH') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return createdAt >= thirtyDaysAgo;
      }
      if (timeFilter === 'YEAR') {
        return createdAt.getFullYear() === now.getFullYear();
      }
      return true; // ALL
    });
  };

  const timeFilteredJobs = filterJobsByTime(jobs);

  const filteredJobs = timeFilteredJobs.filter((job) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      job.vehicleName.toLowerCase().includes(query) ||
      job.vehicleNumber.toLowerCase().includes(query)
    );
  });

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
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Create Job
            </button>
          )}
        </div>

        {/* Toolbar & Filters (No Scrollbar) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Compact Segmented Button Group */}
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
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Wrench className="w-6 h-6 text-amber-500 dark:text-yellow-400 animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">LOADING VEHICLE JOB CARDS...</p>
          </div>
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
              {timeFilter !== 'ALL' ? `No job cards for [ ${timeFilter} ]. Select [ ALL ].` : 'No vehicle job cards present.'}
            </p>
          </div>
        ) : (
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
                        {job.vehicleName}
                      </h3>
                      <span className="inline-block mt-0.5 text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                        {job.vehicleNumber}
                      </span>
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
        )}

        {/* Modal for Creating Job */}
        <CreateJobModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </main>
    </div>
  );
};
