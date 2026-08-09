import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Receipt, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { Navbar } from '../components/navbar/Navbar';
import { CatalogItem, useCreateSaleMutation, useGetCatalogQuery } from '../api/catalogApi';

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
    return (data?.data || []).filter((item) => {
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
  }, [data, filter]);

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
      className={`pos-checkout flex min-h-0 flex-col bg-white dark:bg-slate-900 ${
        mobile
          ? 'h-[85dvh] rounded-t-3xl border-t border-slate-200 dark:border-slate-800'
          : 'h-full border-l border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Checkout Header */}
      <div className="border-b border-slate-100 p-5 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              POS Checkout
            </p>
            <h2 className="mt-0.5 text-xl font-black text-slate-900 dark:text-white">Current Sale</h2>
          </div>
          {mobile && (
            <button
              onClick={() => setMobileCartOpen(false)}
              className="rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Customer Details Inputs */}
        <div className="mt-4 space-y-2.5">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name (optional)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-amber-400"
          />
          <input
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            placeholder="Customer Mobile (optional)"
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-amber-400"
          />
        </div>
      </div>

      {/* Cart Items Scroll Area */}
      <div className="pos-cart-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
        {cart.length ? (
          cart.map((line) => (
            <article
              key={line.item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-xs dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="min-w-0">
                <b className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                  {line.item.title}
                </b>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  {money(line.item.price)} each
                </span>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center rounded-xl bg-white p-1 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <button
                  onClick={() => quantity(line.item.id, -1)}
                  aria-label="Decrease quantity"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-extrabold text-slate-900 dark:text-white">
                  {line.quantity}
                </span>
                <button
                  onClick={() => quantity(line.item.id, 1)}
                  aria-label="Increase quantity"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Line Price & Remove */}
              <div className="text-right">
                <b className="block text-sm font-extrabold text-slate-900 dark:text-white">
                  {money(line.item.price * line.quantity)}
                </b>
                <button
                  onClick={() => remove(line.item.id)}
                  aria-label={`Remove ${line.item.title}`}
                  className="mt-1 text-red-500 hover:text-red-600 dark:text-red-400"
                >
                  <Trash2 className="ml-auto h-4 w-4" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/40 px-5 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Your Cart is Empty</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select items from the catalog on the left to begin direct sale checkout.
            </p>
          </div>
        )}
      </div>

      {/* Cart Summary & Checkout Action */}
      <div className="border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2 text-sm">
          <p className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <b className="text-slate-900 dark:text-white">{money(subtotal)}</b>
          </p>

          <button
            onClick={() => setDiscountOpen(true)}
            className="flex w-full justify-between text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <span className="font-bold">Discount {safeDiscount ? '(Edit)' : '(Apply)'}</span>
            <b className="font-extrabold">-{money(safeDiscount)}</b>
          </button>

          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          <p className="flex justify-between text-xl font-black text-slate-900 dark:text-white">
            <span>Total Payable</span>
            <span className="text-emerald-600 dark:text-emerald-400">{money(total)}</span>
          </p>
        </div>

        <button
          disabled={!cart.length || isLoading}
          onClick={checkout}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Processing Sale...' : `Complete Sale · ${money(total)}`}
        </button>
      </div>
    </aside>
  );

  const chips: Array<{ id: Filter; label: string }> = [
    { id: 'ALL', label: 'All Items' },
    { id: 'SERVICE', label: 'Services' },
    { id: 'PRODUCT', label: 'Products & Parts' },
    { id: 'FAST', label: 'Fast Moving' },
  ];

  return (
    <div className="pos-page flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        {/* Catalog Section */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Header & Filter Controls */}
          <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Point of Sale
                </p>
                <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Direct Counter Sales
                </h1>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <b className="block text-slate-900 dark:text-white">{itemCount} items in cart</b>
                <span>Ready to checkout</span>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-24 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                Ctrl K
              </kbd>
            </div>

            {/* Category Chips */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    filter === chip.id
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-amber-400 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
                      className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      <div className="p-3.5 space-y-3">
                        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                          <div className="h-5 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))
                : products.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => add(item)}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
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

                        <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
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
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
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

      {/* Mobile Cart Trigger Button */}
      <button
        onClick={() => setMobileCartOpen(true)}
        className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-2xl bg-emerald-500 px-5 py-4 font-bold text-white shadow-xl shadow-emerald-500/30 lg:hidden"
      >
        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        <span>View Sale · {money(total)}</span>
      </button>

      {/* Mobile Cart Sheet Modal */}
      {mobileCartOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-2 backdrop-blur-xs lg:hidden"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setDiscountOpen(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setDiscountOpen(false);
            }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800"
          >
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Apply Sale Discount</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Discount applies to the complete sale subtotal.
            </p>

            <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Discount Amount (₹)
              <input
                autoFocus
                type="number"
                min="0"
                max={subtotal}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value || 0)))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-base font-bold text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDiscount(0);
                  setDiscountOpen(false);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Clear
              </button>
              <button className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600">
                Apply Discount
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sale Receipt Confirmation Modal */}
      {receipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15">
              <Receipt className="h-8 w-8" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Payment Recorded
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Sale Completed</h2>
            <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{money(receipt.grandTotal)}</p>
            <button
              onClick={() => setReceipt(null)}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white shadow-md dark:bg-amber-400 dark:text-slate-950"
            >
              Start New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
