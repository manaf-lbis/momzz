import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, PackagePlus, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useGetAllInventoryQuery, useAddInventoryItemMutation, InventoryItem } from '../../api/inventoryApi';

interface TaskAutoCompleteProps {
  value: string;
  onChange: (val: string) => void;
  onAddTask: (title: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TaskAutoComplete: React.FC<TaskAutoCompleteProps> = ({
  value,
  onChange,
  onAddTask,
  placeholder = 'Type or search a sub-task...',
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [pendingCustomTask, setPendingCustomTask] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allInventoryData } = useGetAllInventoryQuery();
  const [addInventoryItem] = useAddInventoryItemMutation();

  const allItems: InventoryItem[] = allInventoryData?.data || [];

  // Filtered suggestions
  const suggestions = value.trim().length >= 1
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : allItems.slice(0, 6);

  // Exact match check (case-insensitive)
  const exactMatchExists = allItems.some(
    (item) => item.name.toLowerCase().trim() === value.toLowerCase().trim()
  );

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Instant click-to-add: Clicking a suggestion adds it to the checklist immediately!
   */
  const handleSelectSuggestion = (name: string) => {
    onAddTask(name);
    onChange('');
    setShowDropdown(false);
  };

  /**
   * Process adding a task input:
   * If item is in inventory -> add instantly.
   * If item is NOT in inventory -> trigger option modal asking user preference!
   */
  const handleInitiateAdd = (itemTitle?: string) => {
    const target = (itemTitle || value).trim();
    if (!target) return;

    const exists = allItems.some(
      (item) => item.name.toLowerCase().trim() === target.toLowerCase()
    );

    if (exists) {
      onAddTask(target);
      onChange('');
      setShowDropdown(false);
    } else {
      // Not in inventory -> prompt 2 options modal
      setPendingCustomTask(target);
      setShowDropdown(false);
    }
  };

  // Option 1: Add to Master Inventory & Use
  const handleAddWithInventory = async () => {
    if (!pendingCustomTask) return;
    setIsSavingInventory(true);
    try {
      await addInventoryItem({ name: pendingCustomTask }).unwrap();
    } catch {
      // Ignore if already exists or duplicate
    } finally {
      setIsSavingInventory(false);
      onAddTask(pendingCustomTask);
      onChange('');
      setPendingCustomTask(null);
    }
  };

  // Option 2: Use Only for This Job
  const handleAddJobOnly = () => {
    if (!pendingCustomTask) return;
    onAddTask(pendingCustomTask);
    onChange('');
    setPendingCustomTask(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInitiateAdd();
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        {/* Input Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs industrial-input font-medium"
            autoComplete="off"
          />
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={() => handleInitiateAdd()}
          disabled={!value.trim() || disabled}
          className="px-4 py-2.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm disabled:opacity-40 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-3.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 dark:text-yellow-400" />
              Inventory Suggestions (Click to Add)
            </span>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {suggestions.map((item) => (
              <div
                key={item._id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(item.name);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-amber-400/10 dark:hover:bg-yellow-400/10 hover:text-amber-600 dark:hover:text-yellow-400 transition-colors flex items-center justify-between cursor-pointer group border-b border-zinc-100 dark:border-zinc-800/60 last:border-none"
              >
                <span>{item.name}</span>
                <span className="text-[10px] font-mono text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-yellow-400">
                  + Add Instantly
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Not in Inventory Options Prompt Modal */}
      {pendingCustomTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm uppercase text-zinc-900 dark:text-zinc-100">
                  Item Not In Inventory
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  "{pendingCustomTask}"
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              This task is not in your master inventory database. Choose how you would like to proceed:
            </p>

            <div className="space-y-2 pt-1">
              {/* Option 1: Add to Master Inventory & Use */}
              <button
                type="button"
                onClick={handleAddWithInventory}
                disabled={isSavingInventory}
                className="w-full py-2.5 px-3.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 active:scale-98 shadow-sm"
              >
                {isSavingInventory ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <PackagePlus className="w-4 h-4" />
                )}
                <span>1. Add to Inventory Master & Use</span>
              </button>

              {/* Option 2: Use Only for This Job */}
              <button
                type="button"
                onClick={handleAddJobOnly}
                disabled={isSavingInventory}
                className="w-full py-2.5 px-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-mono font-bold text-xs uppercase rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Plus className="w-4 h-4 text-zinc-500" />
                <span>2. Use Only for This Job</span>
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPendingCustomTask(null)}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
