import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, PackagePlus, Loader2 } from 'lucide-react';
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
  placeholder = 'Type a task name...',
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allInventoryData } = useGetAllInventoryQuery();
  const [addInventoryItem] = useAddInventoryItemMutation();

  const allItems: InventoryItem[] = allInventoryData?.data || [];

  // Client-side filtered suggestions
  const suggestions = value.trim().length >= 1
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : allItems.slice(0, 6);

  // Exact match check (case insensitive)
  const exactMatchExists = allItems.some(
    (item) => item.name.toLowerCase() === value.toLowerCase().trim()
  );

  // Click-outside handler
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

  const handleSelectSuggestion = (name: string) => {
    onChange(name);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSaveToInventory = async () => {
    if (!value.trim() || exactMatchExists) return;
    setIsSaving(true);
    try {
      await addInventoryItem({ name: value.trim() }).unwrap();
    } catch {
      // Already exists or other error — silently ignore
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onAddTask(value.trim());
        setShowDropdown(false);
      }
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        {/* Input */}
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

        {/* Add Task Button */}
        <button
          type="button"
          onClick={() => {
            if (value.trim()) {
              onAddTask(value.trim());
              setShowDropdown(false);
            }
          }}
          disabled={!value.trim() || disabled}
          className="px-4 py-2.5 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm disabled:opacity-40 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Save to Inventory Button */}
      {value.trim() && !exactMatchExists && (
        <button
          type="button"
          onClick={handleSaveToInventory}
          disabled={isSaving}
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-yellow-400 hover:underline transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <PackagePlus className="w-3.5 h-3.5" />
          )}
          + Save "{value.trim()}" to Inventory Master
        </button>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
              📦 Inventory Suggestions
            </span>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item._id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(item.name);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-amber-50 dark:hover:bg-yellow-400/10 hover:text-amber-700 dark:hover:text-yellow-400 transition-colors flex items-center justify-between group"
              >
                <span>{item.name}</span>
                {item.category && (
                  <span className="text-[10px] font-mono text-zinc-400 group-hover:text-amber-500 dark:group-hover:text-yellow-500">
                    {item.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
