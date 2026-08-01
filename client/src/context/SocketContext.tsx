import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { apiSlice } from '../api/apiSlice';
import { logout, updateUser } from '../slice/authSlice';
import { useNavigate } from 'react-router-dom';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Determine backend URL
    const backendUrl =
      import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || window.location.origin;

    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET CLIENT] Connected to server:', socket.id);
      if (user?.id) {
        socket.emit('join', user.id);
      }
    });

    socket.on('jobCard:created', () => {
      console.log('[SOCKET CLIENT] Real-time jobCard:created event received.');
      dispatch(apiSlice.util.invalidateTags(['JobCard']));
    });

    socket.on('task:added', () => {
      console.log('[SOCKET CLIENT] Real-time task:added event received.');
      dispatch(apiSlice.util.invalidateTags(['JobCard']));
    });

    socket.on('task:completed', () => {
      console.log('[SOCKET CLIENT] Real-time task:completed event received.');
      dispatch(apiSlice.util.invalidateTags(['JobCard', 'User']));
    });

    socket.on('user:approved_global', () => {
      dispatch(apiSlice.util.invalidateTags(['PendingWorkers', 'AllUsers', 'User']));
    });

    socket.on('user:approved', ({ userId }) => {
      console.log('[SOCKET CLIENT] User approved event received for:', userId);
      dispatch(apiSlice.util.invalidateTags(['User', 'PendingWorkers']));
      if (user && user.id === userId) {
        dispatch(updateUser({ ...user, isApproved: true }));
        navigate('/dashboard');
      }
    });

    socket.on('user:blocked', ({ userId }) => {
      console.log('[SOCKET CLIENT] User blocked event received for:', userId);
      if (user && user.id === userId) {
        dispatch(logout());
        navigate('/login');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, user?.id]);

  // Re-emit join when user changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected && user?.id) {
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
