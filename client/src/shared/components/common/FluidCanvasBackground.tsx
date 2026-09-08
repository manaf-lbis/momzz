import React from 'react';

/**
 * Minimal, standard, clean glassmorphic background.
 * - 100% stationary (fixed to viewport, never scrolls).
 * - Minimal, subtle, clean uniform technical grid.
 * - Calm, distraction-free neutral canvas.
 */
export const FluidCanvasBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none -z-10 overflow-hidden bg-[#f4f5f8] dark:bg-[#080912] transition-colors duration-300"
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
      {/* ── Minimal Standard Clean Grid (Fixed) ── */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-18 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      {/* ── Very subtle, minimal warm ambient breath at top ── */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full pointer-events-none opacity-20 dark:opacity-10"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {/* ── Soft Neutral Corner Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 60%, rgba(0, 0, 0, 0.25) 100%)',
        }}
      />
    </div>
  );
};

export const ModernAppBackground = FluidCanvasBackground;
