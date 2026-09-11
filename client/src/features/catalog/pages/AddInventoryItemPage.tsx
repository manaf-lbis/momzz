import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  FolderPlus,
  ImagePlus,
  Package,
  Plus,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import {
  useCreateCatalogItemMutation,
  useCreateCategoryMutation,
  useGetCategoriesQuery,
  useGetCatalogQuery,
} from '../../catalog/api/catalogApi';
import { ImageCropperModal } from '../../../shared/components/common/ImageCropperModal';
import { findDuplicateCandidates } from '../../../shared/utils/searchAlgorithm';

const labelStyle =
  'block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5';

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
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background aura */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 max-w-3xl mx-auto space-y-4">
        {/* Page Header with BackButton */}
        <PageHeader
          backTo="/inventory"
          title="Add New Item"
          description="Create a product or workshop service in the catalog"
        />

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Classification Bento */}
          <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-3">
            <label className={labelStyle}>Item Classification</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleFieldChange('itemType', 'PRODUCT')}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer ${
                  form.itemType === 'PRODUCT'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'glass-ghost-btn text-slate-600 dark:text-slate-400'
                }`}
              >
                <Package className="h-4 w-4" /> Physical Product
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('itemType', 'SERVICE')}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer ${
                  form.itemType === 'SERVICE'
                    ? 'bg-violet-600 text-white shadow-md font-black'
                    : 'glass-ghost-btn text-slate-600 dark:text-slate-400'
                }`}
              >
                <Wrench className="h-4 w-4" /> Workshop Service
              </button>
            </div>
          </div>

          {/* Basic Info Bento */}
          <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-4">
            <label className={labelStyle}>Core Details</label>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Item Title *
              </label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g. Engine Oil 10W-40, Wheel Alignment"
                className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
              />
              {duplicateCandidates.length > 0 && (
                <div className="mt-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      Similar item found: "{duplicateCandidates[0].item.title}"
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      An item with a similar name already exists in your inventory.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => handleFieldChange('price', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Category
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.categoryId}
                    onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
                  >
                    <option value="" className="text-slate-900 dark:bg-slate-900">General</option>
                    {categories.map((cat) => (
                      <option
                        key={cat.id || cat._id}
                        value={cat.id || cat._id}
                        className="text-slate-900 dark:bg-slate-900"
                      >
                        {cat.name}
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
                  <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3 space-y-2">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Create Category
                    </p>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
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
                        <option value="BOTH" className="text-slate-900 dark:bg-slate-900">Both Products & Services</option>
                        <option value="PRODUCT" className="text-slate-900 dark:bg-slate-900">Products Only</option>
                        <option value="SERVICE" className="text-slate-900 dark:bg-slate-900">Services Only</option>
                      </select>
                      <button
                        type="button"
                        disabled={isCreatingCategory || !newCategoryName.trim()}
                        onClick={handleCreateCategory}
                        className="rounded-lg glass-gold-btn px-3 py-1 text-xs font-bold text-slate-950 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isCreatingCategory ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stock Quantities (Products only) */}
          {form.itemType === 'PRODUCT' && (
            <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-3">
              <label className={labelStyle}>Inventory Stock</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minimumStockQuantity}
                    onChange={(e) => handleFieldChange('minimumStockQuantity', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Multi-image Uploader Bento */}
          <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Media Photos (4:3)</label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {images.map((img, idx) => (
                <div key={idx} className="group relative h-16 w-20 shrink-0">
                  <div
                    className={`h-full w-full overflow-hidden rounded-xl border-2 transition-all ${
                      thumbnailIndex === idx
                        ? 'border-amber-400 shadow-md ring-2 ring-amber-400/30'
                        : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition bg-slate-950/50 rounded-xl">
                    <button
                      type="button"
                      title="Set as primary thumbnail"
                      onClick={() => setThumbnailIndex(idx)}
                      className="h-5 w-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
                    >
                      <Star className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      title="Remove image"
                      onClick={() => handleRemoveImage(idx)}
                      className="h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  {thumbnailIndex === idx && (
                    <div className="absolute left-1 top-1 rounded bg-amber-400 px-1 py-0.5 shadow">
                      <Star className="h-2 w-2 fill-slate-950 text-slate-950" />
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-20 shrink-0 rounded-xl border border-dashed border-amber-400/50 bg-amber-400/10 flex flex-col items-center justify-center gap-1 text-amber-500 hover:bg-amber-400/20 active:scale-95 transition cursor-pointer"
              >
                <ImagePlus className="h-4 w-4" />
                <span className="text-[10px] font-bold">Add</span>
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

          {/* Description Bento */}
          <div className="rounded-3xl glass-modern-card p-4 sm:p-5 space-y-2">
            <label className={labelStyle}>Description & Notes</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Product specs, vehicle compatibility, or service details..."
              className="w-full rounded-xl glass-modern-input px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="px-4 py-2 rounded-xl glass-ghost-btn text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl glass-gold-btn text-xs sm:text-sm font-black text-slate-950 shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{isCreating ? 'Creating...' : 'Save Item'}</span>
            </button>
          </div>
        </form>
      </main>

      {/* Image Cropper Modal */}
      {cropSource && (
        <ImageCropperModal
          isOpen={!!cropSource}
          imageSrc={cropSource}
          aspectRatio={4 / 3}
          title="Crop Item Photo (4:3 Landscape)"
          onClose={() => setCropSource(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default AddInventoryItemPage;
