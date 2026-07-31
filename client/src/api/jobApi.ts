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

export const jobApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobCards: builder.query<{ success: boolean; data: JobCardData[] }, void>({
      query: () => '/jobs',
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
    toggleTask: builder.mutation<{ success: boolean; data: TaskItem }, { taskId: string }>({
      query: ({ taskId }) => ({
        url: `/jobs/tasks/${taskId}/toggle`,
        method: 'PATCH',
      }),
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
