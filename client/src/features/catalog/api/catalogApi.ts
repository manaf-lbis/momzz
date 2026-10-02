import { apiSlice } from '../../auth/api/apiSlice';

export type CatalogItemType = 'PRODUCT' | 'SERVICE';
export interface Category {
  id: string;
  _id: string;
  name: string;
  description?: string;
  type: 'PRODUCT' | 'SERVICE' | 'BOTH';
}
export interface CatalogItem {
  id: string;
  _id: string;
  title: string;
  category: Category;
  itemType: CatalogItemType;
  price: number;
  stockQuantity: number;
  trackStock?: boolean;
  minimumStockQuantity?: number;
  sku?: string;
  thumbnailUrl: string;
  images: string[];
  description?: string;
  isAvailable: boolean;
}
export interface CatalogItemPayload {
  title: string;
  category?: string;
  categoryId?: string;
  itemType: CatalogItemType;
  price: number;
  stockQuantity?: number;
  minimumStockQuantity?: number;
  sku?: string;
  thumbnailUrl?: string;
  images?: string[];
  description?: string;
  isAvailable?: boolean;
}

export interface ItemSaleHistory {
  id: string;
  customerName: string;
  customerMobile: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  soldBy: string;
  soldByRole?: string;
  createdAt: string;
}

export interface ItemJobHistory {
  id: string;
  jobCardId: string | null;
  vehicleName: string;
  vehicleNumber: string;
  customerName: string;
  customerMobile: string;
  jobStatus: string;
  taskTitle: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  finalPrice: number;
  taskStatus: string;
  completedBy: string;
  completedAt: string;
  createdAt: string;
}

export interface ItemHistoryData {
  sales: ItemSaleHistory[];
  jobs: ItemJobHistory[];
  summary: {
    totalSoldQty: number;
    totalSalesCount: number;
    totalJobsCount: number;
    totalRevenue: number;
    lastUsedAt: string | null;
  };
}

export interface SaleLineItem {
  item: CatalogItem | { id?: string; _id?: string; title: string; sku?: string; price: number };
  quantity: number;
  unitPrice: number;
  discountType?: 'FLAT' | 'PERCENT';
  discountValue?: number;
  discountAmount: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  _id?: string;
  invoiceNumber: string;
  customerName?: string;
  customerMobile?: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'OTHER';
  notes?: string;
  status: 'COMPLETED' | 'CANCELLED';
  cancelReason?: string;
  items: SaleLineItem[];
  subtotal: number;
  itemDiscountTotal?: number;
  billDiscountType?: 'FLAT' | 'PERCENT';
  billDiscountValue?: number;
  billDiscountAmount?: number;
  totalDiscount: number;
  grandTotal: number;
  soldBy: {
    id?: string;
    _id?: string;
    name: string;
    mobile?: string;
    role?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SalesMetrics {
  totalSalesCount: number;
  totalRevenue: number;
  todaySalesCount: number;
  todayRevenue: number;
  totalDiscounts: number;
  avgBillValue: number;
}

export interface SalesListResponse {
  sales: Sale[];
  metrics: SalesMetrics;
}

export interface CreateSalePayload {
  invoiceNumber?: string;
  customerName?: string;
  customerMobile?: string;
  paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'OTHER';
  notes?: string;
  billDiscountType?: 'FLAT' | 'PERCENT';
  billDiscountValue?: number;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice?: number;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
    discountAmount?: number;
  }>;
}

export interface UpdateSalePayload {
  customerName?: string;
  customerMobile?: string;
  paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'OTHER';
  notes?: string;
  billDiscountType?: 'FLAT' | 'PERCENT';
  billDiscountValue?: number;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice?: number;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
  }>;
}

