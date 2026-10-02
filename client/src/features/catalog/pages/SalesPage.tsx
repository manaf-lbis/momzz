import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Minus,
  Plus,
  Trash2,
  Receipt,
  Package,
  Wrench,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  Printer,
  Edit3,
  Ban,
  Copy,
  Check,
  Calendar,
  User,
  Phone,
  CreditCard,
  ArrowRight,
  Clock,
  FileText,
  RefreshCw,
  Percent,
  IndianRupee,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import {
  CatalogItem,
  Sale,
  useGetCatalogQuery,
  useGetSalesQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useCancelSaleMutation,
} from '../api/catalogApi';
import { advancedSearch } from '../../../shared/utils/searchAlgorithm';

type CartLine = {
  item: CatalogItem;
  quantity: number;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number;
};

type ItemFilter = 'ALL' | 'SERVICE' | 'PRODUCT' | 'FAST';
type ViewMode = 'REGISTER' | 'LEDGER';
type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'OTHER';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (isoString: string) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const SalesPage: React.FC = () => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('REGISTER');

  // Register / POS State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [itemFilter, setItemFilter] = useState<ItemFilter>('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [billDiscountType, setBillDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [billNotes, setBillNotes] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [billDiscountModalOpen, setBillDiscountModalOpen] = useState(false);

  // Edit Existing Bill State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Past Bills Ledger State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Receipt / Print Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  // Void / Cancel Modal State
  const [voidModalSale, setVoidModalSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Copied invoice feedback
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // RTK Queries & Mutations
  const { data: catalogData, isFetching: isFetchingCatalog } = useGetCatalogQuery();
  const {
    data: salesData,
    isFetching: isFetchingSales,
    refetch: refetchSales,
  } = useGetSalesQuery(
    {
      q: ledgerSearch || undefined,
      status: ledgerStatusFilter !== 'ALL' ? ledgerStatusFilter : undefined,
    },
    { pollingInterval: 30000 }
  );

  const [createSale, { isLoading: isCreatingSale }] = useCreateSaleMutation();
  const [updateSale, { isLoading: isUpdatingSale }] = useUpdateSaleMutation();
  const [cancelSale, { isLoading: isCancellingSale }] = useCancelSaleMutation();

  const isSaving = isCreatingSale || isUpdatingSale;

  // Keyboard Shortcuts (Ctrl+K for search, F2 for register/ledger toggle, Escape to close modals)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput =
          viewMode === 'REGISTER'
            ? document.getElementById('pos-search')
            : document.getElementById('ledger-search');
        searchInput?.focus();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'REGISTER' ? 'LEDGER' : 'REGISTER'));
      }
      if (e.key === 'Escape') {
        setMobileCartOpen(false);
        setBillDiscountModalOpen(false);
        setSelectedReceipt(null);
        setVoidModalSale(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode]);

  // Catalog filtering & Fuzzy search
  const availableItems = useMemo(() => {
    const raw = (catalogData?.data || []).filter((item) => {
      const isOk =
        item.isAvailable &&
        (item.itemType === 'SERVICE' || item.trackStock === false || item.stockQuantity > 0);
      return (
        isOk &&
        (itemFilter === 'ALL' ||
          (itemFilter === 'SERVICE' && item.itemType === 'SERVICE') ||
          (itemFilter === 'PRODUCT' && item.itemType === 'PRODUCT') ||
          (itemFilter === 'FAST' &&
            item.itemType === 'PRODUCT' &&
            item.stockQuantity > 0 &&
            item.stockQuantity <= Math.max(5, item.minimumStockQuantity || 0)))
      );
    });

    if (!catalogSearch.trim()) return raw;
    return advancedSearch<CatalogItem>(
      raw,
      catalogSearch,
      {
        getTitle: (item) => item.title,
        getSku: (item) => item.sku,
        getCategory: (item) => item.category?.name,
        getDescription: (item) => item.description,
      },
      140
    );
  }, [catalogData, itemFilter, catalogSearch]);

  // Financial Calculations for Active Cart
  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart]
  );

  const itemDiscountsTotal = useMemo(() => {
    return cart.reduce((sum, line) => {
      const base = line.item.price * line.quantity;
      const disc =
        line.discountType === 'PERCENT'
          ? (base * line.discountValue) / 100
          : line.discountValue;
      return sum + Math.min(base, Math.max(0, disc));
    }, 0);
  }, [cart]);

  const taxableAfterItemDisc = Math.max(0, subtotal - itemDiscountsTotal);

  const billDiscountAmount = useMemo(() => {
    const rawDisc =
      billDiscountType === 'PERCENT'
        ? (taxableAfterItemDisc * billDiscountValue) / 100
        : billDiscountValue;
    return Math.min(taxableAfterItemDisc, Math.max(0, rawDisc));
  }, [taxableAfterItemDisc, billDiscountType, billDiscountValue]);

  const totalDiscount = itemDiscountsTotal + billDiscountAmount;
  const grandTotal = Math.max(0, Math.round(subtotal - totalDiscount));
  const itemCount = cart.reduce((acc, line) => acc + line.quantity, 0);

  // Cart Manipulations
  const addToCart = (item: CatalogItem) => {
    setCart((lines) => {
      const maxStock =
        item.itemType === 'PRODUCT' && item.trackStock !== false ? item.stockQuantity : 999;
      const existing = lines.find((l) => l.item.id === item.id);
      if (existing) {
        return lines.map((l) =>
          l.item.id === item.id
            ? { ...l, quantity: Math.min(maxStock, l.quantity + 1) }
            : l
        );
      }
      return [
        ...lines,
        {
          item,
          quantity: 1,
          discountType: 'FLAT',
          discountValue: 0,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((lines) =>
      lines
        .map((line) => {
          if (line.item.id !== itemId) return line;
          const maxStock =
            line.item.itemType === 'PRODUCT' && line.item.trackStock !== false
              ? line.item.stockQuantity
              : 999;
          const nextQty = Math.max(1, Math.min(maxStock, line.quantity + delta));
          return { ...line, quantity: nextQty };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((lines) => lines.filter((l) => l.item.id !== itemId));
  };

  const updateLineDiscount = (
    itemId: string,
    type: 'FLAT' | 'PERCENT',
    val: number
  ) => {
    setCart((lines) =>
      lines.map((l) => {
        if (l.item.id !== itemId) return l;
        return {
          ...l,
          discountType: type,
          discountValue: Math.max(0, val),
        };
      })
    );
  };

  const clearRegister = () => {
    setCart([]);
    setCustomerName('');
    setCustomerMobile('');
    setPaymentMethod('CASH');
    setBillDiscountType('FLAT');
    setBillDiscountValue(0);
    setBillNotes('');
    setEditingSale(null);
    setMobileCartOpen(false);
  };

  // Populate Register for Editing Existing Bill
  const startEditingBill = (sale: Sale) => {
    setEditingSale(sale);
    setCustomerName(sale.customerName || '');
    setCustomerMobile(sale.customerMobile || '');
    setPaymentMethod(sale.paymentMethod || 'CASH');
    setBillDiscountType(sale.billDiscountType || 'FLAT');
    setBillDiscountValue(sale.billDiscountValue || 0);
    setBillNotes(sale.notes || '');

    // Reconstruct cart lines
    const reconstructed: CartLine[] = (sale.items || []).map((line) => {
      const rawItem = line.item as any;
      const itemId = rawItem?._id || rawItem?.id || rawItem;
      const matchedCatalog = (catalogData?.data || []).find((c) => c.id === itemId);

      const catalogFallback: CatalogItem = matchedCatalog || {
        id: itemId,
        _id: itemId,
        title: rawItem?.title || 'Catalog Item',
        category: rawItem?.category || { id: 'c1', _id: 'c1', name: 'General', type: 'BOTH' },
        itemType: rawItem?.itemType || 'PRODUCT',
        price: line.unitPrice || 0,
        stockQuantity: 999,
        thumbnailUrl: rawItem?.thumbnailUrl || '',
        images: rawItem?.images || [],
        isAvailable: true,
      };

      return {
        item: catalogFallback,
        quantity: line.quantity,
        discountType: line.discountType || 'FLAT',
        discountValue: line.discountValue || line.discountAmount || 0,
      };
    });

    setCart(reconstructed);
    setViewMode('REGISTER');
  };

  // Submit Sale (Create or Update)
  const handleSaveSale = async () => {
    if (!cart.length) {
      alert('Please add at least one item to the bill.');
      return;
    }

    try {
      const itemsPayload = cart.map((line) => ({
        itemId: line.item.id,
        quantity: line.quantity,
        unitPrice: line.item.price,
        discountType: line.discountType,
        discountValue: line.discountValue,
      }));

      if (editingSale) {
        // Update existing invoice
        const res = await updateSale({
          id: editingSale.id,
          body: {
            customerName: customerName.trim() || undefined,
            customerMobile: customerMobile.trim() || undefined,
            paymentMethod,
            notes: billNotes.trim() || undefined,
            billDiscountType,
            billDiscountValue,
            items: itemsPayload,
          },
        }).unwrap();

        setSelectedReceipt(res.data);
        clearRegister();
      } else {
        // Create new invoice
        const res = await createSale({
          customerName: customerName.trim() || undefined,
          customerMobile: customerMobile.trim() || undefined,
          paymentMethod,
          notes: billNotes.trim() || undefined,
          billDiscountType,
          billDiscountValue,
          items: itemsPayload,
        }).unwrap();

        setSelectedReceipt(res.data);
        clearRegister();
      }
    } catch (err: any) {
      alert(err?.data?.message || 'Transaction could not be completed.');
    }
  };

  // Confirm Void / Cancellation
  const handleConfirmVoid = async () => {
    if (!voidModalSale) return;
    try {
      await cancelSale({
        id: voidModalSale.id,
        reason: voidReason.trim() || 'Voided by cashier',
      }).unwrap();
      setVoidModalSale(null);
      setVoidReason('');
      refetchSales();
    } catch (err: any) {
      alert(err?.data?.message || 'Could not cancel the bill.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvoiceId(id);
    setTimeout(() => setCopiedInvoiceId(null), 2000);
  };

  const metrics = salesData?.data?.metrics || {
    totalSalesCount: 0,
    totalRevenue: 0,
    todaySalesCount: 0,
    todayRevenue: 0,
    totalDiscounts: 0,
    avgBillValue: 0,
  };

  const salesList = salesData?.data?.sales || [];

  // Filter chips for catalog
  const catalogChips: Array<{ id: ItemFilter; label: string }> = [
    { id: 'ALL', label: 'All Items' },
    { id: 'PRODUCT', label: 'Spare Parts' },
    { id: 'SERVICE', label: 'Labor & Services' },
    { id: 'FAST', label: 'Low Stock Alert' },
  ];

  return (
    <div className="flex h-screen flex-col glass-canvas overflow-hidden text-slate-900 dark:text-white font-sans">
      <Navbar glass />

      {/* ── TOP ENTERPRISE HEADER & WORKSTATION MODE SWITCHER ── */}
      <header className="border-b border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#070810]/70 backdrop-blur-xl px-4 py-2.5 sm:px-6 shrink-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton to="/dashboard" label="Dashboard" />
            <div className="h-5 w-px bg-slate-200 dark:bg-white/10 hidden xs:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  Sales & Billing Workstation
                </h1>
                {editingSale && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                    EDITING #{editingSale.invoiceNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                POS Invoicing • Real-Time Stock Reconciliation • Past Bills Ledger
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/50 dark:border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('REGISTER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'REGISTER'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>POS Register</span>
              {itemCount > 0 && (
                <span className="ml-1 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-slate-950 text-white">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode('LEDGER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'LEDGER'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Past Bills & Invoices</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-300/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
                {metrics.totalSalesCount}
              </span>
            </button>
          </div>
        </div>

        {/* Editing Sale Banner */}
        {editingSale && (
          <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                You are currently modifying Invoice <b>{editingSale.invoiceNumber}</b>. Any item
                quantity changes will automatically adjust inventory stock levels.
              </span>
            </div>
            <button
              onClick={clearRegister}
              className="text-[11px] font-mono font-bold text-rose-500 hover:underline cursor-pointer ml-3 shrink-0"
            >
              Cancel Edit & Start Fresh
            </button>
          </div>
        )}
      </header>

      {/* ── HIGH DENSITY KPI STRIP (ENTERPRISE STATS) ── */}
      <section className="bg-slate-100/60 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.06] px-4 py-2 sm:px-6 shrink-0 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              Today's Revenue:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {money(metrics.todayRevenue)}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({metrics.todaySalesCount} bills)
            </span>
          </div>

          <div className="h-3 w-px bg-slate-200 dark:bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              Avg Order Value:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {money(metrics.avgBillValue)}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-200 dark:bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              Total Outflow Discount:
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {money(metrics.totalDiscounts)}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-200 dark:bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              Lifetime Billing:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {money(metrics.totalRevenue)}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({metrics.totalSalesCount} total invoices)
            </span>
          </div>
        </div>
      </section>

      {/* ── WORKSPACE VIEWPORT ── */}
      {viewMode === 'REGISTER' ? (
        /* ========================================================
           POS REGISTER & LIVE CHECKOUT MODE
           ======================================================== */
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left/Center Catalog Browser */}
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-200/80 dark:border-white/[0.08]">
            {/* Search & Category Filter Toolbar */}
            <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.01]">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="pos-search"
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search spare parts, services, SKU, category (Ctrl+K)..."
                    className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500 transition font-mono"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => setCatalogSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                  {catalogChips.map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setItemFilter(chip.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        itemFilter === chip.id
                          ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                          : 'bg-slate-200/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 lg:pb-6 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 px-1">
                <span>
                  {isFetchingCatalog
                    ? 'Loading catalog...'
                    : `${availableItems.length} items available in register`}
                </span>
                <span>Click item to add or increment in cart</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {availableItems.map((item) => {
                  const isService = item.itemType === 'SERVICE';
                  const stockQty = item.stockQuantity ?? 0;
                  const minQty = item.minimumStockQuantity ?? 0;
                  const isOutOfStock = !isService && item.trackStock !== false && stockQty <= 0;
                  const isLowStock = !isService && item.trackStock !== false && stockQty <= minQty;

                  // Progress percentage for stock gauge
                  const gaugeTarget = minQty > 0 ? Math.max(minQty * 2, 10) : 20;
                  const stockPercent = Math.min(100, Math.round((stockQty / gaugeTarget) * 100));

                  const inCartLine = cart.find((l) => l.item.id === item.id);
                  const inCartQty = inCartLine?.quantity ?? 0;

                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-2xl sm:rounded-3xl border p-3 sm:p-3.5 flex gap-3.5 items-stretch transition-all duration-200 select-none overflow-hidden ${
                        isOutOfStock
                          ? 'border-slate-200/50 dark:border-white/5 opacity-60 bg-slate-50/50 dark:bg-white/[0.01]'
                          : inCartQty > 0
                          ? 'border-amber-500/80 bg-amber-500/[0.04] ring-1 ring-amber-500/30 shadow-md'
                          : 'border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0d18]/80 hover:border-amber-400/60 hover:shadow-lg'
                      }`}
                    >
                      {/* -- LEFT SIDE: PART IMAGE / THUMBNAIL (Fixed Standard Square Size) -- */}
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

                        {/* Top-Left Chip: Item Type */}
                        <span
                          className={`absolute top-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-xs ${
                            isService
                              ? 'bg-violet-600/90 text-white'
                              : 'bg-amber-400/95 text-slate-950 font-black'
                          }`}
                        >
                          {isService ? 'SVC' : 'PART'}
                        </span>

                        {/* Bottom-Right In-Cart Badge */}
                        {inCartQty > 0 && (
                          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-md flex items-center gap-0.5">
                            <span>x{inCartQty} in cart</span>
                          </span>
                        )}
                      </div>

                      {/* -- RIGHT SIDE: COMPREHENSIVE STOCK & BILLING DETAILS -- */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          {/* Row 1: Category + Status Badge */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate max-w-[140px]">
                              {item.category?.name || 'General Spares'}
                            </span>

                            {/* Status Badge */}
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
                                {stockQty} in stock
                              </span>
                            )}
                          </div>

                          {/* Row 2: Part Name */}
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors line-clamp-1 mt-0.5">
                            {item.title}
                          </h3>

                          {/* Row 3: SKU & Description Snippet */}
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {item.sku ? (
                              <span className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-white/5 truncate max-w-[120px]">
                                SKU: {item.sku}
                              </span>
                            ) : (
                              <span>ID: {item.id.slice(-6).toUpperCase()}</span>
                            )}

                            {item.description && (
                              <span className="truncate max-w-[150px] text-slate-500 dark:text-slate-400 font-sans" title={item.description}>
                                • {item.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Row 4: Stock Level Meter (Only for trackable physical products) */}
                        {!isService && (
                          <div className="my-1.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400 dark:text-slate-500 font-semibold">
                                Stock Level
                              </span>
                              <span
                                className={`font-black ${
                                  isOutOfStock
                                    ? 'text-rose-500'
                                    : isLowStock
                                    ? 'text-amber-500'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
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

                        {/* Row 5: Price & Interactive Stepper / Add to Cart */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.06] mt-0.5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {money(item.price)}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">/ unit</span>
                          </div>

                          {/* Direct Actions: Stepper if in cart, Add button if not */}
                          {inCartQty > 0 ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center rounded-xl border border-amber-500/50 bg-amber-500/10 p-0.5"
                            >
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-95 transition cursor-pointer"
                                title="Decrease quantity"
                              >
                                <Minus className="h-3 w-3 stroke-[2.5]" />
                              </button>
                              <span className="w-7 text-center text-xs font-black font-mono text-slate-950 dark:text-white">
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                disabled={!isService && item.trackStock !== false && inCartQty >= stockQty}
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-95 transition disabled:opacity-30 cursor-pointer"
                                title="Increase quantity"
                              >
                                <Plus className="h-3 w-3 stroke-[2.5]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                              }}
                              className={`flex items-center gap-1 text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-slate-200/50 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 active:scale-95'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{isOutOfStock ? 'No Stock' : 'Add to Bill'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!availableItems.length && (
                <div className="py-20 text-center text-xs font-mono text-slate-400">
                  No catalog items match your search.
                </div>
              )}
            </div>
          </section>

          {/* Right-Side Desktop Checkout Terminal */}
          <aside className="hidden lg:flex w-[420px] xl:w-[460px] shrink-0 flex-col bg-white/70 dark:bg-[#090a14]/70 backdrop-blur-xl">
            <CheckoutRegisterContent
              cart={cart}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerMobile={customerMobile}
              setCustomerMobile={setCustomerMobile}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              billDiscountType={billDiscountType}
              setBillDiscountType={setBillDiscountType}
              billDiscountValue={billDiscountValue}
              setBillDiscountValue={setBillDiscountValue}
              billNotes={billNotes}
              setBillNotes={setBillNotes}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              updateLineDiscount={updateLineDiscount}
              clearRegister={clearRegister}
              subtotal={subtotal}
              itemDiscountsTotal={itemDiscountsTotal}
              billDiscountAmount={billDiscountAmount}
              totalDiscount={totalDiscount}
              grandTotal={grandTotal}
              itemCount={itemCount}
              editingSale={editingSale}
              isSaving={isSaving}
              onSave={handleSaveSale}
            />
          </aside>
        </main>
      ) : (
        /* ========================================================
           PAST BILLS & INVOICING LEDGER MODE
           ======================================================== */
        <main className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-hidden">
          {/* Ledger Toolbar */}
          <div className="rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="ledger-search"
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search invoice #, customer name, mobile..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500 font-mono"
                />
                {ledgerSearch && (
                  <button
                    onClick={() => setLedgerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/50 dark:border-white/10">
                {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setLedgerStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      ledgerStatusFilter === status
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {status === 'ALL'
                      ? 'All Invoices'
                      : status === 'COMPLETED'
                      ? 'Completed'
                      : 'Voided'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchSales()}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingSales ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  clearRegister();
                  setViewMode('REGISTER');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xs hover:bg-amber-400 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New Bill / Sale</span>
              </button>
            </div>
          </div>

          {/* Invoices Ledger Data Table */}
          <div className="flex-1 rounded-2xl bg-white/70 dark:bg-[#0c0d18]/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl overflow-hidden flex flex-col shadow-xs">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-3.5">Invoice #</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Line Items</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Billed By</th>
                    <th className="py-3 px-3 text-right">Discount</th>
                    <th className="py-3 px-3 text-right">Grand Total</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                  {salesList.map((sale) => {
                    const isCancelled = sale.status === 'CANCELLED';
                    const itemsSummary = (sale.items || [])
                      .map((i) => {
                        const itemTitle =
                          typeof i.item === 'object' && i.item?.title
                            ? i.item.title
                            : 'Item';
                        return `${i.quantity}x ${itemTitle}`;
                      })
                      .join(', ');

                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition ${
                          isCancelled ? 'opacity-60 bg-rose-500/[0.02]' : ''
                        }`}
                      >
                        {/* Invoice Number */}
                        <td className="py-3 px-3.5 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-900 dark:text-white">
                              {sale.invoiceNumber}
                            </span>
                            <button
                              onClick={() => copyToClipboard(sale.invoiceNumber, sale.id)}
                              className="text-slate-400 hover:text-amber-500 cursor-pointer p-0.5 rounded"
                              title="Copy invoice number"
                            >
                              {copiedInvoiceId === sale.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                          {formatDate(sale.createdAt)}
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3">
                          <div className="font-sans font-bold text-slate-900 dark:text-white">
                            {sale.customerName || 'Walk-in Counter'}
                          </div>
                          {sale.customerMobile && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              {sale.customerMobile}
                            </div>
                          )}
                        </td>

                        {/* Items */}
                        <td className="py-3 px-3 max-w-[200px]">
                          <span
                            className="block truncate text-[11px] text-slate-600 dark:text-slate-300"
                            title={itemsSummary}
                          >
                            <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">
                              ({sale.items?.length || 0})
                            </span>
                            {itemsSummary || '—'}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {sale.paymentMethod || 'CASH'}
                          </span>
                        </td>

                        {/* Cashier */}
                        <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                          {sale.soldBy?.name || 'Staff'}
                        </td>

                        {/* Discounts */}
                        <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">
                          {sale.totalDiscount > 0 ? `-${money(sale.totalDiscount)}` : '—'}
                        </td>

                        {/* Grand Total */}
                        <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                          {money(sale.grandTotal)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              Voided
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Completed
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View / Print Receipt */}
                            <button
                              onClick={() => setSelectedReceipt(sale)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                              title="View & Print Bill Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Bill */}
                            {!isCancelled && (
                              <button
                                onClick={() => startEditingBill(sale)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                title="Edit Bill & Adjust Stock"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Void / Cancel Bill */}
                            {!isCancelled && (
                              <button
                                onClick={() => {
                                  setVoidModalSale(sale);
                                  setVoidReason('');
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Void / Cancel Bill (Return Stock)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!salesList.length && (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400">
                        No invoices found in ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ── MOBILE CART SHEET TRIGGER BUTTON ── */}
      {viewMode === 'REGISTER' && itemCount > 0 && (
        <div className="fixed bottom-20 inset-x-3 z-40 lg:hidden">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl bg-amber-500 text-slate-950 px-5 py-3.5 font-black shadow-2xl active:scale-95 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{itemCount} items</span>
            </div>
            <span>Checkout · {money(grandTotal)}</span>
          </button>
        </div>
      )}

      {/* ── MOBILE CART SHEET MODAL ── */}
      {mobileCartOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-2 backdrop-blur-md lg:hidden"
          onClick={() => setMobileCartOpen(false)}
        >
          <div
            className="w-full h-[85dvh] rounded-3xl bg-white dark:bg-[#0c0d18] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                Current Sale Register
              </h3>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <CheckoutRegisterContent
                cart={cart}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerMobile={customerMobile}
                setCustomerMobile={setCustomerMobile}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                billDiscountType={billDiscountType}
                setBillDiscountType={setBillDiscountType}
                billDiscountValue={billDiscountValue}
                setBillDiscountValue={setBillDiscountValue}
                billNotes={billNotes}
                setBillNotes={setBillNotes}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                updateLineDiscount={updateLineDiscount}
                clearRegister={clearRegister}
                subtotal={subtotal}
                itemDiscountsTotal={itemDiscountsTotal}
                billDiscountAmount={billDiscountAmount}
                totalDiscount={totalDiscount}
                grandTotal={grandTotal}
                itemCount={itemCount}
                editingSale={editingSale}
                isSaving={isSaving}
                onSave={handleSaveSale}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TOTAL BILL DISCOUNT MODAL ── */}
      {billDiscountModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setBillDiscountModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0f101d] border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Invoice-Level Discount
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Applied on top of any item-level discounts.
              </p>
            </div>

            {/* Discount Type Toggle */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setBillDiscountType('FLAT')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  billDiscountType === 'FLAT'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ₹ Flat Amount
              </button>
              <button
                type="button"
                onClick={() => setBillDiscountType('PERCENT')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  billDiscountType === 'PERCENT'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                % Percentage
              </button>
            </div>

            {/* Presets */}
            <div className="flex gap-2">
              {(billDiscountType === 'FLAT' ? [50, 100, 200, 500] : [5, 10, 15, 20]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBillDiscountValue(preset)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:border-amber-500 transition"
                >
                  {billDiscountType === 'FLAT' ? `₹${preset}` : `${preset}%`}
                </button>
              ))}
            </div>

            {/* Input Field */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                {billDiscountType === 'FLAT'
                  ? `Enter Flat Rupees (Max ${money(taxableAfterItemDisc)})`
                  : 'Enter Percentage (0% to 100%)'}
              </label>
              <input
                type="number"
                min="0"
                max={billDiscountType === 'FLAT' ? taxableAfterItemDisc : 100}
                value={billDiscountValue || ''}
                onChange={(e) => setBillDiscountValue(Math.max(0, Number(e.target.value || 0)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                placeholder="0"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBillDiscountValue(0);
                  setBillDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Clear Discount
              </button>
              <button
                type="button"
                onClick={() => setBillDiscountModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition"
              >
                Apply to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VOID / CANCEL BILL CONFIRMATION MODAL ── */}
      {voidModalSale && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setVoidModalSale(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f101d] border border-rose-500/30 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Void Invoice #{voidModalSale.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action will cancel the bill and restock all physical parts.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Grand Total Refunded:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {money(voidModalSale.grandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Items Returned to Stock:</span>
                <span className="font-bold text-emerald-500">
                  {voidModalSale.items?.length || 0} product lines
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Reason for Void / Cancellation *
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Customer returned items, Cashier entry mistake..."
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidModalSale(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Keep Bill Active
              </button>
              <button
                type="button"
                disabled={isCancellingSale}
                onClick={handleConfirmVoid}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 disabled:opacity-50 transition"
              >
                {isCancellingSale ? 'Voiding...' : 'Confirm Void & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENTERPRISE RECEIPT & PRINT MODAL ── */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c0d18] border border-slate-200 dark:border-white/15 p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar (Top) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Tax Invoice / Bill Receipt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xs hover:bg-amber-400 cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div id="receipt-paper" className="p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-900 dark:text-white space-y-4">
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-white/20">
                <h2 className="text-base font-black uppercase tracking-wider">
                  MOMZZ AUTOMOTIVE GARAGE
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                  Premium Vehicle Maintenance, Spare Parts & Custom Works
                </p>
                <p className="text-[10px] text-slate-400">
                  Phone: +91 98765 43210 • GSTIN: 32ABCDE1234F1Z5
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-300 dark:border-white/20">
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoice Number:</span>
                  <span className="font-bold">{selectedReceipt.invoiceNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Date & Time:</span>
                  <span>{formatDate(selectedReceipt.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer:</span>
                  <span className="font-bold">
                    {selectedReceipt.customerName || 'Walk-in Counter'}
                  </span>
                  {selectedReceipt.customerMobile && (
                    <span className="block text-[10px] text-slate-400">
                      {selectedReceipt.customerMobile}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Payment Mode:</span>
                  <span className="font-bold uppercase text-amber-600 dark:text-amber-400">
                    {selectedReceipt.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300 dark:border-white/20">
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 pb-1">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>

                {selectedReceipt.items?.map((line, idx) => {
                  const itemTitle =
                    typeof line.item === 'object' && line.item?.title
                      ? line.item.title
                      : 'Catalog Item';
                  return (
                    <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                      <div className="col-span-6 truncate pr-1">
                        <span className="font-bold">{itemTitle}</span>
                        {line.discountAmount > 0 && (
                          <span className="block text-[9px] text-amber-500">
                            Disc: -{money(line.discountAmount)}
                          </span>
                        )}
                      </div>
                      <span className="col-span-2 text-center">{line.quantity}</span>
                      <span className="col-span-2 text-right">{money(line.unitPrice)}</span>
                      <span className="col-span-2 text-right font-bold">
                        {money(line.totalPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation */}
              <div className="space-y-1 text-right text-[11px]">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Gross Subtotal:</span>
                  <span>{money(selectedReceipt.subtotal)}</span>
                </div>

                {selectedReceipt.totalDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Total Discount Given:</span>
                    <span>-{money(selectedReceipt.totalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300 dark:border-white/20 text-slate-900 dark:text-white">
                  <span>Grand Total Payable:</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {money(selectedReceipt.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Remarks & Footer */}
              {selectedReceipt.notes && (
                <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-white/10">
                  Note: {selectedReceipt.notes}
                </div>
              )}

              <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-300 dark:border-white/20">
                Thank you for your visit! Genuine automotive parts guaranteed.
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1 print:hidden">
              <button
                onClick={() => {
                  startEditingBill(selectedReceipt);
                  setSelectedReceipt(null);
                }}
                className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit this invoice in register</span>
              </button>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================
   SUB-COMPONENT: CHECKOUT REGISTER CONTENT
   Shared between Desktop right sidebar & Mobile sheet
   ======================================================== */
interface CheckoutRegisterContentProps {
  cart: CartLine[];
  customerName: string;
  setCustomerName: (v: string) => void;
  customerMobile: string;
  setCustomerMobile: (v: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  billDiscountType: 'FLAT' | 'PERCENT';
  setBillDiscountType: (v: 'FLAT' | 'PERCENT') => void;
  billDiscountValue: number;
  setBillDiscountValue: (v: number) => void;
  billNotes: string;
  setBillNotes: (v: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  updateLineDiscount: (id: string, type: 'FLAT' | 'PERCENT', val: number) => void;
  clearRegister: () => void;
  subtotal: number;
  itemDiscountsTotal: number;
  billDiscountAmount: number;
  totalDiscount: number;
  grandTotal: number;
  itemCount: number;
  editingSale: Sale | null;
  isSaving: boolean;
  onSave: () => void;
}

const CheckoutRegisterContent: React.FC<CheckoutRegisterContentProps> = ({
  cart,
  customerName,
  setCustomerName,
  customerMobile,
  setCustomerMobile,
  paymentMethod,
  setPaymentMethod,
  billDiscountType,
  setBillDiscountType,
  billDiscountValue,
  setBillDiscountValue,
  billNotes,
  setBillNotes,
  updateQuantity,
  removeFromCart,
  updateLineDiscount,
  clearRegister,
  subtotal,
  itemDiscountsTotal,
  billDiscountAmount,
  totalDiscount,
  grandTotal,
  itemCount,
  editingSale,
  isSaving,
  onSave,
}) => {
  const [openItemDiscountId, setOpenItemDiscountId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Terminal Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span className="font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {editingSale ? `Edit Invoice #${editingSale.invoiceNumber}` : 'Draft Bill #CURRENT'}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearRegister}
              className="text-[11px] font-mono text-rose-500 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Customer Information Inputs */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="tel"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="Mobile Number"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Payment Method Pills */}
        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                paymentMethod === method
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingBag className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-300">Bill Cart is Empty</p>
            <p className="text-[11px] font-mono mt-1 text-slate-400">
              Click spare parts or labor services from the catalog to add items.
            </p>
          </div>
        ) : (
          cart.map((line) => {
            const basePrice = line.item.price * line.quantity;
            const lineDiscount =
              line.discountType === 'PERCENT'
                ? (basePrice * line.discountValue) / 100
                : line.discountValue;
            const safeDiscount = Math.min(basePrice, Math.max(0, lineDiscount));
            const netPrice = Math.max(0, basePrice - safeDiscount);
            const isDiscountOpen = openItemDiscountId === line.item.id;

            return (
              <div
                key={line.item.id}
                className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] p-2.5 shadow-2xs space-y-2"
              >
                {/* Line Header & Quantities */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {line.item.title}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {money(line.item.price)} each •{' '}
                      {line.item.sku ? `SKU: ${line.item.sku}` : 'Part'}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-0.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(line.item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(line.item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Remove line */}
                  <button
                    onClick={() => removeFromCart(line.item.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Line Pricing & Per-Item Discount Controls */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-white/[0.04]">
                  {/* Per-Item Discount Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenItemDiscountId(isDiscountOpen ? null : line.item.id)
                    }
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                      line.discountValue > 0
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-amber-500'
                    }`}
                  >
                    <Percent className="w-2.5 h-2.5" />
                    <span>
                      {line.discountValue > 0
                        ? `-${
                            line.discountType === 'PERCENT'
                              ? `${line.discountValue}%`
                              : money(line.discountValue)
                          }`
                        : 'Add Disc'}
                    </span>
                  </button>

                  {/* Line Total */}
                  <div className="text-right font-mono">
                    {safeDiscount > 0 && (
                      <span className="text-[10px] text-slate-400 line-through mr-1.5">
                        {money(basePrice)}
                      </span>
                    )}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {money(netPrice)}
                    </span>
                  </div>
                </div>

                {/* Inline Per-Item Discount Mini Drawer */}
                {isDiscountOpen && (
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Item Discount Mode:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => updateLineDiscount(line.item.id, 'FLAT', line.discountValue)}
                          className={`px-1.5 py-0.2 rounded font-bold ${
                            line.discountType === 'FLAT'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400'
                          }`}
                        >
                          ₹ Flat
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateLineDiscount(line.item.id, 'PERCENT', line.discountValue)
                          }
                          className={`px-1.5 py-0.2 rounded font-bold ${
                            line.discountType === 'PERCENT'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400'
                          }`}
                        >
                          % Pct
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max={line.discountType === 'PERCENT' ? 100 : basePrice}
                        value={line.discountValue || ''}
                        onChange={(e) =>
                          updateLineDiscount(
                            line.item.id,
                            line.discountType,
                            Number(e.target.value || 0)
                          )
                        }
                        placeholder={line.discountType === 'PERCENT' ? 'e.g. 10%' : 'e.g. ₹50'}
                        className="flex-1 px-2 py-1 rounded bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateLineDiscount(line.item.id, 'FLAT', 0);
                          setOpenItemDiscountId(null);
                        }}
                        className="px-2 py-1 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Financial Summary & Checkout Action */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] space-y-2.5 shrink-0">
        {/* Memo / Notes input */}
        <input
          type="text"
          value={billNotes}
          onChange={(e) => setBillNotes(e.target.value)}
          placeholder="Bill remark / Internal memo (optional)..."
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-900 dark:text-white outline-none font-mono"
        />

        {/* Calculation Table */}
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Gross Subtotal:</span>
            <span className="font-bold text-slate-900 dark:text-white">{money(subtotal)}</span>
          </div>

          {itemDiscountsTotal > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Item Discounts:</span>
              <span>-{money(itemDiscountsTotal)}</span>
            </div>
          )}

          {/* Invoice-level discount selector */}
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1 font-bold">
              Bill Discount ({billDiscountType === 'PERCENT' ? `${billDiscountValue}%` : 'Flat'}):
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max={billDiscountType === 'PERCENT' ? 100 : subtotal}
                value={billDiscountValue || ''}
                onChange={(e) => setBillDiscountValue(Math.max(0, Number(e.target.value || 0)))}
                placeholder="0"
                className="w-16 px-1.5 py-0.5 text-right rounded bg-white dark:bg-black/30 border border-amber-500/40 text-[11px] font-bold outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setBillDiscountType(billDiscountType === 'FLAT' ? 'PERCENT' : 'FLAT')
                }
                className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 text-[10px]"
                title="Toggle Flat ₹ or %"
              >
                {billDiscountType === 'FLAT' ? '₹' : '%'}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase text-slate-900 dark:text-white">
              Grand Total:
            </span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {money(grandTotal)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          disabled={!cart.length || isSaving}
          onClick={onSave}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <span>Processing Invoice...</span>
          ) : editingSale ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Update Invoice #{editingSale.invoiceNumber} • {money(grandTotal)}</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Complete Sale & Bill • {money(grandTotal)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
