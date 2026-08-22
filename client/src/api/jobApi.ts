import { apiSlice } from './apiSlice';

export interface TaskItem {
  id: string;
  _id?: string;
  jobCardId: string;
  title: string;
  description?: string;
  inventoryItem?: { id?: string; _id?: string; title: string; thumbnailUrl?: string; itemType: 'PRODUCT' | 'SERVICE' };
  itemType?: 'PRODUCT' | 'SERVICE';
  quantityUsed?: number;
  unitPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  status: 'OPEN' | 'COMPLETED';
  completedBy?: {
    id?: string;
    _id?: string;
    name: string;
    mobile: string;
    role: string;
    profileImageUrl?: string;
  };
  partnerBy?: {
    id?: string;
    _id?: string;
    name: string;
    mobile: string;
    role: string;
    profileImageUrl?: string;
  };
  partners?: {
    id?: string;
    _id?: string;
    name: string;
    mobile: string;
    role: string;
    profileImageUrl?: string;
  }[];
  isShared?: boolean;
  isPinned?: boolean;
  completedAt?: string;
  createdAt: string;
  activityLog?: { action: 'COMPLETED' | 'REOPENED'; at: string; user?: { name: string; profileImageUrl?: string } }[];
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
  thumbnailUrl?: string;
  expectedDeliveryDate?: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdBy?: {
    id?: string;
    _id?: string;
    name: string;
    mobile?: string;
    role?: string;
    profileImageUrl?: string;
  };
  isPinnedForAll?: boolean;
  pinnedBy?: string[] | { id?: string; _id?: string; name?: string }[];
  createdAt: string;
  updatedAt: string;
  verifiedBy?: { name: string };
  verifiedAt?: string;
  tasks: TaskItem[];
}

export interface CreateJobRequest {
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  thumbnailUrl?: string;
  expectedDeliveryDate?: string | null;
  tasks: Array<string | { itemId: string; quantityUsed: number; discountAmount?: number }>;
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
      { page?: number; limit?: number; timeframe?: string; tab?: string; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } | void
    >({
      query: (params) => {
        if (!params) return '/jobs';
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.timeframe) queryParams.append('timeframe', params.timeframe);
        if (params.tab) queryParams.append('tab', params.tab);
        if (params.search) queryParams.append('search', params.search);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        const qs = queryParams.toString();
        return qs ? `/jobs?${qs}` : '/jobs';
      },
      providesTags: ['JobCard'],
    }),

    getJobCardById: builder.query<{ success: boolean; data: JobCardData }, string>({
      query: (jobCardId) => `/jobs/${jobCardId}`,
      providesTags: (_result, _error, id) => [{ type: 'JobCard', id }],
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
      { jobCardId: string } & Partial<Pick<CreateJobRequest, 'vehicleName' | 'vehicleNumber' | 'vehicleColor' | 'customerName' | 'customerMobile' | 'customerEmail' | 'expectedDeliveryDate'>>
    >({
      query: ({ jobCardId, ...body }) => ({ url: `/jobs/${jobCardId}`, method: 'PATCH', body }),
      invalidatesTags: ['JobCard'],
    }),

    /**
     * Explicit set task status — sends { action: 'COMPLETE' | 'REOPEN', partnerId?: string } in body.
     */
    setTaskStatus: builder.mutation<
      { success: boolean; data: TaskItem },
      { taskId: string; action: 'COMPLETE' | 'REOPEN'; partnerIds?: string[]; currentUserName?: string; currentUserId?: string }
    >({
      query: ({ taskId, action, partnerIds }) => ({
        url: `/jobs/tasks/${taskId}/status`,
        method: 'PATCH',
        body: { action, partnerIds },
      }),
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
    addInventoryTask: builder.mutation<
      { success: boolean; data: TaskItem },
      { jobCardId: string; itemId: string; quantityUsed: number; discountAmount: number }
    >({
      query: ({ jobCardId, ...body }) => ({ url: `/jobs/${jobCardId}/inventory-tasks`, method: 'POST', body }),
      invalidatesTags: ['JobCard', 'Task', 'Catalog'],
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
    toggleTaskPin: builder.mutation<{ success: boolean; data: TaskItem }, { taskId: string }>({
      query: ({ taskId }) => ({ url: `/jobs/tasks/${taskId}/pin`, method: 'PATCH' }),
      invalidatesTags: ['JobCard'],
    }),
    toggleJobPin: builder.mutation<
      { success: boolean; data: JobCardData },
      { jobCardId: string; mode: 'ALL' | 'ME' }
    >({
      query: ({ jobCardId, mode }) => ({
        url: `/jobs/${jobCardId}/pin`,
        method: 'PATCH',
        body: { mode },
      }),
      invalidatesTags: ['JobCard'],
    }),
    verifyJobCard: builder.mutation<{ success: boolean; data: JobCardData }, { jobCardId: string }>({
      query: ({ jobCardId }) => ({ url: `/jobs/${jobCardId}/verify`, method: 'PATCH' }),
      invalidatesTags: ['JobCard'],
    }),
    uploadJobImage: builder.mutation<
      { success: boolean; data: JobCardData },
      { jobCardId: string; image: string }
    >({
      query: ({ jobCardId, image }) => ({
        url: `/jobs/${jobCardId}/image`,
        method: 'PATCH',
        body: { image },
      }),
      invalidatesTags: ['JobCard'],
    }),
  }),
});

export const {
  useGetJobCardsQuery,
  useGetJobCardByIdQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useSetTaskStatusMutation,
  useAddTaskMutation,
  useAddInventoryTaskMutation,
  useDeleteTaskMutation,
  useDeleteJobCardMutation,
  useToggleTaskPinMutation,
  useToggleJobPinMutation,
  useVerifyJobCardMutation,
  useUploadJobImageMutation,
} = jobApi;

