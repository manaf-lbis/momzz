import React from 'react';
import { useGetPendingWorkersQuery, useApproveWorkerMutation } from '../api/authApi';
import { Navbar } from '../components/navbar/Navbar';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ShieldCheck, UserCheck, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils/formatters';

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-yellow-400" />
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">
                ADMIN TECHNICIAN APPROVALS
              </h1>
            </div>
            <p className="text-[10px] sm:text-xs font-mono text-zinc-400 mt-1">
              REVIEW AND VERIFY PENDING WORKER ACCOUNT REGISTRATIONS
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Queue
          </Button>
        </div>

        {isLoading ? (
          <div className="industrial-card p-8 sm:p-12 text-center text-zinc-400 font-mono text-xs sm:text-sm">
            Loading pending worker registrations...
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            Failed to retrieve pending worker approvals. Ensure backend is running.
          </div>
        ) : pendingWorkers.length === 0 ? (
          <div className="industrial-card p-8 sm:p-12 text-center space-y-3 rounded-xl">
            <UserCheck className="w-10 h-10 text-yellow-400 mx-auto opacity-75" />
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-zinc-200">
              NO PENDING APPROVALS
            </h3>
            <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto">
              All registered technicians have been approved. Newly registered worker accounts will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card List View (Visible on small screens) */}
            <div className="block md:hidden space-y-3">
              {pendingWorkers.map((worker: any) => {
                const workerId = worker.id || worker._id;
                return (
                  <div
                    key={workerId}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-zinc-100 text-base">{worker.name}</h4>
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">{worker.mobile}</p>
                      </div>
                      <Badge variant="zinc">{worker.role}</Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs font-mono">
                      <span className="text-zinc-500">
                        {worker.createdAt ? formatDate(new Date(worker.createdAt)) : 'Recently'}
                      </span>
                      <Button
                        variant="primary"
                        className="text-xs py-1.5 px-3"
                        isLoading={isApproving}
                        onClick={() => handleApprove(workerId)}
                      >
                        <UserCheck className="w-4 h-4 mr-1.5" /> Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block industrial-card rounded-xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-400">
                    <th className="p-4">Technician Name</th>
                    <th className="p-4">Mobile Number</th>
                    <th className="p-4">Role Request</th>
                    <th className="p-4">Registered Date</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm font-sans">
                  {pendingWorkers.map((worker: any) => {
                    const workerId = worker.id || worker._id;
                    return (
                      <tr key={workerId} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-4 font-bold text-zinc-100">{worker.name}</td>
                        <td className="p-4 font-mono text-zinc-300">{worker.mobile}</td>
                        <td className="p-4">
                          <Badge variant="zinc">{worker.role}</Badge>
                        </td>
                        <td className="p-4 text-xs font-mono text-zinc-400">
                          {worker.createdAt ? formatDate(new Date(worker.createdAt)) : 'Recently'}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="primary"
                            className="text-xs"
                            isLoading={isApproving}
                            onClick={() => handleApprove(workerId)}
                          >
                            <UserCheck className="w-4 h-4 mr-1.5" /> Approve Technician
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
