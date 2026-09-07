import React, { PropsWithChildren, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, MotionValue, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface DockProps {
  className?: string;
  magnification?: number;
  distance?: number;
  direction?: 'top' | 'middle' | 'bottom';
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 58;
const DEFAULT_DISTANCE = 130;

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      magnification = DEFAULT_MAGNIFICATION,
      distance = DEFAULT_DISTANCE,
      direction = 'bottom',
      ...props
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity);

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...(child.props as object),
            mouseX: mouseX,
            magnification: magnification,
            distance: distance,
          });
        }
        return child;
      });
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(
          'mx-auto w-max flex items-center gap-1.5 sm:gap-2 rounded-2xl sm:rounded-3xl border p-1.5 sm:p-2 backdrop-blur-2xl transition-all select-none',
          {
            'items-start': direction === 'top',
            'items-center': direction === 'middle',
            'items-end': direction === 'bottom',
          },
          'bg-white/85 dark:bg-[#0c0d18]/85 border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_50px_-8px_rgba(0,0,0,0.8)] ring-1 ring-black/5 dark:ring-white/[0.06]',
          className
        )}
      >
        {renderChildren()}
      </motion.div>
    );
  }
);

Dock.displayName = 'Dock';

export interface DockIconProps {
  size?: number;
  magnification?: number;
  distance?: number;
  mouseX?: MotionValue<number>;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}

export const DockIcon = ({
  size = 40,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  onClick,
  title,
  active,
}: PropsWithChildren<DockIconProps>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const defaultMouseX = useMotionValue(Infinity);
  const effectiveMouseX = mouseX || defaultMouseX;

  const distanceCalc = useTransform(effectiveMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { left: 0, width: 0 };
    return val - bounds.left - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 160,
    damping: 14,
  });

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip Popup */}
      <AnimatePresence>
        {isHovered && title && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.85 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap rounded-lg bg-slate-900/90 dark:bg-white/95 px-2 py-0.5 text-[10px] font-mono font-bold text-white dark:text-slate-950 shadow-lg backdrop-blur-md"
          >
            {title}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/90 dark:border-t-white/95" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={ref}
        style={{ width, height: width }}
        onClick={onClick}
        className={cn(
          'relative flex aspect-square cursor-pointer items-center justify-center rounded-xl sm:rounded-2xl p-2 transition-colors duration-150',
          active
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md shadow-slate-900/25 dark:shadow-white/15 ring-1 ring-black/10 dark:ring-white/20'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white',
          className
        )}
        whileTap={{ scale: 0.9 }}
      >
        {children}
        {active && (
          <motion.span
            layoutId="dock-active-dot"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]"
          />
        )}
      </motion.div>
    </div>
  );
};

DockIcon.displayName = 'DockIcon';

export const DockSeparator = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'h-6 sm:h-7 w-[1px] bg-slate-200/80 dark:bg-white/10 my-auto mx-0.5 sm:mx-1 shrink-0 pointer-events-none',
      className
    )}
  />
);

DockSeparator.displayName = 'DockSeparator';

