import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

const CREDIT = 'DESIGNED AND DEVELOPED BY MANAF';

export const Footer = () => {
  const creditRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.timeline({ repeat: -1, repeatDelay: 3 })
        .set(creditRef.current, { textContent: '••••••••••••••••••••••••••••••' })
        .to(creditRef.current, {
          duration: 1.5,
          scrambleText: { text: CREDIT, chars: 'upperCase', revealDelay: 0.15, speed: 0.45 },
          ease: 'none',
        });
    });
    return () => context.revert();
  }, []);

  return <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur px-4 py-4 text-center">
    <p ref={creditRef} className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.14em] text-amber-600 dark:text-yellow-400" aria-label={CREDIT}>{CREDIT}</p>
  </footer>;
};
