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
  customerName?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  tasks: TaskItem[];
}

export interface CreateJobRequest {
  vehicleName: string;
  vehicleNumber: string;
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
    getJobCards: builder.query<{ success: boolean; data: any }, { page?: number; limit?: number; timeframe?: string } | void>({
      query: (params) => {
        if (!params) return '/jobs';
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.timeframe) queryParams.append('timeframe', params.timeframe);
        return `/jobs?${queryParams.toString()}`;
      },
      providesTags: ['JobCard'],
    }),
    createJob: builder.mutation<{ success: boolean; message: string; data: JobCardData }, CreateJobRequest>({
      query: (body) => ({
        url: '/jobs/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobCard'],
    }),
    toggleTask: builder.mutation<{ success: boolean; data: TaskItem }, { taskId: string; currentUserName?: string }>({
      query: ({ taskId }) => ({
        url: `/jobs/tasks/${taskId}/toggle`,
        method: 'PATCH',
      }),
      async onQueryStarted({ taskId, currentUserName }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          jobApi.util.updateQueryData('getJobCards', undefined, (draft) => {
            const jobsList = Array.isArray(draft.data) ? draft.data : (draft.data as any)?.jobs || [];
            for (const job of jobsList) {
              const task = job.tasks?.find((t: TaskItem) => (t.id || t._id) === taskId);
              if (task) {
                const isCompleted = task.status === 'COMPLETED';
                task.status = isCompleted ? 'OPEN' : 'COMPLETED';
                if (!isCompleted) {
                  task.completedBy = {
                    name: currentUserName || 'Worker',
                    mobile: '',
                    role: 'WORKER',
                  };
                  task.completedAt = new Date().toISOString();
                } else {
                  task.completedBy = undefined;
                  task.completedAt = undefined;
                }

                // Check if all tasks in job are finished
                const allCompleted = job.tasks.every((t: TaskItem) => t.status === 'COMPLETED');
                job.status = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';
                break;
              }
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['JobCard', 'User'],
    }),
    addTask: builder.mutation<{ success: boolean; data: TaskItem }, { jobCardId: string; title: string }>({
      query: ({ jobCardId, title }) => ({
        url: `/jobs/${jobCardId}/tasks`,
        method: 'POST',
        body: { title },
      }),
      invalidatesTags: ['JobCard'],
    }),
    deleteTask: builder.mutation<{ success: boolean; message: string }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/jobs/tasks/${taskId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobCard', 'User'],
    }),
    deleteJobCard: builder.mutation<{ success: boolean; message: string }, { jobCardId: string }>({
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
  useToggleTaskMutation,
  useAddTaskMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
} = jobApi;
