import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { apiSlice } from '../api/apiSlice';
import { jobApi, TaskItem, JobCardData } from '../api/jobApi';
import { logout, updateUser } from '../slice/authSlice';
import { useNavigate } from 'react-router-dom';
import { store } from '../store/store';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

const getBackendUrl = (): string => {
  const raw = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';
  if (raw) return raw.replace(/\/api\/?$/, '');
  return 'http://localhost:5000';
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

  useEffect(() => {
    const backendUrl = getBackendUrl();
    console.log('[SOCKET] Connecting to:', backendUrl);

    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] ✅ Connected:', socket.id);
      if (user?.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[SOCKET] ❌ Connection error:', err.message);
    });

    // ───── Job Card Created ─────────────────────────────────────────────
    socket.on('jobCard:created', (jobCard: any) => {
      console.log('[SOCKET] 📥 jobCard:created', jobCard?.vehicleNumber);

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
      console.log('[SOCKET] 📥 jobCard:updated', jobCard?.vehicleNumber || jobCard?.id);

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
      console.log('[SOCKET] 📥 jobCard:deleted', data?.jobCardId);

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
      console.log('[SOCKET] 📥 task:added for job', data?.jobCardId);

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
        console.log(
          '[SOCKET] 📥 task:updated',
          data?.taskId,
          'action:',
          data?.action,
          'status:',
          data?.task?.status
        );

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
      console.log('[SOCKET] 📥 task:deleted', data?.taskId);

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
      console.log('[SOCKET] 📥 user:approved for:', userId);
      dispatch(apiSlice.util.invalidateTags(['User', 'PendingWorkers']));
      if (user && user.id === userId) {
        dispatch(updateUser({ ...user, isApproved: true }));
        navigate('/dashboard');
      }
    });

    socket.on('user:blocked', ({ userId }: { userId: string }) => {
      console.log('[SOCKET] 📥 user:blocked for:', userId);
      if (user && user.id === userId) {
        dispatch(logout());
        navigate('/login');
      }
    });

    return () => {
      console.log('[SOCKET] Disconnecting...');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.id]);

  // Re-join room when user changes
  useEffect(() => {
    if (socketRef.current?.connected && user?.id) {
      socketRef.current.emit('join', user.id);
    }
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
