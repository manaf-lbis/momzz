import React from 'react';
import { useGetPendingWorkersQuery, useApproveWorkerMutation } from '../api/authApi';
import { Navbar } from '../components/navbar/Navbar';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ShieldCheck, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { PageShimmer } from '../components/common/PageShimmer';

export const AdminApproval: React.FC = () => {
  const { data, isLoading, isError, refetch } = useGetPendingWorkersQuery();
  const [approveWorker, { isLoading: isApproving }] = useApproveWorkerMutation();

  const handleApprove = async (userId: string) => {
    try {
      await approveWorker({ userId, isApproved: true }).unwrap();
    } catch (err) {
      console.error('Failed to approve worker:', err);
    }
  };

  const pendingWorkers = data?.data || [];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-500 dark:text-yellow-400" />
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                ADMIN TECHNICIAN APPROVALS
              </h1>
            </div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
              REVIEW AND VERIFY PENDING WORKER REGISTRATIONS
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Queue
          </Button>
        </div>

        {isLoading ? (
          <PageShimmer label="Loading pending registrations" cards={3} />
        ) : isError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            Failed to retrieve pending worker approvals. Ensure backend is running.
          </div>
        ) : pendingWorkers.length === 0 ? (
          <div className="industrial-card p-8 text-center space-y-3 rounded-2xl">
            <UserCheck className="w-8 h-8 text-amber-500 dark:text-yellow-400 mx-auto opacity-75" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
              NO PENDING APPROVALS
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono max-w-md mx-auto">
              All registered technicians have been approved. Newly registered worker accounts will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingWorkers.map((worker: any) => {
              const workerId = worker.id || worker._id;
              return (
                <div
                  key={workerId}
                  className="industrial-card rounded-2xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{worker.name}</h4>
                      <Badge variant="zinc">{worker.role}</Badge>
                    </div>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{worker.mobile}</p>
                    <p className="text-[10px] font-mono text-zinc-400">
                      Registered: {worker.createdAt ? formatDate(new Date(worker.createdAt)) : 'Recently'}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    className="text-xs py-1.5 px-3"
                    isLoading={isApproving}
                    onClick={() => handleApprove(workerId)}
                  >
                    <UserCheck className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
