import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserRole } from '../constants/roles';

export interface User {
  id: string;
  _id?: string;
  name: string;
  mobile: string;
  role: UserRole;
  isApproved: boolean;
  status?: 'ACTIVE' | 'BLOCKED';
  taskCount?: number;
  lastLoginAttempt?: string;
  totalLoginAttempts?: number;
  failedLoginAttempts?: number;
  loginLockedUntil?: string;
  isOnline?: boolean;
  lastSeen?: string;
  updatedAt?: string;
  createdAt?: string;
  profileImageUrl?: string;
  loginAudit?: Array<{ timestamp: string; status: 'SUCCESS' | 'FAILED'; ipAddress: string }>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const tokenFromStorage = localStorage.getItem('token');
const userFromStorage = localStorage.getItem('user');

const initialState: AuthState = {
  token: tokenFromStorage,
  user: userFromStorage ? JSON.parse(userFromStorage) : null,
  isAuthenticated: !!tokenFromStorage,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken?: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      if (action.payload.refreshToken) localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
