import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  Tag,
  Wrench,
} from 'lucide-react';
import { Navbar } from '../components/navbar/Navbar';
import {
  useGetAllInventoryQuery,
  useAddInventoryItemMutation,
  useDeleteInventoryItemMutation,
  InventoryItem,
} from '../api/inventoryApi';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

const CATEGORY_OPTIONS = ['General', 'Service', 'Repair', 'Parts', 'Cleaning', 'Electrical', 'Body Work'];

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetAllInventoryQuery();
  const [addInventoryItem, { isLoading: isAdding }] = useAddInventoryItemMutation();
  const [deleteInventoryItem] = useDeleteInventoryItemMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [addError, setAddError] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: InventoryItem | null }>({
    isOpen: false,
    item: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const allItems: InventoryItem[] = data?.data || [];

  const filteredItems = searchQuery.trim()
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allItems;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newName.trim()) {
      setAddError('Task name is required.');
      return;
    }
    try {
      await addInventoryItem({ name: newName.trim(), category: newCategory }).unwrap();
      setNewName('');
      setNewCategory('General');
    } catch (err: any) {
      setAddError(err?.data?.message || 'Failed to add item. It may already exist.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem({ id: deleteModal.item._id }).unwrap();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  // Group by category
  const grouped = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight">
                  Task Inventory Master
                </h1>
              </div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {allItems.length} items · Auto-suggestion dictionary
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Add New Item Form */}
            <div className="lg:col-span-1">
              <div className="industrial-card rounded-3xl p-5 space-y-4 sticky top-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-yellow-400" />
                  Add New Item
                </h2>

                <form onSubmit={handleAddItem} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Task / Service Name *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Engine Oil Change"
                      className="w-full rounded-xl py-2.5 px-3.5 text-xs industrial-input font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-xl py-2.5 px-3.5 text-xs industrial-input font-medium appearance-none"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {addError && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> {addError}
                    </p>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={isAdding}
                    className="w-full py-2.5 rounded-xl bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-extrabold text-xs uppercase shadow-sm hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isAdding ? 'Saving...' : 'Add to Inventory'}
                  </motion.button>
                </form>
              </div>
            </div>

            {/* Right: Inventory List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search Filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search inventory items..."
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs industrial-input font-medium"
                />
              </div>

              {isLoading ? (
                <div className="py-10 text-center text-xs font-mono text-zinc-400 animate-pulse">
                  Loading inventory...
                </div>
              ) : isError ? (
                <div className="py-8 text-center text-xs font-mono text-red-400 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Failed to load inventory.
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-10 text-center text-xs font-mono text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <Package className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                  <p>No items found. Add your first task to the inventory.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).sort().map(([category, items]) => (
                    <div key={category} className="industrial-card rounded-3xl p-4 space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <Tag className="w-3.5 h-3.5 text-yellow-400" />
                        <h3 className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          {category}
                        </h3>
                        <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 dark:text-zinc-400">
                          {items.length}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <AnimatePresence>
                          {items.map((item) => (
                            <motion.div
                              key={item._id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 group transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Wrench className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {item.name}
                                </span>
                              </div>
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, item })}
                                className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                title="Delete item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Remove from Inventory"
        message={`Remove "${deleteModal.item?.name}" from the task inventory master list? Existing job cards will not be affected.`}
        confirmText="Remove Item"
        variant="danger"
      />
    </div>
  );
};
