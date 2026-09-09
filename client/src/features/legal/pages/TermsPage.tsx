import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  Camera,
  Car,
  Lock,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Languages,
  ArrowUp,
  FileText,
  BadgeAlert,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import {
  LEGAL_SECTIONS,
  LegalLanguage,
  LegalSection,
} from '../../../shared/components/legal/legalContent';

export const TermsPage: React.FC = () => {
  const location = useLocation();
  const [language, setLanguage] = useState<LegalLanguage>('en');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle hash navigation if present (e.g. #vehicle-tracking-policy)
  React.useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, [location.hash]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter sections by search query and category
  const filteredSections = useMemo(() => {
    return LEGAL_SECTIONS.map((section) => {
      if (selectedSection !== 'ALL' && section.id !== selectedSection) {
        return null;
      }
      if (!searchQuery.trim()) {
        return section;
      }
      const q = searchQuery.toLowerCase();
      const titleMatches =
        section.title.en.toLowerCase().includes(q) ||
        section.title.ml.toLowerCase().includes(q) ||
        section.subtitle.en.toLowerCase().includes(q) ||
        section.subtitle.ml.toLowerCase().includes(q);

      const matchingClauses = section.clauses.filter(
        (c) =>
          c.title.en.toLowerCase().includes(q) ||
          c.title.ml.toLowerCase().includes(q) ||
          c.body.en.toLowerCase().includes(q) ||
          c.body.ml.toLowerCase().includes(q) ||
          c.clauseNumber.includes(q) ||
          (c.highlight &&
            (c.highlight.en.toLowerCase().includes(q) ||
              c.highlight.ml.toLowerCase().includes(q)))
      );

      if (titleMatches || matchingClauses.length > 0) {
        return {
          ...section,
          clauses: titleMatches ? section.clauses : matchingClauses,
        };
      }
      return null;
    }).filter(Boolean) as LegalSection[];
  }, [selectedSection, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07080e] text-slate-900 dark:text-white flex flex-col font-sans selection:bg-amber-400/20">
      <Navbar glass />

      {/* Main Content Area */}
      <main className="app-container relative z-10 flex-1 py-5 pb-32 max-w-4xl mx-auto w-full space-y-6">
        {/* Sticky Header with Back Button and Language Toggle */}
        <header className="sticky top-0 sm:top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 pt-3 pb-3 mb-2 glass-modern-header flex items-center justify-between gap-3 transition-all border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton label={language === 'en' ? 'Back' : 'തിരികെ'} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {language === 'en'
                    ? 'Legal, Terms & Privacy Policy'
                    : 'നിയമവും നിബന്ധനകളും സ്വകാര്യതാ നയവും'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                  DPDPA 2023 · IT Act 2000
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {language === 'en'
                  ? 'Official statutory disclosures & data theft protection'
                  : 'ഔദ്യോഗിക നിയമാവലിയും ഡാറ്റാ മോഷണ സംരക്ഷണവും'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher Pill */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-white/10 border border-slate-300/80 dark:border-white/10 shadow-xs">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-black transition active:scale-95 cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Switch to English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ml')}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-black transition active:scale-95 cursor-pointer ${
                  language === 'ml'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="മലയാളത്തിലേക്ക് മാറ്റുക"
              >
                മലയാളം
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl glass-ghost-btn text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200/80 dark:border-white/10 active:scale-90 transition cursor-pointer hidden sm:flex items-center gap-1 text-xs font-mono font-bold"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Print</span>
            </button>
          </div>
        </header>

        {/* Hero Legal Summary Banner */}
        <section className="relative overflow-hidden rounded-3xl p-5 sm:p-6 glass-modern-card border border-amber-400/30 dark:border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-slate-900/5 to-transparent shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-500 border border-amber-400/30 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {language === 'en'
                    ? 'MOMZ\'Z Certified Legal & Operational Framework'
                    : 'MOMZ\'Z നിയമാനുസൃത സേവന ചട്ടക്കൂട്'}
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {language === 'en'
                  ? 'Comprehensive operational terms, customer data privacy, tamper-evident vehicle intake photographic proof, live service tracking, and strict protection against data theft under Indian Law.'
                  : 'ഇന്ത്യൻ നിയമങ്ങൾക്കനുസൃതമായ സമഗ്ര സേവന നിബന്ധനകൾ, ഉപഭോക്തൃ ഡാറ്റാ സ്വകാര്യത, വാഹന ഫോട്ടോ തെളിവുകൾ, തത്സമയ ട്രാക്കിംഗ്, വിവര മോഷണ വിരുദ്ധ കർശന സംരക്ഷണം.'}
              </p>
            </div>

            {/* Quick Trust Badges */}
            <div className="flex flex-wrap sm:flex-col gap-1.5 shrink-0 text-[10px] font-mono font-bold">
              <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>DPDPA 2023 Compliant</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Zero Data Resale Guarantee</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>In-Image Timestamp Proof</span>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter Chips & Search Bar */}
        <section className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Search legal clauses, data theft, timestamp, photos, bailment, liability...'
                  : 'നിബന്ധനകൾ, ഡാറ്റാ മോഷണം, ഫോട്ടോ തെളിവുകൾ, ബാധ്യതകൾ എന്നിവ തിരയുക...'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-amber-400 transition shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 hover:text-amber-500"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              type="button"
              onClick={() => setSelectedSection('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 transition active:scale-95 cursor-pointer ${
                selectedSection === 'ALL'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-400/40'
              }`}
            >
              {language === 'en' ? 'All Sections (5)' : 'എല്ലാ വിഭാഗങ്ങളും (5)'}
            </button>

            {LEGAL_SECTIONS.map((sec) => {
              const isSelected = selectedSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-400/40'
                  }`}
                >
                  <span>{sec.number}.</span>
                  <span>{sec.title[language]}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Legal Sections Accordion / Cards */}
        <div className="space-y-6">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 rounded-3xl glass-modern-card p-6 space-y-2">
              <Search className="w-8 h-8 text-amber-500/50 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {language === 'en' ? 'No clauses matched your search' : 'ഫലങ്ങളൊന്നും കണ്ടെത്തിയില്ല'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {language === 'en'
                  ? 'Try searching for terms like "theft", "privacy", "photo", "bailment", or "damage".'
                  : '"ഡാറ്റ", "സ്വകാര്യത", "ഫോട്ടോ", "ബാധ്യത" തുടങ്ങിയ വാക്കുകൾ ഉപയോഗിച്ച് തിരയുക.'}
              </p>
            </div>
          ) : (
            filteredSections.map((sec) => (
              <section
                key={sec.id}
                id={sec.id}
                className="rounded-3xl p-5 sm:p-7 glass-modern-card border border-slate-200/90 dark:border-white/10 shadow-lg space-y-5 transition-all"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center font-mono font-black text-sm shrink-0">
                      {sec.number}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {sec.title[language]}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {sec.subtitle[language]}
                      </p>
                    </div>
                  </div>

                  {/* Statutory Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sec.statutoryBadges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Clauses in Section */}
                <div className="space-y-4">
                  {sec.clauses.map((clause) => (
                    <div
                      key={clause.id}
                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-md">
                          {clause.clauseNumber}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {clause.title[language]}
                        </h4>
                      </div>

                      <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {clause.body[language]}
                      </p>

                      {/* Highlight alert if any */}
                      {clause.highlight && (
                        <div className="mt-2.5 p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-900 dark:text-amber-300 font-mono text-[11px] font-bold flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{clause.highlight[language]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Data Protection Officer & Grievance Contact Card */}
        <section className="rounded-3xl p-5 sm:p-6 glass-modern-card border border-slate-200/80 dark:border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Grievance Officer & Data Redressal Mechanism'
                  : 'പരാതി പരിഹാര ഓഫീസറും ഡാറ്റാ സംരക്ഷണവും'}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? 'Mandated under Section 13 of DPDPA 2023 & Section 5 of IT Rules 2011'
                  : 'DPDPA 2023 സെക്ഷൻ 13, ഐടി റൂൾസ് 2011 സെക്ഷൻ 5 പ്രകാരം'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] uppercase">Designated Officer</span>
              <p className="font-bold text-slate-800 dark:text-white">Legal & Compliance Cell</p>
              <p className="text-slate-500">MOMZ'Z Auto Operations</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase">Grievance Contact</span>
              <p className="font-bold text-amber-600 dark:text-amber-400">privacy@momzz.com</p>
              <p className="text-slate-500">Response turnaround: Within 48 business hours</p>
            </div>
          </div>
        </section>

        {/* Bottom Navigation & Scroll-to-Top */}
        <div className="flex items-center justify-between pt-4 text-xs font-mono text-slate-500">
          <BackButton label={language === 'en' ? '← Back to Previous Page' : '← മുൻപത്തെ പേജിലേക്ക്'} />

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-ghost-btn hover:text-amber-500 transition active:scale-95 cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
            <span>{language === 'en' ? 'Back to Top' : 'മുകളിലേക്ക്'}</span>
          </button>
        </div>
      </main>
    </div>
  );
};
