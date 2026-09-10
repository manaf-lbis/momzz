import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Receipt, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import { CatalogItem, useCreateSaleMutation, useGetCatalogQuery } from '../../catalog/api/catalogApi';
import { advancedSearch } from '../../../shared/utils/searchAlgorithm';

type CartLine = { item: CatalogItem; quantity: number };
type Filter = 'ALL' | 'SERVICE' | 'PRODUCT' | 'FAST';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export const SalesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const { data, isFetching } = useGetCatalogQuery({
    q: search,
    ...(filter === 'SERVICE' || filter === 'PRODUCT' ? { itemType: filter } : {}),
  });
  const [createSale, { isLoading }] = useCreateSaleMutation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('pos-search')?.focus();
      }
      if (event.key === 'Escape') {
        setMobileCartOpen(false);
        setDiscountOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const products = useMemo(() => {
    const raw = (data?.data || []).filter((item) => {
      const available =
        item.isAvailable &&
        (item.itemType === 'SERVICE' || item.trackStock === false || item.stockQuantity > 0);
      return (
        available &&
        (filter !== 'FAST' ||
          (item.itemType === 'PRODUCT' &&
            item.stockQuantity > 0 &&
            item.stockQuantity <= Math.max(5, item.minimumStockQuantity || 0)))
      );
    });
    if (!search.trim()) return raw;
    return advancedSearch<CatalogItem>(
      raw,
      search,
      {
        getTitle: (item) => item.title,
        getSku: (item) => item.sku,
        getCategory: (item) => item.category?.name,
        getDescription: (item) => item.description,
      },
      140
    );
  }, [data, filter, search]);

  const subtotal = useMemo(
    () => cart.reduce((total, line) => total + line.item.price * line.quantity, 0),
    [cart]
  );
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  const tax = 0;
  const total = subtotal - safeDiscount + tax;
  const itemCount = cart.reduce((count, line) => count + line.quantity, 0);

  const add = (item: CatalogItem) =>
    setCart((lines) => {
      const max = item.itemType === 'PRODUCT' && item.trackStock !== false ? item.stockQuantity : 99;
      const found = lines.find((line) => line.item.id === item.id);
      return found
        ? lines.map((line) =>
            line.item.id === item.id ? { ...line, quantity: Math.min(max, line.quantity + 1) } : line
          )
        : [...lines, { item, quantity: 1 }];
    });

  const quantity = (id: string, delta: number) =>
    setCart((lines) =>
      lines.map((line) => {
        if (line.item.id !== id) return line;
        const max = line.item.itemType === 'PRODUCT' && line.item.trackStock !== false ? line.item.stockQuantity : 99;
        return { ...line, quantity: Math.max(1, Math.min(max, line.quantity + delta)) };
      })
    );

  const remove = (id: string) => setCart((lines) => lines.filter((line) => line.item.id !== id));

  const checkout = async () => {
    try {
      const result = await createSale({
        customerName,
        customerMobile,
        items: cart.map((line, index) => ({
          itemId: line.item.id,
          quantity: line.quantity,
          discountAmount: index === 0 ? safeDiscount : 0,
        })),
      }).unwrap();
      setReceipt(result.data);
      setCart([]);
      setCustomerName('');
      setCustomerMobile('');
      setDiscount(0);
      setMobileCartOpen(false);
    } catch (error: any) {
      alert(error?.data?.message || 'Could not complete the sale.');
    }
  };

  const Checkout = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`pos-checkout flex min-h-0 flex-col ${
        mobile
          ? 'h-[85dvh] rounded-t-3xl glass-modern-panel shadow-2xl'
          : 'h-full border-l border-slate-200/80 dark:border-white/[0.08] glass-modern-panel'
      }`}
    >
      {/* Checkout Header */}
      <div className="border-b border-slate-200/80 dark:border-white/[0.08] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              POS Checkout
            </p>
            <h2 className="mt-0.5 text-xl font-black text-slate-900 dark:text-white">Current Sale</h2>
          </div>
          {mobile && (
            <button
              onClick={() => setMobileCartOpen(false)}
              className="rounded-full bg-slate-100 dark:bg-white/10 p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-400/30">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Customer Details Inputs */}
        <div className="mt-4 space-y-2.5">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name (optional)"
            className="w-full rounded-xl glass-modern-input px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition"
          />
        </div>
      </div>

      {/* Cart Items List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Cart is empty</p>
            <p className="mt-1 text-xs text-slate-400 font-mono">Click products or services to add them to this sale.</p>
          </div>
        ) : (
          cart.map((line) => (
            <div
              key={line.item.id}
              className="flex items-center justify-between gap-3 rounded-2xl glass-modern-card p-3 shadow-2xs"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">{line.item.title}</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {money(line.item.price)} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-0.5">
                  <button
                    onClick={() => quantity(line.item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black font-mono text-slate-900 dark:text-white">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => quantity(line.item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button
                  onClick={() => remove(line.item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout Action */}
      <div className="border-t border-slate-200/80 dark:border-white/[0.08] p-5 pb-8">
        <div className="space-y-2 text-sm">
          <p className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <b className="text-slate-900 dark:text-white">{money(subtotal)}</b>
          </p>

          <button
            onClick={() => setDiscountOpen(true)}
            className="flex w-full justify-between text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
          >
            <span className="font-bold">Discount {safeDiscount ? '(Edit)' : '(Apply)'}</span>
            <b className="font-extrabold">-{money(safeDiscount)}</b>
          </button>

          <div className="my-3 border-t border-slate-200/60 dark:border-white/[0.06]" />

          <p className="flex justify-between text-xl font-black text-slate-900 dark:text-white">
            <span>Total Payable</span>
            <span className="text-amber-600 dark:text-amber-300 font-mono">{money(total)}</span>
          </p>
        </div>

        <button
          disabled={!cart.length || isLoading}
          onClick={checkout}
          className="mt-5 w-full rounded-xl glass-gold-btn py-3.5 text-sm font-black text-slate-950 shadow-lg transition hover:opacity-95 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? 'Processing Sale...' : `Complete Sale · ${money(total)}`}
        </button>
      </div>
    </aside>
  );

  const chips: Array<{ id: Filter; label: string }> = [
    { id: 'ALL', label: 'All Items' },
    { id: 'SERVICE', label: 'Services' },
    { id: 'PRODUCT', label: 'Products' },
    { id: 'FAST', label: 'Low Stock' },
  ];

  return (
    <div className="flex h-screen flex-col glass-canvas overflow-hidden text-slate-900 dark:text-white">
      <Navbar glass />

      <main className="app-container flex min-h-0 w-full flex-1">
        {/* Catalog Section */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Header & Filter Controls */}
          <div className="border-b border-slate-200/80 bg-white/95 px-4 py-4 dark:border-white/[0.08] dark:bg-[#080811]/90 sm:px-6 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <BackButton to="/dashboard" label="Dashboard" />
                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 shrink-0 hidden xs:block" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                    Point of Sale
                  </p>
                  <h1 className="mt-0.5 text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    Direct Counter Sales
                  </h1>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0">
                <b className="block text-slate-900 dark:text-white">{itemCount} items in cart</b>
                <span className="hidden sm:inline">Ready to checkout</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mt-4">
              <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                id="pos-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, services, or parts..."
                className="w-full rounded-xl glass-modern-input py-2.5 pl-10 pr-24 text-sm text-slate-900 dark:text-white outline-none font-mono"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                ⌘K
              </kbd>
            </div>

            {/* Category Chips */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    filter === chip.id
                      ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                      : 'glass-ghost-btn text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 pb-40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Catalog Items
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isFetching ? 'Searching catalog...' : `${products.length} available items`}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {isFetching && !products.length
                ? [...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="relative flex flex-col overflow-hidden rounded-2xl glass-modern-card shadow-2xs"
                    >
                      <div className="aspect-[4/3] w-full bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                      <div className="p-3.5 space-y-3">
                        <div className="h-4 w-3/4 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                        <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-white/5 pt-2">
                          <div className="h-3 w-16 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                          <div className="h-5 w-14 rounded bg-slate-200/60 dark:bg-white/5 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))
                : products.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => add(item)}
                      className="group relative flex flex-col overflow-hidden rounded-2xl glass-modern-card text-left shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-xl active:scale-[0.98] cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-white/5">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600">
                            <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
                          </div>
                        )}
                        <span
                          className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${
                            item.itemType === 'SERVICE'
                              ? 'bg-violet-600/90 text-white'
                              : 'bg-amber-400/90 text-slate-950'
                          }`}
                        >
                          {item.itemType}
                        </span>
                      </div>

                      <div className="p-3.5 flex flex-1 flex-col justify-between">
                        <b className="block line-clamp-1 text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </b>

                        <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-200/60 dark:border-white/[0.06] pt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.itemType === 'PRODUCT' ? `${item.stockQuantity} in stock` : 'Service Item'}
                          </span>
                          <strong className="text-base font-black text-slate-900 dark:text-white">
                            {money(item.price)}
                          </strong>
                        </div>
                      </div>
                    </button>
                  ))}
            </div>

            {!isFetching && !products.length && (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No catalog items match your search.
              </div>
            )}
          </div>
        </section>

        {/* Desktop Checkout Panel */}
        <div className="hidden w-[360px] lg:w-[400px] xl:w-[420px] shrink-0 lg:block">
          <Checkout />
        </div>
      </main>

      {/* Mobile Cart Trigger Button - Elevated above QuickAccessDock */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 inset-x-3 z-40 lg:hidden">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl glass-gold-btn px-5 py-3.5 font-black text-slate-950 shadow-2xl active:scale-95 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            </div>
            <span>View Cart · {money(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Sheet Modal */}
      {mobileCartOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-2 backdrop-blur-md lg:hidden"
          onClick={() => setMobileCartOpen(false)}
        >
          <div className="w-full" onClick={(event) => event.stopPropagation()}>
            <Checkout mobile />
          </div>
        </div>
      )}

      {/* Apply Discount Modal */}
      {discountOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => setDiscountOpen(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setDiscountOpen(false);
            }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl glass-modern-panel p-6 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Apply Sale Discount</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Discount applies to the complete sale subtotal.
              </p>
            </div>

            {/* Quick Discount Presets */}
            <div className="flex gap-2">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDiscount(preset)}
                  className="flex-1 py-1.5 rounded-xl glass-ghost-btn text-xs font-mono font-bold hover:border-amber-400"
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Custom Amount (₹)
              <input
                autoFocus
                type="number"
                min="0"
                max={subtotal}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value || 0)))}
                className="mt-2 w-full rounded-xl glass-modern-input p-3 text-base font-bold text-slate-900 dark:text-white outline-none"
              />
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDiscount(0);
                  setDiscountOpen(false);
                }}
                className="flex-1 rounded-xl glass-ghost-btn py-3 text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                Clear
              </button>
              <button className="flex-1 rounded-xl glass-gold-btn py-3 text-sm font-black text-slate-950">
                Apply
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sale Receipt Confirmation Modal */}
      {receipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl glass-modern-panel p-7 text-center shadow-2xl space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Receipt className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Payment Recorded
            </p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Sale Completed</h2>
            <p className="text-3xl font-black text-amber-500 dark:text-amber-300">{money(receipt.grandTotal)}</p>
            <button
              onClick={() => setReceipt(null)}
              className="mt-4 w-full rounded-xl glass-gold-btn py-3.5 font-black text-slate-950 shadow-md cursor-pointer"
            >
              Start New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
