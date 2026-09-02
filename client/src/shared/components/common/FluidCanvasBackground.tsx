import React from "react";

/**
 * Modern fluid organic wave canvas background with liquid gradient contours and glowing orbs.
 * Sits behind the frosted glass cards to create true glassmorphism depth.
 */
export const FluidCanvasBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
      {/* 1. Fluid Ambient Glowing Orbs */}
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-40 dark:opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.45) 0%, rgba(245,158,11,0.05) 55%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute top-1/3 -left-40 w-[550px] h-[550px] rounded-full opacity-35 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(99,102,241,0.05) 55%, transparent 70%)",
          filter: "blur(95px)",
        }}
      />
      <div
        className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full opacity-30 dark:opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(56,189,248,0.05) 55%, transparent 70%)",
          filter: "blur(85px)",
        }}
      />

      {/* 2. Fluid Organic SVG Wave Contours across background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25 dark:opacity-10 text-amber-500/40 dark:text-amber-400/20"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <path
          d="M-100,200 C300,50 600,350 1000,180 C1300,40 1500,220 1600,150"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M-100,280 C320,130 580,420 1020,260 C1320,120 1480,300 1600,230"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M-100,360 C340,210 560,490 1040,340 C1340,200 1460,380 1600,310"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M-100,440 C360,290 540,560 1060,420 C1360,280 1440,460 1600,390"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />

        {/* Secondary overlapping wave stream in violet */}
        <g className="text-violet-500/30 dark:text-violet-400/15">
          <path
            d="M-100,600 C200,750 500,450 900,680 C1200,820 1400,600 1600,720"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M-100,680 C220,820 480,520 920,750 C1220,890 1380,670 1600,790"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </g>
      </svg>

      {/* 3. Subtle Frosted Base Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/20 to-slate-50/60 dark:via-transparent dark:to-[#08090f]/70" />
    </div>
  );
};