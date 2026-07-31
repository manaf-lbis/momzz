import { apiSlice } from './apiSlice';
import { User } from '../slice/authSlice';
import { UserRole } from '../constants/roles';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    token?: string;
    user: User;
  };
}

export interface RegisterRequest {
  name: string;
  mobile: string;
  password: string;
  role?: string;
}

export interface LoginRequest {
  mobile: string;
  password: string;
}

export interface PendingWorkersResponse {
  success: boolean;
  message: string;
  data: User[];
}

export interface DummyApiResponse {
  success: boolean;
  message: string;
  data: {
    serverTime: string;
    environment: string;
    system: string;
    dummyStatus: string;
  };
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    refreshToken: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    logoutApi: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    getMe: builder.query<{ success: boolean; data: User }, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    getPendingWorkers: builder.query<PendingWorkersResponse, void>({
      query: () => '/auth/pending',
      providesTags: ['PendingWorkers'],
    }),
    approveWorker: builder.mutation<{ success: boolean; message: string; data: User }, { userId: string; isApproved: boolean }>({
      query: ({ userId, isApproved }) => ({
        url: `/auth/approve/${userId}`,
        method: 'PATCH',
        body: { isApproved },
      }),
      invalidatesTags: ['PendingWorkers', 'User'],
    }),
    getDummy: builder.query<DummyApiResponse, void>({
      query: () => '/dummy',
      providesTags: ['Dummy'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutApiMutation,
  useGetMeQuery,
  useGetPendingWorkersQuery,
  useApproveWorkerMutation,
  useGetDummyQuery,
} = authApi;
