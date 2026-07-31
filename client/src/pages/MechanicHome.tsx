import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Badge } from '../components/common/Badge';
import { useGetJobCardsQuery } from '../api/jobApi';
import { VehicleCard } from '../components/jobCard/VehicleCard';
import { Wrench, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/common/Button';

export const MechanicHome: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useGetJobCardsQuery();

  const jobs = data?.data || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Header Banner */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100 uppercase">
                ACTIVE JOB CARDS
              </h1>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Logged in as: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span>
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Job Cards Mission List */}
        {isLoading ? (
          <div className="industrial-card p-8 text-center text-zinc-400 font-mono text-xs sm:text-sm">
            Loading active garage job cards...
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            Failed to retrieve job cards. Please check your connection.
          </div>
        ) : jobs.length === 0 ? (
          <div className="industrial-card p-8 text-center space-y-3 rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-yellow-400 mx-auto opacity-75" />
            <h3 className="text-base font-bold uppercase tracking-wider text-zinc-200">
              NO ACTIVE VEHICLE JOBS
            </h3>
            <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto">
              There are currently no active job cards assigned in the garage.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <VehicleCard key={job.id || job._id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

