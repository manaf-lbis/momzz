import React from 'react';
import { cn } from '../../lib/utils';

type TColorProp = string | string[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: TColorProp;
  className?: string;
  children?: React.ReactNode;
}

export const ShineBorder: React.FC<ShineBorderProps> = ({
  borderRadius = 16,
  borderWidth = 1.5,
  duration = 14,
  color = ['#facc15', '#f59e0b', '#fbbf24'],
  className,
  children,
}) => {
  return (
    <div
      style={
        {
          '--border-radius': `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        'relative rounded-[--border-radius] p-px',
        className
      )}
    >
      <div
        style={
          {
            '--border-width': `${borderWidth}px`,
            '--border-radius': `${borderRadius}px`,
            '--duration': `${duration}s`,
            '--mask-linear-gradient': `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            '--background-radial-gradient': `radial-gradient(transparent,transparent, ${
              Array.isArray(color) ? color.join(',') : color
            },transparent,transparent)`,
          } as React.CSSProperties
        }
        className={cn(
          'pointer-events-none before:bg-radial-gradient absolute inset-0 size-full rounded-[--border-radius] p-[--border-width] will-change-[background-position]',
          'before:absolute before:inset-0 before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[""]',
          'before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:[mask:--mask-linear-gradient] motion-safe:before:animate-shine'
        )}
      />
      {children}
    </div>
  );
};
