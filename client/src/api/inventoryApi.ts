import { apiSlice } from './apiSlice';

export interface InventoryItem {
  _id: string;
  name: string;
  category?: string;
  createdAt: string;
}

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchInventory: builder.query<{ success: boolean; data: InventoryItem[] }, string>({
      query: (q) => `/inventory?q=${encodeURIComponent(q)}&limit=10`,
      providesTags: ['TaskInventory'],
    }),

    getAllInventory: builder.query<{ success: boolean; data: InventoryItem[] }, void>({
      query: () => '/inventory?limit=200',
      providesTags: ['TaskInventory'],
    }),

    addInventoryItem: builder.mutation<
      { success: boolean; data: InventoryItem },
      { name: string; category?: string }
    >({
      query: (body) => ({
        url: '/inventory',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TaskInventory'],
    }),

    deleteInventoryItem: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `/inventory/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TaskInventory'],
    }),
  }),
});

export const {
  useSearchInventoryQuery,
  useGetAllInventoryQuery,
  useAddInventoryItemMutation,
  useDeleteInventoryItemMutation,
} = inventoryApi;
