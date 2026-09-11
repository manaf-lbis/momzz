import React from 'react';
import { useTheme } from '../../../features/auth/context/ThemeContext';

/**
 * ModernAppBackground
 *
 * Modern aesthetic background component inspired by organic waves & botanical aesthetics:
 * - Uses the custom high-res organic visual artwork (/background.png).
 * - Multi-mode optimization:
 *     - Light mode: Warm, delicate cream/blush tones with subtle organic overlay.
 *     - Dark mode: Ultra-sleek deep void (#080911) with rich contrast and luminous low-opacity highlights.
 * - Hardware-accelerated with CSS pointer-events-none, fixed positioning, and zero scroll lag.
 */
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

      {/* ── Luxury Organic Artwork Layer (/background.png) ── */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ${
          isDark
            ? 'opacity-[0.14] invert hue-rotate-180 brightness-[0.75] contrast-[1.25] mix-blend-screen'
            : 'opacity-[0.42] mix-blend-multiply contrast-[1.05]'
        }`}
        style={{
          backgroundImage: 'url(/background.png)',
        }}
      />

      {/* ── Soft Ambient Radial Lights (Warm Golden & Rose Undertones) ── */}
      {/* Top Left Organic Glow */}
      <div
        className={`absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full blur-[110px] pointer-events-none transition-opacity duration-700 ${
          isDark
            ? 'bg-amber-500/10'
            : 'bg-rose-300/25'
        }`}
      />

      {/* Bottom Right Counter Glow */}
      <div
        className={`absolute -bottom-36 -right-36 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-700 ${
          isDark
            ? 'bg-amber-600/[0.08]'
            : 'bg-amber-200/35'
        }`}
      />

      {/* Center Subtle Breath */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[500px] rounded-full blur-[130px] pointer-events-none transition-opacity duration-700 ${
          isDark
            ? 'bg-slate-800/20'
            : 'bg-white/40'
        }`}
      />

      {/* ── Vignette for Premium Depth Framing (Dark mode) ── */}
      {isDark && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 55%, rgba(4, 4, 8, 0.6) 100%)',
          }}
        />
      )}

      {/* ── Subtle Glass Micro-Texture Gradients (Light mode) ── */}
      {!isDark && (
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, transparent 60%, rgba(240, 230, 225, 0.5) 100%)',
          }}
        />
      )}
    </div>
  );
};

export const FluidCanvasBackground = ModernAppBackground;
