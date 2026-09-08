import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Maximize2,
  Package,
  Save,
  Star,
  Tag,
  Trash2,
  Wrench,
  X,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import {
  useDeleteCatalogItemMutation,
  useGetCatalogItemQuery,
  useUpdateCatalogItemMutation,
} from '../../catalog/api/catalogApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { ImageCropperModal } from '../../../shared/components/common/ImageCropperModal';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export const InventoryDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data, isLoading } = useGetCatalogItemQuery(id);
  const [updateItem, { isLoading: isSaving }] = useUpdateCatalogItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteCatalogItemMutation();

  const [[page, direction], setPage] = useState([0, 0]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
  });

  const item = data?.data;

  useEffect(() => {
    if (item) {
      setDraft({
        title: item.title,
        price: item.price,
        description: item.description || '',
        stockQuantity: item.stockQuantity || 0,
        minimumStockQuantity: item.minimumStockQuantity || 0,
      });
      const rawImgs = item.images?.filter(Boolean) || [];
      const allImgs = rawImgs.length ? rawImgs : item.thumbnailUrl ? [item.thumbnailUrl] : [];
      setEditImages(allImgs);
      const thumbIdx = allImgs.indexOf(item.thumbnailUrl || '');
      setEditThumbnailIndex(thumbIdx >= 0 ? thumbIdx : 0);
    }
  }, [item]);

  if (isLoading) {
    return (
      <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col">
        <div className="glass-ambient-glow" aria-hidden="true" />
        <Navbar glass />
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 dark:text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mb-4" />
          <p className="text-xs sm:text-sm font-medium">Loading catalog details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col">
        <div className="glass-ambient-glow" aria-hidden="true" />
        <Navbar glass />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl glass-modern-card text-rose-500 mb-4">
            <Package className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Item Not Found</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            The item you are looking for does not exist or has been deleted.
          </p>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl glass-gold-btn px-4 py-2 text-xs font-bold text-slate-950 active:scale-95 transition"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  const rawImages = item.images?.filter(Boolean) || [];
  const images = rawImages.length ? rawImages : item.thumbnailUrl ? [item.thumbnailUrl] : [];
  const imageIndex = Math.abs(page % (images.length || 1));

  const paginate = (newDirection: number) => {
    if (!images.length) return;
    setPage([page + newDirection, newDirection]);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) return;
    try {
      await updateItem({
        id: item.id,
        body: {
          title: draft.title.trim(),
          price: draft.price,
          description: draft.description,
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

  const handleStockAdjust = async (delta: number) => {
    try {
      await updateItem({
        id: item.id,
        body: {
          stockQuantity: Math.max(0, (item.stockQuantity || 0) + delta),
        },
      }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to adjust stock.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to remove "${item.title}"?`)) {
      try {
        await deleteItem(item.id).unwrap();
        navigate('/inventory');
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to delete item.');
      }
    }
  };

  const isLowStock =
    item.itemType === 'PRODUCT' &&
    item.trackStock !== false &&
    (item.stockQuantity || 0) <= (item.minimumStockQuantity || 0);

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col overflow-x-clip selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        {/* Page Header */}
        <PageHeader
          backTo="/inventory"
          title={item.title}
          description={
            item.category?.name
              ? `${item.itemType === 'SERVICE' ? 'Service Item' : 'Inventory Spare'} · ${item.category.name}`
              : item.itemType === 'SERVICE'
              ? 'Workshop Service'
              : 'Inventory Spare'
          }
          actions={
            isAdmin && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl glass-ghost-btn text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !draft.title.trim()}
                      onClick={handleSave}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-gold-btn text-xs font-black text-slate-950 shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-gold-btn text-xs font-black text-slate-950 shadow-md active:scale-95 transition cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Item</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="p-1.5 sm:p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            )
          }
        />

        {/* Bento Grid Content */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left Column: Media Stage & Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative overflow-hidden rounded-3xl glass-modern-card p-2.5">
              {/* Animated Carousel Stage with Swipe */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/5 select-none">
                {images.length > 0 ? (
                  <AnimatePresence initial={false} custom={direction}>
                    <motion.img
                      key={page}
                      src={images[imageIndex]}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_, { offset }) => {
                        const swipe = offset.x;
                        if (swipe < -50) {
                          paginate(1);
                        } else if (swipe > 50) {
                          paginate(-1);
                        }
                      }}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-cover cursor-grab active:cursor-grabbing"
                      onClick={() => setIsLightboxOpen(true)}
                    />
                  </AnimatePresence>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {item.itemType === 'SERVICE' ? (
                      <Wrench className="h-16 w-16 stroke-[1.5] text-violet-500/70 dark:text-violet-400/70" />
                    ) : (
                      <Package className="h-16 w-16 stroke-[1.5] text-amber-500/70 dark:text-amber-400/70" />
                    )}
                  </div>
                )}

                {/* Top Overlay Chips */}
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                      item.itemType === 'SERVICE'
                        ? 'bg-violet-600/80 text-white'
                        : 'bg-amber-400/80 text-slate-950'
                    }`}
                  >
                    {item.itemType}
                  </span>
                  {isLowStock && (
                    <span className="rounded-lg bg-rose-500/90 text-white px-2 py-1 text-[10px] font-black uppercase backdrop-blur-md animate-pulse">
                      Low Stock
                    </span>
                  )}
                </div>

                {/* Lightbox Trigger */}
                {images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute right-3 top-3 z-10 rounded-xl bg-slate-950/60 p-2 text-white backdrop-blur-md transition hover:bg-slate-950/80 cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => paginate(-1)}
                      aria-label="Previous"
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/60 p-2 text-white backdrop-blur-md hover:bg-slate-950/80 active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => paginate(1)}
                      aria-label="Next"
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/60 p-2 text-white backdrop-blur-md hover:bg-slate-950/80 active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Pagination Dots */}
                    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-950/60 px-2.5 py-1 backdrop-blur-md">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPage([idx, idx > imageIndex ? 1 : -1])}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            imageIndex === idx ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/50 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails Row / Gallery Edit */}
              {isAdmin && isEditing ? (
                <div className="p-2 pt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {editImages.map((img, idx) => (
                      <div key={img + idx} className="group relative h-14 w-16 shrink-0">
                        <div
                          className={`h-full w-full overflow-hidden rounded-xl border-2 transition-all ${
                            editThumbnailIndex === idx
                              ? 'border-amber-400 shadow-md ring-2 ring-amber-400/30'
                              : 'border-transparent'
                          }`}
                        >
                          <img src={img} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition bg-slate-950/50 rounded-xl">
                          <button
                            type="button"
                            title="Set as thumbnail"
                            onClick={() => setEditThumbnailIndex(idx)}
                            className="h-5 w-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
                          >
                            <Star className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            title="Remove image"
                            onClick={() => {
                              setEditImages((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                if (editThumbnailIndex >= next.length)
                                  setEditThumbnailIndex(Math.max(0, next.length - 1));
                                return next;
                              });
                            }}
                            className="h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => imageFileInputRef.current?.click()}
                      className="h-14 w-16 shrink-0 rounded-xl border border-dashed border-amber-400/50 bg-amber-400/10 flex items-center justify-center text-amber-500 hover:bg-amber-400/20 transition cursor-pointer"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </button>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelected}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Hover image and tap ⭐ to set thumbnail, 🗑 to remove.
                  </p>
                </div>
              ) : (
                images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-2 pt-2.5 no-scrollbar">
                    {images.map((img, idx) => (
                      <button
                        key={img + idx}
                        type="button"
                        onClick={() => setPage([idx, idx > imageIndex ? 1 : -1])}
                        className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                          imageIndex === idx
                            ? 'border-amber-400 shadow-md ring-2 ring-amber-400/25'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Column: Information & Edit Bento */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-3xl glass-modern-card p-5 space-y-5">
              {/* Header Price Banner */}
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Item Title
                    </label>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                      className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>
                  {item.itemType === 'PRODUCT' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={draft.stockQuantity}
                          onChange={(e) => setDraft({ ...draft, stockQuantity: Number(e.target.value) })}
                          className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Low Stock Alert At
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={draft.minimumStockQuantity}
                          onChange={(e) => setDraft({ ...draft, minimumStockQuantity: Number(e.target.value) })}
                          className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-slate-200/50 pb-4 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                      Selling Price
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {money(item.price)}
                    </h2>
                  </div>

                  <div className="sm:text-right">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        item.itemType === 'SERVICE'
                          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                          : isLowStock
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {item.itemType === 'SERVICE'
                        ? 'Workshop Service'
                        : isLowStock
                        ? `Low Stock (${item.stockQuantity})`
                        : `${item.stockQuantity} In Stock`}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              {!isEditing && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Description
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.description || 'No detailed description available for this item.'}
                  </p>
                </div>
              )}

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/40 dark:bg-white/[0.02] p-3 border border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Item Code
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    #{item.id.slice(-8).toUpperCase()}
                  </span>
                </div>

                <div className="rounded-2xl bg-white/40 dark:bg-white/[0.02] p-3 border border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Classification
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.itemType === 'SERVICE' ? 'Service' : 'Physical Product'}
                  </span>
                </div>
              </div>

              {/* Stock Stepper (Admin Only for physical products) */}
              {isAdmin && item.itemType === 'PRODUCT' && !isEditing && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white/40 dark:bg-white/[0.02] p-3.5 border border-slate-200/50 dark:border-white/5">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Quick Stock Adjustment
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Currently {item.stockQuantity} units available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(-1)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl glass-ghost-btn px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                      <span>1 Unit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(1)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl glass-gold-btn px-3 py-1.5 text-xs font-black text-slate-950 active:scale-95 transition cursor-pointer"
                    >
                      <Plus className="h-3 w-3 stroke-[2.5]" />
                      <span>1 Unit</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox / Fullscreen Modal */}
      {isLightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
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
              src={images[imageIndex]}
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
          title="Crop Inventory Photo (4:3 Landscape)"
          onClose={() => setCropSource(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default InventoryDetailPage;
