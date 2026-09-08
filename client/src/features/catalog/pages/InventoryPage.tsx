import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Package,
  Plus,
  Search,
  Wrench,
  X,
  ChevronRight,
  Boxes,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

type StockFilterType = 'ALL' | 'LOW_STOCK' | 'PRODUCT' | 'SERVICE';

const PAGE_SIZE = 16;

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Determine query parameters based on current filter
  const queryItemType =
    stockFilter === 'PRODUCT'
      ? 'PRODUCT'
      : stockFilter === 'SERVICE'
      ? 'SERVICE'
      : undefined;

  const { data, isLoading } = useGetCatalogQuery({
    q: search || undefined,
    itemType: queryItemType,
    category: categoryFilter || undefined,
  });
  const { data: categoryData } = useGetCategoriesQuery();

  const rawItems = data?.data || [];
  const categories = categoryData?.data || [];

  // Client-side search & filtering
  const filteredItems = useMemo(() => {
    let result = rawItems;

    // Filter by low stock if tab is active
    if (stockFilter === 'LOW_STOCK') {
      result = result.filter(
        (item) =>
          item.itemType === 'PRODUCT' &&
          item.trackStock !== false &&
          (item.stockQuantity ?? 0) <= (item.minimumStockQuantity ?? 0)
      );
    }

    if (!search.trim()) return result;

    return advancedSearch<CatalogItem>(
      result,
      search,
      {
        getTitle: (item) => item.title,
        getSku: (item) => item.sku,
        getCategory: (item) => item.category?.name,
        getDescription: (item) => item.description,
      },
      140
    );
  }, [rawItems, search, stockFilter]);

  // Reset infinite scroll count when filter or search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, stockFilter, categoryFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredItems.length) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length));
        }
      },
      { threshold: 0.15, rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filteredItems.length]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  // Stock KPI calculations
  const lowStockItems = useMemo(
    () =>
      rawItems.filter(
        (item) =>
          item.itemType === 'PRODUCT' &&
          item.trackStock !== false &&
          (item.stockQuantity ?? 0) <= (item.minimumStockQuantity ?? 0)
      ),
    [rawItems]
  );

  const totalProducts = useMemo(
    () => rawItems.filter((item) => item.itemType === 'PRODUCT').length,
    [rawItems]
  );

  const totalServices = useMemo(
    () => rawItems.filter((item) => item.itemType === 'SERVICE').length,
    [rawItems]
  );

  const filterTabs = useMemo(
    () => [
      { key: 'ALL' as StockFilterType, label: `All Parts (${rawItems.length})` },
      {
        key: 'LOW_STOCK' as StockFilterType,
        label: `Low Stock (${lowStockItems.length})`,
      },
      { key: 'PRODUCT' as StockFilterType, label: `Spares (${totalProducts})` },
      { key: 'SERVICE' as StockFilterType, label: `Services (${totalServices})` },
    ],
    [rawItems.length, lowStockItems.length, totalProducts, totalServices]
  );

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col overflow-x-clip selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 flex flex-col gap-4">
        {/* Header */}
        <PageHeader
          backTo="/dashboard"
          title="Parts & Stock Inventory"
          count={filteredItems.length}
          description="Workshop spares, consumables and operational service parts"
          actions={
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/inventory/new')}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl glass-gold-btn text-xs sm:text-sm font-black text-slate-950 shadow-md active:scale-95 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add Part</span>
                </button>
              )}
            </div>
          }
        />

        {/* -- STOCK KPI OVERVIEW BAR -- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total Parts */}
          <div className="rounded-2xl glass-modern-card p-3 sm:p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Total Items</p>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {rawItems.length}
              </p>
            </div>
          </div>

          {/* Low Stock Alert */}
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
            className={`rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 text-left transition active:scale-95 cursor-pointer border ${
              lowStockItems.length > 0
                ? 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-500/[0.08]'
                : 'glass-modern-card'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              lowStockItems.length > 0
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 animate-pulse'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Low Stock</p>
              <p className={`text-base sm:text-lg font-black leading-tight ${
                lowStockItems.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}>
                {lowStockItems.length}
              </p>
            </div>
          </button>

          {/* Spares / Physical Products */}
          <div className="rounded-2xl glass-modern-card p-3 sm:p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Spares & Stock</p>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {totalProducts}
              </p>
            </div>
          </div>

          {/* Workshop Services */}
          <div className="rounded-2xl glass-modern-card p-3 sm:p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Labor & Services</p>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {totalServices}
              </p>
            </div>
          </div>
        </div>

        {/* -- SEARCH & FILTER CONTROLS -- */}
        <div className="space-y-2.5">
          {/* Stock Filter MagicTabs */}
          <MagicTabs
            items={filterTabs}
            activeKey={stockFilter}
            onChange={(key) => setStockFilter(key as StockFilterType)}
            layoutId="stock-mgmt-tabs"
          />

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part name, OEM SKU, part number, category..."
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

          {/* Category Chips */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              <button
                type="button"
                onClick={() => setCategoryFilter('')}
                className={`shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  categoryFilter === ''
                    ? 'bg-amber-400 text-slate-950 font-black'
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
                    onClick={() => setCategoryFilter(isSelected ? '' : catId)}
                    className={`shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black'
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

        {/* -- STOCK MANAGEMENT INVENTORY CARDS (Left Side Image, Right Side Details) -- */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl sm:rounded-3xl glass-modern-card p-3 sm:p-4 flex gap-3.5 items-center animate-pulse"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-200/60 dark:bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-200/60 dark:bg-white/5" />
                  <div className="h-4 w-3/4 rounded bg-slate-200/60 dark:bg-white/5" />
                  <div className="h-3 w-1/2 rounded bg-slate-200/60 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl glass-modern-card py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20 flex items-center justify-center mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              No stock items found
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {search ? `No items matched "${search}".` : 'No items match the selected stock filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleItems.map((item) => {
              const isService = item.itemType === 'SERVICE';
              const stockQty = item.stockQuantity ?? 0;
              const minQty = item.minimumStockQuantity ?? 0;
              const isLowStock = !isService && item.trackStock !== false && stockQty <= minQty;
              const isOutOfStock = !isService && item.trackStock !== false && stockQty <= 0;

              // Progress percentage for stock gauge
              const gaugeTarget = minQty > 0 ? Math.max(minQty * 2, 10) : 20;
              const stockPercent = Math.min(100, Math.round((stockQty / gaugeTarget) * 100));

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/inventory/${item.id}`)}
                  className={`group relative rounded-2xl sm:rounded-3xl glass-modern-card p-3 sm:p-3.5 flex gap-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/50 hover:shadow-lg cursor-pointer select-none overflow-hidden ${
                    isOutOfStock
                      ? 'border-rose-500/40'
                      : isLowStock
                      ? 'border-amber-400/40'
                      : ''
                  }`}
                >
                  {/* -- LEFT SIDE: PART IMAGE / THUMBNAIL -- */}
                  <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 shrink-0 self-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isService ? (
                          <Wrench className="w-8 h-8 text-violet-400/70" />
                        ) : (
                          <Package className="w-8 h-8 text-amber-500/70" />
                        )}
                      </div>
                    )}

                    {/* Left overlay chip: Type */}
                    <span
                      className={`absolute top-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-md ${
                        isService
                          ? 'bg-violet-500/80 text-white'
                          : 'bg-amber-400/90 text-slate-950 font-black'
                      }`}
                    >
                      {isService ? 'SVC' : 'PART'}
                    </span>
                  </div>

                  {/* -- RIGHT SIDE: STOCK MANAGEMENT DETAILS -- */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      {/* Top Row: Category + Stock Status Badge */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate max-w-[140px]">
                          {item.category?.name || 'General Spares'}
                        </span>

                        {/* Status Badge */}
                        {isService ? (
                          <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                            Workshop Service
                          </span>
                        ) : isOutOfStock ? (
                          <span className="shrink-0 text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="shrink-0 text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Low ({stockQty})
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            In Stock
                          </span>
                        )}
                      </div>

                      {/* Part Name */}
                      <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors line-clamp-1 mt-0.5">
                        {item.title}
                      </h2>

                      {/* SKU / Part Identifier */}
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {item.sku ? (
                          <span className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-white/5 truncate max-w-[130px]">
                            SKU: {item.sku}
                          </span>
                        ) : (
                          <span>ID: {item.id.slice(-6).toUpperCase()}</span>
                        )}
                      </div>
                    </div>

                    {/* Stock Level Bar (Only for trackable physical products) */}
                    {!isService && (
                      <div className="my-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400 dark:text-slate-500 font-semibold">
                            Stock Level
                          </span>
                          <span className={`font-black ${
                            isOutOfStock
                              ? 'text-rose-500'
                              : isLowStock
                              ? 'text-amber-500'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {stockQty} pcs {minQty > 0 && <span className="text-slate-400 font-normal">/ min {minQty}</span>}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isLowStock
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${isOutOfStock ? 0 : Math.max(stockPercent, 6)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bottom Row: Price & View Link */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.06] mt-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {money(item.price)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">/ unit</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* -- INFINITE SCROLL SENTINEL & COUNTER -- */}
        {filteredItems.length > 0 && (
          <div className="py-4 flex flex-col items-center justify-center gap-2">
            {visibleCount < filteredItems.length ? (
              <div ref={sentinelRef} className="flex items-center gap-2 text-xs font-mono text-slate-400 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
                <span>Loading more parts...</span>
              </div>
            ) : (
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                All {filteredItems.length} inventory items loaded
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default InventoryPage;
