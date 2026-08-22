import React, { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[16rem]',
        className
      )}
    >
      {children}
    </div>
  );
};

interface BentoCardProps {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon?: React.ElementType;
  description?: string | ReactNode;
  href?: string;
  cta?: string;
  onClick?: () => void;
  badge?: ReactNode;
  children?: ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  onClick,
  badge,
  children,
}) => {
  return (
    <motion.div
      key={name}
      whileHover={{ y: -3, scale: 1.008 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl cursor-pointer',
        // Light styles
        'bg-white/90 [box-shadow:0_0_0_1px_rgba(0,0,0,.04),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
        // Dark styles
        'dark:bg-slate-900/90 dark:border dark:border-slate-800/80 dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
        'backdrop-blur-md transition-all duration-300',
        className
      )}
    >
      {/* Background visual or gradient */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {background}
      </div>

      {/* Top Header Row with Icon and Badge */}
      <div className="relative z-10 p-5 flex items-start justify-between gap-2">
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/90 text-amber-500 dark:text-yellow-400 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-300 shadow-xs">
            <Icon className="h-5 w-5" />
          </div>
        )}
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Embedded Children Content if any */}
      {children && <div className="relative z-10 px-5 flex-1">{children}</div>}

      {/* Bottom Text & CTA */}
      <div className="relative z-10 p-5 pt-0 flex flex-col gap-1 transition-all duration-300">
        <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
          {name}
        </h3>
        {description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono line-clamp-2">
            {description}
          </div>
        )}
        {cta && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform">
            <span>{cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Subtle Hover Gradient Glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-400/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
};
