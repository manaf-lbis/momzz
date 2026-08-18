import React, { useMemo, useState } from 'react';
import { AlertTriangle, Eye, Package, Plus, Search, Tag, Wrench, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar/Navbar';
import { CatalogItem, useGetCatalogQuery, useGetCategoriesQuery } from '../api/catalogApi';
import { useAuth } from '../hooks/useAuth';
import { advancedSearch } from '../utils/searchAlgorithm';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  const { data, isLoading } = useGetCatalogQuery({
    q: search || undefined,
    ...(typeFilter !== 'ALL' ? { itemType: typeFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  });
  const { data: categoryData } = useGetCategoriesQuery();

  const rawItems = data?.data || [];
  const categories = categoryData?.data || [];

  const items = useMemo(() => {
    if (!search.trim()) return rawItems;
    return advancedSearch<CatalogItem>(
      rawItems,
      search,
      {
        getTitle: (item) => item.title,
        getSku: (item) => item.sku,
        getCategory: (item) => item.category?.name,
        getDescription: (item) => item.description,
      },
      140
    );
  }, [rawItems, search]);

  const lowStockItems = items.filter(
    (item) =>
      item.itemType === 'PRODUCT' &&
      item.trackStock !== false &&
      item.stockQuantity <= (item.minimumStockQuantity ?? 0)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-white transition-colors duration-200">
      <Navbar />

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300 ring-1 ring-amber-500/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Inventory
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Manage products and services for job cards & direct POS sales.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Low Stock Alert Button */}
            {isAdmin && lowStockItems.length > 0 && (
              <button
                onClick={() => setIsLowStockModalOpen(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-red-500 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-600 active:scale-[0.98] animate-pulse"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Low Stock</span>
                <span className="inline sm:hidden">Alert</span>
                <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-white/20 text-[10px] sm:text-xs font-black">
                  {lowStockItems.length}
                </span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => navigate('/inventory/new')}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-500 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-[0.98]"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Search + Type Filter */}
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products or services..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-800"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Type Filter Tabs */}
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90">
              {(['ALL', 'PRODUCT', 'SERVICE'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTypeFilter(tab)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    typeFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-amber-400 dark:text-slate-950'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'PRODUCT' ? 'Products' : 'Services'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('')}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                categoryFilter === ''
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-400 dark:hover:text-amber-400'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id || cat._id}
                onClick={() => setCategoryFilter(cat.id || cat._id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  categoryFilter === (cat.id || cat._id)
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-400 dark:hover:text-amber-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Inventory Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/90"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="h-5 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="h-4 w-12 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => {
              const isLowStock =
                item.itemType === 'PRODUCT' &&
                item.trackStock !== false &&
                item.stockQuantity <= (item.minimumStockQuantity || 0);

              return (
                <Link
                  key={item.id}
                  to={`/inventory/${item.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-amber-400/50"
                >
                  {/* Image */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600">
                        {item.itemType === 'SERVICE' ? (
                          <Wrench className="h-10 w-10 stroke-[1.5]" />
                        ) : (
                          <Package className="h-10 w-10 stroke-[1.5]" />
                        )}
                      </div>
                    )}

                    {/* Type Badge */}
                    <span
                      className={`absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-md ${
                        item.itemType === 'SERVICE'
                          ? 'bg-violet-600/90 text-white'
                          : 'bg-amber-400/90 text-slate-950'
                      }`}
                    >
                      {item.itemType}
                    </span>

                    {/* Low Stock Badge */}
                    {isLowStock && (
                      <span className="absolute right-2 top-2 rounded-lg bg-red-500/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-white backdrop-blur-md">
                        LOW
                      </span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg dark:bg-slate-900/90 dark:text-white">
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </span>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="mt-2.5 sm:mt-3 flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                        {item.category?.name || 'General'}
                      </p>
                      <h2 className="mt-0.5 line-clamp-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h2>
                    </div>

                    <div className="mt-2 sm:mt-3 flex items-center justify-between border-t border-slate-100 pt-2 sm:pt-2.5 dark:border-slate-800">
                      <strong className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {money(item.price)}
                      </strong>
                      <span
                        className={`rounded-full px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-bold ${
                          item.itemType === 'SERVICE'
                            ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                            : isLowStock
                            ? 'animate-pulse bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        }`}
                      >
                        {item.itemType === 'SERVICE'
                          ? 'Service'
                          : isLowStock
                          ? `Low: ${item.stockQuantity}`
                          : `${item.stockQuantity} left`}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">No items found</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {search
                ? `No items match "${search}".`
                : 'There are currently no items in this inventory view.'}
            </p>
          </div>
        )}
      </main>

      {/* Low Stock Alert Modal */}
      {isLowStockModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onClick={() => setIsLowStockModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Low Stock Alert</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need restocking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLowStockModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Threshold: {item.minimumStockQuantity ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700 dark:bg-red-500/20 dark:text-red-300">
                      {item.stockQuantity} left
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-end">
              <button
                onClick={() => setIsLowStockModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900 transition hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
