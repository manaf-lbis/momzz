import { apiSlice } from './apiSlice';

export interface TaskItem {
  id: string;
  _id?: string;
  jobCardId: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'COMPLETED';
  completedBy?: {
    id?: string;
    _id?: string;
    name: string;
    mobile: string;
    role: string;
  };
  completedAt?: string;
  createdAt: string;
}

export interface JobCardData {
  id: string;
  _id?: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  tasks: TaskItem[];
}

export interface CreateJobRequest {
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  tasks: string[];
}


export interface PaginatedJobResponse {
  success: boolean;
  data: {
    jobs: JobCardData[];
    pagination: {
      total: number;
      page: number;
      totalPages: number;
    };
  } | JobCardData[];
}

export const jobApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobCards: builder.query<
      { success: boolean; data: any },
      { page?: number; limit?: number; timeframe?: string } | void
    >({
      query: (params) => {
        if (!params) return '/jobs';
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.timeframe) queryParams.append('timeframe', params.timeframe);
        const qs = queryParams.toString();
        return qs ? `/jobs?${qs}` : '/jobs';
      },
      providesTags: ['JobCard'],
    }),

    createJob: builder.mutation<
      { success: boolean; message: string; data: JobCardData },
      CreateJobRequest
    >({
      query: (body) => ({
        url: '/jobs/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobCard'],
    }),

    updateJob: builder.mutation<
      { success: boolean; data: JobCardData },
      { jobCardId: string } & Partial<Pick<CreateJobRequest, 'vehicleName' | 'vehicleNumber' | 'vehicleColor' | 'customerName' | 'customerMobile' | 'customerEmail'>>
    >({
      query: ({ jobCardId, ...body }) => ({ url: `/jobs/${jobCardId}`, method: 'PATCH', body }),
      invalidatesTags: ['JobCard'],
    }),

    /**
     * Explicit set task status — sends { action: 'COMPLETE' | 'REOPEN' } in body.
     * NOT a toggle. Prevents race conditions when two workers click simultaneously.
     */
    setTaskStatus: builder.mutation<
      { success: boolean; data: TaskItem },
      { taskId: string; action: 'COMPLETE' | 'REOPEN'; currentUserName?: string; currentUserId?: string }
    >({
      query: ({ taskId, action }) => ({
        url: `/jobs/tasks/${taskId}/status`,
        method: 'PATCH',
        body: { action },
      }),
      // DO NOT invalidatesTags here — the socket event handles cache updates for ALL clients.
      // The calling client applies an optimistic update in the component.
    }),

    addTask: builder.mutation<
      { success: boolean; data: TaskItem },
      { jobCardId: string; title: string }
    >({
      query: ({ jobCardId, title }) => ({
        url: `/jobs/${jobCardId}/tasks`,
        method: 'POST',
        body: { title },
      }),
      // Socket handles live update
    }),

    deleteTask: builder.mutation<
      { success: boolean; message: string },
      { taskId: string }
    >({
      query: ({ taskId }) => ({
        url: `/jobs/tasks/${taskId}`,
        method: 'DELETE',
      }),
      // Socket handles live update
    }),

    deleteJobCard: builder.mutation<
      { success: boolean; message: string },
      { jobCardId: string }
    >({
      query: ({ jobCardId }) => ({
        url: `/jobs/${jobCardId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobCard', 'User'],
    }),
  }),
});

export const {
  useGetJobCardsQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useSetTaskStatusMutation,
  useAddTaskMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
} = jobApi;
