import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { ModernInfiniteLoader } from '../../../shared/components/common/ModernInfiniteLoader';
import { MagicTabs } from '../../../shared/components/magicui/MagicTabs';
import {
  CatalogItem,
  useGetCatalogStatsQuery,
  useGetCategoriesQuery,
  useGetPaginatedCatalogQuery,
} from '../../catalog/api/catalogApi';
import { useAuth } from '../../../shared/hooks/useAuth';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

type StockFilterType = 'ALL' | 'LOW_STOCK' | 'PRODUCT' | 'SERVICE';

const PAGE_SIZE = 20;

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const categoryStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const filterKey = `${debouncedSearch}||${stockFilter}||${categoryFilter}`;
  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      setItems([]);
      setHasMore(false);
    }
  }, [filterKey]);

  const { data: statsData } = useGetCatalogStatsQuery();
  const { data: categoryData } = useGetCategoriesQuery();
  const { currentData, isFetching } = useGetPaginatedCatalogQuery({
    q: debouncedSearch || undefined,
    stockFilter: stockFilter === 'ALL' ? undefined : stockFilter,
    category: categoryFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    const payload = currentData?.data;
    if (!payload) return;
    if (payload.pagination.page !== page) return;

    if (page === 1) {
      setItems(payload.items);
    } else {
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id || i._id));
        const next = payload.items.filter((i) => !seen.has(i.id || i._id));
        return [...prev, ...next];
      });
    }
    setHasMore(payload.pagination.hasMore);
    setTotalCount(payload.pagination.total);
  }, [currentData, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isFetching) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '140px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetching, items.length]);

  const categories = categoryData?.data || [];
  const stats = statsData?.data;
  const isInitialLoading = page === 1 && items.length === 0 && isFetching;

  const filterTabs = useMemo(
    () => [
      { key: 'ALL' as StockFilterType, label: `All (${stats?.totalCount ?? 0})` },
      { key: 'LOW_STOCK' as StockFilterType, label: `Low Stock (${stats?.lowStockCount ?? 0})` },
      { key: 'PRODUCT' as StockFilterType, label: `Spares (${stats?.productCount ?? 0})` },
      { key: 'SERVICE' as StockFilterType, label: `Services (${stats?.serviceCount ?? 0})` },
    ],
    [stats]
  );

  const scrollCategories = (dir: 'left' | 'right') => {
    const el = categoryStripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-3 sm:py-4 pb-36 sm:pb-40 md:pb-16 flex flex-col gap-3">
        {/* Header */}
        <PageHeader
          backTo="/dashboard"
          title="Inventory"
          count={totalCount || undefined}
          description="Parts & services"
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

        {/* -- STICKY SEARCH + AMAZON-STYLE CATEGORY SWIPE BAR -- */}
        <div className="sticky top-0 sm:top-14 z-30 -mx-3 sm:mx-0 px-3 sm:px-3.5 py-2.5 sm:rounded-2xl bg-slate-50/95 dark:bg-[#0b0d14]/95 backdrop-blur-xl border-b sm:border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2.5">
          {/* Amazon-style Horizontal Swipeable Categories */}
          {categories.length > 0 && (
            <div className="relative flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                aria-label="Scroll categories left"
                className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full glass-ghost-btn text-slate-500 hover:text-amber-500 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div
                ref={categoryStripRef}
                className="flex-1 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory touch-pan-x no-scrollbar scroll-smooth py-0.5"
              >
                <button
                  type="button"
                  onClick={() => setCategoryFilter('')}
                  className={`snap-start shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                    categoryFilter === ''
                      ? 'bg-amber-400 border-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-white/70 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-400/50'
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
                      className={`snap-start shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-amber-400 border-amber-400 text-slate-950 font-black shadow-xs'
                          : 'bg-white/70 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-400/50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollCategories('right')}
                aria-label="Scroll categories right"
                className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full glass-ghost-btn text-slate-500 hover:text-amber-500 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sticky Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part name, SKU, category..."
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

          {/* Filter Tabs */}
          <div className="overflow-x-auto no-scrollbar">
            <MagicTabs
              items={filterTabs}
              activeKey={stockFilter}
              onChange={(key) => setStockFilter(key as StockFilterType)}
              layoutId="stock-mgmt-tabs"
            />
          </div>
        </div>

        {/* -- STOCK MANAGEMENT INVENTORY CARDS -- */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl sm:rounded-3xl glass-modern-card p-3 sm:p-4 flex gap-3.5 items-center animate-pulse"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 aspect-square rounded-2xl bg-slate-200/60 dark:bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-200/60 dark:bg-white/5" />
                  <div className="h-4 w-3/4 rounded bg-slate-200/60 dark:bg-white/5" />
                  <div className="h-3 w-1/2 rounded bg-slate-200/60 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl glass-modern-card py-14 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20 flex items-center justify-center mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              No items found
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {search ? `No match for "${search}".` : 'Try another category or filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item) => {
              const itemId = item.id || item._id;
              const isService = item.itemType === 'SERVICE';
              const stockQty = item.stockQuantity ?? 0;
              const minQty = item.minimumStockQuantity ?? 0;
              const isLowStock = !isService && item.trackStock !== false && stockQty <= minQty;
              const isOutOfStock = !isService && item.trackStock !== false && stockQty <= 0;

              const gaugeTarget = minQty > 0 ? Math.max(minQty * 2, 10) : 20;
              const stockPercent = Math.min(100, Math.round((stockQty / gaugeTarget) * 100));

              return (
                <div
                  key={itemId}
                  onClick={() => navigate(`/inventory/${itemId}`)}
                  className={`group relative rounded-2xl sm:rounded-3xl glass-modern-card p-3 sm:p-3.5 flex gap-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/50 hover:shadow-lg cursor-pointer select-none overflow-hidden ${
                    isOutOfStock
                      ? 'border-rose-500/40'
                      : isLowStock
                      ? 'border-amber-400/40'
                      : ''
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 min-w-[96px] sm:min-w-[112px] shrink-0 aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-center self-center">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
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

                    <span
                      className={`absolute top-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-xs ${
                        isService
                          ? 'bg-violet-600/90 text-white'
                          : 'bg-amber-400/95 text-slate-950 font-black'
                      }`}
                    >
                      {isService ? 'SVC' : 'PART'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate max-w-[140px]">
                          {item.category?.name || 'General'}
                        </span>

                        {isService ? (
                          <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                            Service
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

                      <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors line-clamp-1 mt-0.5">
                        {item.title}
                      </h2>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {item.sku ? (
                          <span className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-white/5 truncate max-w-[120px]">
                            SKU: {item.sku}
                          </span>
                        ) : (
                          <span>ID: {itemId.slice(-6).toUpperCase()}</span>
                        )}

                        {item.description && (
                          <span className="truncate max-w-[140px] text-slate-500 dark:text-slate-400 font-sans" title={item.description}>
                            &bull; {item.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isService && (
                      <div className="my-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400 dark:text-slate-500 font-semibold">
                            Stock
                          </span>
                          <span className={`font-black ${
                            isOutOfStock
                              ? 'text-rose-500'
                              : isLowStock
                              ? 'text-amber-500'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {stockQty} pcs {minQty > 0 && <span className="text-slate-400 font-normal">/ {minQty}</span>}
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

        {/* -- INFINITE SCROLL LOADER & END COUNTER -- */}
        {items.length > 0 && (
          <ModernInfiniteLoader
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            isLoading={isFetching && page > 1}
            totalCount={totalCount || items.length}
            entityName="items"
            loadingLabel="Loading more items"
          />
        )}
      </main>
    </div>
  );
};

export default InventoryPage;
