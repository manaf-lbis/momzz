import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ENV } from './env';
import { userRepository } from '../repository/userRepository';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    let currentUserId: string | null = null;
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    socket.on('join', async (userId: string) => {
      if (userId) {
        currentUserId = userId;
        socket.join(`user:${userId}`);
        console.log(`[SOCKET] Socket ${socket.id} joined room user:${userId}`);

        try {
          await userRepository.setUserOnlineStatus(userId, true);
          if (io) {
            io.emit('user:status_changed', { userId, isOnline: true });
          }
        } catch (err) {
          console.error('[SOCKET] Error updating online status:', err);
        }
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
      if (currentUserId) {
        try {
          await userRepository.setUserOnlineStatus(currentUserId, false);
          if (io) {
            io.emit('user:status_changed', { userId: currentUserId, isOnline: false });
          }
        } catch (err) {
          console.error('[SOCKET] Error updating offline status:', err);
        }
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io has not been initialized!');
  return io;
};

// ── Job Card Events ─────────────────────────────────────────────────────────

export const emitJobCreated = (jobCard: any) => {
  if (io) {
    console.log('[SOCKET] Emitting jobCard:created for', jobCard?.vehicleNumber);
    io.emit('jobCard:created', jobCard);
  }
};

export const emitJobDeleted = (jobCardId: string) => {
  if (io) {
    console.log('[SOCKET] Emitting jobCard:deleted for', jobCardId);
    io.emit('jobCard:deleted', { jobCardId });
  }
};

// ── Task Events ─────────────────────────────────────────────────────────────

export const emitTaskAdded = (jobCardId: string, task: any) => {
  if (io) {
    console.log('[SOCKET] Emitting task:added for job', jobCardId);
    io.emit('task:added', { jobCardId, task });
  }
};

export const emitTaskUpdated = (
  jobCardId: string,
  taskId: string,
  task: any,
  action: 'COMPLETE' | 'REOPEN'
) => {
  if (io) {
    console.log('[SOCKET] Emitting task:updated', taskId, '-> action:', action, 'status:', task?.status);
    io.emit('task:updated', { jobCardId, taskId, task, action });
  }
};

export const emitTaskDeleted = (jobCardId: string, taskId: string) => {
  if (io) {
    console.log('[SOCKET] Emitting task:deleted', taskId);
    io.emit('task:deleted', { jobCardId, taskId });
  }
};

// ── User Events ─────────────────────────────────────────────────────────────

export const emitUserApproved = (userId: string) => {
  if (io) {
    io.to(`user:${userId}`).emit('user:approved', { userId });
    io.emit('user:approved_global', { userId });
  }
};

export const emitUserBlocked = (userId: string) => {
  if (io) {
    io.to(`user:${userId}`).emit('user:blocked', { userId });
    io.emit('user:blocked_global', { userId });
  }
};
