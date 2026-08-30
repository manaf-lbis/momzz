import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from './env';
import { userRepository } from '../features/users/user.repository';
import { cacheService } from '../features/cache/cache.service';

let io: Server | null = null;

const isAllowedSocketOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/$/, '');
  const allowedOrigins = ENV.CORS_ORIGINS;

  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some((allowed) => {
    if (!allowed) return false;
    const cleanAllowed = allowed.replace(/\/$/, '');
    if (cleanAllowed === cleanOrigin) return true;

    // Support wildcard matching e.g. https://*.vercel.app
    if (cleanAllowed.includes('*')) {
      const pattern = cleanAllowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(cleanOrigin);
    }

    return false;
  });
};

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isAllowedSocketOrigin(origin) || ENV.CORS_ORIGINS.length === 0) {
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
        } catch {
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
      socket.join(`user:${currentUserId}`);

      try {
        await userRepository.setUserOnlineStatus(currentUserId, true);
        if (io) {
          io.emit('user:status_changed', { userId: currentUserId, isOnline: true });
        }
      } catch (err) {
        console.error('[SOCKET] Error updating online status:', err);
      }
    }

    socket.on('disconnect', async () => {
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
    io.emit('jobCard:created', jobCard);
  }
};

export const emitJobUpdated = (jobCard: any) => {
  if (io) {
    io.emit('jobCard:updated', jobCard);
  }
};

export const emitJobDeleted = (jobCardId: string) => {
  if (io) {
    io.emit('jobCard:deleted', { jobCardId });
  }
};

// ── Task Events ─────────────────────────────────────────────────────────────

export const emitTaskAdded = (jobCardId: string, task: any) => {
  if (io) {
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
    io.emit('task:updated', { jobCardId, taskId, task, action });
  }
};

export const emitTaskDeleted = (jobCardId: string, taskId: string) => {
  if (io) {
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
