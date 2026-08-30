import { useState, useEffect } from 'react';

const CREDIT = 'MANAF';
const ROLE = 'DESIGN & CODE';

export const Footer = () => {
  const [time, setTime] = useState<string>('');

  // Live UTC/Local Time counter for that terminal vibe
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="relative w-full border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl py-4 px-4 sm:px-8 overflow-hidden font-mono text-xs">
      {/* Background Subtle Cyber Glow */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-24 bg-amber-500/10 blur-3xl rounded-full" />

      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-400">
        
        {/* Left: Terminal Prompt & Credit */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <span className="text-amber-400 font-bold">$</span>
          <span className="text-zinc-500 text-[11px]">dev.sys //</span>
          
          <div className="relative overflow-hidden font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors">
            <span>crafted_by</span>
            <span className="text-amber-400 mx-1 font-bold">[{CREDIT}]</span>
          </div>

          {/* Blinking Cursor */}
          <span className="w-1.5 h-3.5 bg-amber-400/80 animate-pulse inline-block" />
        </div>

        {/* Center: Interactive Badge / System Tag */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full border border-zinc-800/80 bg-zinc-900/50 text-[11px]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-zinc-400">{ROLE}</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-500">v2.0.26</span>
        </div>

        {/* Right: Live Clock & System Time */}
        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
          <span className="text-zinc-600">SYS_TIME:</span>
          <span className="font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            {time || '00:00:00'}
          </span>
        </div>

      </div>
    </footer>
  );
};




