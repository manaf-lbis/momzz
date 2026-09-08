import React, { useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Mail,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wrench,
  X,
  Camera,
  Upload,
  Sparkles,
  Phone,
  Palette,
  Car,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../../shared/components/common/BackButton';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { useCreateJobMutation } from '../../jobs/api/jobApi';
import { CatalogItem, useGetCatalogQuery, useQuickAddCatalogItemMutation } from '../../catalog/api/catalogApi';
import { advancedSearch, findDuplicateCandidates } from '../../../shared/utils/searchAlgorithm';
import { ImageCropperModal } from '../../../shared/components/common/ImageCropperModal';
import { getDeliveryPreset } from '../../../shared/utils/dateUtils';
import { ModernDateTimePicker } from '../../../shared/components/common/ModernDateTimePicker';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';

type SelectedLine = {
  item:
    | CatalogItem
    | {
        id: string;
        title: string;
        price: number;
        itemType: 'PRODUCT' | 'SERVICE';
        isCustomOnly?: boolean;
        thumbnailUrl?: string;
        stockQuantity?: number;
        trackStock?: boolean;
      };
  quantityUsed: number;
  discountAmount: number;
};

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const inputStyle =
  'w-full rounded-xl glass-modern-input px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20';

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [createJob, { isLoading }] = useCreateJobMutation();
  const [quickAdd, { isLoading: isQuickAdding }] = useQuickAddCatalogItemMutation();

  const [step, setStep] = useState<1 | 2>(1);

  // Form State - Step 1: Vehicle & Customer
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const camInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Form State - Step 2: Catalog Checklist Selection
  const [query, setQuery] = useState('');
  const [itemFilter, setItemFilter] = useState<'ALL' | 'SERVICE' | 'PRODUCT'>('ALL');
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [error, setError] = useState('');

  const { data, isFetching } = useGetCatalogQuery({
    q: query,
    ...(itemFilter === 'ALL' ? {} : { itemType: itemFilter }),
  });

  const results = useMemo(() => {
    const raw = (data?.data || []).filter(
      (item) =>
        item.isAvailable &&
        (item.itemType === 'SERVICE' || item.trackStock === false || item.stockQuantity > 0)
    );
    if (!query.trim()) return raw;
    return advancedSearch<CatalogItem>(
      raw,
      query,
      {
        getTitle: (item) => item.title,
        getSku: (item) => item.sku,
        getCategory: (item) => item.category?.name,
        getDescription: (item) => item.description,
      },
      140
    );
  }, [data, query]);

  const nearDuplicates = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    return findDuplicateCandidates<CatalogItem>(
      query,
      data?.data || [],
      (item) => item.title,
      0.82
    );
  }, [query, data]);

  const noExactMatch =
    Boolean(query.trim()) &&
    !results.some(
      (item) => item.title.trim().toLowerCase() === query.trim().toLowerCase()
    );

  const formatRegistration = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^(.{2})(.{0,2})(.{0,2})(.{0,4}).*$/, (_, a, b, c, d) =>
        [a, b, c, d].filter(Boolean).join(' ')
      );

  const goNext = () => {
    if (!vehicleName.trim() || !vehicleNumber.trim()) {
      setError('Vehicle model and registration number are required.');
      return;
    }
    setError('');
    setStep(2);
  };

  const openAddItemModal = (item: CatalogItem | SelectedLine['item']) => {
    const existingIndex = selected.findIndex((s) => s.item.id === item.id);
    if (existingIndex > -1) {
      setSelected((prev) =>
        prev.map((l, i) => (i === existingIndex ? { ...l, quantityUsed: l.quantityUsed + 1 } : l))
      );
    } else {
      setSelected((prev) => [...prev, { item, quantityUsed: 1, discountAmount: 0 }]);
    }
  };

  const handleAddJustForThisJob = (type: 'PRODUCT' | 'SERVICE') => {
    const title = query.trim();
    if (!title) return;
    const newItem: SelectedLine['item'] = {
      id: `custom-${Date.now()}`,
      title,
      price: 0,
      itemType: type,
      isCustomOnly: true,
      thumbnailUrl: '',
      stockQuantity: 0,
      trackStock: false,
    };
    setSelected((prev) => [...prev, { item: newItem, quantityUsed: 1, discountAmount: 0 }]);
    setQuery('');
  };

  const updateSelectedLine = (index: number, changes: Partial<SelectedLine>) => {
    setSelected((prev) => prev.map((l, i) => (i === index ? { ...l, ...changes } : l)));
  };

  const handleSubmit = async () => {
    setError('');
    if (!selected.length) {
      setError('Please add at least one service or checklist item.');
      return;
    }

    try {
      const response = await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        vehicleColor: vehicleColor.trim() || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        customerName: customerName.trim() || undefined,
        customerMobile: customerMobile.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        tasks: selected.map((line) => {
          if ('isCustomOnly' in line.item && line.item.isCustomOnly) {
            return {
              customTitle: line.item.title,
              itemType: line.item.itemType,
              unitPrice: line.item.price || 0,
              quantityUsed: line.quantityUsed,
              discountAmount: line.discountAmount,
            };
          }
          return {
            itemId: line.item.id,
            quantityUsed: line.quantityUsed,
            discountAmount: line.discountAmount,
          };
        }),
      }).unwrap();

      navigate(`/jobs/${response.data.id || response.data._id}`);
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to register new job card.');
    }
  };

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col overflow-x-clip selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* Header & Step Indicator */}
        <header className="sticky top-0 sm:top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 pt-3 pb-3 mb-1 backdrop-blur-2xl bg-white/85 dark:bg-[#070812]/85 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs transition-all">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={() => (step === 2 ? setStep(1) : navigate('/jobs'))}
              label={step === 2 ? 'Step 1' : 'Vehicles'}
            />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {step === 1 ? 'Intake & Vehicle Registration' : 'Job Checklist & Parts'}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300">
                  Step {step} of 2
                </span>
              </h1>
            </div>
          </div>
        </header>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* STEP 1: Vehicle & Customer */}
        {step === 1 ? (
          <div className="space-y-4">
            {/* Vehicle Details Card */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-6 shadow-xl space-y-4">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-500" />
                Vehicle Specifications
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Vehicle Model / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    placeholder="e.g. Fortuner / Innova"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Registration Number Plate *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(formatRegistration(e.target.value))}
                    placeholder="e.g. KL 07 CA 1234"
                    className={`${inputStyle} font-mono font-bold uppercase tracking-wider`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Vehicle Color <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="e.g. Pearl White"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <ModernDateTimePicker
                    value={expectedDeliveryDate}
                    onChange={setExpectedDeliveryDate}
                    label="Expected Delivery Date & Time (optional)"
                    placeholder="Select delivery time"
                  />
                </div>
              </div>

              {/* Photo Upload Row */}
              <div className="pt-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={camInputRef}
                  capture="environment"
                  className="hidden"
                  onChange={handleSelectPhoto}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleSelectPhoto}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => camInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-2xl glass-ghost-btn text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-500" />
                    <span>Capture Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-2xl glass-ghost-btn text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Customer Details Card */}
            <div className="rounded-3xl glass-modern-card p-4 sm:p-6 shadow-xl space-y-4">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserRound className="w-4 h-4 text-amber-500" />
                Customer Information <span className="text-xs text-slate-500 font-normal">(optional)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Owner / Driver Name"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Step 1 CTA */}
            <div className="flex justify-end pt-2 pb-8">
              <button
                type="button"
                onClick={goNext}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl glass-gold-btn text-slate-950 font-black text-xs sm:text-sm shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Checklist</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Service & Checklist */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
            {/* Catalog Items Search (Left Column) */}
            <div className="lg:col-span-7 rounded-3xl glass-modern-card p-4 sm:p-5 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Available Services & Products
                </h2>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search catalog items..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl glass-modern-input text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 p-1 bg-white/60 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10">
                {(
                  [
                    { id: 'ALL', label: 'All' },
                    { id: 'SERVICE', label: 'Services' },
                    { id: 'PRODUCT', label: 'Products' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setItemFilter(t.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      itemFilter === t.id
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {isFetching && !results.length && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex w-full items-center gap-3 rounded-2xl glass-modern-card p-3 animate-pulse"
                      >
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                          <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-white/5" />
                        </div>
                        <div className="h-7 w-7 rounded-xl bg-slate-200 dark:bg-white/10" />
                      </div>
                    ))}
                  </div>
                )}

                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openAddItemModal(item)}
                    className="w-full p-3 rounded-2xl glass-modern-card text-left transition flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400/50 active:scale-[0.99]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.itemType === 'SERVICE' ? 'Service' : `${item.stockQuantity} in stock`} · {money(item.price)}
                      </p>
                    </div>
                    <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-black">
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </button>
                ))}

                {/* Custom Item Quick Add & Duplicate Guard */}
                {noExactMatch && (
                  <div className="mt-3 rounded-2xl sm:rounded-3xl glass-modern-card p-4 sm:p-5 border-dashed border-amber-400/50 space-y-3.5">
                    {nearDuplicates.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span className="text-xs font-bold">Similar catalog item exists: “{nearDuplicates[0].item.title}”</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              openAddItemModal(nearDuplicates[0].item);
                              setQuery('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            Select Existing “{nearDuplicates[0].item.title}”
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pb-1 border-b border-slate-200/80 dark:border-white/10">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Item not found in catalog: <span className="text-amber-500 font-mono">“{query.trim()}”</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Choose how you would like to add this item:
                      </p>
                    </div>

                    {/* Option 1: Master Catalog (Permanent) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                        <PackagePlus className="w-3 h-3 text-amber-500" />
                        Option 1 · Save to Catalog (Permanent)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isQuickAdding}
                          onClick={async () => {
                            try {
                              const response = await quickAdd({ title: query.trim(), itemType: 'PRODUCT' }).unwrap();
                              openAddItemModal(response.data);
                              setQuery('');
                            } catch (err: any) {
                              setError(err?.data?.message || 'Could not add product.');
                            }
                          }}
                          className="p-2.5 rounded-xl glass-gold-btn text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>Save as Product</span>
                        </button>
                        <button
                          type="button"
                          disabled={isQuickAdding}
                          onClick={async () => {
                            try {
                              const response = await quickAdd({ title: query.trim(), itemType: 'SERVICE' }).unwrap();
                              openAddItemModal(response.data);
                              setQuery('');
                            } catch (err: any) {
                              setError(err?.data?.message || 'Could not add service.');
                            }
                          }}
                          className="p-2.5 rounded-xl glass-ghost-btn text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-500" />
                          <span>Save as Service</span>
                        </button>
                      </div>
                    </div>

                    {/* Option 2: Just for this job (One-time) */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        Option 2 · Just for This Job (One-Time)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddJustForThisJob('PRODUCT')}
                          className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-800 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>One-Time Product</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddJustForThisJob('SERVICE')}
                          className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-800 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>One-Time Service</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Checklist (Right Column) */}
            <div className="lg:col-span-5 rounded-3xl glass-modern-card p-4 sm:p-5 shadow-xl space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Job Card Checklist
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
                    {selected.length} items
                  </span>
                </div>

                {/* ── SCROLLING CONTAINER ── */}
                <div className="space-y-2 max-h-[50vh] sm:max-h-[55vh] overflow-y-auto overscroll-contain pr-1 -mr-1">
                  {selected.length === 0 ? (
                    <div className="py-12 text-center text-xs font-mono text-slate-400 space-y-1">
                      <p>No checklist items added yet</p>
                      <p className="text-[10px]">Select items from catalog on the left</p>
                    </div>
                  ) : (
                    selected.map((line, idx) => (
                      <div
                        key={`${line.item.id}-${idx}`}
                        className="p-3 rounded-2xl glass-modern-card space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{line.item.title}</p>
                              {'isCustomOnly' in line.item && line.item.isCustomOnly && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  Just this job
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              {line.item.itemType === 'SERVICE' ? 'Service' : 'Product'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelected((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quantity Counter & Rate Input */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateSelectedLine(idx, { quantityUsed: Math.max(1, line.quantityUsed - 1) })}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-slate-900 dark:text-white text-[11px]">{line.quantityUsed}</span>
                              <button
                                type="button"
                                onClick={() => updateSelectedLine(idx, { quantityUsed: line.quantityUsed + 1 })}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Price / Rate input */}
                            <div className="flex items-center gap-1 bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-lg px-2 py-0.5">
                              <span className="text-[10px] font-mono text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={line.item.price || ''}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  updateSelectedLine(idx, {
                                    item: { ...line.item, price: val } as any,
                                  });
                                }}
                                className="w-14 bg-transparent text-right font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
                              />
                            </div>
                          </div>

                          <span className="font-mono font-bold text-amber-600 dark:text-amber-300 text-xs">
                            {money((line.item.price || 0) * line.quantityUsed)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !selected.length}
                  className="w-full py-3 rounded-2xl glass-gold-btn text-slate-950 font-black text-xs sm:text-sm shadow-lg active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isLoading ? 'Creating Job Card...' : 'Create Vehicle Job Card'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Image Cropper Modal */}
      {isCropperOpen && cropImageSrc && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          imageSrc={cropImageSrc}
          onCropComplete={(croppedBase64) => {
            setThumbnailUrl(croppedBase64);
            setIsCropperOpen(false);
          }}
          onClose={() => setIsCropperOpen(false)}
        />
      )}
    </div>
  );
};
