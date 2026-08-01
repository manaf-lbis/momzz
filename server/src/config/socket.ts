import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ENV } from './env';

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
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    socket.on('join', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[SOCKET] Socket ${socket.id} joined room user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
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
  } else {
    console.error('[SOCKET] io is null, cannot emit jobCard:created');
  }
};

export const emitJobDeleted = (jobCardId: string) => {
  if (io) {
    console.log('[SOCKET] Emitting jobCard:deleted for', jobCardId);
    io.emit('jobCard:deleted', { jobCardId });
  } else {
    console.error('[SOCKET] io is null, cannot emit jobCard:deleted');
  }
};

// ── Task Events ─────────────────────────────────────────────────────────────

export const emitTaskAdded = (jobCardId: string, task: any) => {
  if (io) {
    console.log('[SOCKET] Emitting task:added for job', jobCardId);
    io.emit('task:added', { jobCardId, task });
  } else {
    console.error('[SOCKET] io is null, cannot emit task:added');
  }
};

/**
 * Emitted when a task status is explicitly set to COMPLETE or REOPEN.
 * Sends the full updated task object + the action so clients can apply it deterministically.
 */
export const emitTaskUpdated = (
  jobCardId: string,
  taskId: string,
  task: any,
  action: 'COMPLETE' | 'REOPEN'
) => {
  if (io) {
    console.log('[SOCKET] Emitting task:updated', taskId, '-> action:', action, 'status:', task?.status);
    io.emit('task:updated', { jobCardId, taskId, task, action });
  } else {
    console.error('[SOCKET] io is null, cannot emit task:updated');
  }
};

export const emitTaskDeleted = (jobCardId: string, taskId: string) => {
  if (io) {
    console.log('[SOCKET] Emitting task:deleted', taskId);
    io.emit('task:deleted', { jobCardId, taskId });
  } else {
    console.error('[SOCKET] io is null, cannot emit task:deleted');
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
