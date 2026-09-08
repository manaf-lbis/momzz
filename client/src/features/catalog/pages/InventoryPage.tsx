import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Package,
  Plus,
  Search,
  Wrench,
  X,
  ChevronRight,
  ArrowLeft,
  Edit3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "../../../shared/components/navbar/Navbar";
import { PageHeader } from "../../../shared/components/common/PageHeader";
import { MagicTabs } from "../../../shared/components/magicui/MagicTabs";
import {
  CatalogItem,
  useGetCatalogQuery,
  useGetCategoriesQuery,
} from "../../catalog/api/catalogApi";
import { useAuth } from "../../../shared/hooks/useAuth";
import { advancedSearch } from "../../../shared/utils/searchAlgorithm";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

type CatalogFilterType = "ALL" | "PRODUCT" | "SERVICE";

const PAGE_SIZE = 20;

const ItemRow: React.FC<{
  item: CatalogItem;
  isSelected: boolean;
  isLowStock: boolean;
  onClick: () => void;
}> = ({ item, isSelected, isLowStock, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer ${
      isSelected
        ? "bg-amber-400/15 border border-amber-400/40 shadow-xs"
        : "hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-transparent"
    }`}
  >
    <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {item.itemType === "SERVICE" ? (
            <Wrench className="w-4 h-4 text-violet-400" />
          ) : (
            <Package className="w-4 h-4 text-amber-400" />
          )}
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className={`text-[10px] font-mono font-semibold ${
          item.itemType === "SERVICE" ? "text-violet-500 dark:text-violet-400" : "text-amber-600 dark:text-amber-400"
        }`}>{money(item.price)}</span>
        {isLowStock && <span className="text-[9px] font-black text-rose-500 uppercase tracking-wide">· Low</span>}
        {item.itemType === "PRODUCT" && !isLowStock && item.stockQuantity !== undefined && (
          <span className="text-[9px] text-slate-400 dark:text-slate-500">· {item.stockQuantity} pcs</span>
        )}
      </div>
    </div>
    <span className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
      item.itemType === "SERVICE"
        ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
        : "bg-amber-400/15 text-amber-700 dark:text-amber-300"
    }`}>{item.itemType === "SERVICE" ? "Svc" : "Prd"}</span>
    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${
      isSelected ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
    }`} />
  </button>
);

const DetailPanel: React.FC<{
  item: CatalogItem;
  isLowStock: boolean;
  isAdmin: boolean;
  onNavigate: (id: string) => void;
  onClose: () => void;
}> = ({ item, isLowStock, isAdmin, onNavigate, onClose }) => {
  const images = item.images?.filter(Boolean).length ? item.images : item.thumbnailUrl ? [item.thumbnailUrl] : [];
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => setImgIdx(0), [item.id]);

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-3 lg:hidden">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
      </div>

      {/* Image */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.07] aspect-[4/3] w-full shrink-0">
        {images.length > 0 ? (
          <img src={images[imgIdx]} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.itemType === "SERVICE" ? (
              <Wrench className="w-12 h-12 text-violet-300 dark:text-violet-600" />
            ) : (
              <Package className="w-12 h-12 text-amber-300 dark:text-amber-600" />
            )}
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-lg backdrop-blur-md ${
          item.itemType === "SERVICE" ? "bg-violet-500/80 text-white" : "bg-amber-400/90 text-slate-950"
        }`}>{item.itemType}</span>
        {isLowStock && (
          <span className="absolute top-3 right-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-rose-500/90 text-white backdrop-blur-md animate-pulse">
            Low Stock
          </span>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_: string, i: number) => (
              <button key={i} type="button" onClick={() => setImgIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${i === imgIdx ? "bg-white scale-125" : "bg-white/50"}`} />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
          {images.map((img: string, i: number) => (
            <button key={i} type="button" onClick={() => setImgIdx(i)}
              className={`w-12 h-12 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${i === imgIdx ? "border-amber-400" : "border-transparent opacity-60 hover:opacity-90"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3 flex-1">
        <div>
          {item.category?.name && (
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">{item.category.name}</p>
          )}
          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{item.title}</h2>
          {item.sku && <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">SKU: {item.sku}</p>}
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Price</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{money(item.price)}</p>
          </div>
          {item.itemType === "PRODUCT" && (
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold">Stock</p>
              <p className={`text-xl font-black ${isLowStock ? "text-rose-500 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{item.stockQuantity ?? 0}</p>
              {item.minimumStockQuantity != null && (
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">min {item.minimumStockQuantity}</p>
              )}
            </div>
          )}
        </div>

        {item.description && (
          <div>
            <p className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold mb-1">Description</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.description}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${item.isAvailable ? "bg-emerald-500" : "bg-slate-400"}`} />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.isAvailable ? "Available" : "Unavailable"}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => onNavigate(item.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl glass-gold-btn text-xs font-black text-slate-950 transition active:scale-[0.98] cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Open Full Details
          </button>
        </div>
      )}
    </motion.div>
  );
};

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CatalogFilterType>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useGetCatalogQuery({
    q: search || undefined,
    ...(typeFilter !== "ALL" ? { itemType: typeFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  });
  const { data: categoryData } = useGetCategoriesQuery();

  const rawItems = data?.data || [];
  const categories = categoryData?.data || [];

  const items = useMemo(() => {
    if (!search.trim()) return rawItems;
    return advancedSearch<CatalogItem>(rawItems, search, {
      getTitle: (item) => item.title,
      getSku: (item) => item.sku,
      getCategory: (item) => item.category?.name,
      getDescription: (item) => item.description,
    }, 140);
  }, [rawItems, search]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); setSelectedItem(null); }, [search, typeFilter, categoryFilter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < items.length) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length));
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, items.length]);

  const visibleItems = items.slice(0, visibleCount);

  const lowStockItems = useMemo(
    () => items.filter((item) => item.itemType === "PRODUCT" && item.trackStock !== false && item.stockQuantity <= (item.minimumStockQuantity ?? 0)),
    [items]
  );

  const isLowStock = useCallback(
    (item: CatalogItem) => item.itemType === "PRODUCT" && item.trackStock !== false && item.stockQuantity <= (item.minimumStockQuantity || 0),
    []
  );

  const filterTabs = useMemo(() => [
    { key: "ALL" as CatalogFilterType, label: "All" },
    { key: "PRODUCT" as CatalogFilterType, label: "Products" },
    { key: "SERVICE" as CatalogFilterType, label: "Services" },
  ], []);

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col overflow-x-clip selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 flex flex-col gap-4">
        <PageHeader
          backTo="/dashboard"
          title="Parts & Catalog"
          count={items.length}
          actions={
            <div className="flex items-center gap-2">
              {isAdmin && lowStockItems.length > 0 && (
                <button type="button" onClick={() => setIsLowStockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 active:scale-95 transition cursor-pointer">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Low Stock</span>
                  <span>({lowStockItems.length})</span>
                </button>
              )}
              {isAdmin && (
                <button type="button" onClick={() => navigate("/inventory/new")}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-gold-btn text-xs sm:text-sm font-black text-slate-950 shadow-md active:scale-95 transition cursor-pointer">
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              )}
            </div>
          }
        />

        <div className="space-y-2.5">
          <MagicTabs items={filterTabs} activeKey={typeFilter} onChange={(key) => setTypeFilter(key as CatalogFilterType)} layoutId="inventory-catalog-type" />
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts, services, SKU..."
              className="w-full rounded-2xl glass-modern-input py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition dark:text-white" />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
              <button type="button" onClick={() => setCategoryFilter("")}
                className={`shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${categoryFilter === "" ? "bg-amber-400 text-slate-950 font-black" : "glass-ghost-btn text-slate-600 dark:text-slate-400 hover:text-amber-500"}`}>
                All
              </button>
              {categories.map((cat) => {
                const catId = cat.id || cat._id;
                return (
                  <button key={catId} type="button" onClick={() => setCategoryFilter(catId)}
                    className={`shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${categoryFilter === catId ? "bg-amber-400 text-slate-950 font-black" : "glass-ghost-btn text-slate-600 dark:text-slate-400 hover:text-amber-500"}`}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Left list */}
          <div className={`flex-col gap-1 lg:w-[340px] xl:w-[380px] shrink-0 ${selectedItem ? "hidden lg:flex" : "flex"}`}>
            {isLoading ? (
              <div className="glass-modern-card rounded-3xl p-3 space-y-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-white/5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-200/60 dark:bg-white/5" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-200/60 dark:bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl glass-modern-card py-16 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20 mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">No items found</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  {search ? `No results for "${search}"` : "No items in this category."}
                </p>
              </div>
            ) : (
              <div className="glass-modern-card rounded-3xl p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-260px)]">
                {visibleItems.map((item) => (
                  <ItemRow key={item.id} item={item} isSelected={selectedItem?.id === item.id} isLowStock={isLowStock(item)} onClick={() => setSelectedItem(item)} />
                ))}
                {visibleCount < items.length && (
                  <div ref={sentinelRef} className="py-4 flex justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
                  </div>
                )}
                {visibleCount >= items.length && items.length > PAGE_SIZE && (
                  <p className="text-center text-[10px] font-mono text-slate-400 dark:text-slate-600 py-3">All {items.length} items loaded</p>
                )}
              </div>
            )}
          </div>

          {/* Right detail */}
          <div className={`flex-1 min-w-0 ${selectedItem ? "block" : "hidden lg:block"}`}>
            <AnimatePresence mode="wait">
              {selectedItem ? (
                <div key="detail" className="glass-modern-card rounded-3xl p-4 sm:p-5 h-full overflow-y-auto">
                  <DetailPanel
                    item={selectedItem}
                    isLowStock={isLowStock(selectedItem)}
                    isAdmin={isAdmin}
                    onNavigate={(id) => navigate(`/inventory/${id}`)}
                    onClose={() => setSelectedItem(null)}
                  />
                </div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hidden lg:flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl glass-modern-card text-center p-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Select an item</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click any item from the list to preview it here</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Low Stock Modal */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" onClick={() => setIsLowStockModalOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl glass-modern-card p-6 shadow-2xl border border-slate-200 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/25">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Low Stock Alerts</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} need restocking</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsLowStockModalOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-200/40 dark:divide-white/5 my-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/40 dark:border-white/10">
                      {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-slate-400" /></div>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Min: {item.minimumStockQuantity ?? 0}</p>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-xs font-black text-rose-600 dark:text-rose-400">{item.stockQuantity} left</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex justify-end">
              <button type="button" onClick={() => setIsLowStockModalOpen(false)} className="rounded-xl glass-gold-btn px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 transition active:scale-95 cursor-pointer">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
