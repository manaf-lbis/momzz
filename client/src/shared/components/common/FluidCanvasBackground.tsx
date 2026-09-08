import React from 'react';

/**
 * Minimal scribble glassmorphic background.
 * - 100% stationary (fixed to viewport, never scrolls).
 * - Elegant, minimal abstract fluid scribble / continuous line art.
 * - Clean, distraction-free neutral canvas.
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
      {/* ── Minimal Scribble Continuous Line Art (Fixed) ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-35 dark:opacity-20 text-slate-500 dark:text-amber-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Scribble Curve 1 — Sweeping diagonal loop */}
        <path
          d="M-80,180 C180,40 380,420 680,210 C980,0 1120,440 1380,260 C1480,190 1560,320 1620,280"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Scribble Curve 2 — Soft undulating counter-contour */}
        <path
          d="M-100,420 C160,560 380,260 740,510 C1100,760 1280,360 1580,480"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Scribble Curve 3 — Fluid bottom wave */}
        <path
          d="M80,820 C340,680 560,920 860,740 C1160,560 1380,800 1560,690"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Scribble Curve 4 — Delicate upper swirl */}
        <path
          d="M180,-30 C380,140 680,-40 920,130 C1160,300 1360,70 1540,160"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>

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
