import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

interface GsapPageTransitionProps {
  children: React.ReactNode;
}

export const GsapPageTransition: React.FC<GsapPageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    const bar = topBarRef.current;
    if (!el) return;

    // Kill any active tweens on the elements
    gsap.killTweensOf(el);
    if (bar) gsap.killTweensOf(bar);

    const ctx = gsap.context(() => {
      // 1. Sleek top ambient beam animation on page switch
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0, opacity: 1, transformOrigin: 'left center' },
          {
            scaleX: 1,
            duration: 0.4,
            ease: 'power3.inOut',
            onComplete: () => {
              gsap.to(bar, { opacity: 0, duration: 0.25, ease: 'power2.out' });
            },
          }
        );
      }

      // 2. Modern Silk-Smooth Page Entrance (Subtle lift + Micro-scale + Blur dissolve)
      gsap.fromTo(
        el,
        {
          opacity: 0,
          y: 10,
          scale: 0.994,
          filter: 'blur(3px)',
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.34,
          ease: 'power2.out',
          clearProps: 'transform,filter',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <div className="relative w-full min-h-screen">
      {/* Top Ambient Route Switch Glow Indicator */}
      <div
        ref={topBarRef}
        className="fixed top-0 left-0 right-0 h-[2px] z-[9999] pointer-events-none bg-gradient-to-r from-amber-500 via-amber-400 via-50% to-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
      />
      {/* Animated Page Container */}
      <div ref={containerRef} className="w-full min-h-screen">
        {children}
      </div>
    </div>
  );
};
