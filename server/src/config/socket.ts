import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from './env';
import { userRepository } from '../repository/userRepository';
import { cacheService } from '../service/cacheService';

let io: Server | null = null;

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/$/, '');
  return ENV.CORS_ORIGINS.some(
    (allowed) => allowed && allowed.replace(/\/$/, '') === cleanOrigin
  );
};

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin) || ENV.CORS_ORIGINS.length === 0) {
          callback(null, true);
        } else {
          console.warn(`[SOCKET CORS] Blocked origin: ${origin}`);
          callback(new Error('Origin not allowed by Socket CORS policy'));
        }
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication Handshake Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization &&
          socket.handshake.headers.authorization.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (rawToken) {
        const isRevoked = await cacheService.isTokenBlacklisted(rawToken);
        if (isRevoked) {
          return next(new Error('Access token has been revoked.'));
        }

        try {
          const decoded = jwt.verify(rawToken, ENV.JWT_ACCESS_SECRET) as any;
          socket.data.user = decoded;
        } catch (jwtError) {
          return next(new Error('Invalid or expired socket access token.'));
        }
      }

      next();
    } catch (err: any) {
      next(err);
    }
  });

  io.on('connection', async (socket: Socket) => {
    const authUser = socket.data.user;
    const currentUserId = authUser?.id;

    if (currentUserId) {
      console.log(`[SOCKET] Authenticated client connected: ${socket.id} (User: ${currentUserId})`);
      socket.join(`user:${currentUserId}`);

      try {
        await userRepository.setUserOnlineStatus(currentUserId, true);
        if (io) {
          io.emit('user:status_changed', { userId: currentUserId, isOnline: true });
        }
      } catch (err) {
        console.error('[SOCKET] Error updating online status:', err);
      }
    } else {
      console.log(`[SOCKET] Guest/Public client connected: ${socket.id}`);
    }

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

export const emitJobUpdated = (jobCard: any) => {
  if (io) {
    console.log('[SOCKET] Emitting jobCard:updated for', jobCard?.vehicleNumber || jobCard?.id);
    io.emit('jobCard:updated', jobCard);
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
  action: 'COMPLETE' | 'REOPEN' | 'PIN_TOGGLED'
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
