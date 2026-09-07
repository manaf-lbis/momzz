import React from "react";

/**
 * Modern luxury app background with liquid ambient light orbs,
 * tech micro-dot mesh, and harmonic wave contours.
 * Works seamlessly across both dark and light modes.
 */
export const FluidCanvasBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-[#f6f5f2] dark:bg-[#080811] transition-colors duration-300"
      aria-hidden="true"
    >
      {/* ── 1. Tech Micro-Dot Grid Layer with Radial Vignette ── */}
      <div
        className="absolute inset-0 opacity-60 dark:opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148, 163, 184, 0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 90% 90% at 50% 35%, black 45%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 90% at 50% 35%, black 45%, transparent 100%)",
        }}
      />

      {/* ── 2. Fluid Ambient Glowing Orbs ── */}
      {/* Amber/Gold Top-Center Beam */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-65 dark:opacity-40 animate-pulse-glow"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.5) 0%, rgba(251, 191, 36, 0.18) 45%, transparent 70%)",
          filter: "blur(85px)",
        }}
      />

      {/* Violet/Indigo Left Accent */}
      <div
        className="absolute top-1/4 -left-28 w-[600px] h-[600px] rounded-full opacity-50 dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.45) 0%, rgba(99, 102, 241, 0.12) 50%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />

      {/* Emerald/Cyan Bottom-Right Accent */}
      <div
        className="absolute bottom-10 -right-24 w-[550px] h-[550px] rounded-full opacity-45 dark:opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, rgba(56, 189, 248, 0.1) 50%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />

      {/* ── 3. Fluid Harmonic Wave Streams ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30 dark:opacity-12 text-amber-500/40 dark:text-amber-400/20"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <path
          d="M-100,180 C300,40 600,320 1000,160 C1300,30 1500,200 1600,140"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M-100,260 C320,110 580,390 1020,240 C1320,100 1480,280 1600,210"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M-100,340 C340,190 560,460 1040,320 C1340,180 1460,350 1600,290"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />

        {/* Secondary overlapping stream in violet */}
        <g className="text-violet-500/30 dark:text-violet-400/15">
          <path
            d="M-100,620 C200,770 500,470 900,700 C1200,840 1400,620 1600,740"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M-100,700 C220,840 480,540 920,770 C1220,910 1380,690 1600,810"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </g>
      </svg>

      {/* ── 4. Subtle Ambient Light/Dark Gradient Wash ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-100/40 dark:to-[#07080e]/60 pointer-events-none" />
    </div>
  );
};

export const ModernAppBackground = FluidCanvasBackground;