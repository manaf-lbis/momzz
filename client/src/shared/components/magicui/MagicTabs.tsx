import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface MagicTabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  layoutId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MagicTabs<T extends string = string>({
  items,
  activeKey,
  onChange,
  layoutId = 'magic-tab-indicator',
  className = '',
  size = 'md',
}: MagicTabsProps<T>) {
  const sizeStyles = {
    sm: 'py-1.5 px-2.5 text-xs gap-1.5',
    md: 'py-2 px-3 text-xs sm:text-sm gap-2',
    lg: 'py-2.5 px-4 text-sm font-bold gap-2.5',
  }[size];

  return (
    <div
      role="tablist"
      className={`relative flex items-center gap-1 p-1 rounded-2xl bg-transparent border border-slate-200/80 dark:border-white/10 overflow-x-auto no-scrollbar select-none ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeKey === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative flex-1 ${sizeStyles} font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
              isActive
                ? 'text-slate-950 font-black'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {/* Animated Magic Active Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-xl shadow-[0_2px_12px_rgba(245,158,11,0.35)]"
                transition={{ type: 'spring', bounce: 0.18, duration: 0.36 }}
              />
            )}

            {/* Icon */}
            {tab.icon && (
              <span className={`relative z-10 transition-transform ${isActive ? 'scale-105' : ''}`}>
                {tab.icon}
              </span>
            )}

            {/* Label */}
            <span className="relative z-10 tracking-tight whitespace-nowrap">{tab.label}</span>

            {/* Count / Status Badge */}
            {tab.count !== undefined && (
              <span
                className={`relative z-10 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                  isActive
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
