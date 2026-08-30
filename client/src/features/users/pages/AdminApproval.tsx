import React from 'react';
import { useGetPendingWorkersQuery, useApproveWorkerMutation } from '../../auth/api/authApi';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { ShieldAlert, UserCheck, RefreshCw, AlertCircle, ChevronLeft, Phone, Calendar, Loader2 } from 'lucide-react';
import { formatDate } from '../../../shared/utils/formatters';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AdminApproval: React.FC = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background light */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.04)_0%,transparent_65%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 pb-32 space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Staff Approvals
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <NumberTicker value={pendingWorkers.length} /> Pending
                </span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <PageShimmer label="Loading approval queue..." cards={3} />
        ) : isError ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            Failed to retrieve pending registrations.
          </div>
        ) : pendingWorkers.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/95 dark:bg-[#12131F]/90 border border-slate-200/80 dark:border-white/[0.08] space-y-2">
            <UserCheck className="w-9 h-9 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300">
              All Registrations Cleared
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-sm mx-auto">
              Every mechanic and technician has been approved. New registrations will appear in this queue automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingWorkers.map((worker: any) => {
              const workerId = worker.id || worker._id;
              return (
                <motion.div
                  key={workerId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 shadow-sm dark:shadow-xl dark:shadow-black/50 space-y-3 flex flex-col justify-between"
                >
                  <BorderBeam size={160} duration={6} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-sm text-white shrink-0">
                        {worker.name?.charAt(0)?.toUpperCase() || 'W'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{worker.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 uppercase">
                            {worker.role || 'WORKER'}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {worker.mobile}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-3 text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {worker.createdAt ? formatDate(new Date(worker.createdAt)) : 'Recently'}
                    </span>

                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={() => handleApprove(workerId)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-400/20 hover:opacity-95 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Approve Access</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

