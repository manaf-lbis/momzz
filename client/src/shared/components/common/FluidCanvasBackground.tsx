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
      {/* ── 1. Automotive Blueprint / Technical Fine Grid Pattern (Fixed) ── */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage:
            'radial-gradient(ellipse 90% 85% at 50% 45%, black 50%, transparent 95%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 85% at 50% 45%, black 50%, transparent 95%)',
        }}
      />

      {/* ── 2. Subtle Micro Carbon Diagonal Mesh ── */}
      <div
        className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 8px)
          `,
        }}
      />

      {/* ── 3. Moody Ambient Light Gradients (Provides depth for frosted glass cards to blur) ── */}
      {/* Warm Golden Glow at Top Center */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full pointer-events-none opacity-45 dark:opacity-28"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.15) 50%, transparent 75%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Deep Indigo/Violet Accent on Left */}
      <div
        className="absolute top-1/3 -left-32 w-[650px] h-[650px] rounded-full pointer-events-none opacity-35 dark:opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(79, 70, 229, 0.1) 50%, transparent 70%)',
          filter: 'blur(110px)',
        }}
      />

      {/* Subtle Cyan/Teal Accent on Bottom Right */}
      <div
        className="absolute bottom-10 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30 dark:opacity-15"
        style={{
          background:
            'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, transparent 70%)',
          filter: 'blur(110px)',
        }}
      />

      {/* ── 4. Edge Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 95% 85% at 50% 45%, transparent 55%, rgba(0, 0, 0, 0.4) 100%)',
        }}
      />
    </div>
  );
};

export const ModernAppBackground = FluidCanvasBackground;
