import React from 'react';

/**
 * Clean, fixed glassmorphic application background.
 * - Stays 100% stationary (does NOT scroll with page content).
 * - Clean, subtle geometric micro-dot grid pattern.
 * - Soft, understated ambient tone without harsh or glaring neon orbs.
 */
export const FluidCanvasBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none -z-10 overflow-hidden bg-[#f4f5f8] dark:bg-[#070810] transition-colors duration-300"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
      }}
      aria-hidden="true"
    >
      {/* ── Clean Geometric Micro-Dot Grid Pattern (Fixed in Viewport) ── */}
      <div
        className="absolute inset-0 opacity-45 dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Soft, non-glaring ambient vignette around edges ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, transparent 50%, rgba(0, 0, 0, 0.28) 100%)',
        }}
      />
    </div>
  );
};

export const ModernAppBackground = FluidCanvasBackground;
