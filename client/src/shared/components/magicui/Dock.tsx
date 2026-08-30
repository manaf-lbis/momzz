import React, { PropsWithChildren, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface DockProps {
  className?: string;
  magnification?: number;
  distance?: number;
  direction?: 'top' | 'middle' | 'bottom';
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

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
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(
          'mx-auto w-max mt-auto flex items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl transition-all',
          {
            'items-start': direction === 'top',
            'items-center': direction === 'middle',
            'items-end': direction === 'bottom',
          },
          'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/10',
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

  const defaultMouseX = useMotionValue(Infinity);
  const effectiveMouseX = mouseX || defaultMouseX;

  const distanceCalc = useTransform(effectiveMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width, height: width }}
      onClick={onClick}
      className={cn(
        'relative flex aspect-square cursor-pointer items-center justify-center rounded-xl p-2 transition-all',
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md shadow-slate-900/20 dark:shadow-white/10 ring-1 ring-black/10 dark:ring-white/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white',
        className
      )}
      title={title}
      whileTap={{ scale: 0.9 }}
    >
      {children}
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500 shadow-xs shadow-amber-500" />
      )}
    </motion.div>
  );
};

DockIcon.displayName = 'DockIcon';
