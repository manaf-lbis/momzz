import React from 'react';
import { useTheme } from '../../../features/auth/context/ThemeContext';

/**
 * ModernAppBackground
 *
 * Uses the exact user reference artwork (/background.png):
 * - Light Mode: Original warm boho cream aesthetic.
 * - Dark Mode: Clean, deep void (#080911) with the exact leaves & waves visible
 *   using crisp contrast without any blinding or muddy glowing spots.
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
      {/* ── Base Canvas Background ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isDark
            ? 'bg-[#080911]'
            : 'bg-gradient-to-br from-[#fbf8f7] via-[#f7f3f1] to-[#f4eeea]'
        }`}
      />

      {/* ── Mobile/Tablet Corner Botanical Vignettes (visible < md) ── */}
      {/* Top-left & Top leaf cluster */}
      <div
        className={`md:hidden absolute -top-3 -left-3 w-[85vw] h-[48vh] max-w-[400px] max-h-[340px] bg-no-repeat bg-left-top transition-all duration-700 pointer-events-none ${
          isDark
            ? 'opacity-[0.45] invert hue-rotate-180 brightness-[1.1] contrast-[1.6] mix-blend-screen'
            : 'opacity-[0.62] mix-blend-multiply contrast-[1.15]'
        }`}
        style={{
          backgroundImage: 'url(/background.png)',
          backgroundSize: '160% auto',
          maskImage: 'radial-gradient(ellipse 90% 90% at 20% 20%, black 50%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 20% 20%, black 50%, transparent 95%)',
        }}
      />

      {/* Bottom-right leaf sprig & wave cluster */}
      <div
        className={`md:hidden absolute -bottom-3 -right-3 w-[90vw] h-[52vh] max-w-[440px] max-h-[380px] bg-no-repeat bg-right-bottom transition-all duration-700 pointer-events-none ${
          isDark
            ? 'opacity-[0.48] invert hue-rotate-180 brightness-[1.1] contrast-[1.6] mix-blend-screen'
            : 'opacity-[0.65] mix-blend-multiply contrast-[1.15]'
        }`}
        style={{
          backgroundImage: 'url(/background.png)',
          backgroundSize: '160% auto',
          maskImage: 'radial-gradient(ellipse 95% 95% at 80% 80%, black 50%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at 80% 80%, black 50%, transparent 95%)',
        }}
      />

      {/* Bottom-left delicate leaf accent */}
      <div
        className={`md:hidden absolute -bottom-5 -left-5 w-[70vw] h-[40vh] max-w-[320px] max-h-[280px] bg-no-repeat bg-left-bottom transition-all duration-700 pointer-events-none ${
          isDark
            ? 'opacity-[0.42] invert hue-rotate-180 brightness-[1.1] contrast-[1.6] mix-blend-screen'
            : 'opacity-[0.58] mix-blend-multiply contrast-[1.15]'
        }`}
        style={{
          backgroundImage: 'url(/background.png)',
          backgroundSize: '180% auto',
          maskImage: 'radial-gradient(ellipse 90% 90% at 20% 80%, black 45%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 20% 80%, black 45%, transparent 95%)',
        }}
      />

      {/* ── Desktop/Tablet Full-Canvas Layer (visible md+) ── */}
      <div
        className={`hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ${
          isDark
            ? 'opacity-[0.38] invert hue-rotate-180 brightness-[1.1] contrast-[1.6] mix-blend-screen'
            : 'opacity-[0.50] mix-blend-multiply contrast-[1.1]'
        }`}
        style={{
          backgroundImage: 'url(/background.png)',
        }}
      />

      {/* ── Light Mode Delicate Warmth ── */}
      {!isDark && (
        <>
          <div className="absolute -top-32 -left-32 w-[380px] sm:w-[550px] h-[380px] sm:h-[550px] rounded-full blur-[90px] sm:blur-[110px] pointer-events-none bg-rose-300/25" />
          <div className="absolute -bottom-36 -right-36 w-[420px] sm:w-[600px] h-[420px] sm:h-[600px] rounded-full blur-[100px] sm:blur-[120px] pointer-events-none bg-amber-200/35" />
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
export default ModernAppBackground;
