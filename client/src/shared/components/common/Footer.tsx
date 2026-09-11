import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LEGAL_METADATA } from '../legal/legalContent';

const CREDIT = 'MANAF';

export const Footer: React.FC = () => {
  const { user } = useAuth();

  if (user && (user.needsTermsAcceptance || user.acceptedTermsVersion !== LEGAL_METADATA.version)) {
    return null;
  }

  return (
    <footer className="relative w-full border-t border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-[#08090f]/70 backdrop-blur-xl transition-colors duration-300 font-sans">
      <div className="app-container py-5 pb-28 sm:pb-24 md:pb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="MOMZ'Z Logo"
            className="w-6 h-6 rounded-lg object-cover bg-black border border-slate-200 dark:border-white/15 shadow-2xs group-hover:scale-105 transition-transform shrink-0"
          />
          <span className="font-black text-xs tracking-wider uppercase text-slate-900 dark:text-white">
            MOMZ<span className="text-amber-500 font-black">'Z</span> AUTO
          </span>
        </Link>

        {/* Rights reserved & Legal Link */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 text-center flex-wrap justify-center">
          <span>© {new Date().getFullYear()} MOMZ'Z Auto Garage. All rights reserved.</span>
          <span>·</span>
          <Link to="/terms" className="text-slate-600 dark:text-slate-400 hover:text-amber-500 underline transition">
            Terms & Privacy (EN / മലയാളം)
          </Link>
        </div>

        {/* Creator credit */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
          <span>Crafted by</span>
          <span className="font-black text-amber-600 dark:text-amber-400">
            {CREDIT}
          </span>
        </div>
      </div>
    </footer>
  );
};






