import React from 'react';

interface BadgeProps {
  variant?: 'yellow' | 'green' | 'red' | 'zinc';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'zinc', children, className = '' }) => {
  const styles = {
    yellow: 'bg-yellow-400/10 text-yellow-400 border-yellow-500/30',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    zinc: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-mono font-semibold uppercase tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
