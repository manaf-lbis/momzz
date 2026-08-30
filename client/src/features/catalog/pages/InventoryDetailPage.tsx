import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
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
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import {
  useDeleteCatalogItemMutation,
  useGetCatalogItemQuery,
  useUpdateCatalogItemMutation,
} from '../../catalog/api/catalogApi';
import { useAuth } from '../../../shared/hooks/useAuth';
import { ImageCropperModal } from '../../../shared/components/common/ImageCropperModal';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const inputStyle =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-400';

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
      // Sync edit images from item
      const rawImgs = item.images?.filter(Boolean) || [];
      const allImgs = rawImgs.length ? rawImgs : item.thumbnailUrl ? [item.thumbnailUrl] : [];
      setEditImages(allImgs);
      const thumbIdx = allImgs.indexOf(item.thumbnailUrl || '');
      setEditThumbnailIndex(thumbIdx >= 0 ? thumbIdx : 0);
    }
  }, [item]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A]">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 text-slate-500 dark:text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-400 border-t-transparent mb-4" />
          <p className="text-sm font-medium">Loading catalog details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A]">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-400">
            <Package className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Item Not Found</h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            The item you are looking for does not exist or was deleted.
          </p>
          <button
            onClick={() => navigate('/inventory')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md dark:bg-amber-400 dark:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  // Handle product images
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
    setEditImages((prev) => {
      const next = [...prev, cropped];
      return next;
    });
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05)_0%,transparent_65%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      <main className="relative z-10 mx-auto max-w-[1200px] w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32">
        {/* Back Link */}
        <button
          onClick={() => navigate('/inventory')}
          className="group mb-4 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 transition hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Inventory</span>
        </button>

        {/* Details Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Touch & Swipe Image Carousel */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Animated Carousel Stage with Drag/Swipe Support */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 select-none">
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
                  <div className="flex h-full w-full items-center justify-center text-amber-500">
                    {item.itemType === 'SERVICE' ? (
                      <Wrench className="h-16 w-16 stroke-[1.5]" />
                    ) : (
                      <Package className="h-16 w-16 stroke-[1.5]" />
                    )}
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                      item.itemType === 'SERVICE'
                        ? 'bg-violet-600/90 text-white'
                        : 'bg-amber-400/90 text-slate-950'
                    }`}
                  >
                    {item.itemType}
                  </span>
                </div>

                {/* Lightbox Trigger */}
                {images.length > 0 && (
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute right-3 top-3 z-10 rounded-xl bg-slate-950/60 p-2 text-white backdrop-blur-md transition hover:bg-slate-950/80"
                    title="Fullscreen View"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => paginate(-1)}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/60 p-2.5 text-white backdrop-blur-md transition hover:bg-slate-950/80 active:scale-95"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => paginate(1)}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/60 p-2.5 text-white backdrop-blur-md transition hover:bg-slate-950/80 active:scale-95"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Counter Dots */}
                    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1.5 backdrop-blur-md">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPage([idx, idx > imageIndex ? 1 : -1])}
                          className={`h-2 rounded-full transition-all ${
                            imageIndex === idx ? 'w-5 bg-amber-400' : 'w-2 bg-white/50 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails Row / Image Edit Section */}
              {isAdmin && isEditing ? (
                <div className="p-2 pt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {editImages.map((img, idx) => (
                      <div key={img + idx} className="group relative h-16 w-20 shrink-0">
                        <div
                          className={`h-full w-full overflow-hidden rounded-xl border-2 transition-all ${
                            editThumbnailIndex === idx
                              ? 'border-amber-400 shadow-md ring-2 ring-amber-400/30'
                              : 'border-transparent'
                          }`}
                        >
                          <img src={img} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                        </div>
                        {/* Controls */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition bg-slate-950/40 rounded-xl">
                          <button
                            type="button"
                            title="Set as thumbnail"
                            onClick={() => setEditThumbnailIndex(idx)}
                            className="h-6 w-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Remove image"
                            onClick={() => {
                              setEditImages((prev) => {
                                const next = prev.filter((_, i) => i !== idx);
                                if (editThumbnailIndex >= next.length) setEditThumbnailIndex(Math.max(0, next.length - 1));
                                return next;
                              });
                            }}
                            className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {editThumbnailIndex === idx && (
                          <div className="absolute left-1 top-1 rounded bg-amber-400 px-1 py-0.5">
                            <Star className="h-2.5 w-2.5 fill-slate-950 text-slate-950" />
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Add Photo button */}
                    <button
                      type="button"
                      onClick={() => imageFileInputRef.current?.click()}
                      className="h-16 w-20 shrink-0 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-50 dark:bg-amber-400/5 flex items-center justify-center text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-400/10 transition"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelected}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Hover image and tap ⭐ to set thumbnail, 🗑 to remove.</p>
                </div>
              ) : (
                images.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto p-2 pt-3">
                    {images.map((img, idx) => (
                      <button
                        key={img + idx}
                        onClick={() => setPage([idx, idx > imageIndex ? 1 : -1])}
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                          imageIndex === idx
                            ? 'border-amber-400 shadow-md ring-2 ring-amber-400/30'
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

          {/* Right Column: Integrated Info & Simplified Price */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              {/* Header Title & Integrated Price Header */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {item.category?.name || 'General'}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.itemType === 'SERVICE'
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                        : isLowStock
                        ? 'animate-pulse bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    }`}
                  >
                    {item.itemType === 'SERVICE'
                      ? 'Service Item'
                      : isLowStock
                      ? `Low Stock (${item.stockQuantity})`
                      : `${item.stockQuantity} In Stock`}
                  </span>
                </div>

                {/* Simplified Title & Price Line */}
                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Item Title
                      </label>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        className={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Selling Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                        className={inputStyle}
                      />
                    </div>
                    {item.itemType === 'PRODUCT' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={draft.stockQuantity}
                            onChange={(e) => setDraft({ ...draft, stockQuantity: Number(e.target.value) })}
                            className={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Low Stock Threshold
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={draft.minimumStockQuantity}
                            onChange={(e) => setDraft({ ...draft, minimumStockQuantity: Number(e.target.value) })}
                            className={inputStyle}
                          />
                          <p className="mt-1 text-[10px] text-slate-400">Alert when stock falls below this.</p>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        className={`${inputStyle} resize-none`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                      {item.title}
                    </h1>
                    <div className="sm:text-right flex items-baseline gap-2 sm:block">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block sm:mb-0.5">
                        Selling Price
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {money(item.price)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {!isEditing && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Description
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.description || 'No description available for this item.'}
                  </p>
                </div>
              )}

              {/* Quick Specs / Details Row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Item Code
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    #{item.id.slice(-8).toUpperCase()}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Classification
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.itemType}</span>
                </div>
              </div>

              {/* Quick Stock Adjuster (Admin Only) */}
              {isAdmin && item.itemType === 'PRODUCT' && !isEditing && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <div>
                    <b className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Adjust Stock
                    </b>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      Currently {item.stockQuantity} available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStockAdjust(-1)}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      1 Stock
                    </button>
                    <button
                      onClick={() => handleStockAdjust(1)}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-600 active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      1 Stock
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2.5 sm:gap-3 border-t border-slate-100 pt-4 sm:pt-5 dark:border-slate-800">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSaving || !draft.title.trim()}
                        onClick={handleSave}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex-1 rounded-xl bg-slate-900 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                      >
                        Edit Item
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="flex items-center justify-center rounded-xl bg-red-50 px-4 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                        title="Archive Item"
                      >
                        <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox / Fullscreen Modal */}
      {isLightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md hover:bg-white/20"
            aria-label="Close Lightbox"
          >
            <X className="h-6 w-6" />
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

      {/* Landscape Image Cropper */}
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
