import React, { ReactNode, useCallback, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, useMotionTemplate, useMotionValue, Variants } from 'framer-motion';

export interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.01,
    },
  },
};

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-2.5 sm:gap-4 auto-rows-auto',
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export type BentoAccentColor = 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'cyan' | 'slate';

const accentGradients: Record<BentoAccentColor, { glow: string; borderHover: string; iconBg: string; iconColor: string; ctaColor: string }> = {
  amber: {
    glow: 'rgba(245, 158, 11, 0.18)',
    borderHover: 'hover:border-amber-400/50 dark:hover:border-amber-400/40',
    iconBg: 'bg-amber-500/10 dark:bg-amber-400/15 group-hover:bg-amber-400 group-hover:text-slate-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
    ctaColor: 'text-amber-600 dark:text-amber-400',
  },
  emerald: {
    glow: 'rgba(16, 185, 129, 0.18)',
    borderHover: 'hover:border-emerald-400/50 dark:hover:border-emerald-400/40',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/15 group-hover:bg-emerald-500 group-hover:text-white',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    ctaColor: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    glow: 'rgba(59, 130, 246, 0.18)',
    borderHover: 'hover:border-blue-400/50 dark:hover:border-blue-400/40',
    iconBg: 'bg-blue-500/10 dark:bg-blue-400/15 group-hover:bg-blue-500 group-hover:text-white',
    iconColor: 'text-blue-600 dark:text-blue-400',
    ctaColor: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    glow: 'rgba(168, 85, 247, 0.18)',
    borderHover: 'hover:border-purple-400/50 dark:hover:border-purple-400/40',
    iconBg: 'bg-purple-500/10 dark:bg-purple-400/15 group-hover:bg-purple-500 group-hover:text-white',
    iconColor: 'text-purple-600 dark:text-purple-400',
    ctaColor: 'text-purple-600 dark:text-purple-400',
  },
  rose: {
    glow: 'rgba(244, 63, 94, 0.18)',
    borderHover: 'hover:border-rose-400/50 dark:hover:border-rose-400/40',
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/15 group-hover:bg-rose-500 group-hover:text-white',
    iconColor: 'text-rose-600 dark:text-rose-400',
    ctaColor: 'text-rose-600 dark:text-rose-400',
  },
  cyan: {
    glow: 'rgba(6, 182, 212, 0.18)',
    borderHover: 'hover:border-cyan-400/50 dark:hover:border-cyan-400/40',
    iconBg: 'bg-cyan-500/10 dark:bg-cyan-400/15 group-hover:bg-cyan-500 group-hover:text-slate-950',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    ctaColor: 'text-cyan-600 dark:text-cyan-400',
  },
  slate: {
    glow: 'rgba(148, 163, 184, 0.15)',
    borderHover: 'hover:border-slate-400/50 dark:hover:border-slate-500/40',
    iconBg: 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700',
    iconColor: 'text-slate-700 dark:text-slate-300',
    ctaColor: 'text-slate-700 dark:text-slate-300',
  },
};

export interface BentoCardProps {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon?: React.ElementType;
  description?: string | ReactNode;
  subtitle?: string;
  href?: string;
  cta?: string;
  onClick?: () => void;
  badge?: ReactNode;
  children?: ReactNode;
  accent?: BentoAccentColor;
  featured?: boolean;
  spotlight?: boolean;
}

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 28,
    },
  },
};

export const BentoCard: React.FC<BentoCardProps> = ({
  name,
  className,
  background,
  Icon,
  description,
  subtitle,
  cta,
  onClick,
  badge,
  children,
  accent = 'amber',
  featured = false,
  spotlight = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-300);
  const mouseY = useMotionValue(-300);

  const accentStyle = accentGradients[accent] || accentGradients.amber;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-300);
    mouseY.set(-300);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      variants={cardItemVariants}
      whileHover={{ y: -3, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={spotlight ? handleMouseMove : undefined}
      onMouseLeave={spotlight ? handleMouseLeave : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer select-none touch-manipulation',
        // Glassmorphism Light & Dark Backgrounds
        'bg-white/80 dark:bg-white/[0.035]',
        // Crisp 1px borders & shadows
        'border border-slate-200/80 dark:border-white/[0.08]',
        accentStyle.borderHover,
        'shadow-sm dark:shadow-xl dark:shadow-black/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/70',
        'backdrop-blur-2xl transition-all duration-200',
        featured && 'ring-1 ring-amber-400/40 dark:ring-amber-500/30',
        className
      )}
    >
      {/* ── Spotlight Radial Glow Following Pointer (Desktop) ── */}
      {spotlight && (
        <motion.div
          className="pointer-events-none hidden md:block absolute -inset-px rounded-2xl sm:rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-1"
          style={{
            background: useMotionTemplate`
              radial-gradient(280px circle at ${mouseX}px ${mouseY}px, ${accentStyle.glow}, transparent 80%)
            `,
          }}
        />
      )}

      {/* ── Background visual / Ambient grid or glow ── */}
      {background && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {background}
        </div>
      )}

      {/* Subtle modern dot-grid texture on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.05] transition-opacity duration-500 z-0"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* ── Top Header Row with Icon and Badge ── */}
      <div className="relative z-10 p-3 sm:p-4.5 pb-1.5 sm:pb-2 flex items-start justify-between gap-2">
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300 shadow-2xs shrink-0',
              accentStyle.iconBg,
              accentStyle.iconColor
            )}
          >
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}

        {badge && <div className="shrink-0 flex items-center">{badge}</div>}
      </div>

      {/* ── Embedded Children Content if any ── */}
      {children && <div className="relative z-10 px-3 sm:px-4.5 py-1 sm:py-2 flex-1 flex flex-col justify-center">{children}</div>}

      {/* ── Bottom Text & Action CTA ── */}
      <div className="relative z-10 p-3 sm:p-4.5 pt-1.5 sm:pt-2 flex flex-col gap-0.5 sm:gap-1 transition-all duration-300">
        {subtitle && (
          <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
            {subtitle}
          </span>
        )}
        <h3 className="text-xs sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5 truncate">
          {name}
        </h3>
        {description && (
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5 leading-snug sm:leading-relaxed">
            {description}
          </div>
        )}
        {cta && (
          <div
            className={cn(
              'mt-2 sm:mt-2.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold transition-all duration-200',
              accentStyle.ctaColor
            )}
          >
            <span className="tracking-tight">{cta}</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
          </div>
        )}
      </div>

      {/* Bottom Subtle Gradient Accent Line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/30 dark:via-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
};
