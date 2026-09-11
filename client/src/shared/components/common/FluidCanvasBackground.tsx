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

      {/* ── Luxury Organic Artwork Layer: Dual-Optimized for Mobile & Desktop ── */}
      {/* 
        Uses `/background.png` in Light Mode and `/background-dark.png` in Dark Mode.
        In Dark Mode:
        - Deep void background (#080911)
        - Clean, crisp, high-aesthetic warm amber-gold botanical leaves and flowing wave curves
        - No muddy CSS invert or blur wash
        - No harsh overpowering glowing spots
      */}

      {/* Mobile/Tablet Layer (visible < md): Top-left & Top leaf cluster */}
      <div
        className={`md:hidden absolute -top-3 -left-3 w-[85vw] h-[48vh] max-w-[400px] max-h-[340px] bg-no-repeat bg-left-top transition-all duration-700 pointer-events-none ${
          isDark
            ? 'opacity-[0.85] mix-blend-screen'
            : 'opacity-[0.62] mix-blend-multiply contrast-[1.15]'
        }`}
        style={{
          backgroundImage: `url(${isDark ? '/background-dark.png' : '/background.png'})`,
          backgroundSize: '160% auto',
          maskImage: 'radial-gradient(ellipse 90% 90% at 20% 20%, black 50%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 20% 20%, black 50%, transparent 95%)',
        }}
      />

      {/* Mobile/Tablet Layer (visible < md): Bottom-right wave & leaf sprig cluster */}
      <div
        className={`md:hidden absolute -bottom-3 -right-3 w-[90vw] h-[52vh] max-w-[440px] max-h-[380px] bg-no-repeat bg-right-bottom transition-all duration-700 pointer-events-none ${
          isDark
            ? 'opacity-[0.85] mix-blend-screen'
            : 'opacity-[0.65] mix-blend-multiply contrast-[1.15]'
        }`}
        style={{
          backgroundImage: `url(${isDark ? '/background-dark.png' : '/background.png'})`,
          backgroundSize: '160% auto',
          maskImage: 'radial-gradient(ellipse 95% 95% at 80% 80%, black 50%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at 80% 80%, black 50%, transparent 95%)',
        }}
      />

      {/* Mobile/Tablet Layer (visible < md): Delicate bottom-left leaf sprig */}
      <div
        className={`md:hidden absolute -bottom-4 -left-4 w-[70vw] h-[40vh] max-w-[320px] max-h-[280px] bg-no-repeat bg-left-bottom transition-all duration-700 pointer-events-none ${
          isDark
            ? 'opacity-[0.82] mix-blend-screen'
            : 'opacity-[0.58] mix-blend-multiply contrast-[1.15]'
        }`}
        style={{
          backgroundImage: `url(${isDark ? '/background-dark.png' : '/background.png'})`,
          backgroundSize: '180% auto',
          maskImage: 'radial-gradient(ellipse 90% 90% at 20% 80%, black 45%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 20% 80%, black 45%, transparent 95%)',
        }}
      />

      {/* Desktop/Tablet Full-Canvas Layer (visible md+) */}
      <div
        className={`hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ${
          isDark
            ? 'opacity-[0.75] mix-blend-screen'
            : 'opacity-[0.50] mix-blend-multiply contrast-[1.1]'
        }`}
        style={{
          backgroundImage: `url(${isDark ? '/background-dark.png' : '/background.png'})`,
        }}
      />

      {/* ── Ambient Glow (Light mode only — clean zero-bleed in dark mode) ── */}
      {!isDark && (
        <>
          <div className="absolute -top-32 -left-32 w-[380px] sm:w-[550px] h-[380px] sm:h-[550px] rounded-full blur-[90px] sm:blur-[110px] pointer-events-none bg-rose-300/25" />
          <div className="absolute -bottom-36 -right-36 w-[420px] sm:w-[600px] h-[420px] sm:h-[600px] rounded-full blur-[100px] sm:blur-[120px] pointer-events-none bg-amber-200/35" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-[750px] h-[400px] sm:h-[500px] rounded-full blur-[100px] sm:blur-[130px] pointer-events-none bg-white/40" />
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background:
                'radial-gradient(ellipse 95% 90% at 50% 50%, transparent 60%, rgba(240, 230, 225, 0.4) 100%)',
            }}
          />
        </>
      )}
    </div>
  );
};

export const FluidCanvasBackground = ModernAppBackground;
