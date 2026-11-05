import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CheckCircle2, AlertCircle, X, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useAppDispatch } from '../../../shared/hooks/useAppDispatch';
import { apiSlice } from '../api/apiSlice';
import { jobApi, TaskItem, JobCardData } from '../../jobs/api/jobApi';
import { logout, updateUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { store } from '../../../store/store';
import { getBaseServerUrl } from '../../../shared/utils/serverUrl';

export interface InAppAlert {
  id: string;
  type: 'INCENTIVE' | 'OT_APPROVED' | 'OT_REJECTED' | 'SETTLEMENT' | 'WAGE';
  title: string;
  message: string;
}

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

const getBackendUrl = (): string => {
  return getBaseServerUrl();
};

/**
 * Patch ALL active getJobCards cache entries in Redux store.
 * Uses store.getState() directly to reliably read cache keys.
 */
const patchAllJobCardCaches = (
  dispatch: any,
  updater: (jobsList: any[]) => void
) => {
  try {
    const state = store.getState();
    const queries = (state as any)[apiSlice.reducerPath]?.queries || {};

    for (const key of Object.keys(queries)) {
      if (!key.startsWith('getJobCards(')) continue;
      const entry = queries[key];
      if (!entry?.data) continue;

      // Parse the original query arg from the cache key
      let arg: any;
      try {
        const argStr = key.slice('getJobCards('.length, -1);
        arg = argStr === 'undefined' ? undefined : JSON.parse(argStr);
      } catch {
        arg = undefined;
      }

      dispatch(
        jobApi.util.updateQueryData('getJobCards', arg, (draft: any) => {
          if (!draft?.data) return;
          const jobsList: any[] = Array.isArray(draft.data)
            ? draft.data
            : draft.data?.jobs || [];
          updater(jobsList);
        })
      );
    }
  } catch (err) {
    console.error('[SOCKET] Cache patch failed:', err);
  }
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);

  const addAlert = (alert: Omit<InAppAlert, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setAlerts((prev) => [...prev, { ...alert, id }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 6000);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    const backendUrl = getBackendUrl();
    console.log('[SOCKET] Connecting to:', backendUrl);

    const socket = io(backendUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (user?.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('connect_error', (err) => {
      // Suppress dev noise when server is offline or reconnecting
      if (import.meta.env.DEV) {
        console.warn('[SOCKET] Connection attempt:', err.message);
      }
    });

    // ───── Job Card Created ─────────────────────────────────────────────
    socket.on('jobCard:created', (jobCard: any) => {
      // Instant cache patch → then background refetch
      patchAllJobCardCaches(dispatch, (jobsList) => {
        const exists = jobsList.some(
          (j: any) => (j.id || j._id) === (jobCard.id || jobCard._id)
        );
        if (!exists) {
          jobsList.unshift(jobCard);
        }
      });

      // Schedule a background refetch to get authoritative server data
      setTimeout(() => dispatch(apiSlice.util.invalidateTags(['JobCard'])), 300);
    });

    // ───── Job Card Updated ─────────────────────────────────────────────
    socket.on('jobCard:updated', (jobCard: any) => {
      patchAllJobCardCaches(dispatch, (jobsList) => {
        const idx = jobsList.findIndex(
          (j: any) => (j.id || j._id) === (jobCard.id || jobCard._id)
        );
        if (idx !== -1) {
          jobsList[idx] = { ...jobsList[idx], ...jobCard };
        }
      });

      setTimeout(() => dispatch(apiSlice.util.invalidateTags(['JobCard'])), 300);
    });

    // ───── Job Card Deleted ─────────────────────────────────────────────
    socket.on('jobCard:deleted', (data: { jobCardId: string }) => {
      patchAllJobCardCaches(dispatch, (jobsList) => {
        const idx = jobsList.findIndex(
          (j: any) => (j.id || j._id) === data.jobCardId
        );
        if (idx !== -1) jobsList.splice(idx, 1);
      });

      setTimeout(() => dispatch(apiSlice.util.invalidateTags(['JobCard'])), 300);
    });

    // ───── Task Added ───────────────────────────────────────────────────
    socket.on('task:added', (data: { jobCardId: string; task: any }) => {
      patchAllJobCardCaches(dispatch, (jobsList) => {
        const job = jobsList.find(
          (j: any) => (j.id || j._id) === data.jobCardId
        );
        if (job) {
          if (!job.tasks) job.tasks = [];
          const exists = job.tasks.some(
            (t: any) => (t.id || t._id) === (data.task.id || data.task._id)
          );
          if (!exists) {
            job.tasks.push(data.task);
          }
          job.status = 'IN_PROGRESS';
        }
      });

      setTimeout(() => dispatch(apiSlice.util.invalidateTags(['JobCard'])), 300);
    });

    // ───── Task Updated (Complete / Reopen) ─────────────────────────────
    socket.on(
      'task:updated',
      (data: { jobCardId: string; taskId: string; task: any; action: string }) => {
        // Instant patch: replace the task in every cached job list
        patchAllJobCardCaches(dispatch, (jobsList) => {
          for (const job of jobsList) {
            if (!job.tasks) continue;
            const idx = job.tasks.findIndex(
              (t: any) =>
                (t.id || t._id) === data.taskId ||
                (t.id || t._id) === (data.task?.id || data.task?._id)
            );
            if (idx !== -1) {
              // Full replace with server-authoritative task data
              job.tasks[idx] = { ...data.task };
              // Recalculate parent job status
              const allDone =
                job.tasks.length > 0 &&
                job.tasks.every((t: any) => t.status === 'COMPLETED');
              job.status = allDone ? 'COMPLETED' : 'IN_PROGRESS';
              break;
            }
          }
        });

        // Background refetch for eventual consistency
        setTimeout(() => dispatch(apiSlice.util.invalidateTags(['JobCard', 'User'])), 300);
      }
    );

    // ───── Task Deleted ─────────────────────────────────────────────────
    socket.on('task:deleted', (data: { jobCardId: string; taskId: string }) => {
      patchAllJobCardCaches(dispatch, (jobsList) => {
        for (const job of jobsList) {
          if (!job.tasks) continue;
          const idx = job.tasks.findIndex(
            (t: any) => (t.id || t._id) === data.taskId
          );
          if (idx !== -1) {
            job.tasks.splice(idx, 1);
            const allDone =
              job.tasks.length > 0 &&
              job.tasks.every((t: any) => t.status === 'COMPLETED');
            job.status = allDone ? 'COMPLETED' : 'IN_PROGRESS';
            break;
          }
        }
      });

      setTimeout(() => dispatch(apiSlice.util.invalidateTags(['JobCard'])), 300);
    });

    // ───── User Events ──────────────────────────────────────────────────
    socket.on('user:approved_global', () => {
      dispatch(apiSlice.util.invalidateTags(['PendingWorkers', 'AllUsers', 'User']));
    });

    socket.on('user:status_changed', () => {
      dispatch(apiSlice.util.invalidateTags(['AllUsers']));
    });

    socket.on('user:approved', ({ userId }: { userId: string }) => {
      dispatch(apiSlice.util.invalidateTags(['User', 'PendingWorkers']));
      if (user && user.id === userId) {
        dispatch(updateUser({ ...user, isApproved: true }));
        navigate('/dashboard');
      }
    });

    socket.on('user:blocked', ({ userId }: { userId: string }) => {
      if (user && user.id === userId) {
        dispatch(logout());
        navigate('/login');
      }
    });

    // ───── Payroll Socket Events ─────────────────────────────────────────
    socket.on('payroll:incentive_awarded', (data: any) => {
      dispatch(apiSlice.util.invalidateTags(['Payroll', 'AllUsers', 'User']));
      addAlert({
        type: 'INCENTIVE',
        title: '🎉 Incentive Awarded!',
        message: `You were awarded a ₹${Number(data.amount || 0).toLocaleString('en-IN')} incentive (${data.notes || 'Performance'})`,
      });
    });

    socket.on('payroll:ot_reviewed', (data: any) => {
      dispatch(apiSlice.util.invalidateTags(['Payroll', 'AllUsers', 'User']));
      const isApproved = data.status === 'APPROVED';
      addAlert({
        type: isApproved ? 'OT_APPROVED' : 'OT_REJECTED',
        title: isApproved ? '✅ Overtime Approved!' : '⚠️ Overtime Review',
        message: isApproved
          ? `Your claim for ${data.otHours}h OT (+₹${data.potentialAmount || data.otHours * 150}) on ${data.date} was approved.`
          : `Your OT claim for ${data.date} was marked as rejected: ${data.note || 'Admin clearance required'}`,
      });
    });

    socket.on('payroll:settled', (data: any) => {
      dispatch(apiSlice.util.invalidateTags(['Payroll', 'AllUsers', 'User']));
      addAlert({
        type: 'SETTLEMENT',
        title: '💳 Payout Disbursed',
        message: `Settlement payout of ₹${Number(data.amount || 0).toLocaleString('en-IN')} disbursed via ${data.paymentMethod || 'Cash'}.`,
      });
    });

    socket.on('payroll:wage_updated', (data: any) => {
      dispatch(apiSlice.util.invalidateTags(['Payroll', 'AllUsers', 'User']));
      addAlert({
        type: 'WAGE',
        title: '💼 Wage Rate Updated',
        message: `Your daily wage rate has been updated to ₹${data.dailyWage}.`,
      });
    });

    socket.on('payroll:updated', () => {
      dispatch(apiSlice.util.invalidateTags(['Payroll', 'AllUsers', 'User']));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, user?.id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
      {/* Floating In-App Notifications Container */}
      <aside aria-label="Notifications" className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-700/60 shadow-xl text-white"
            >
              <div className="p-2 rounded-xl shrink-0 mt-0.5 bg-white/10">
                {alert.type === 'INCENTIVE' && <Sparkles className="w-5 h-5 text-amber-400" />}
                {alert.type === 'OT_APPROVED' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {alert.type === 'OT_REJECTED' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {alert.type === 'SETTLEMENT' && <Wallet className="w-5 h-5 text-blue-400" />}
                {alert.type === 'WAGE' && <Award className="w-5 h-5 text-violet-400" />}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-sm font-semibold text-white leading-tight">{alert.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{alert.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAlert(alert.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </aside>
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
