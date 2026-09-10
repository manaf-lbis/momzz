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
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-transparent dark:bg-[#080912]/85 transition-colors duration-300"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <style>{`
        /* Smooth, infrequent neuron impulse traveling along scribble curves */
        .neuron-pulse {
          stroke-dasharray: 140 1200;
          stroke-dashoffset: 1140;
          opacity: 0;
          will-change: stroke-dashoffset, opacity;
        }

        /* Forward pulse 1: 15s cycle, active for ~4.5s (0% -> 30%), rests 70% */
        .neuron-pulse-1 {
          animation: neuronTravelForward 15s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 0s;
        }

        /* Reverse pulse 2: 17s cycle, active for ~4.8s (0% -> 28%), rests 72% */
        .neuron-pulse-2 {
          animation: neuronTravelReverse 17s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 5s;
        }

        /* Forward pulse 3: 16s cycle, active for ~4.5s (0% -> 28%), rests 72% */
        .neuron-pulse-3 {
          animation: neuronTravelForward 16s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 10s;
        }

        /* Reverse pulse 4: 18s cycle, active for ~4.8s (0% -> 27%), rests 73% */
        .neuron-pulse-4 {
          animation: neuronTravelReverse 18s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 2.5s;
        }

        @keyframes neuronTravelForward {
          0% {
            stroke-dashoffset: 1140;
            opacity: 0;
          }
          4% {
            opacity: 0.85;
          }
          24% {
            opacity: 0.85;
          }
          28%, 100% {
            stroke-dashoffset: -140;
            opacity: 0;
          }
        }

        @keyframes neuronTravelReverse {
          0% {
            stroke-dashoffset: -140;
            opacity: 0;
          }
          4% {
            opacity: 0.8;
          }
          24% {
            opacity: 0.8;
          }
          28%, 100% {
            stroke-dashoffset: 1140;
            opacity: 0;
          }
        }

        /* Synaptic junction nodes gentle, infrequent breathing */
        .neuron-node-1 {
          animation: neuronNodePulse 15s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 1.5s;
        }
        .neuron-node-2 {
          animation: neuronNodePulse 17s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 6.5s;
        }
        .neuron-node-3 {
          animation: neuronNodePulse 16s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 11.5s;
        }
        .neuron-node-4 {
          animation: neuronNodePulse 18s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          animation-delay: 4s;
        }

        @keyframes neuronNodePulse {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.9);
          }
          10% {
            opacity: 0.85;
            transform: scale(1.35);
          }
          22% {
            opacity: 0.25;
            transform: scale(0.9);
          }
        }
      `}</style>

      {/* ── Minimal Scribble Continuous Line Art with Neuron Pulses ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle soft glow filter for traveling electrical pulses */}
          <filter id="neuron-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Halo filter for synaptic nodes */}
          <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── BASE SCRIBBLE LINES (Static neutral backdrop - softened in light mode) ── */}
        <g className="opacity-10 dark:opacity-15 text-slate-400 dark:text-amber-400">
          {/* Scribble Curve 1 — Sweeping diagonal loop */}
          <path
            d="M-80,180 C180,40 380,420 680,210 C980,0 1120,440 1380,260 C1480,190 1560,320 1620,280"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
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
        </g>

        {/* ── NEURON IMPULSE TRAVELERS (Layer 1: Soft Ambient Halo) ── */}
        <g filter="url(#neuron-glow)" className="text-amber-500 dark:text-amber-400 opacity-60 dark:opacity-50">
          <path
            d="M-80,180 C180,40 380,420 680,210 C980,0 1120,440 1380,260 C1480,190 1560,320 1620,280"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-1"
          />
          <path
            d="M-100,420 C160,560 380,260 740,510 C1100,760 1280,360 1580,480"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.6"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-2"
          />
          <path
            d="M80,820 C340,680 560,920 860,740 C1160,560 1380,800 1560,690"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-3"
          />
          <path
            d="M180,-30 C380,140 680,-40 920,130 C1160,300 1360,70 1540,160"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-4"
          />
        </g>

        {/* ── NEURON IMPULSE TRAVELERS (Layer 2: Crisp Bright Core) ── */}
        <g className="opacity-40 dark:opacity-100 text-amber-500 dark:text-yellow-200">
          <path
            d="M-80,180 C180,40 380,420 680,210 C980,0 1120,440 1380,260 C1480,190 1560,320 1620,280"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-1"
          />
          <path
            d="M-100,420 C160,560 380,260 740,510 C1100,760 1280,360 1580,480"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-2"
          />
          <path
            d="M80,820 C340,680 560,920 860,740 C1160,560 1380,800 1560,690"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-3"
          />
          <path
            d="M180,-30 C380,140 680,-40 920,130 C1160,300 1360,70 1540,160"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            pathLength="1000"
            className="neuron-pulse neuron-pulse-4"
          />
        </g>

        {/* ── SUBTLE SYNAPSE JUNCTION NODES ── */}
        <g className="opacity-40 dark:opacity-100 text-amber-500 dark:text-amber-400">
          {/* Node 1: upper crest of Curve 1 */}
          <g className="neuron-node-1" style={{ transformOrigin: '680px 210px' }}>
            <circle cx="680" cy="210" r="5" fill="currentColor" opacity="0.2" filter="url(#node-glow)" />
            <circle cx="680" cy="210" r="2.2" fill="currentColor" opacity="0.75" />
            <circle cx="680" cy="210" r="1" fill="#fff" opacity="0.85" />
          </g>

          {/* Node 2: mid junction near Curve 2 */}
          <g className="neuron-node-2" style={{ transformOrigin: '740px 510px' }}>
            <circle cx="740" cy="510" r="5" fill="currentColor" opacity="0.2" filter="url(#node-glow)" />
            <circle cx="740" cy="510" r="2" fill="currentColor" opacity="0.75" />
            <circle cx="740" cy="510" r="1" fill="#fff" opacity="0.85" />
          </g>

          {/* Node 3: lower node near Curve 3 */}
          <g className="neuron-node-3" style={{ transformOrigin: '860px 740px' }}>
            <circle cx="860" cy="740" r="5" fill="currentColor" opacity="0.2" filter="url(#node-glow)" />
            <circle cx="860" cy="740" r="2.2" fill="currentColor" opacity="0.75" />
            <circle cx="860" cy="740" r="1" fill="#fff" opacity="0.85" />
          </g>

          {/* Node 4: gentle high node near Curve 4 */}
          <g className="neuron-node-4" style={{ transformOrigin: '920px 130px' }}>
            <circle cx="920" cy="130" r="4.5" fill="currentColor" opacity="0.2" filter="url(#node-glow)" />
            <circle cx="920" cy="130" r="1.8" fill="currentColor" opacity="0.7" />
            <circle cx="920" cy="130" r="0.9" fill="#fff" opacity="0.8" />
          </g>
        </g>
      </svg>

      {/* ── Very subtle, minimal warm ambient breath at top ── */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full pointer-events-none opacity-10 dark:opacity-10"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {/* ── Soft Neutral Corner Vignette (dark mode only for atmosphere) ── */}
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 60%, rgba(0, 0, 0, 0.25) 100%)',
        }}
      />
    </div>
  );
};

export const ModernAppBackground = FluidCanvasBackground;
