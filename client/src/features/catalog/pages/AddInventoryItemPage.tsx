import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ExternalLink,
  FolderPlus,
  ImagePlus,
  Info,
  Layers,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import {
  CatalogItem,
  useCreateCatalogItemMutation,
  useCreateCategoryMutation,
  useGetCategoriesQuery,
  useGetCatalogQuery,
} from '../../catalog/api/catalogApi';
import { useGetJobCardsQuery } from '../../jobs/api/jobApi';
import { ImageCropperModal } from '../../../shared/components/common/ImageCropperModal';
import { findDuplicateCandidates } from '../../../shared/utils/searchAlgorithm';

const labelStyle =
  'block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

const COMMON_UNITS = ['pcs', 'set', 'pair', 'ltr', 'box', 'kit', 'kg', 'meter'];

export const AddInventoryItemPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    price: '',
    costPrice: '',
    itemType: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
    categoryId: '',
    stockQuantity: '10',
    minimumStockQuantity: '2',
    sku: '',
    brand: '',
    unit: 'pcs',
    location: '',
    yearFrom: '',
    yearTo: '',
    description: '',
  });

  // Compatible Vehicles Tag List
  const [compatibleVehicles, setCompatibleVehicles] = useState<string[]>([]);
  const [customVehicleInput, setCustomVehicleInput] = useState('');
  const [showPlatformTwinHelp, setShowPlatformTwinHelp] = useState(false);

  // ── DEBOUNCING FOR LIVE DUPLICATE SEARCH (280ms) ──
  const [debouncedTitle, setDebouncedTitle] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    const raw = form.title.trim();
    if (raw === debouncedTitle) {
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedTitle(raw);
      setIsDebouncing(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [form.title, debouncedTitle]);

  // Load existing catalog items
  const { data: categoryData, refetch: refetchCategories } = useGetCategoriesQuery();
  // 1. Full catalog cache
  const { data: fullCatalogData, isLoading: isLoadingCatalog } = useGetCatalogQuery();
  // 2. Query search server for targeted match tokens
  const trimmedSearchToken = debouncedTitle.slice(0, 25);
  const { data: searchCatalogData, isFetching: isSearchingServer } = useGetCatalogQuery(
    { q: trimmedSearchToken, limit: 50 },
    { skip: trimmedSearchToken.length < 2 }
  );

  // 3. Garage job cards to dynamically source vehicle models/variants
  const { data: jobCardsData } = useGetJobCardsQuery();

  const [createCatalogItem, { isLoading: isCreating }] = useCreateCatalogItemMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();

  const categories = categoryData?.data || [];

  // Merge full catalog items and targeted server search items
  const existingItems = useMemo<CatalogItem[]>(() => {
    const map = new Map<string, CatalogItem>();
    for (const it of fullCatalogData?.data || []) {
      const key = it.id || (it as any)._id;
      if (key) map.set(key, it);
    }
    for (const it of searchCatalogData?.data || []) {
      const key = it.id || (it as any)._id;
      if (key) map.set(key, it);
    }
    return Array.from(map.values());
  }, [fullCatalogData, searchCatalogData]);

  // Duplicate candidates check with optimized automotive similarity
  const [dismissDuplicateNotice, setDismissDuplicateNotice] = useState(false);

  const duplicateCandidates = useMemo(() => {
    if (!debouncedTitle || debouncedTitle.length < 2) return [];

    const matches = findDuplicateCandidates(
      debouncedTitle,
      existingItems,
      (item) => item.title,
      0.60
    );

    // Also detect duplicate SKU if entered
    const cleanSku = form.sku.trim().toUpperCase();
    if (cleanSku) {
      for (const item of existingItems) {
        if (item.sku && item.sku.trim().toUpperCase() === cleanSku) {
          const itemId = item.id || (item as any)._id;
          if (!matches.some((m) => (m.item.id || (m.item as any)._id) === itemId)) {
            matches.unshift({
              item,
              similarity: 1.0,
              reason: `Exact SKU Match: "${item.sku}"`,
            });
          }
        }
      }
    }

    return matches;
  }, [debouncedTitle, existingItems, form.sku]);

  // Multi-image state
  const [images, setImages] = useState<string[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);
  const [cropSource, setCropSource] = useState<string | null>(null);

  // Inline new category state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'PRODUCT' | 'SERVICE' | 'BOTH'>('BOTH');

  const [error, setError] = useState('');

  // Auto-calculated profit and margin percentage
  const profitMetrics = useMemo(() => {
    const sell = Number(form.price) || 0;
    const cost = Number(form.costPrice) || 0;
    if (sell <= 0) return null;
    const profit = sell - cost;
    const margin = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '100.0';
    return {
      profit,
      margin,
      isProfitable: profit >= 0,
    };
  }, [form.price, form.costPrice]);

  const handleFieldChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'title') {
      setDismissDuplicateNotice(false);
    }
  };

  // Add / remove vehicle compatibility tags
  const handleAddVehicleTag = (vehicleName: string) => {
    const trimmed = vehicleName.trim();
    if (!trimmed) return;
    if (!compatibleVehicles.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setCompatibleVehicles((prev) => [...prev, trimmed]);
    }
    setCustomVehicleInput('');
  };

  const handleRemoveVehicleTag = (index: number) => {
    setCompatibleVehicles((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamically extract all saved vehicle models from inventory & job cards
  const savedVehiclesList = useMemo(() => {
    const counts = new Map<string, number>();
    const displayNameMap = new Map<string, string>();

    // 1. From existing stock items
    for (const it of existingItems) {
      if (Array.isArray(it.compatibleVehicles)) {
        for (const raw of it.compatibleVehicles) {
          const trimmed = (raw || '').trim();
          if (trimmed.length >= 2) {
            const lower = trimmed.toLowerCase();
            counts.set(lower, (counts.get(lower) || 0) + 1);
            if (!displayNameMap.has(lower)) {
              displayNameMap.set(lower, trimmed);
            }
          }
        }
      }
    }

    // 2. From garage job cards
    const rawJobs: any[] = Array.isArray(jobCardsData?.data)
      ? jobCardsData.data
      : Array.isArray(jobCardsData?.data?.jobs)
      ? jobCardsData.data.jobs
      : [];

    for (const j of rawJobs) {
      const name = (j?.vehicleName || '').trim();
      if (name.length >= 2) {
        const lower = name.toLowerCase();
        counts.set(lower, (counts.get(lower) || 0) + 1);
        if (!displayNameMap.has(lower)) {
          displayNameMap.set(lower, name);
        }
      }
    }

    // Sort by frequency of use
    return Array.from(counts.keys())
      .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))
      .map((k) => displayNameMap.get(k)!);
  }, [existingItems, jobCardsData]);

  // Filter saved suggestions based on user input (or top frequent if input is empty)
  const filteredSavedSuggestions = useMemo(() => {
    const query = customVehicleInput.trim().toLowerCase();
    const unselected = savedVehiclesList.filter(
      (v) => !compatibleVehicles.some((c) => c.toLowerCase() === v.toLowerCase())
    );
    if (!query) {
      return unselected.slice(0, 16);
    }
    return unselected.filter((v) => v.toLowerCase().includes(query)).slice(0, 16);
  }, [customVehicleInput, savedVehiclesList, compatibleVehicles]);

  // Preset Year Ranges
  const handleApplyYearPreset = (from: string, to: string) => {
    setForm((prev) => ({ ...prev, yearFrom: from, yearTo: to }));
  };

  // Auto-generate enterprise SKU
  const handleAutoGenerateSku = () => {
    const titleSlug = form.title
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    const brandSlug = (form.brand || 'STK').slice(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generated = `${brandSlug}-${titleSlug || 'ITEM'}-${rand}`;
    setForm((prev) => ({ ...prev, sku: generated }));
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSource(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBase64: string) => {
    setImages((prev) => {
      const next = [...prev, croppedBase64];
      if (prev.length === 0) setThumbnailIndex(0);
      return next;
    });
    setCropSource(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (thumbnailIndex >= next.length) setThumbnailIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await createCategory({
        name: newCategoryName.trim(),
        type: newCategoryType,
      }).unwrap();
      await refetchCategories();
      setForm((prev) => ({ ...prev, categoryId: res.data.id || (res.data as any)._id }));
      setNewCategoryName('');
      setShowCategoryForm(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create category.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.price) {
      setError('Title and selling price are required.');
      return;
    }

    try {
      await createCatalogItem({
        title: form.title.trim(),
        price: Number(form.price),
        costPrice: form.costPrice ? Number(form.costPrice) : 0,
        itemType: form.itemType,
        category: form.categoryId || undefined,
        categoryId: form.categoryId || undefined,
        sku: form.sku.trim() || undefined,
        brand: form.brand.trim() || undefined,
        unit: form.unit.trim() || 'pcs',
        location: form.location.trim() || undefined,
        compatibleVehicles,
        yearFrom: form.yearFrom ? Number(form.yearFrom) || form.yearFrom : undefined,
        yearTo: form.yearTo ? (form.yearTo.toLowerCase() === 'present' ? 'Present' : Number(form.yearTo) || form.yearTo) : undefined,
        description: form.description.trim(),
        stockQuantity: form.itemType === 'PRODUCT' ? Number(form.stockQuantity || 0) : 0,
        minimumStockQuantity: form.itemType === 'PRODUCT' ? Number(form.minimumStockQuantity || 0) : 0,
        thumbnailUrl: images[thumbnailIndex] || undefined,
        images,
        isAvailable: true,
      }).unwrap();

      navigate('/inventory');
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create stock item.');
    }
  };

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 sm:py-6 pb-36 sm:pb-40 md:pb-16 max-w-7xl mx-auto space-y-5">
        {/* Enterprise Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
          <PageHeader
            backTo="/inventory"
            title="Add New Stock Item"
            description="Enterprise inventory catalog, multi-model vehicle compatibility & pricing management"
          />

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="px-4 py-2 rounded-xl glass-ghost-btn text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isCreating || !form.title.trim() || !form.price}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl glass-gold-btn text-xs sm:text-sm font-black text-slate-950 shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{isCreating ? 'Saving Stock...' : 'Save Stock Item'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2.5 shadow-xs animate-shake">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* ══════════ LEFT COLUMN (Main Data Entry) ══════════ */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1. Classification Selector */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className={labelStyle}>1. Stock Classification</label>
                <span className="text-[11px] font-mono text-slate-400">
                  {form.itemType === 'PRODUCT' ? 'Tracked Inventory' : 'Labor & Time'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleFieldChange('itemType', 'PRODUCT')}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer border ${
                    form.itemType === 'PRODUCT'
                      ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-white/60 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-amber-400/40'
                  }`}
                >
                  <Package className="h-4 w-4 shrink-0" />
                  <span>Physical Stock Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('itemType', 'SERVICE')}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer border ${
                    form.itemType === 'SERVICE'
                      ? 'bg-violet-600 border-violet-600 text-white shadow-md font-black'
                      : 'bg-white/60 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-violet-500/40'
                  }`}
                >
                  <Wrench className="h-4 w-4 shrink-0" />
                  <span>Workshop Service</span>
                </button>
              </div>
            </div>

            {/* 2. Primary Identifiers & Real-time Duplicate Avoidance */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <label className={labelStyle}>2. Core Identifiers</label>
                <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live Duplicate Checker Active
                </span>
              </div>

              {/* Title with Live Duplicate Finder */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Stock Item Title *
                  </label>
                  {isDebouncing || isSearchingServer ? (
                    <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3" /> Checking duplicates...
                    </span>
                  ) : duplicateCandidates.length > 0 && !dismissDuplicateNotice ? (
                    <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {duplicateCandidates.length} existing similar item{duplicateCandidates.length > 1 ? 's' : ''} found
                    </span>
                  ) : debouncedTitle.length >= 2 ? (
                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Unique Title Verified
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="e.g. 5D All-Weather Floor Mats, Mobil 1 5W-40 Synthetic Oil, Brake Pads..."
                    className={`w-full rounded-xl glass-modern-input px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 ${
                      duplicateCandidates.length > 0 && !dismissDuplicateNotice
                        ? 'border-amber-500/60 focus:ring-amber-500/40 bg-amber-500/[0.02]'
                        : 'focus:ring-amber-400/40'
                    }`}
                  />
                  {form.title && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('title', '')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Clear Title"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* ── LIVE DUPLICATE / RELATED STOCK SUGGESTIONS TRAY ── */}
                {duplicateCandidates.length > 0 && !dismissDuplicateNotice && (
                  <div className="mt-3 rounded-2xl border border-amber-500/50 bg-amber-500/[0.08] dark:bg-amber-500/[0.06] p-3 sm:p-4 space-y-3 animate-fadeIn shadow-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          {duplicateCandidates.length} Existing Stock{duplicateCandidates.length > 1 ? 's' : ''} in Inventory Match This Name
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDismissDuplicateNotice(true)}
                        className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
                      >
                        Dismiss warning
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-700 dark:text-slate-300">
                      We found existing items with identical or closely matching keywords. Check if you want to update an existing record instead of creating a duplicate:
                    </p>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {duplicateCandidates.map(({ item, reason, similarity }) => {
                        const itemId = item.id || (item as any)._id;
                        const matchPercent = Math.round(similarity * 100);
                        const isHighDuplicate = similarity >= 0.85;

                        return (
                          <div
                            key={itemId}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border text-xs shadow-2xs transition-all ${
                              isHighDuplicate
                                ? 'bg-amber-50 dark:bg-zinc-900/90 border-amber-400/40 ring-1 ring-amber-400/20'
                                : 'bg-white/80 dark:bg-zinc-900/80 border-slate-200/80 dark:border-white/10'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-white/10 mt-0.5"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-900 dark:text-white truncate">
                                    {item.title}
                                  </p>
                                  <span
                                    className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] font-bold ${
                                      isHighDuplicate
                                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {matchPercent}% Match
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                                  <span>{item.category?.name || 'General'}</span>
                                  {item.sku && <span>• SKU: {item.sku}</span>}
                                  {item.brand && <span>• {item.brand}</span>}
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    Stock: {item.stockQuantity} {item.unit || 'pcs'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium block">
                                  {reason}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                              <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                                ₹{item.price.toLocaleString('en-IN')}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigate(`/inventory/${itemId}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Open & manage this existing stock item"
                              >
                                <span>View Item</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Brand & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                    placeholder="e.g. Bosch, MGP, Motul, Uno Minda"
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      SKU / Part Number
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Barcode className="w-3 h-3" /> Auto Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => handleFieldChange('sku', e.target.value.toUpperCase())}
                    placeholder="e.g. BOSCH-0986-F00"
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Category Dropdown with inline creation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Category
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.categoryId}
                    onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
                  >
                    <option value="" className="text-slate-900 dark:bg-zinc-900">General Stocks</option>
                    {categories.map((cat) => (
                      <option
                        key={cat.id || cat._id}
                        value={cat.id || cat._id}
                        className="text-slate-900 dark:bg-zinc-900"
                      >
                        {cat.name} ({cat.type})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm((v) => !v)}
                    title="Add new category"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass-ghost-btn text-amber-500 hover:text-amber-400 active:scale-95 transition cursor-pointer"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </div>

                {/* Inline New Category Form */}
                {showCategoryForm && (
                  <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3 space-y-2 animate-fadeIn">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Create Stock Category
                    </p>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name (e.g. Brake Systems, Body Kits)"
                      className="w-full rounded-xl glass-modern-input px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between pt-1">
                      <select
                        value={newCategoryType}
                        onChange={(e) => setNewCategoryType(e.target.value as any)}
                        className="rounded-lg glass-modern-input px-2 py-1 text-[11px] text-slate-900 dark:text-white"
                      >
                        <option value="BOTH" className="text-slate-900 dark:bg-zinc-900">Both Products & Services</option>
                        <option value="PRODUCT" className="text-slate-900 dark:bg-zinc-900">Products Only</option>
                        <option value="SERVICE" className="text-slate-900 dark:bg-zinc-900">Services Only</option>
                      </select>
                      <button
                        type="button"
                        disabled={isCreatingCategory || !newCategoryName.trim()}
                        onClick={handleCreateCategory}
                        className="rounded-lg glass-gold-btn px-3 py-1 text-xs font-bold text-slate-950 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isCreatingCategory ? 'Saving...' : 'Add Category'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Vehicle Compatibility & Year Range (Automotive Specialized) */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-4 shadow-xs border-amber-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <label className={labelStyle}>3. Vehicle Compatibility & Year Range</label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Specify vehicle models, shared platform variants, and applicable model years
                  </p>
                </div>
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Car className="w-4 h-4" />
                </span>
              </div>

              {/* Model Year Range Inputs */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Model Year Range Suitability
                  </span>
                  {(form.yearFrom || form.yearTo) && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-[11px] font-bold">
                      {form.yearFrom || 'All'} - {form.yearTo || 'Present'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Year From (Start Year)
                    </label>
                    <input
                      type="text"
                      value={form.yearFrom}
                      onChange={(e) => handleFieldChange('yearFrom', e.target.value)}
                      placeholder="e.g. 2018"
                      className="w-full rounded-xl glass-modern-input px-3 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Year To (End Year / Present)
                    </label>
                    <input
                      type="text"
                      value={form.yearTo}
                      onChange={(e) => handleFieldChange('yearTo', e.target.value)}
                      placeholder="e.g. 2024 or Present"
                      className="w-full rounded-xl glass-modern-input px-3 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Quick Year Range Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Presets:</span>
                  {[
                    { label: '2018 - 2024', from: '2018', to: '2024' },
                    { label: '2020 - Present', from: '2020', to: 'Present' },
                    { label: '2015 - 2020', from: '2015', to: '2020' },
                    { label: 'All Years (Clear)', from: '', to: '' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyYearPreset(p.from, p.to)}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 hover:border-amber-400/50 text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cross-Variant & Multi-Model Compatibility */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    Compatible Car Models & Variants ({compatibleVehicles.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPlatformTwinHelp((v) => !v)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" /> Shared Platform Info
                  </button>
                </div>

                {showPlatformTwinHelp && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1 animate-fadeIn">
                    <p className="font-bold text-amber-700 dark:text-amber-400">
                      💡 Shared Platform & Variant Matching:
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Products like mats, filters, brake pads, and mirrors often share identical dimensions across brand twins (e.g. <b>Maruti Baleno & Toyota Glanza</b>, <b>Brezza & Urban Cruiser</b>, <b>Creta & Seltos</b>). Add both models so your team can find this stock under either vehicle during job cards and billing!
                    </p>
                  </div>
                )}

                {/* Custom Model / Variant Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customVehicleInput}
                    onChange={(e) => setCustomVehicleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddVehicleTag(customVehicleInput);
                      }
                    }}
                    placeholder="Type car model or variant (e.g. Swift Type 3, Baleno, Creta, Wagon R)..."
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddVehicleTag(customVehicleInput)}
                    disabled={!customVehicleInput.trim()}
                    className="shrink-0 px-4 py-2 rounded-xl glass-gold-btn text-xs font-bold text-slate-950 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Vehicle Badges */}
                {compatibleVehicles.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    {compatibleVehicles.map((model, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs font-semibold shadow-2xs animate-fadeIn"
                      >
                        <Car className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>{model}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicleTag(idx)}
                          className="hover:text-rose-500 rounded-full p-0.5 transition"
                          title="Remove vehicle"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCompatibleVehicles([])}
                      className="text-[10px] text-rose-500 hover:underline font-semibold ml-auto px-1"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic px-1">
                    No vehicle model selected yet. Type to search saved vehicles or add custom variants.
                  </p>
                )}

                {/* Dynamic Saved Vehicle Suggestions & Autocomplete */}
                {filteredSavedSuggestions.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {customVehicleInput.trim()
                          ? `Matching Saved Vehicles (${filteredSavedSuggestions.length}):`
                          : `Saved Garage & Stock Vehicles (${savedVehiclesList.length}):`}
                      </span>
                      <span className="text-[10px] text-slate-400">Click to add</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {filteredSavedSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleAddVehicleTag(name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 hover:border-amber-400/50 hover:bg-amber-400/10 text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-amber-500" />
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : customVehicleInput.trim() ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    <span>
                      New variant: <b>"{customVehicleInput.trim()}"</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddVehicleTag(customVehicleInput)}
                      className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Press Enter or click + Add
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 4. Pricing, Margin & Inventory Quantities */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-4 shadow-xs">
              <label className={labelStyle}>4. Pricing & Inventory Controls</label>

              {/* Price & Cost Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Selling Price (MRP / Bill ₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => handleFieldChange('price', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Buying / Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => handleFieldChange('costPrice', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Profit & Margin Indicator */}
              {profitMetrics && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>Estimated Unit Margin</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      Profit: ₹{profitMetrics.profit.toLocaleString('en-IN')}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-extrabold text-[11px]">
                      +{profitMetrics.margin}%
                    </span>
                  </div>
                </div>
              )}

              {/* Physical Stock Specific Controls */}
              {form.itemType === 'PRODUCT' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Initial Stock Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stockQuantity}
                      onChange={(e) => handleFieldChange('stockQuantity', e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Unit of Measure
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) => handleFieldChange('unit', e.target.value)}
                      className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u} className="text-slate-900 dark:bg-zinc-900">
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Low Stock Alert Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.minimumStockQuantity}
                      onChange={(e) => handleFieldChange('minimumStockQuantity', e.target.value)}
                      placeholder="2"
                      className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Warehouse / Shelf Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Storage Bin / Rack Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="e.g. Shelf A-3, Bin 12, Main Lubricant Bay"
                    className="w-full rounded-xl glass-modern-input pl-10 pr-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 5. Media Photos (Studio 4:3) */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className={labelStyle}>5. Product Photos (4:3 Ratio)</label>
                <span className="text-[10px] text-slate-400">Multiple Photos Supported</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {images.map((img, idx) => (
                  <div key={idx} className="group relative h-20 w-24 shrink-0">
                    <div
                      className={`h-full w-full overflow-hidden rounded-2xl border-2 transition-all ${
                        thumbnailIndex === idx
                          ? 'border-amber-400 shadow-md ring-2 ring-amber-400/30'
                          : 'border-slate-200/80 dark:border-white/10'
                      }`}
                    >
                      <img src={img} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition bg-slate-950/60 rounded-2xl">
                      <button
                        type="button"
                        title="Set as primary thumbnail"
                        onClick={() => setThumbnailIndex(idx)}
                        className="h-6 w-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs active:scale-90 transition"
                      >
                        <Star className="h-3 w-3 fill-slate-950 text-slate-950" />
                      </button>
                      <button
                        type="button"
                        title="Remove image"
                        onClick={() => handleRemoveImage(idx)}
                        className="h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs active:scale-90 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {thumbnailIndex === idx && (
                      <div className="absolute left-1.5 top-1.5 rounded-md bg-amber-400 px-1 py-0.5 shadow-xs">
                        <Star className="h-2.5 w-2.5 fill-slate-950 text-slate-950" />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-20 w-24 shrink-0 rounded-2xl border-2 border-dashed border-amber-400/50 bg-amber-400/10 flex flex-col items-center justify-center gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-400/20 active:scale-95 transition cursor-pointer"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-bold">Add Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelected}
                  className="hidden"
                />
              </div>
            </div>

            {/* 6. Description & Specs */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-2 shadow-xs">
              <label className={labelStyle}>6. Technical Specs & Notes</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Product specifications, OEM part cross-references, warranty details, installation notes..."
                className="w-full rounded-xl glass-modern-input px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none resize-none"
              />
            </div>
          </div>

          {/* ══════════ RIGHT COLUMN (Sticky Live Preview & Summary) ══════════ */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            {/* Live Catalog Card Preview */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-4 shadow-md border-amber-400/20">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-500" /> Live Catalog Preview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  {form.itemType === 'PRODUCT' ? 'Stock Item' : 'Service'}
                </span>
              </div>

              {/* Photo Card Preview */}
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex items-center justify-center">
                {images[thumbnailIndex] ? (
                  <img
                    src={images[thumbnailIndex]}
                    alt="Stock preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400 flex flex-col items-center gap-2">
                    <Package className="w-8 h-8 stroke-1 text-slate-400" />
                    <span className="text-[11px]">No Photo Uploaded</span>
                  </div>
                )}
                {form.brand && (
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold">
                    {form.brand}
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {form.title.trim() || 'Stock Item Title Here'}
                </h3>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Selling Price</span>
                    <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{(Number(form.price) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {form.itemType === 'PRODUCT' && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Available Stock</span>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                        {form.stockQuantity || 0} {form.unit}
                      </span>
                    </div>
                  )}
                </div>

                {/* Compatibility Snippet */}
                {compatibleVehicles.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Fits:</span>
                    <div className="flex flex-wrap gap-1">
                      {compatibleVehicles.slice(0, 3).map((v, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                          {v}
                        </span>
                      ))}
                      {compatibleVehicles.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-semibold self-center">
                          +{compatibleVehicles.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Year Range Snippet */}
                {(form.yearFrom || form.yearTo) && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>Model Years: {form.yearFrom || 'All'} - {form.yearTo || 'Present'}</span>
                  </div>
                )}

                {/* Storage Location Snippet */}
                {form.location && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>Location: {form.location}</span>
                  </div>
                )}

                {/* Duplicate Status Card in Preview */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                  {duplicateCandidates.length > 0 ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{duplicateCandidates.length} potential duplicate(s) in inventory</span>
                    </div>
                  ) : debouncedTitle.length >= 2 ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>Unique stock title confirmed</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] text-[11px] text-slate-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Type title to check duplicates</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Save */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isCreating || !form.title.trim() || !form.price}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl glass-gold-btn text-xs sm:text-sm font-black text-slate-950 shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>{isCreating ? 'Saving Stock...' : 'Save Stock Item'}</span>
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Image Cropper Modal */}
      {cropSource && (
        <ImageCropperModal
          isOpen={!!cropSource}
          imageSrc={cropSource}
          aspectRatio={4 / 3}
          title="Crop Stock Photo (4:3 Landscape)"
          onClose={() => setCropSource(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default AddInventoryItemPage;
