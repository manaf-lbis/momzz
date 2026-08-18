import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FolderPlus,
  ImagePlus,
  Package,
  Plus,
  Save,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/navbar/Navbar';
import {
  useCreateCatalogItemMutation,
  useCreateCategoryMutation,
  useGetCategoriesQuery,
  useGetCatalogQuery,
} from '../api/catalogApi';
import { ImageCropperModal } from '../components/common/ImageCropperModal';
import { findDuplicateCandidates } from '../utils/searchAlgorithm';

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const inputStyle =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-400';

const labelStyle = 'block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

export const AddInventoryItemPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categoryData, refetch: refetchCategories } = useGetCategoriesQuery();
  const { data: catalogData } = useGetCatalogQuery();
  const [createCatalogItem, { isLoading: isCreating }] = useCreateCatalogItemMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();

  const categories = categoryData?.data || [];
  const existingItems = catalogData?.data || [];

  // Form State
  const [form, setForm] = useState({
    title: '',
    price: '',
    itemType: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
    categoryId: '',
    stockQuantity: '10',
    minimumStockQuantity: '2',
    description: '',
  });

  // Duplicate candidates check
  const duplicateCandidates = useMemo(() => {
    if (!form.title.trim() || form.title.trim().length < 2) return [];
    return findDuplicateCandidates(
      form.title,
      existingItems,
      (item) => item.title,
      0.82
    );
  }, [form.title, existingItems]);

  // Multi-image state
  const [images, setImages] = useState<string[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);
  const [cropSource, setCropSource] = useState<string | null>(null);

  // Inline new category state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'PRODUCT' | 'SERVICE' | 'BOTH'>('BOTH');

  const [error, setError] = useState('');

  const handleFieldChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      // Auto-set thumbnail to first image
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
      setError('Title and price are required.');
      return;
    }

    try {
      await createCatalogItem({
        title: form.title.trim(),
        price: Number(form.price),
        itemType: form.itemType,
        category: form.categoryId || undefined,
        categoryId: form.categoryId || undefined,
        description: form.description,
        stockQuantity: form.itemType === 'PRODUCT' ? Number(form.stockQuantity || 0) : 0,
        minimumStockQuantity: form.itemType === 'PRODUCT' ? Number(form.minimumStockQuantity || 0) : 0,
        thumbnailUrl: images[thumbnailIndex] || undefined,
        images,
        isAvailable: true,
      }).unwrap();

      navigate('/inventory');
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create item.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-white transition-colors duration-200">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/inventory')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-amber-400 hover:text-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Add New Item</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create a product or service in the inventory catalog.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Type */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Item Type</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleFieldChange('itemType', 'PRODUCT')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                  form.itemType === 'PRODUCT'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Package className="h-4 w-4" /> Product
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('itemType', 'SERVICE')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                  form.itemType === 'SERVICE'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Wrench className="h-4 w-4" /> Service
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Basic Info</h2>

            <div>
              <label className={labelStyle}>Item Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g. Engine Oil 10W-40, Wheel Alignment"
                className={inputStyle}
              />
              {duplicateCandidates.length > 0 && (
                <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      Similar item found: "{duplicateCandidates[0].item.title}"
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      An item with a very similar name or spelling already exists in your inventory.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyle}>Selling Price (₹) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => handleFieldChange('price', e.target.value)}
                  placeholder="0"
                  className={inputStyle}
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className={labelStyle}>Category</label>
                <div className="flex gap-2">
                  <select
                    value={form.categoryId}
                    onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                    className={`${inputStyle} flex-1`}
                  >
                    <option value="">General</option>
                    {categories.map((cat) => (
                      <option key={cat.id || cat._id} value={cat.id || cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm((v) => !v)}
                    title="Add new category"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-amber-500 shadow-xs transition hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </div>

                {/* Inline New Category Form */}
                {showCategoryForm && (
                  <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-50/60 p-3 space-y-2 dark:bg-amber-400/5 dark:border-amber-400/20">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      New Category
                    </p>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className={inputStyle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      {(['PRODUCT', 'SERVICE', 'BOTH'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewCategoryType(t)}
                          className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition ${
                            newCategoryType === t
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCategoryForm(false)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={isCreatingCategory || !newCategoryName.trim()}
                        className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {isCreatingCategory ? 'Adding...' : 'Add Category'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelStyle}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Optional product/service details, notes, or instructions..."
                className={`${inputStyle} resize-none`}
              />
            </div>
          </div>

          {/* Stock (Products only) */}
          {form.itemType === 'PRODUCT' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Stock Management
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(e) => handleFieldChange('stockQuantity', e.target.value)}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minimumStockQuantity}
                    onChange={(e) => handleFieldChange('minimumStockQuantity', e.target.value)}
                    placeholder="Alert when below this"
                    className={inputStyle}
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Alert will appear when stock falls below this number.</p>
                </div>
              </div>
            </div>
          )}

          {/* Images */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Product Photos
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">4:3 landscape ratio. Tap ⭐ to set as thumbnail.</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition hover:bg-amber-600 active:scale-[0.97]"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Add Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelected}
                className="hidden"
              />
            </div>

            {images.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center transition hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-400/50"
              >
                <ImagePlus className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Click to upload images</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">4:3 landscape crop applied automatically</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={i} className="group relative">
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition ${
                        thumbnailIndex === i
                          ? 'border-amber-400 shadow-lg shadow-amber-400/20'
                          : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <img src={img} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />

                      {/* Thumbnail Badge */}
                      {thumbnailIndex === i && (
                        <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-400 px-1.5 py-0.5">
                          <Star className="h-2.5 w-2.5 fill-slate-950 text-slate-950" />
                          <span className="text-[9px] font-black text-slate-950">THUMB</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-1.5 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setThumbnailIndex(i)}
                        title="Set as thumbnail"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm transition hover:bg-amber-500"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        title="Remove image"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add More */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Plus className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </button>
              </div>
            )}

            {images.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>{images.length} photo{images.length > 1 ? 's' : ''}</strong> added.{' '}
                  Thumbnail: photo #{thumbnailIndex + 1}. Preview: {' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {money(Number(form.price) || 0)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <X className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !form.title.trim() || !form.price}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-black text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-50 active:scale-[0.98]"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </span>
              ) : (
                <>
                  <Save className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                  Create Item
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Landscape Image Cropper */}
      {cropSource && (
        <ImageCropperModal
          isOpen={!!cropSource}
          imageSrc={cropSource}
          aspectRatio={4 / 3}
          title="Crop Product Photo (4:3 Landscape)"
          onClose={() => setCropSource(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};
