import React, { useMemo } from 'react';
import { useTheme } from '../../../features/auth/context/ThemeContext';

/**
 * BotanicalVectorArt
 * Pure high-definition scalable SVG botanical artwork matching the user's reference illustration:
 * - Top-left palm/fern frond and organic wave blob
 * - Top monstera leaf with inner segmented slits
 * - Top-right eucalyptus sprig
 * - Bottom-left ribbed monstera / palm foliage with delicate vein ribs
 * - Bottom-right layered concentric organic wave contours and soft flowing hills
 * 
 * In Light Mode:
 *   Earthy warm taupe, blush, rosewood, and dusty cedar strokes and fills.
 * In Dark Mode:
 *   Subtle champagne gold, warm bronze, and amber-gold line art with soft dark-void tints (#080911).
 *   Ultra sharp at any screen resolution, 0 image lag, 0 heavy asset downloads!
 */
export const BotanicalVectorArt: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const colors = useMemo(() => {
    if (isDark) {
      return {
        // Deep luxury dark mode palette
        blob1: 'rgba(245, 158, 11, 0.04)',      // soft warm amber tint
        blob2: 'rgba(217, 119, 6, 0.035)',     // subtle bronze tint
        leafStrokePrimary: '#f59e0b',           // warm amber gold stroke
        leafStrokeSecondary: '#d97706',         // deep gold stroke
        leafFillSoft: 'rgba(245, 158, 11, 0.06)',
        waveLine: 'rgba(245, 158, 11, 0.18)',   // concentric wave lines
        opacity: 0.85,
      };
    }
    return {
      // Warm boho aesthetic light mode palette (matching original illustration)
      blob1: 'rgba(212, 175, 170, 0.55)',      // soft dusty mauve/terracotta
      blob2: 'rgba(228, 196, 191, 0.45)',      // delicate blush sand
      leafStrokePrimary: '#645052',            // deep espresso taupe
      leafStrokeSecondary: '#786164',          // warm cedar
      leafFillSoft: 'rgba(212, 175, 170, 0.35)',
      waveLine: 'rgba(212, 175, 170, 0.75)',   // concentric contour lines
      opacity: 0.95,
    };
  }, [isDark]);

  return (
    <svg
      viewBox="0 0 1000 660"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-700 select-none"
      style={{ opacity: colors.opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradients for smooth organic wave depth */}
        <linearGradient id="topBlobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.blob1} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        <linearGradient id="bottomWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.blob1} />
          <stop offset="100%" stopColor={colors.blob2} />
        </linearGradient>

        <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={isDark ? '#f59e0b' : '#645052'} floodOpacity={isDark ? "0.2" : "0.08"} />
        </filter>
      </defs>

      {/* ── 1. BACKGROUND ORGANIC COLOR BLOBS (Corners & Edges) ── */}
      {/* Top Left Organic Shape */}
      <path
        d="M -20,-20 L 220,-20 C 190,70 240,150 140,210 C 60,260 -20,220 -20,180 Z"
        fill="url(#topBlobGrad)"
      />

      {/* Top Right Curved Mass */}
      <path
        d="M 740,-20 C 780,60 840,90 910,70 C 970,50 1020,10 1020,-20 Z"
        fill={colors.blob2}
      />
      <path
        d="M 860,-20 C 890,70 940,120 1020,140 L 1020,-20 Z"
        fill={colors.blob1}
      />

      {/* Bottom Right Flowing Hill Layer 1 */}
      <path
        d="M 380,680 C 440,580 560,570 660,600 C 780,630 840,510 930,470 C 980,440 1020,460 1020,460 L 1020,680 Z"
        fill="url(#bottomWaveGrad)"
      />

      {/* Bottom Left Flowing Swell */}
      <path
        d="M -20,380 C 60,360 150,380 200,450 C 260,530 200,640 140,680 L -20,680 Z"
        fill={colors.blob2}
      />

      {/* ── 2. BOTTOM-RIGHT CONCENTRIC ARCHITECTURAL CURVE LINES ── */}
      <g stroke={colors.waveLine} fill="none" strokeWidth="1.8" strokeLinecap="round">
        <path d="M 520,530 C 640,470 780,470 910,505" />
        <path d="M 545,550 C 660,495 785,495 900,528" />
        <path d="M 580,572 C 685,525 790,525 890,555" />
      </g>

      {/* ── 3. TOP-LEFT BOTANICAL PALM / FERN FROND ── */}
      <g filter="url(#subtleGlow)">
        {/* Main Stem */}
        <path
          d="M -5,220 C 15,170 35,110 185,150"
          stroke={colors.leafStrokePrimary}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Palm Leaflets (Solid / Silhouette Style) */}
        {/* Left leaflets */}
        <path
          d="M 12,185 C 2,160 5,130 35,120 C 35,140 28,165 12,185 Z"
          fill={colors.leafStrokePrimary}
        />
        <path
          d="M 32,150 C 20,120 28,88 65,80 C 62,105 52,130 32,150 Z"
          fill={colors.leafStrokePrimary}
        />
        <path
          d="M 58,125 C 45,90 60,58 98,52 C 92,78 80,105 58,125 Z"
          fill={colors.leafStrokePrimary}
        />
        <path
          d="M 90,110 C 80,72 102,40 140,35 C 132,62 118,92 90,110 Z"
          fill={colors.leafStrokePrimary}
        />
        <path
          d="M 130,115 C 125,78 152,48 188,48 C 178,75 162,102 130,115 Z"
          fill={colors.leafStrokePrimary}
        />

        {/* Right leaflets */}
        <path
          d="M 38,198 C 50,175 75,165 88,185 C 72,198 55,202 38,198 Z"
          fill={colors.leafStrokePrimary}
        />
        <path
          d="M 68,172 C 85,145 115,138 126,160 C 108,175 88,180 68,172 Z"
          fill={colors.leafStrokePrimary}
        />
        <path
          d="M 105,155 C 125,128 158,125 168,148 C 148,162 128,165 105,155 Z"
          fill={colors.leafStrokePrimary}
        />
      </g>

      {/* ── 4. TOP-CENTER MONSTERA / BANANA LEAF (With Slits & Central Vein) ── */}
      <g filter="url(#subtleGlow)">
        {/* Leaf Outer Contour */}
        <path
          d="M 550,-10 C 585,45 615,95 640,125 C 670,75 710,25 735,-10 Z"
          fill={colors.leafFillSoft}
          stroke={colors.leafStrokePrimary}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Central Spine */}
        <path
          d="M 645,-10 L 640,125"
          stroke={colors.leafStrokePrimary}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Angular Inner Segment Cuts */}
        <path d="M 643,30 L 590,10" stroke={colors.leafStrokePrimary} strokeWidth="1.8" />
        <path d="M 642,65 L 575,55" stroke={colors.leafStrokePrimary} strokeWidth="1.8" />
        <path d="M 641,95 L 605,92" stroke={colors.leafStrokePrimary} strokeWidth="1.8" />
        <path d="M 643,45 L 695,30" stroke={colors.leafStrokePrimary} strokeWidth="1.8" />
        <path d="M 642,80 L 680,75" stroke={colors.leafStrokePrimary} strokeWidth="1.8" />
      </g>

      {/* ── 5. TOP-RIGHT BERRY / EUCALYPTUS FOLIAGE SPRIG ── */}
      <g filter="url(#subtleGlow)">
        {/* Main Stem */}
        <path
          d="M 1010,75 C 970,95 940,130 920,205"
          stroke={colors.leafStrokePrimary}
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Rounded eucalyptus paddles */}
        <ellipse cx="948" cy="85" rx="16" ry="24" transform="rotate(-35 948 85)" fill={colors.leafStrokePrimary} />
        <ellipse cx="985" cy="115" rx="15" ry="22" transform="rotate(25 985 115)" fill={colors.leafStrokePrimary} />
        <ellipse cx="930" cy="145" rx="14" ry="20" transform="rotate(-40 930 145)" fill={colors.leafStrokePrimary} />
        <ellipse cx="955" cy="178" rx="12" ry="18" transform="rotate(20 955 178)" fill={colors.leafStrokePrimary} />
      </g>

      {/* ── 6. BOTTOM-LEFT DETAILED MONSTERA RIBBED LEAF SPRIG ── */}
      <g filter="url(#subtleGlow)">
        {/* Primary Arching Stem */}
        <path
          d="M -15,660 C 25,580 85,520 280,470"
          stroke={colors.leafStrokePrimary}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Detailed Veined Foliage Pairs */}
        {/* Leaf 1 (Top Tip) */}
        <g>
          <path
            d="M 280,470 C 265,430 220,445 195,485 C 225,492 258,485 280,470 Z"
            fill={colors.leafFillSoft}
            stroke={colors.leafStrokePrimary}
            strokeWidth="2"
          />
          <path d="M 205,480 L 270,472" stroke={colors.leafStrokePrimary} strokeWidth="1.5" />
          <path d="M 225,465 L 245,477" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
          <path d="M 245,455 L 260,474" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
        </g>

        {/* Leaf 2 (Upper Left) */}
        <g>
          <path
            d="M 205,485 C 160,460 120,490 125,545 C 160,535 190,510 205,485 Z"
            fill={colors.leafFillSoft}
            stroke={colors.leafStrokePrimary}
            strokeWidth="2"
          />
          <path d="M 132,535 L 198,492" stroke={colors.leafStrokePrimary} strokeWidth="1.5" />
          <path d="M 145,502 L 165,518" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
          <path d="M 168,488 L 185,505" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
          <path d="M 152,530 L 175,512" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
        </g>

        {/* Leaf 3 (Lower Right) */}
        <g>
          <path
            d="M 175,515 C 185,565 155,605 105,625 C 115,580 145,540 175,515 Z"
            fill={colors.leafFillSoft}
            stroke={colors.leafStrokePrimary}
            strokeWidth="2"
          />
          <path d="M 115,615 L 170,525" stroke={colors.leafStrokePrimary} strokeWidth="1.5" />
          <path d="M 132,572 L 152,555" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
          <path d="M 148,595 L 164,575" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
        </g>

        {/* Leaf 4 (Lower Left Stem Accent) */}
        <g>
          <path
            d="M 110,545 C 65,530 30,570 38,625 C 68,605 95,575 110,545 Z"
            fill={colors.leafFillSoft}
            stroke={colors.leafStrokePrimary}
            strokeWidth="2"
          />
          <path d="M 45,615 L 105,552" stroke={colors.leafStrokePrimary} strokeWidth="1.5" />
          <path d="M 58,575 L 78,590" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
          <path d="M 78,555 L 95,572" stroke={colors.leafStrokePrimary} strokeWidth="1.3" />
        </g>
      </g>
    </svg>
  );
};

export const ModernAppBackground: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden transition-colors duration-500"
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
      {/* ── Base Tint Canvas ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isDark
            ? 'bg-[#080911]'
            : 'bg-gradient-to-br from-[#fbf8f7] via-[#f7f3f1] to-[#f4eeea]'
        }`}
      />

      {/* ── Pure Scalable Vector Artwork Layer (0 heavy assets, 100% crisp!) ── */}
      <BotanicalVectorArt isDark={isDark} />

      {/* ── Subtle Ambient Warmth (Light mode only) ── */}
      {!isDark && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, transparent 60%, rgba(240, 230, 225, 0.4) 100%)',
          }}
        />
      )}
    </div>
  );
};

export const FluidCanvasBackground = ModernAppBackground;
export default ModernAppBackground;
