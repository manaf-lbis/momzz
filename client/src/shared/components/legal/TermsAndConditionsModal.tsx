import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  Camera,
  Car,
  Lock,
  X,
  CheckCircle2,
  Printer,
  Search,
  ExternalLink,
  Languages,
} from 'lucide-react';
import {
  LEGAL_SECTIONS,
  LegalLanguage,
  LegalSection,
} from './legalContent';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [language, setLanguage] = useState<LegalLanguage>('en');
  const [activeSectionId, setActiveSectionId] = useState<string>(LEGAL_SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeSection = LEGAL_SECTIONS.find((s) => s.id === activeSectionId) || LEGAL_SECTIONS[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c0d18] border border-slate-200/90 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden"
        >
          {/* Header Banner */}
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-500 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {language === 'en' ? 'MOMZ\'Z Legal Agreement' : 'MOMZ\'Z നിയമാവലി'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                    DPDPA 2023 · IT Act 2000
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {language === 'en'
                    ? 'Terms of Service, Image Verification & Anti-Theft Shield'
                    : 'സേവന നിബന്ധനകൾ, ഫോട്ടോ പരിശോധന, വിവര മോഷണ സംരക്ഷണം'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Language Switcher Pill */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-white/10 border border-slate-300/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black transition cursor-pointer ${
                    language === 'en'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ml')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black transition cursor-pointer ${
                    language === 'ml'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  മലയാളം
                </button>
              </div>

              {/* Open full page link */}
              <Link
                to="/terms"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                title="Open Dedicated Full Page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                title="Print Terms"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Section Tabs */}
          <div className="flex items-center gap-1.5 px-5 pt-3 pb-2 border-b border-slate-200/60 dark:border-white/[0.05] overflow-x-auto scrollbar-none">
            {LEGAL_SECTIONS.map((sec) => {
              const isSelected = activeSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{sec.number}.</span>
                  <span className="truncate max-w-[140px] sm:max-w-none">{sec.title[language]}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="px-5 py-2 border-b border-slate-200/50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'Search legal clauses (e.g. data theft, photos, damage, tracking)...'
                    : 'തിരയുക (ഡാറ്റാ മോഷണം, ഫോട്ടോ, ബാധ്യത, ട്രാക്കിംഗ്)...'
                }
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
            {/* Active Section Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {activeSection.number}. {activeSection.title[language]}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {activeSection.subtitle[language]}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeSection.statutoryBadges.map((b, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Clauses */}
            <div className="space-y-3.5">
              {activeSection.clauses
                .filter((c) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    c.title[language].toLowerCase().includes(q) ||
                    c.body[language].toLowerCase().includes(q) ||
                    c.clauseNumber.includes(q)
                  );
                })
                .map((clause) => (
                  <div
                    key={clause.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05] space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded">
                        {clause.clauseNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {clause.title[language]}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {clause.body[language]}
                    </p>

                    {clause.highlight && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-900 dark:text-amber-300 font-mono text-[10.5px] font-bold flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{clause.highlight[language]}</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Footer & Action Bar */}
          <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              to="/terms"
              onClick={onClose}
              className="text-[11px] font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
            >
              <span>
                {language === 'en'
                  ? 'View distinct full legal page with Back button →'
                  : 'പൂർണ്ണ പേജ് കാണുക →'}
              </span>
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                {language === 'en' ? 'Close' : 'അടയ്ക്കുക'}
              </button>

              {showAcceptButton && onAccept && (
                <button
                  type="button"
                  onClick={() => {
                    onAccept();
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{language === 'en' ? 'I Accept & Agree' : 'ഞാൻ സമ്മതിക്കുന്നു'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
