import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ className, children, delay = 1000 }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const childrenArray = React.Children.toArray(children);

    useEffect(() => {
      const interval = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
      }, delay);

      return () => clearInterval(interval);
    }, [childrenArray.length, delay]);

    const itemsToShow = useMemo(
      () => childrenArray.slice(0, index + 1).reverse(),
      [index, childrenArray]
    );

    return (
      <div className={cn('flex flex-col items-center gap-2.5', className)}>
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedList.displayName = 'AnimatedList';

export function AnimatedListItem({ children }: { children: ReactNode }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: 'spring' as const, stiffness: 350, damping: 30 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

// Static animated container for standard dynamic lists where all items render with layout animations
export const AnimatedListContainer: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </div>
  );
};
