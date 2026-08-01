import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '../slice/authSlice';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const baseQuery = fetchBaseQuery({
  baseUrl: `${SERVER_URL}/api`,
  credentials: 'include', // Include HttpOnly cookies (refreshToken)
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  // If access token expired (401 Unauthorized), attempt token rotation via HttpOnly refresh cookie
  if (result.error && result.error.status === 401) {
    // Prevent infinite loop if /auth/refresh itself fails
    const url = typeof args === 'string' ? args : args.url;
    if (url !== '/auth/refresh' && url !== '/auth/login') {
      const refreshResult = await baseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const data = refreshResult.data as any;
        const newAccessToken = data.data.accessToken;
        const user = data.data.user;

        // Update Redux state & localStorage
        api.dispatch(setCredentials({ user, token: newAccessToken }));

        // Retry original API call with new access token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed / compromised token -> logout user
        api.dispatch(logout());
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'PendingWorkers', 'AllUsers', 'JobCard', 'Task', 'Dummy'],
  endpoints: () => ({}),
});
