import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
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
  Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import {
  useGetJobCardsQuery,
  useGetJobCardByIdQuery,
  useUpdateJobMutation,
  useAddTaskMutation,
  useAddInventoryTaskMutation,
  useDeleteTaskMutation,
  JobCardData,
  TaskItem,
} from '../../jobs/api/jobApi';
import { CatalogItem, useGetCatalogQuery, useQuickAddCatalogItemMutation } from '../../catalog/api/catalogApi';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { advancedSearch, findDuplicateCandidates, normalizeSearchText } from '../../../shared/utils/searchAlgorithm';
import { toDateTimeLocal, getDeliveryPreset } from '../../../shared/utils/dateUtils';
import { ModernDateTimePicker } from '../../../shared/components/common/ModernDateTimePicker';

type SelectedLine = {
  id?: string;
  item: CatalogItem;
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
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:px-3.5 sm:py-3 text-xs sm:text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-600 dark:focus:border-amber-400';

export const EditJobPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: jobResponse, isLoading: isSingleLoading } = useGetJobCardByIdQuery(id!, { skip: !id });
  const { data: listResponse, isLoading: isListLoading } = useGetJobCardsQuery(undefined, { skip: !!jobResponse?.data });

  const rawList = listResponse?.data;
  const jobsList: JobCardData[] = Array.isArray(rawList) ? rawList : rawList?.jobs || [];
  const fallbackJob = jobsList.find((j: JobCardData) => j.id === id || j._id === id);

  const currentJob: JobCardData | undefined = jobResponse?.data || fallbackJob;
  const isJobsLoading = (isSingleLoading && !currentJob) || (isListLoading && !currentJob);

  const [updateJob, { isLoading: isUpdatingJob }] = useUpdateJobMutation();
  const [addTask] = useAddTaskMutation();
  const [addInventoryTask] = useAddInventoryTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [quickAdd, { isLoading: isQuickAdding }] = useQuickAddCatalogItemMutation();

  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State - Step 1: Vehicle & Customer
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Form State - Step 2: Catalog Checklist Selection
  const [query, setQuery] = useState('');
  const [itemFilter, setItemFilter] = useState<'ALL' | 'SERVICE' | 'PRODUCT'>('ALL');
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [initialTaskIds, setInitialTaskIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');

  // Prepopulate form when job is loaded
  useEffect(() => {
    if (!currentJob) return;

    setVehicleName(currentJob.vehicleName || '');
    setVehicleNumber(currentJob.vehicleNumber || '');
    setVehicleColor(currentJob.vehicleColor || '');
    setExpectedDeliveryDate(toDateTimeLocal(currentJob.expectedDeliveryDate));
    setCustomerName(currentJob.customerName || '');
    setCustomerMobile(currentJob.customerMobile || '');
    setCustomerEmail(currentJob.customerEmail || '');

    if (currentJob.tasks && currentJob.tasks.length > 0) {
      const taskIds = currentJob.tasks.map((t: TaskItem) => t.id || t._id!);
      setInitialTaskIds(taskIds);

      const mappedSelected: SelectedLine[] = currentJob.tasks.map((t: TaskItem) => {
        const itemObj: Partial<CatalogItem> = t.inventoryItem
          ? {
              id: t.inventoryItem.id || t.inventoryItem._id || t.id || t._id!,
              _id: t.inventoryItem._id || t.inventoryItem.id || t.id || t._id!,
              title: t.inventoryItem.title || t.title,
              itemType: t.inventoryItem.itemType || t.itemType || 'SERVICE',
              price: t.unitPrice || 0,
              thumbnailUrl: t.inventoryItem.thumbnailUrl || '',
              images: [],
              stockQuantity: 999,
              isAvailable: true,
            }
          : {
              id: t.id || t._id!,
              _id: t.id || t._id!,
              title: t.title,
              itemType: t.itemType || 'SERVICE',
              price: t.unitPrice || 0,
              thumbnailUrl: '',
              images: [],
              stockQuantity: 999,
              isAvailable: true,
            };

        return {
          id: t.id || t._id,
          item: itemObj as CatalogItem,
          quantityUsed: t.quantityUsed || 1,
          discountAmount: t.discountAmount || 0,
        };
      });

      setSelected(mappedSelected);
    }
  }, [currentJob]);

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

  const subtotal = selected.reduce((sum, line) => sum + (line.item.price || 0) * line.quantityUsed, 0);
  const totalDiscount = selected.reduce((sum, line) => sum + line.discountAmount, 0);

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

  const openAddItemModal = (item: CatalogItem) => {
    setEditing(item);
    setQuantity(1);
    setDiscount(0);
  };

  const handleAddItemToChecklist = () => {
    if (!editing) return;
    const max =
      editing.itemType === 'PRODUCT' && editing.trackStock !== false ? editing.stockQuantity : 999;
    const qty = Math.max(1, Math.min(max, quantity));

    setSelected((lines) => [
      ...lines,
      {
        item: editing,
        quantityUsed: qty,
        discountAmount: Math.min(editing.price * qty, Math.max(0, discount)),
      },
    ]);
    setEditing(null);
    setQuery('');
  };

  const updateSelectedLine = (index: number, change: Partial<SelectedLine>) =>
    setSelected((lines) =>
      lines.map((line, i) => (i === index ? { ...line, ...change } : line))
    );

  const submitJobCardEdit = async () => {
    if (!currentJob) return;
    if (!selected.length) {
      setError('Add at least one service or product to save the job card.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const jobCardId = currentJob.id || currentJob._id!;

      // 1. Update Core Vehicle & Customer info
      await updateJob({
        jobCardId,
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.replace(/\s/g, ''),
        vehicleColor: vehicleColor.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerMobile: customerMobile.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
      }).unwrap();

      // 2. Diff and synchronize tasks
      const currentSelectedTaskIds = new Set(selected.map((s) => s.id).filter(Boolean) as string[]);
      const tasksToDelete = initialTaskIds.filter((tId) => !currentSelectedTaskIds.has(tId));

      // Remove deleted tasks
      for (const tId of tasksToDelete) {
        try {
          await deleteTask({ taskId: tId }).unwrap();
        } catch (e) {
          console.error('Failed to remove task', tId, e);
        }
      }

      // Add newly added tasks (those without an existing task id)
      const newItemsToAdd = selected.filter((s) => !s.id);
      for (const newLine of newItemsToAdd) {
        try {
          if (newLine.item.id && newLine.item.price !== undefined) {
            await addInventoryTask({
              jobCardId,
              itemId: newLine.item.id,
              quantityUsed: newLine.quantityUsed,
              discountAmount: newLine.discountAmount,
            }).unwrap();
          } else {
            await addTask({
              jobCardId,
              title: newLine.item.title,
            }).unwrap();
          }
        } catch (e) {
          console.error('Failed to add task item', newLine, e);
        }
      }

      navigate(`/jobs/${jobCardId}`);
    } catch (err: any) {
      setError(err?.data?.message || 'Could not update job card.');
    } finally {
      setIsSaving(false);
    }
  };

  const noExactMatch =
    query.trim() &&
    !results.some((item) => normalizeSearchText(item.title) === normalizeSearchText(query));

  if (isJobsLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Navbar />
        <PageShimmer label="Loading job card details..." />
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-6 industrial-card rounded-2xl text-center space-y-4">
          <p className="font-bold text-red-500 uppercase">Job Card Not Found</p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
          >
            ← Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[260px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.04)_0%,transparent_70%)]" />
      </div>

      <Navbar glass />

      <main className="w-full max-w-[1140px] mx-auto px-3 py-4 sm:px-6 sm:py-8 overflow-x-hidden">
        {/* Page Top Controls */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate(`/jobs/${id}`))}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 transition hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Back to Job Details</span>
          </button>

          <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] sm:text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Step {step} of 2
          </span>
        </header>

        {/* Page Title */}
        <div className="mb-4 sm:mb-6">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Garage Workspace
          </p>
          <h1 className="mt-0.5 text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Edit Job Card
          </h1>
        </div>

        {/* Progress Navigation Tabs */}
        <nav className="mb-6 sm:mb-8 flex gap-2 sm:gap-3" aria-label="Create job progress">
          {(
            [
              { number: 1, label: 'Vehicle & Customer', sub: 'Model, reg no, owner' },
              { number: 2, label: 'Service Checklist', sub: 'Services & products' },
            ] as const
          ).map((item) => (
            <button
              key={item.number}
              onClick={() =>
                item.number === 1 || (vehicleName && vehicleNumber) ? setStep(item.number) : undefined
              }
              className={`flex flex-1 items-center gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition-all ${
                step === item.number
                  ? 'border-amber-400 bg-amber-500/10 text-slate-900 dark:border-amber-400 dark:bg-amber-400/15 dark:text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <span
                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black ${
                  step === item.number
                    ? 'bg-amber-500 text-slate-950 dark:bg-amber-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {item.number}
              </span>
              <span className="min-w-0">
                <b className="block text-xs sm:text-sm font-bold truncate">{item.label}</b>
                <small className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                  {item.sub}
                </small>
              </span>
            </button>
          ))}
        </nav>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 p-3 sm:p-4 text-xs sm:text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* STEP 1: Vehicle & Customer Information */}
        {step === 1 ? (
          <>
            <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Vehicle Card */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300">
                    <Car className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Vehicle Details
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      Identify vehicle model and registration.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Vehicle Model *
                    </label>
                    <input
                      className={inputStyle}
                      value={vehicleName}
                      onChange={(e) => setVehicleName(e.target.value)}
                      placeholder="e.g. Honda City, Swift Dzire, Classic 350"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Registration Number *
                    </label>
                    <input
                      className={`${inputStyle} font-mono uppercase tracking-wider`}
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(formatRegistration(e.target.value))}
                      placeholder="e.g. KL 01 AB 1234"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Colour / Variant <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      className={inputStyle}
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="e.g. Pearl White, BS6 Diesel"
                    />
                  </div>

                  {/* Modern Expected Delivery Date & Time Calendar */}
                  <ModernDateTimePicker
                    value={expectedDeliveryDate}
                    onChange={setExpectedDeliveryDate}
                    label="Expected Delivery Date & Time"
                    placeholder="Click to pick delivery date & time"
                  />
                </div>
              </div>

              {/* Customer Information Card */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-500 dark:bg-blue-400/15 dark:text-blue-300">
                    <UserRound className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Customer Information
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      Optional contact info for billing & notifications.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Customer Name
                    </label>
                    <input
                      className={inputStyle}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer full name"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Mobile Phone Number
                    </label>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800">
                      <span className="flex items-center border-r border-slate-200 px-3 text-xs sm:text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        +91
                      </span>
                      <input
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 outline-none dark:text-white"
                        inputMode="numeric"
                        maxLength={10}
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Email Address <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        className={`${inputStyle} pl-9 sm:pl-10`}
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="customer@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Step Actions */}
            <footer className="mt-6 sm:mt-8 flex justify-end border-t border-slate-200 pt-4 sm:pt-6 dark:border-slate-800">
              <button
                onClick={goNext}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-95"
              >
                <span>Continue to Checklist</span>
                <ChevronRight className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </button>
            </footer>
          </>
        ) : (
          /* STEP 2: Service & Product Checklist */
          <section className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-12">
            {/* Catalog Search & Filter Left Column */}
            <div className="w-full lg:col-span-7 rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4 sm:space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  Find Services & Products
                </h2>
                <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Search inventory items to append to this job card.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  className={`${inputStyle} pl-9 sm:pl-10 pr-8 sm:pr-9`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search catalog by name or code..."
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {(
                  [
                    { id: 'ALL', label: 'All Items' },
                    { id: 'SERVICE', label: 'Services' },
                    { id: 'PRODUCT', label: 'Products' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setItemFilter(t.id)}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] sm:text-xs font-bold transition ${
                      itemFilter === t.id
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-amber-400 dark:text-slate-950'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[320px] sm:max-h-[440px] overflow-y-auto pr-1 -mr-1">
                {isFetching && !results.length && (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex w-full items-center gap-3 rounded-xl sm:rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 dark:border-slate-800"
                      >
                        <div className="h-10 w-12 sm:h-12 sm:w-14 rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                          <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        </div>
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      </div>
                    ))}
                  </div>
                )}

                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openAddItemModal(item)}
                    className="flex w-full items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 text-left transition hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-800 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/5"
                  >
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="h-10 w-12 sm:h-12 sm:w-14 rounded-lg sm:rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="flex h-10 w-12 sm:h-12 sm:w-14 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </b>
                      <small className="mt-0.5 block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {item.itemType === 'SERVICE' ? 'Service Item' : `${item.stockQuantity} in stock`} ·{' '}
                        {money(item.price)}
                      </small>
                    </span>

                    <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500 text-white shadow-sm">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                  </button>
                ))}

                {/* Custom Item Quick Add & Duplicate Guard */}
                {noExactMatch && (
                  <div className="rounded-xl sm:rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-3 sm:p-4 dark:border-amber-500/30 dark:bg-amber-400/5">
                    {nearDuplicates.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                          <b className="text-xs sm:text-sm font-bold">
                            Similar item found: “{nearDuplicates[0].item.title}”
                          </b>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                          An item with a very similar name already exists. Avoid creating duplicate items!
                        </p>
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openAddItemModal(nearDuplicates[0].item)}
                            className="inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Select Existing “{nearDuplicates[0].item.title}”
                          </button>
                          <button
                            type="button"
                            disabled={isQuickAdding}
                            onClick={async () => {
                              try {
                                const response = await quickAdd({ title: query.trim() }).unwrap();
                                openAddItemModal(response.data);
                              } catch (err: any) {
                                setError(err?.data?.message || 'Could not add custom service.');
                              }
                            }}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                          >
                            {isQuickAdding ? 'Adding...' : 'Add as new item anyway'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <b className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Can’t find “{query.trim()}”?
                        </b>
                        <p className="mt-0.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                          Add a custom service on the fly; details can be refined later.
                        </p>
                        <button
                          disabled={isQuickAdding}
                          onClick={async () => {
                            try {
                              const response = await quickAdd({ title: query.trim() }).unwrap();
                              openAddItemModal(response.data);
                            } catch (err: any) {
                              setError(err?.data?.message || 'Could not add custom service.');
                            }
                          }}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          {isQuickAdding ? 'Adding...' : 'Add Custom Service'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Checklist Summary Right Column */}
            <aside className="w-full lg:col-span-5 flex flex-col rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Job Card Checklist
                  </h2>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Review assigned tasks and pricing.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {selected.length} items
                </span>
              </div>

              {/* Selected Items List */}
              <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4 max-h-[280px] sm:max-h-[360px]">
                {selected.length ? (
                  selected.map((line, index) => (
                    <article
                      key={`${line.item.id}-${index}`}
                      className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2.5 sm:p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="flex gap-2">
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {line.item.title}
                          </b>
                          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                            {money(line.item.price || 0)} each
                          </span>
                        </div>
                        <button
                          onClick={() => setSelected((lines) => lines.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-600 dark:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between rounded-lg sm:rounded-xl bg-white p-1 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          <button
                            onClick={() =>
                              updateSelectedLine(index, {
                                quantityUsed: Math.max(1, line.quantityUsed - 1),
                              })
                            }
                            className="p-1 text-slate-600 dark:text-slate-300"
                          >
                            <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <b className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {line.quantityUsed}
                          </b>
                          <button
                            onClick={() =>
                              updateSelectedLine(index, {
                                quantityUsed: line.quantityUsed + 1,
                              })
                            }
                            className="p-1 text-slate-600 dark:text-slate-300"
                          >
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                        </div>

                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={(line.item.price || 0) * line.quantityUsed}
                            value={line.discountAmount || ''}
                            onChange={(e) =>
                              updateSelectedLine(index, {
                                discountAmount: Math.max(0, Number(e.target.value || 0)),
                              })
                            }
                            placeholder="Discount"
                            className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-white py-1.5 pl-5 pr-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-right text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {money(Math.max(0, (line.item.price || 0) * line.quantityUsed - line.discountAmount))}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="flex h-full min-h-36 items-center justify-center text-center text-xs text-slate-400 dark:text-slate-500">
                    Selected services and products will appear here.
                  </div>
                )}
              </div>

              {/* Price Calculation & Save Button */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <p className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <b className="text-slate-900 dark:text-white">{money(subtotal)}</b>
                  </p>
                  <p className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Total Discount</span>
                    <b>-{money(totalDiscount)}</b>
                  </p>
                  <p className="mt-2.5 flex justify-between border-t border-slate-200 pt-2.5 text-base sm:text-lg font-black text-slate-900 dark:border-slate-800 dark:text-white">
                    <span>Estimated Total</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {money(Math.max(0, subtotal - totalDiscount))}
                    </span>
                  </p>
                </div>

                <button
                  disabled={!selected.length || isSaving || isUpdatingJob}
                  onClick={submitJobCardEdit}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isSaving || isUpdatingJob ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      <span>Save Job Card Changes</span>
                    </>
                  )}
                </button>
              </div>
            </aside>
          </section>
        )}
      </main>

      {/* Modal: Configure Item Quantity & Discount */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <section
            className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Add to Job Checklist
                </p>
                <h2 className="mt-0.5 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {editing.title}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {money(editing.price)} each
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full bg-slate-100 p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Quantity
                <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 p-1 dark:border-slate-700">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <b className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{quantity}</b>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </label>

              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Discount (₹)
                <input
                  type="number"
                  min="0"
                  max={editing.price * quantity}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value || 0)))}
                  placeholder="0"
                  className={`${inputStyle} mt-1 py-2 text-xs`}
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl sm:rounded-2xl bg-emerald-50 p-3 sm:p-4 dark:bg-emerald-500/15">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Effective Total
              </span>
              <b className="mt-0.5 block text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-200">
                {money(Math.max(0, editing.price * quantity - discount))}
              </b>
            </div>

            <button
              onClick={handleAddItemToChecklist}
              className="mt-4 sm:mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs sm:text-sm font-extrabold text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
            >
              <Plus className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              Add to Checklist
            </button>
          </section>
        </div>
      )}
    </div>
  );
};
