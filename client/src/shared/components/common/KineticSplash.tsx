import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface KineticSplashProps {
  onComplete: () => void;
}

export const KineticSplash: React.FC<KineticSplashProps> = ({ onComplete }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Kill any stray GSAP state on this element
    gsap.killTweensOf(['#ks-f1', '#ks-f2', '#ks-f3', '#ks-f4', overlayRef.current]);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { transformOrigin: '50% 50%' },
        onComplete: () => {
          // Slide entire overlay upward off screen — reveals app beneath
          gsap.to(overlayRef.current, {
            yPercent: -102,
            duration: 0.32,
            ease: 'power3.in',
            onComplete: onComplete,
          });
        },
      });

      // ── Frame 1: Sharp X-axis snap  "DON'T JUST / DRIVE" ─────────────
      tl.fromTo('#ks-f1',
        { opacity: 0, scale: 0.88, rotateX: 18 },
        { opacity: 1, scale: 1, rotateX: 0, duration: 0.18, ease: 'power4.out' }
      )
      .to('#ks-f1', { opacity: 0, scale: 1.06, duration: 0.1, ease: 'power2.in', delay: 0.25 })

      // ── Frame 2: Crisp Y-axis flip + lateral slide  "DOMINATE / THE ROAD" ─
      .fromTo('#ks-f2',
        { opacity: 0, rotationY: -48, x: -40 },
        { opacity: 1, rotationY: 0, x: 0, duration: 0.18, ease: 'power3.out' }
      )
      .to('#ks-f2', { opacity: 0, y: -32, duration: 0.1, ease: 'power2.in', delay: 0.25 })

      // ── Frame 3: Kinetic slide-up  "UPGRADE / YOUR RIDE" ─────────────
      .fromTo('#ks-f3',
        { opacity: 0, y: 65 },
        { opacity: 1, y: 0, duration: 0.18, ease: 'power4.out' }
      )
      .to('#ks-f3', { opacity: 0, scale: 0.92, duration: 0.1, ease: 'power2.in', delay: 0.25 })

      // ── Frame 4: Brand zoom-settle  "WELCOME TO / MOMZ'Z GARRAGE" ────
      .fromTo('#ks-f4',
        { opacity: 0, scale: 1.26 },
        { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(1.5)' }
      )
      // High-impact mechanical shudder / shake effect on landing
      .to('#ks-f4', {
        keyframes: [
          { x: -6, y: 2, rotation: -1.2, duration: 0.035 },
          { x: 6, y: -2, rotation: 1.2, duration: 0.035 },
          { x: -5, y: -1, rotation: -0.8, duration: 0.035 },
          { x: 5, y: 1, rotation: 0.8, duration: 0.035 },
          { x: -3, y: 1, rotation: -0.4, duration: 0.035 },
          { x: 2, y: -1, rotation: 0.2, duration: 0.035 },
          { x: 0, y: 0, rotation: 0, duration: 0.035 },
        ],
        ease: 'power1.inOut',
      })
      // Hold on brand
      .to('#ks-f4', { opacity: 0, duration: 0.18, ease: 'power2.in', delay: 0.4 });
    }, overlayRef);

    return () => ctx.revert();
  }, [onComplete]);

  // ── Shared style values ────────────────────────────────────────────────
  const frameBase: React.CSSProperties = {
    position: 'absolute',
    width: '85%',
    maxWidth: 860,
    opacity: 0,
    letterSpacing: '-0.04em',
    lineHeight: 0.92,
    textTransform: 'uppercase',
    fontFamily: "'Montserrat', 'Barlow Condensed', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 900,
  };

  const smallStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'clamp(1.2rem, 3.8vw, 2.4rem)',
    color: '#FFFFFF',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    marginBottom: '0.08em',
  };

  const bigStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'clamp(3.4rem, 12.5vw, 8rem)',
    color: '#FFC700',
    fontWeight: 900,
    letterSpacing: '-0.05em',
  };

  const bigWhiteStyle: React.CSSProperties = {
    ...bigStyle,
    color: '#FFFFFF',
  };

  return (
    <div
      ref={overlayRef}
      style={{ background: '#000000', zIndex: 99999, perspective: '1200px' }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden select-none pointer-events-none"
    >
      <style>{`
        @media (max-width: 768px) {
          .ks-mobile-bold-amber {
            font-weight: 900 !important;
            -webkit-text-stroke: 1.2px #FFC700;
            text-shadow: 0 0 2px rgba(255, 199, 0, 0.4);
            paint-order: stroke fill;
          }
          .ks-mobile-bold-white {
            font-weight: 900 !important;
            -webkit-text-stroke: 1px #FFFFFF;
            text-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
            paint-order: stroke fill;
          }
          .ks-mobile-bold-small {
            font-weight: 900 !important;
            -webkit-text-stroke: 0.6px #FFFFFF;
            paint-order: stroke fill;
          }
        }
      `}</style>

      {/* ── Frame 1: DON'T JUST + DRIVE ── */}
      <div id="ks-f1" style={frameBase}>
        <span style={smallStyle} className="ks-mobile-bold-small">Don't Just</span>
        <span style={bigStyle} className="ks-mobile-bold-amber">Drive</span>
      </div>

      {/* ── Frame 2: DOMINATE + THE ROAD ── */}
      <div id="ks-f2" style={frameBase}>
        <span style={bigStyle} className="ks-mobile-bold-amber">Dominate</span>
        <span style={smallStyle} className="ks-mobile-bold-small">The Road</span>
      </div>

      {/* ── Frame 3: UPGRADE + YOUR RIDE ── */}
      <div id="ks-f3" style={frameBase}>
        <span style={smallStyle} className="ks-mobile-bold-small">Upgrade</span>
        <span style={bigStyle} className="ks-mobile-bold-amber">Your Ride</span>
      </div>

      {/* ── Frame 4: Brand finale — centred ── */}
      <div
        id="ks-f4"
        style={{ ...frameBase, textAlign: 'center', width: '92%' }}
      >
        <span style={smallStyle} className="ks-mobile-bold-small">Welcome To</span>
        <span style={bigStyle} className="ks-mobile-bold-amber">Momz'Z</span>
        <span
          style={{ ...bigWhiteStyle, fontSize: 'clamp(2.3rem, 8.5vw, 6rem)' }}
          className="ks-mobile-bold-white"
        >
          Garrage
        </span>
      </div>
    </div>
  );
};
