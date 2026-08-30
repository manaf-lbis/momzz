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
            duration: 0.45,
            ease: 'power3.in',
            onComplete: onComplete,
          });
        },
      });

      // ── Frame 1: Sharp X-axis snap  "DON'T JUST / DRIVE" ─────────────
      tl.fromTo('#ks-f1',
        { opacity: 0, scale: 0.88, rotateX: 18 },
        { opacity: 1, scale: 1, rotateX: 0, duration: 0.25, ease: 'power4.out' }
      )
      .to('#ks-f1', { opacity: 0, scale: 1.06, duration: 0.12, ease: 'power2.in', delay: 0.42 })

      // ── Frame 2: Crisp Y-axis flip + lateral slide  "DOMINATE / THE ROAD" ─
      .fromTo('#ks-f2',
        { opacity: 0, rotationY: -48, x: -40 },
        { opacity: 1, rotationY: 0, x: 0, duration: 0.26, ease: 'power3.out' }
      )
      .to('#ks-f2', { opacity: 0, y: -32, duration: 0.12, ease: 'power2.in', delay: 0.42 })

      // ── Frame 3: Kinetic slide-up  "UPGRADE / YOUR RIDE" ─────────────
      .fromTo('#ks-f3',
        { opacity: 0, y: 65 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power4.out' }
      )
      .to('#ks-f3', { opacity: 0, scale: 0.92, duration: 0.12, ease: 'power2.in', delay: 0.42 })

      // ── Frame 4: Brand zoom-settle  "WELCOME TO / MOMZ'Z GARRAGE" ────
      .fromTo('#ks-f4',
        { opacity: 0, scale: 1.28 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.4)' }
      )
      // Hold on brand
      .to('#ks-f4', { opacity: 0, duration: 0.25, ease: 'power2.in', delay: 0.7 });
    }, overlayRef);

    return () => ctx.revert();
  }, [onComplete]);

  // ── Shared style values ────────────────────────────────────────────────
  const frameBase: React.CSSProperties = {
    position: 'absolute',
    width: '80%',
    maxWidth: 860,
    opacity: 0,
    letterSpacing: '-0.04em',
    lineHeight: 0.92,
    textTransform: 'uppercase',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 900,
  };

  const smallStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'clamp(1.1rem, 3.2vw, 2.4rem)',
    color: '#FFFFFF',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    marginBottom: '0.06em',
  };

  const bigStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'clamp(3.2rem, 11vw, 8rem)',
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
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* ── Frame 1: DON'T JUST + DRIVE ── */}
      <div id="ks-f1" style={frameBase}>
        <span style={smallStyle}>Don't Just</span>
        <span style={bigStyle}>Drive</span>
      </div>

      {/* ── Frame 2: DOMINATE + THE ROAD ── */}
      <div id="ks-f2" style={frameBase}>
        <span style={bigStyle}>Dominate</span>
        <span style={smallStyle}>The Road</span>
      </div>

      {/* ── Frame 3: UPGRADE + YOUR RIDE ── */}
      <div id="ks-f3" style={frameBase}>
        <span style={smallStyle}>Upgrade</span>
        <span style={bigStyle}>Your Ride</span>
      </div>

      {/* ── Frame 4: Brand finale — centred ── */}
      <div
        id="ks-f4"
        style={{ ...frameBase, textAlign: 'center', width: '90%' }}
      >
        <span style={smallStyle}>Welcome To</span>
        <span style={bigStyle}>Momz'Z</span>
        <span style={{ ...bigWhiteStyle, fontSize: 'clamp(2rem, 7.5vw, 6rem)' }}>
          Garrage
        </span>
      </div>
    </div>
  );
};
