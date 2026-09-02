import { apiSlice } from './apiSlice';

export type CatalogItemType = 'PRODUCT' | 'SERVICE';
export interface Category { id: string; _id: string; name: string; description?: string; type: 'PRODUCT' | 'SERVICE' | 'BOTH'; }
export interface CatalogItem { id: string; _id: string; title: string; category: Category; itemType: CatalogItemType; price: number; stockQuantity: number; trackStock?: boolean; minimumStockQuantity?: number; sku?: string; thumbnailUrl: string; images: string[]; description?: string; isAvailable: boolean; }
export interface CatalogItemPayload { title: string; category?: string; categoryId?: string; itemType: CatalogItemType; price: number; stockQuantity?: number; minimumStockQuantity?: number; sku?: string; thumbnailUrl?: string; images?: string[]; description?: string; isAvailable?: boolean; }

export const catalogApi = apiSlice.injectEndpoints({ endpoints: (builder) => ({
  getCategories: builder.query<{ success: boolean; data: Category[] }, void>({ query: () => '/catalog/categories', providesTags: ['Catalog'] }),
  createCategory: builder.mutation<{ success: boolean; data: Category }, Omit<Category, 'id' | '_id'>>({ query: (body) => ({ url: '/catalog/categories', method: 'POST', body }), invalidatesTags: ['Catalog'] }),
  getCatalog: builder.query<{ success: boolean; data: CatalogItem[] }, { q?: string; itemType?: string; category?: string } | void>({ query: (filters) => ({ url: '/catalog/items', params: filters || {} }), providesTags: ['Catalog'] }),
  getCatalogItem: builder.query<{ success: boolean; data: CatalogItem }, string>({ query: (id) => `/catalog/items/${id}`, providesTags: ['Catalog'] }),
  createCatalogItem: builder.mutation<{ success: boolean; data: CatalogItem }, CatalogItemPayload>({ query: (body) => ({ url: '/catalog/items', method: 'POST', body }), invalidatesTags: ['Catalog'] }),
  quickAddCatalogItem: builder.mutation<{ success: boolean; data: CatalogItem }, { title: string; itemType?: CatalogItemType; price?: number }>({ query: (body) => ({ url: '/catalog/items/quick-add', method: 'POST', body }), invalidatesTags: ['Catalog'] }),
  updateCatalogItem: builder.mutation<{ success: boolean; data: CatalogItem }, { id: string; body: Partial<CatalogItemPayload> }>({ query: ({ id, body }) => ({ url: `/catalog/items/${id}`, method: 'PATCH', body }), invalidatesTags: ['Catalog'] }),
  deleteCatalogItem: builder.mutation<{ success: boolean }, string>({ query: (id) => ({ url: `/catalog/items/${id}`, method: 'DELETE' }), invalidatesTags: ['Catalog'] }),
  uploadCatalogImage: builder.mutation<{ success: boolean; data: { url: string } }, { image: string }>({ query: (body) => ({ url: '/catalog/upload', method: 'POST', body }) }),
  createSale: builder.mutation<{ success: boolean; data: { id: string; grandTotal: number; createdAt: string; items: unknown[] } }, { customerName?: string; customerMobile?: string; items: Array<{ itemId: string; quantity: number; discountAmount: number }> }>({ query: (body) => ({ url: '/catalog/sales', method: 'POST', body }), invalidatesTags: ['Catalog'] }),
}) });
export const { useGetCategoriesQuery, useCreateCategoryMutation, useGetCatalogQuery, useGetCatalogItemQuery, useCreateCatalogItemMutation, useQuickAddCatalogItemMutation, useUpdateCatalogItemMutation, useDeleteCatalogItemMutation, useUploadCatalogImageMutation, useCreateSaleMutation } = catalogApi;
