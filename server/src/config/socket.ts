import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ENV } from './env';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: ENV.CLIENT_URL || '*',
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
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

// Event Broadcasters
export const emitJobCreated = (jobCard: any) => {
  if (io) {
    io.emit('jobCard:created', jobCard);
  }
};

export const emitTaskAdded = (jobCardId: string, task: any) => {
  if (io) {
    io.emit('task:added', { jobCardId, task });
  }
};

export const emitTaskCompleted = (jobCardId: string, taskId: string, completedBy: any) => {
  if (io) {
    io.emit('task:completed', { jobCardId, taskId, completedBy });
  }
};

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
