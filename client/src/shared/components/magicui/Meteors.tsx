import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface MeteorsProps {
  number?: number;
  className?: string;
}

export const Meteors: React.FC<MeteorsProps> = ({ number = 20, className }) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>([]);

  useEffect(() => {
    const styles = [...new Array(number)].map(() => ({
      top: -5,
      left: Math.floor(Math.random() * window.innerWidth) + 'px',
      animationDelay: Math.random() * 1 + 0.2 + 's',
      animationDuration: Math.floor(Math.random() * 8 + 2) + 's',
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          style={style}
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 size-0.5 rotate-[215deg] animate-meteor rounded-full bg-amber-400 shadow-[0_0_0_1px_#ffffff10]',
            'before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-amber-400 before:to-transparent',
            className
          )}
        />
      ))}
    </div>
  );
};
