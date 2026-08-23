import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  className,
  size = 200,
  duration = 8,
  borderWidth = 2,
  colorFrom = '#f59e0b',
  colorTo = '#fbbf24',
  delay = 0,
}) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-20',
        className
      )}
      style={{
        padding: `${borderWidth}px`,
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
      }}
    >
      <motion.div
        className="absolute inset-[-150%] w-[400%] h-[400%]"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, ${colorFrom} 315deg, ${colorTo} 360deg)`,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          delay,
        }}
      />
    </div>
  );
};
