import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Wrench,
  Boxes,
  ArrowUpRight,
  Plus,
  Minus,
  Search,
  Edit3,
  Trash2,
  Save,
  X,
  Copy,
  Check,
  Car,
  ShoppingBag,
  History,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ImagePlus,
  Star,
  Layers,
  ArrowDownRight,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import {
  useDeleteCatalogItemMutation,
  useGetCatalogItemQuery,
  useUpdateCatalogItemMutation,
  useGetItemHistoryQuery,
  useAdjustItemStockMutation,
} from '../../catalog/api/catalogApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useTheme } from '../../auth/context/ThemeContext';
import { ImageCropperModal } from '../../../shared/components/common/ImageCropperModal';
import { ConfirmationModal } from '../../../shared/components/common/ConfirmationModal';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (isoString?: string | null) => {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

type MovementFilterType = 'ALL' | 'JOBS' | 'SALES';
type AdjustMode = 'ADD' | 'DEDUCT' | 'SET';

interface StockMovement {
  id: string;
  date: string;
  type: 'JOB_CARD' | 'SALE';
  reference: string;
  referenceId?: string | null;
  target: string;
  secondaryInfo?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  operator: string;
  status?: string;
}

export const InventoryDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data, isLoading } = useGetCatalogItemQuery(id);
  const { data: historyData, isLoading: isLoadingHistory } = useGetItemHistoryQuery(id, {
    skip: !id,
  });

  const [updateItem, { isLoading: isSaving }] = useUpdateCatalogItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteCatalogItemMutation();
  const [adjustStock, { isLoading: isAdjusting }] = useAdjustItemStockMutation();

  // State
  const [activeMovementFilter, setActiveMovementFilter] = useState<MovementFilterType>('ALL');
  const [movementSearch, setMovementSearch] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('ADD');
  const [adjustValue, setAdjustValue] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('New Stock Delivery / Supplier Shipment');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustFeedback, setAdjustFeedback] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Image editing state
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editThumbnailIndex, setEditThumbnailIndex] = useState(0);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState({
    title: '',
    price: 0,
    description: '',
    stockQuantity: 0,
    minimumStockQuantity: 0,
    sku: '',
  });

  const item = data?.data;
  const history = historyData?.data;

  useEffect(() => {
    if (item) {
      setDraft({
        title: item.title,
        price: item.price,
        description: item.description || '',
        stockQuantity: item.stockQuantity || 0,
        minimumStockQuantity: item.minimumStockQuantity || 0,
        sku: item.sku || '',
      });
      const rawImgs = item.images?.filter(Boolean) || [];
      const allImgs = rawImgs.length ? rawImgs : item.thumbnailUrl ? [item.thumbnailUrl] : [];
      setEditImages(allImgs);
      const thumbIdx = allImgs.indexOf(item.thumbnailUrl || '');
      setEditThumbnailIndex(thumbIdx >= 0 ? thumbIdx : 0);
    }
  }, [item]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Build unified stock movement ledger
  const movements: StockMovement[] = useMemo(() => {
    const list: StockMovement[] = [];

    // Job card usage
    (history?.jobs || []).forEach((job) => {
      list.push({
        id: `job-${job.id}`,
        date: job.createdAt,
        type: 'JOB_CARD',
        reference: job.vehicleNumber,
        referenceId: job.jobCardId,
        target: job.vehicleName,
        secondaryInfo: job.taskTitle,
        quantity: -job.quantity,
        unitPrice: job.unitPrice,
        totalPrice: job.finalPrice,
        operator: job.completedBy,
        status: job.jobStatus || job.taskStatus,
      });
    });

    // Counter sales
    (history?.sales || []).forEach((sale) => {
      list.push({
        id: `sale-${sale.id}`,
        date: sale.createdAt,
        type: 'SALE',
        reference: `Sale #${sale.id.slice(-6).toUpperCase()}`,
        target: sale.customerName || 'Direct Counter Customer',
        secondaryInfo: sale.customerMobile || undefined,
        quantity: -sale.quantity,
        unitPrice: sale.unitPrice,
        totalPrice: sale.totalPrice,
        operator: sale.soldBy,
        status: 'BILLED',
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    let result = movements;
    if (activeMovementFilter === 'JOBS') {
      result = result.filter((m) => m.type === 'JOB_CARD');
    } else if (activeMovementFilter === 'SALES') {
      result = result.filter((m) => m.type === 'SALE');
    }

    if (!movementSearch.trim()) return result;
    const query = movementSearch.toLowerCase().trim();
    return result.filter(
      (m) =>
        m.reference.toLowerCase().includes(query) ||
        m.target.toLowerCase().includes(query) ||
        (m.secondaryInfo && m.secondaryInfo.toLowerCase().includes(query)) ||
        m.operator.toLowerCase().includes(query)
    );
  }, [movements, activeMovementFilter, movementSearch]);

  const handleStockDeltaQuick = async (delta: number) => {
    if (!item) return;
    try {
      const res = await adjustStock({
        id: item.id,
        delta,
        reason: delta > 0 ? `Stock Increment (+${delta})` : `Stock Decrement (${delta})`,
      }).unwrap();
      setAdjustFeedback(`Stock adjusted to ${res.data.finalStock} units.`);
      setTimeout(() => setAdjustFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to adjust stock.');
    }
  };

  const handleAdjustModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const qty = Number(adjustValue);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid non-negative number.');
      return;
    }

    try {
      let payload: { id: string; delta?: number; newQuantity?: number; reason: string } = {
        id: item.id,
        reason: adjustNotes.trim() ? `${adjustReason}: ${adjustNotes.trim()}` : adjustReason,
      };

      if (adjustMode === 'ADD') {
        payload.delta = qty;
      } else if (adjustMode === 'DEDUCT') {
        payload.delta = -qty;
      } else {
        payload.newQuantity = qty;
      }

      const res = await adjustStock(payload).unwrap();
      setIsAdjustModalOpen(false);
      setAdjustFeedback(`Stock successfully updated to ${res.data.finalStock} units.`);
      setTimeout(() => setAdjustFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to apply stock adjustment.');
    }
  };

  const handleSaveDraft = async () => {
    if (!item || !draft.title.trim()) return;
    try {
      await updateItem({
        id: item.id,
        body: {
          title: draft.title.trim(),
          price: draft.price,
          description: draft.description,
          sku: draft.sku.trim() || undefined,
          images: editImages,
          thumbnailUrl: editImages[editThumbnailIndex] || editImages[0] || undefined,
          ...(item.itemType === 'PRODUCT'
            ? {
                stockQuantity: draft.stockQuantity,
                minimumStockQuantity: draft.minimumStockQuantity,
              }
            : {}),
        },
      }).unwrap();
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to save changes.');
    }
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSource(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (cropped: string) => {
    setEditImages((prev) => [...prev, cropped]);
    setCropSource(null);
  };

  const confirmDelete = async () => {
    if (!item) return;
    try {
      await deleteItem(item.id).unwrap();
      setShowDeleteConfirm(false);
      navigate('/inventory');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to delete item.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col font-sans">
        <div className="glass-ambient-glow" aria-hidden="true" />
        <Navbar glass />
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 dark:text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mb-3" />
          <p className="text-xs font-mono font-medium">Loading stock record...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col font-sans">
        <div className="glass-ambient-glow" aria-hidden="true" />
        <Navbar glass />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-4 border border-rose-500/20">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Part Not Found</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
            This catalog stock item does not exist or has been archived.
          </p>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-xs active:scale-95 transition"
          >
            Return to Inventory
          </button>
        </div>
      </div>
    );
  }

  const isService = item.itemType === 'SERVICE';
  const stockQty = item.stockQuantity ?? 0;
  const minQty = item.minimumStockQuantity ?? 0;
  const isOutOfStock = !isService && item.trackStock !== false && stockQty <= 0;
  const isLowStock = !isService && item.trackStock !== false && stockQty <= minQty;
  const totalStockValue = stockQty * (item.price || 0);
  const stockPercent = minQty > 0 ? Math.min(Math.round((stockQty / (minQty * 2.5)) * 100), 100) : (stockQty > 0 ? 100 : 0);

  const images = (item.images?.filter(Boolean) || []).length
    ? item.images.filter(Boolean)
    : item.thumbnailUrl
    ? [item.thumbnailUrl]
    : [];

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col font-sans selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-32 sm:pb-36 md:pb-16 space-y-4">
        {/* ── BREADCRUMB & ENTERPRISE HEADER ── */}
        <div className="flex flex-col gap-2">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <Link to="/inventory" className="hover:text-amber-500 transition">
              Inventory
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[160px]">
              {item.category?.name || 'General Spares'}
            </span>
            <span>/</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold truncate">
              {item.sku || `#${item.id.slice(-6).toUpperCase()}`}
            </span>
          </div>

          {/* Title & Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                {isService ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h1>

                  {/* Status Pills */}
                  {isService ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                      Service
                    </span>
                  ) : isOutOfStock ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      Out of Stock
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      In Stock
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                  <span>Category: {item.category?.name || 'General'}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span>SKU: {item.sku || 'N/A'}</span>
                    {item.sku && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.sku!, 'sku_header')}
                        className="hover:text-amber-500 transition"
                        title="Copy SKU"
                      >
                        {copiedField === 'sku_header' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Toolbar */}
            {isAdmin && (
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !draft.title.trim()}
                      onClick={handleSaveDraft}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    {!isService && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustMode('ADD');
                          setAdjustValue(1);
                          setIsAdjustModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Adjust Stock</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Archive Part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feedback message banner */}
        <AnimatePresence>
          {adjustFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{adjustFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ENTERPRISE COMPACT KPI STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/[0.08] rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs overflow-hidden">
          {/* 1. On Hand */}
          <div className="p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              On-Hand Stock
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-lg font-mono font-bold ${
                  isOutOfStock
                    ? 'text-rose-500'
                    : isLowStock
                    ? 'text-amber-500'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {isService ? 'N/A' : stockQty}
              </span>
              {!isService && <span className="text-[10px] font-mono text-slate-400">units</span>}
            </div>
          </div>

          {/* 2. Reorder Alert Level */}
          <div className="p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Reorder Point
            </span>
            <span className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
              {isService ? '—' : `${minQty} units`}
            </span>
          </div>

          {/* 3. Unit Selling Price */}
          <div className="p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Unit Selling Price
            </span>
            <span className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
              {money(item.price)}
            </span>
          </div>

          {/* 4. Stock Valuation */}
          <div className="p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Inventory Valuation
            </span>
            <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {isService ? '—' : money(totalStockValue)}
            </span>
          </div>

          {/* 5. Total Units Used / Sold */}
          <div className="p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Total Units Outflow
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                {history?.summary?.totalSoldQty ?? 0}
              </span>
              <span className="text-[10px] font-mono text-slate-400">pcs</span>
            </div>
          </div>

          {/* 6. Total Revenue */}
          <div className="p-3 sm:p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Gross Outflow Value
            </span>
            <span className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-0.5">
              {money(history?.summary?.totalRevenue ?? 0)}
            </span>
          </div>
        </div>

        {/* ── WORKSPACE 2-COLUMN WORKBENCH ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ── LEFT COLUMN (Main Operations: Fast Stock Gauge & Movement Table) ── */}
          <div className="lg:col-span-8 space-y-4">
            {/* Quick On-Hand Stock Gauge & Rapid Stepper (Physical Parts Only) */}
            {!isService && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Live Warehouse Gauge:
                    </span>
                    <span
                      className={`font-bold ${
                        isOutOfStock
                          ? 'text-rose-500'
                          : isLowStock
                          ? 'text-amber-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {stockQty} on hand / min {minQty} alert
                    </span>
                  </div>

                  {/* Inline quick stepper buttons for warehouse managers */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 self-start sm:self-auto">
                      <span className="text-[10px] text-slate-400 uppercase mr-1">Quick:</span>
                      <button
                        type="button"
                        disabled={isAdjusting || stockQty <= 0}
                        onClick={() => handleStockDeltaQuick(-5)}
                        className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-[11px] font-mono font-bold text-rose-500 hover:bg-rose-500/10 transition disabled:opacity-30 cursor-pointer"
                        title="Deduct 5"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        disabled={isAdjusting || stockQty <= 0}
                        onClick={() => handleStockDeltaQuick(-1)}
                        className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-[11px] font-mono font-bold text-rose-500 hover:bg-rose-500/10 transition disabled:opacity-30 cursor-pointer"
                        title="Deduct 1"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        disabled={isAdjusting}
                        onClick={() => handleStockDeltaQuick(1)}
                        className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-[11px] font-mono font-bold text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                        title="Add 1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        disabled={isAdjusting}
                        onClick={() => handleStockDeltaQuick(5)}
                        className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-[11px] font-mono font-bold text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                        title="Add 5"
                      >
                        +5
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Meter Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
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

            {/* ── ENTERPRISE STOCK MOVEMENT & PAST ORDERS LEDGER ── */}
            <div className="rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs overflow-hidden">
              {/* Table Toolbar Header */}
              <div className="p-3 sm:p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Stock Movement & Usage History
                  </h2>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
                    {movements.length}
                  </span>
                </div>

                {/* Filter Tabs & Search */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter selector */}
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/[0.06] text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveMovementFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                        activeMovementFilter === 'ALL'
                          ? 'bg-white dark:bg-[#181926] text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMovementFilter('JOBS')}
                      className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                        activeMovementFilter === 'JOBS'
                          ? 'bg-white dark:bg-[#181926] text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Jobs ({history?.summary?.totalJobsCount ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMovementFilter('SALES')}
                      className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                        activeMovementFilter === 'SALES'
                          ? 'bg-white dark:bg-[#181926] text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Counter Sales ({history?.summary?.totalSalesCount ?? 0})
                    </button>
                  </div>

                  {/* Search within ledger */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search plate, ref, customer..."
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                      className="pl-7 pr-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none w-44 sm:w-52 font-mono placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 bg-slate-50/30 dark:bg-white/[0.01]">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Reference / Vehicle</th>
                      <th className="py-2.5 px-3">Task / Details</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3">Handled By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                    {isLoadingHistory ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                          Loading past orders & stock movement...
                        </td>
                      </tr>
                    ) : filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                          {movementSearch
                            ? `No records match "${movementSearch}".`
                            : 'No past orders or vehicle installations recorded yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((record) => {
                        const isJob = record.type === 'JOB_CARD';
                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Date */}
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {formatDate(record.date)}
                            </td>

                            {/* Channel Tag */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isJob ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  <Car className="w-2.5 h-2.5" />
                                  <span>Vehicle Job</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                  <ShoppingBag className="w-2.5 h-2.5" />
                                  <span>Counter Sale</span>
                                </span>
                              )}
                            </td>

                            {/* Reference / Plate Number */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isJob && record.referenceId ? (
                                <Link
                                  to={`/jobs/${record.referenceId}`}
                                  className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline"
                                >
                                  <span>{record.reference}</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </Link>
                              ) : (
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {record.reference}
                                </span>
                              )}
                            </td>

                            {/* Target Details */}
                            <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300 font-sans text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {record.target}
                              </span>
                              {record.secondaryInfo && (
                                <span className="block text-[11px] text-slate-400 truncate">
                                  {record.secondaryInfo}
                                </span>
                              )}
                            </td>

                            {/* Quantity (negative for outgoing inventory) */}
                            <td className="py-2.5 px-3 text-right font-bold text-rose-500 dark:text-rose-400 whitespace-nowrap">
                              {record.quantity} pcs
                            </td>

                            {/* Unit Price */}
                            <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                              {money(record.unitPrice)}
                            </td>

                            {/* Total Price */}
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {money(record.totalPrice)}
                            </td>

                            {/* Operator */}
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap truncate max-w-[120px]">
                              {record.operator || 'Staff'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (Sidebar: Compact Media + Enterprise Metadata Table) ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* 1. Compact Product Media Box */}
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-2">
              <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10 flex items-center justify-center">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[activeImageIdx] || images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setIsLightboxOpen(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition"
                      title="Zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Package className="w-8 h-8 stroke-[1.2]" />
                    <span className="text-[10px] font-mono">No Photo Uploaded</span>
                  </div>
                )}
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  {images.map((img, idx) => (
                    <button
                      key={img + idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-12 h-10 rounded-lg overflow-hidden border transition shrink-0 ${
                        activeImageIdx === idx
                          ? 'border-amber-500 ring-2 ring-amber-500/20'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Edit Image Management when editing */}
              {isAdmin && isEditing && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {editImages.map((img, idx) => (
                      <div key={img + idx} className="group relative w-12 h-10 rounded-lg overflow-hidden border">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => setEditThumbnailIndex(idx)}
                            className="p-1 rounded bg-amber-400 text-slate-950"
                            title="Set thumbnail"
                          >
                            <Star className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditImages((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 rounded bg-rose-500 text-white"
                            title="Delete"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => imageFileInputRef.current?.click()}
                      className="w-12 h-10 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </button>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelected}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Enterprise Item Specs & Logistics Key-Value Table */}
            <div className="rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs overflow-hidden text-xs font-mono">
              <div className="p-3 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Part Specifications & Logistics
                </span>
              </div>

              <div className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                {/* SKU */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">SKU Code</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.sku || 'N/A'}
                    </span>
                    {item.sku && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.sku!, 'sku_spec')}
                        className="text-slate-400 hover:text-amber-500 transition"
                      >
                        {copiedField === 'sku_spec' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* ID */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">System ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-700 dark:text-slate-300">
                      #{item.id.slice(-8).toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.id, 'id_spec')}
                      className="text-slate-400 hover:text-amber-500 transition"
                    >
                      {copiedField === 'id_spec' ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">Category</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {item.category?.name || 'General'}
                  </span>
                </div>

                {/* Classification */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {isService ? 'Labor / Workshop Service' : 'Physical Spare Part'}
                  </span>
                </div>

                {/* Stock Tracking */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-slate-400">Stock Tracking</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {item.trackStock !== false ? 'Active Tracking' : 'Exempt'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Description Box */}
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Technical Notes & Description
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.description || 'No additional technical description recorded for this item.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── ENTERPRISE STOCK ADJUSTMENT MODAL (Dedicated High-Utility Dialog) ── */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0e101a] border border-slate-200 dark:border-white/15 p-5 shadow-2xl space-y-4 font-sans text-slate-900 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-amber-500" />
                  <span>Adjust On-Hand Inventory</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {item.title} ({item.sku || `#${item.id.slice(-6)}`})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustModalSubmit} className="space-y-4">
              {/* Current Stock vs Resulting Stock Banner */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">CURRENT STOCK</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stockQty} units</span>
                </div>
                <div className="text-center font-bold text-slate-400">→</div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">NEW STOCK RESULT</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    {adjustMode === 'ADD'
                      ? stockQty + (Number(adjustValue) || 0)
                      : adjustMode === 'DEDUCT'
                      ? Math.max(0, stockQty - (Number(adjustValue) || 0))
                      : Number(adjustValue) || 0}{' '}
                    units
                  </span>
                </div>
              </div>

              {/* Adjustment Mode Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('ADD')}
                    className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                      adjustMode === 'ADD'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    + Restock / Add
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustMode('DEDUCT')}
                    className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                      adjustMode === 'DEDUCT'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    - Scrap / Deduct
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode('SET');
                      setAdjustValue(stockQty);
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold transition cursor-pointer ${
                      adjustMode === 'SET'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>
              </div>

              {/* Quantity Input + Stepper Shortcuts */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {adjustMode === 'SET' ? 'Target Stock Count' : 'Quantity Units'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={adjustValue}
                    onChange={(e) => setAdjustValue(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 px-3.5 py-2 text-sm text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-amber-400"
                    required
                  />
                  {adjustMode !== 'SET' && (
                    <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                      {[1, 5, 10, 25].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAdjustValue(amt)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-500 font-bold transition"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-[#141624] border border-slate-200 dark:border-white/10 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="New Stock Delivery / Supplier Shipment">
                    New Stock Delivery / Supplier Shipment
                  </option>
                  <option value="Physical Warehouse Audit Correction">
                    Physical Warehouse Audit Correction
                  </option>
                  <option value="Damaged / Defective Stock Discard">
                    Damaged / Defective Stock Discard
                  </option>
                  <option value="Customer Return / Restock">Customer Return / Restock</option>
                  <option value="Job Card Discrepancy Correction">
                    Job Card Discrepancy Correction
                  </option>
                  <option value="Internal Garage Transfer">Internal Garage Transfer</option>
                  <option value="Other Manual Adjustment">Other Manual Adjustment</option>
                </select>
              </div>

              {/* Remarks / Memo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-8921 invoice or mechanic verified"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-400"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                >
                  {isAdjusting ? 'Applying...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Modal */}
      {isLightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[activeImageIdx] || images[0]}
              alt={item.title}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Landscape Image Cropper Modal */}
      {cropSource && (
        <ImageCropperModal
          isOpen={!!cropSource}
          imageSrc={cropSource}
          aspectRatio={4 / 3}
          title="Crop Spare Part Photo (4:3 Landscape)"
          onClose={() => setCropSource(null)}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Delete Item Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Archive Spare Part"
        message={`Are you sure you want to archive "${item.title}"? It will no longer appear in the active spare parts catalog.`}
        confirmText="Archive Part"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default InventoryDetailPage;
