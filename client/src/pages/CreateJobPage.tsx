import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Car,
  Check,
  ChevronRight,
  Mail,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar/Navbar';
import { useCreateJobMutation } from '../api/jobApi';
import { CatalogItem, useGetCatalogQuery, useQuickAddCatalogItemMutation } from '../api/catalogApi';

type SelectedLine = {
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
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-slate-600 dark:focus:border-amber-400';

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [createJob, { isLoading }] = useCreateJobMutation();
  const [quickAdd, { isLoading: isQuickAdding }] = useQuickAddCatalogItemMutation();

  const [step, setStep] = useState<1 | 2>(1);

  // Form State - Step 1: Vehicle & Customer
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Form State - Step 2: Catalog Checklist Selection
  const [query, setQuery] = useState('');
  const [itemFilter, setItemFilter] = useState<'ALL' | 'SERVICE' | 'PRODUCT'>('ALL');
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');

  const { data, isFetching } = useGetCatalogQuery({
    q: query,
    ...(itemFilter === 'ALL' ? {} : { itemType: itemFilter }),
  });

  const results = useMemo(
    () =>
      (data?.data || []).filter(
        (item) =>
          item.isAvailable &&
          (item.itemType === 'SERVICE' || item.trackStock === false || item.stockQuantity > 0)
      ),
    [data]
  );

  const subtotal = selected.reduce((sum, line) => sum + line.item.price * line.quantityUsed, 0);
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

  const submitJobCard = async () => {
    if (!selected.length) {
      setError('Add at least one service or spare part to create a job card.');
      return;
    }
    try {
      setError('');
      await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.replace(/\s/g, ''),
        vehicleColor: vehicleColor.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerMobile: customerMobile.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        tasks: selected.map((line) => ({
          itemId: line.item.id,
          quantityUsed: line.quantityUsed,
          discountAmount: line.discountAmount,
        })),
      }).unwrap();
      navigate('/jobs');
    } catch (err: any) {
      setError(err?.data?.message || 'Could not create job card.');
    }
  };

  const noExactMatch =
    query.trim() &&
    !results.some((item) => item.title.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
        {/* Page Top Controls */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate('/jobs'))}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job Cards
          </button>

          <span className="rounded-full bg-slate-200/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Step {step} of 2
          </span>
        </header>

        {/* Page Title */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Garage Workspace
          </p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Create New Job Card
          </h1>
        </div>

        {/* Progress Navigation Tabs */}
        <nav className="mb-8 flex gap-3" aria-label="Create job progress">
          {(
            [
              { number: 1, label: 'Vehicle & Customer Details', sub: 'Model, reg no, owner' },
              { number: 2, label: 'Service Checklist', sub: 'Parts and services' },
            ] as const
          ).map((item) => (
            <button
              key={item.number}
              onClick={() =>
                item.number === 1 || (vehicleName && vehicleNumber) ? setStep(item.number) : undefined
              }
              className={`flex flex-1 items-center gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                step === item.number
                  ? 'border-amber-400 bg-amber-500/10 text-slate-900 dark:border-amber-400 dark:bg-amber-400/15 dark:text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                  step === item.number
                    ? 'bg-amber-500 text-slate-950 dark:bg-amber-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {item.number}
              </span>
              <span className="min-w-0">
                <b className="block text-sm font-bold truncate">{item.label}</b>
                <small className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                  {item.sub}
                </small>
              </span>
            </button>
          ))}
        </nav>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* STEP 1: Vehicle & Customer Information */}
        {step === 1 ? (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              {/* Vehicle Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300">
                    <Car className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Vehicle Details
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Identify vehicle model and registration.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Colour / Variant <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      className={inputStyle}
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="e.g. Pearl White, BS6 Diesel"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Information Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 dark:bg-blue-400/15 dark:text-blue-300">
                    <UserRound className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Customer Information
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Optional contact info for billing & notifications.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Mobile Phone Number
                    </label>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800">
                      <span className="flex items-center border-r border-slate-200 px-3.5 text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        +91
                      </span>
                      <input
                        className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm text-slate-900 outline-none dark:text-white"
                        inputMode="numeric"
                        maxLength={10}
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Email Address <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        className={`${inputStyle} pl-10`}
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
            <footer className="mt-8 flex justify-end border-t border-slate-200 pt-6 dark:border-slate-800">
              <button
                onClick={goNext}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-95"
              >
                <span>Continue to Checklist</span>
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </footer>
          </>
        ) : (
          /* STEP 2: Service & Spare Parts Checklist */
          <section className="grid gap-6 lg:grid-cols-12">
            {/* Catalog Search & Filter Left Column */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Wrench className="h-5 w-5 text-amber-500" />
                  Find Services & Parts
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Search inventory items to append to this job card.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  className={`${inputStyle} pl-10 pr-9`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search catalog by name or code..."
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
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
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
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
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {isFetching && (
                  <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Searching catalog...
                  </p>
                )}

                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openAddItemModal(item)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 p-3 text-left transition hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-800 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/5"
                  >
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="h-12 w-14 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <Wrench className="h-5 w-5" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </b>
                      <small className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {item.itemType === 'SERVICE' ? 'Service Item' : `${item.stockQuantity} in stock`} ·{' '}
                        {money(item.price)}
                      </small>
                    </span>

                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                ))}

                {/* Custom Item Quick Add */}
                {noExactMatch && (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-400/5">
                    <b className="text-sm font-bold text-slate-900 dark:text-white">
                      Can’t find “{query.trim()}”?
                    </b>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
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
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                    >
                      <PackagePlus className="h-4 w-4" />
                      {isQuickAdding ? 'Adding...' : 'Add Custom Service'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Checklist Summary Right Column */}
            <aside className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Job Card Checklist
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Review assigned tasks and pricing.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {selected.length} items
                </span>
              </div>

              {/* Selected Items List */}
              <div className="min-h-[220px] max-h-[360px] flex-1 space-y-2.5 overflow-y-auto p-4">
                {selected.length ? (
                  selected.map((line, index) => (
                    <article
                      key={`${line.item.id}-${index}`}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="flex gap-3">
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                            {line.item.title}
                          </b>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {money(line.item.price)} each
                          </span>
                        </div>
                        <button
                          onClick={() => setSelected((lines) => lines.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between rounded-xl bg-white p-1 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                          <button
                            onClick={() =>
                              updateSelectedLine(index, {
                                quantityUsed: Math.max(1, line.quantityUsed - 1),
                              })
                            }
                            className="p-1.5 text-slate-600 dark:text-slate-300"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <b className="text-sm font-black text-slate-900 dark:text-white">
                            {line.quantityUsed}
                          </b>
                          <button
                            onClick={() =>
                              updateSelectedLine(index, {
                                quantityUsed: line.quantityUsed + 1,
                              })
                            }
                            className="p-1.5 text-slate-600 dark:text-slate-300"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={line.item.price * line.quantityUsed}
                            value={line.discountAmount || ''}
                            onChange={(e) =>
                              updateSelectedLine(index, {
                                discountAmount: Math.max(0, Number(e.target.value || 0)),
                              })
                            }
                            placeholder="Discount"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-6 pr-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <p className="mt-2.5 text-right text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {money(Math.max(0, line.item.price * line.quantityUsed - line.discountAmount))}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="flex h-full min-h-44 items-center justify-center text-center text-xs text-slate-400 dark:text-slate-500">
                    Selected services and parts will appear here.
                  </div>
                )}
              </div>

              {/* Price Calculation & Submit Button */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-1.5 text-sm">
                  <p className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <b className="text-slate-900 dark:text-white">{money(subtotal)}</b>
                  </p>
                  <p className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Total Discount</span>
                    <b>-{money(totalDiscount)}</b>
                  </p>
                  <p className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900 dark:border-slate-800 dark:text-white">
                    <span>Estimated Total</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {money(Math.max(0, subtotal - totalDiscount))}
                    </span>
                  </p>
                </div>

                <button
                  disabled={!selected.length || isLoading}
                  onClick={submitJobCard}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50"
                >
                  <Check className="h-4.5 w-4.5" />
                  {isLoading ? 'Creating Job Card...' : 'Complete & Save Job Card'}
                </button>
              </div>
            </aside>
          </section>
        )}
      </main>

      {/* Modal: Configure Item Quantity & Discount */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <section
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Add to Job Checklist
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {editing.title}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {money(editing.price)} each
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Quantity
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 p-1 dark:border-slate-700">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <b className="text-sm font-black text-slate-900 dark:text-white">{quantity}</b>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Discount (₹)
                <input
                  type="number"
                  min="0"
                  max={editing.price * quantity}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value || 0)))}
                  placeholder="0"
                  className={`${inputStyle} mt-1.5 py-2`}
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/15">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Effective Total
              </span>
              <b className="mt-0.5 block text-2xl font-black text-emerald-800 dark:text-emerald-200">
                {money(Math.max(0, editing.price * quantity - discount))}
              </b>
            </div>

            <button
              onClick={handleAddItemToChecklist}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-extrabold text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
            >
              <Plus className="h-4.5 w-4.5" />
              Add to Checklist
            </button>
          </section>
        </div>
      )}
    </div>
  );
};
