import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  Package,
  Plus,
  Search,
  Wrench,
  X,
  Layers,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { MagicTabs } from '../../../shared/components/magicui/MagicTabs';
import {
  CatalogItem,
  useGetCatalogQuery,
  useGetCategoriesQuery,
} from '../../catalog/api/catalogApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { advancedSearch } from '../../../shared/utils/searchAlgorithm';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

type CatalogFilterType = 'ALL' | 'PRODUCT' | 'SERVICE';

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CatalogFilterType>('ALL');
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

  const lowStockItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.itemType === 'PRODUCT' &&
          item.trackStock !== false &&
          item.stockQuantity <= (item.minimumStockQuantity ?? 0)
      ),
    [items]
  );

  const filterTabs = useMemo(
    () => [
      { key: 'ALL' as CatalogFilterType, label: 'All Items' },
      { key: 'PRODUCT' as CatalogFilterType, label: 'Products & Spares' },
      { key: 'SERVICE' as CatalogFilterType, label: 'Services' },
    ],
    []
  );

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col overflow-x-clip selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* Page Header Component with seamless BackButton & parenthesis count */}
        <PageHeader
          backTo="/dashboard"
          title="Parts & Catalog"
          count={items.length}
          description="Manage inventory spares and workshop service items"
          actions={
            <div className="flex items-center gap-2">
              {isAdmin && lowStockItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsLowStockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Low Stock</span>
                  <span>({lowStockItems.length})</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/inventory/new')}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl glass-gold-btn text-xs sm:text-sm font-black text-slate-950 shadow-md active:scale-95 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add Item</span>
                </button>
              )}
            </div>
          }
        />

        {/* Controls Section: Magic Tabs & Search */}
        <div className="space-y-2.5">
          {/* Magic UI Tabs for Types */}
          <MagicTabs
            items={filterTabs}
            activeKey={typeFilter}
            onChange={(key) => setTypeFilter(key as CatalogFilterType)}
            layoutId="inventory-catalog-type"
          />

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts, services, SKU or categories..."
              className="w-full rounded-2xl glass-modern-input py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition dark:text-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Quick Filters */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              <button
                type="button"
                onClick={() => setCategoryFilter('')}
                className={`shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  categoryFilter === ''
                    ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                    : 'glass-ghost-btn text-slate-600 dark:text-slate-400 hover:text-amber-500'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => {
                const catId = cat.id || cat._id;
                const isSelected = categoryFilter === catId;
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategoryFilter(catId)}
                    className={`shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                        : 'glass-ghost-btn text-slate-600 dark:text-slate-400 hover:text-amber-500'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory Bento Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl glass-modern-card p-3 shadow-2xs animate-pulse"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-200/60 dark:bg-white/5" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-16 rounded bg-slate-200/60 dark:bg-white/5" />
                  <div className="h-4 w-3/4 rounded bg-slate-200/60 dark:bg-white/5" />
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-white/5">
                    <div className="h-4 w-14 rounded bg-slate-200/60 dark:bg-white/5" />
                    <div className="h-3 w-12 rounded bg-slate-200/60 dark:bg-white/5" />
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
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl glass-modern-card p-3 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-lg"
                >
                  {/* Media / Image container */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500">
                        {item.itemType === 'SERVICE' ? (
                          <Wrench className="h-10 w-10 stroke-[1.5] text-violet-500/70 dark:text-violet-400/70" />
                        ) : (
                          <Package className="h-10 w-10 stroke-[1.5] text-amber-500/70 dark:text-amber-400/70" />
                        )}
                      </div>
                    )}

                    {/* Top Chips */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md ${
                          item.itemType === 'SERVICE'
                            ? 'bg-violet-500/80 text-white'
                            : 'bg-amber-400/80 text-slate-950'
                        }`}
                      >
                        {item.itemType}
                      </span>
                    </div>

                    {isLowStock && (
                      <span className="absolute top-2 right-2 rounded-lg bg-rose-500/90 text-white px-1.5 py-0.5 text-[9px] font-black uppercase backdrop-blur-md animate-pulse">
                        Low
                      </span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-lg dark:bg-slate-900/90 dark:text-white">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="mt-2.5 flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                        {item.category?.name || 'General'}
                      </p>
                      <h2 className="mt-0.5 line-clamp-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h2>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/50 pt-2 dark:border-white/10">
                      <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {money(item.price)}
                      </strong>

                      <span
                        className={`text-[10px] sm:text-xs font-semibold ${
                          item.itemType === 'SERVICE'
                            ? 'text-violet-600 dark:text-violet-400'
                            : isLowStock
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.itemType === 'SERVICE'
                          ? 'Service'
                          : isLowStock
                          ? `Low: ${item.stockQuantity}`
                          : `${item.stockQuantity} in stock`}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty State styled with frosted glass card matching app design */
          <div className="flex flex-col items-center justify-center rounded-3xl glass-modern-card py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-500 dark:text-amber-400 border border-amber-400/20 mb-3">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              No items found
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {search
                ? `No items match "${search}". Try searching for another keyword.`
                : 'All inventory items in this category are clear.'}
            </p>
          </div>
        )}
      </main>

      {/* Low Stock Alert Modal */}
      {isLowStockModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          onClick={() => setIsLowStockModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl glass-modern-card p-6 shadow-2xl border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/25">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Low Stock Alerts
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} require restocking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-200/40 dark:divide-white/5 my-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/40 dark:border-white/10">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Alert threshold: {item.minimumStockQuantity ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0">
                    <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-xs font-black text-rose-600 dark:text-rose-400">
                      {item.stockQuantity} left
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLowStockModalOpen(false)}
                className="rounded-xl glass-gold-btn px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 transition active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