export const catalogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<{ success: boolean; data: Category[] }, void>({
      query: () => '/catalog/categories',
      providesTags: ['Catalog'],
    }),
    createCategory: builder.mutation<
      { success: boolean; data: Category },
      Omit<Category, 'id' | '_id'>
    >({
      query: (body) => ({ url: '/catalog/categories', method: 'POST', body }),
      invalidatesTags: ['Catalog'],
    }),
    getCatalog: builder.query<
      { success: boolean; data: CatalogItem[] },
      { q?: string; itemType?: string; category?: string } | void
    >({
      query: (filters) => ({ url: '/catalog/items', params: filters || {} }),
      providesTags: ['Catalog'],
    }),
    getCatalogItem: builder.query<{ success: boolean; data: CatalogItem }, string>({
      query: (id) => `/catalog/items/${id}`,
      providesTags: ['Catalog'],
    }),
    getItemHistory: builder.query<{ success: boolean; data: ItemHistoryData }, string>({
      query: (id) => `/catalog/items/${id}/history`,
      providesTags: ['Catalog'],
    }),
    createCatalogItem: builder.mutation<
      { success: boolean; data: CatalogItem },
      CatalogItemPayload
    >({
      query: (body) => ({ url: '/catalog/items', method: 'POST', body }),
      invalidatesTags: ['Catalog'],
    }),
    quickAddCatalogItem: builder.mutation<
      { success: boolean; data: CatalogItem },
      { title: string; itemType?: CatalogItemType; price?: number }
    >({
      query: (body) => ({ url: '/catalog/items/quick-add', method: 'POST', body }),
      invalidatesTags: ['Catalog'],
    }),
    updateCatalogItem: builder.mutation<
      { success: boolean; data: CatalogItem },
      { id: string; body: Partial<CatalogItemPayload> }
    >({
      query: ({ id, body }) => ({ url: `/catalog/items/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Catalog'],
    }),
    adjustItemStock: builder.mutation<
      { success: boolean; data: { item: CatalogItem; finalStock: number; reason: string } },
      { id: string; delta?: number; newQuantity?: number; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/catalog/items/${id}/stock-adjust`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Catalog'],
    }),
    deleteCatalogItem: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/catalog/items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Catalog'],
    }),
    uploadCatalogImage: builder.mutation<
      { success: boolean; data: { url: string } },
      { image: string }
    >({ query: (body) => ({ url: '/catalog/upload', method: 'POST', body }) }),

    // Enterprise Sales & Invoicing Endpoints
    getSales: builder.query<
      { success: boolean; data: SalesListResponse },
      { q?: string; status?: string; limit?: number } | void
    >({
      query: (params) => ({ url: '/catalog/sales', params: params || {} }),
      providesTags: ['Sale'],
    }),
    getSaleById: builder.query<{ success: boolean; data: Sale }, string>({
      query: (id) => `/catalog/sales/${id}`,
      providesTags: ['Sale'],
    }),
    createSale: builder.mutation<{ success: boolean; data: Sale }, CreateSalePayload>({
      query: (body) => ({ url: '/catalog/sales', method: 'POST', body }),
      invalidatesTags: ['Catalog', 'Sale'],
    }),
    updateSale: builder.mutation<
      { success: boolean; data: Sale },
      { id: string; body: UpdateSalePayload }
    >({
      query: ({ id, body }) => ({ url: `/catalog/sales/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Catalog', 'Sale'],
    }),
    cancelSale: builder.mutation<
      { success: boolean; data: Sale },
      { id: string; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/catalog/sales/${id}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Catalog', 'Sale'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetCatalogQuery,
  useGetCatalogItemQuery,
  useGetItemHistoryQuery,
  useCreateCatalogItemMutation,
  useQuickAddCatalogItemMutation,
  useUpdateCatalogItemMutation,
  useAdjustItemStockMutation,
  useDeleteCatalogItemMutation,
  useUploadCatalogImageMutation,
  useGetSalesQuery,
  useGetSaleByIdQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useCancelSaleMutation,
} = catalogApi;
