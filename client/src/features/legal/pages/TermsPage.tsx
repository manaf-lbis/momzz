import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  FileText,
  Code,
  Server,
  ArrowUp,
  Calendar,
  MapPin,
  Bookmark,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import {
  LEGAL_SECTIONS,
  LEGAL_METADATA,
  LegalLanguage,
  LegalSection,
} from '../../../shared/components/legal/legalContent';

export const TermsPage: React.FC = () => {
  const location = useLocation();
  const [language, setLanguage] = useState<LegalLanguage>('en');
  const [activeSectionId, setActiveSectionId] = useState<string>(LEGAL_SECTIONS[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Monitor scroll for back-to-top button & active TOC item
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      const sectionElements = LEGAL_SECTIONS.map((sec) => ({
        id: sec.id,
        el: document.getElementById(sec.id),
      }));

      const scrollPosition = window.scrollY + 180;
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const item = sectionElements[i];
        if (item.el && item.el.offsetTop <= scrollPosition) {
          setActiveSectionId(item.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle hash navigation
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSectionId(id);
        }, 120);
      }
    }
  }, [location.hash]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSectionId(id);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return LEGAL_SECTIONS;
    const q = searchQuery.toLowerCase();

    return LEGAL_SECTIONS.map((section) => {
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
  }, [searchQuery]);

  const getSectionIcon = (name: LegalSection['iconName']) => {
    const props = { className: 'w-4 h-4 shrink-0' };
    switch (name) {
      case 'FileText': return <FileText {...props} />;
      case 'Lock': return <Lock {...props} />;
      case 'Camera': return <Camera {...props} />;
      case 'Car': return <Car {...props} />;
      case 'ShieldCheck': return <ShieldCheck {...props} />;
      case 'Code': return <Code {...props} />;
      case 'Server': return <Server {...props} />;
      case 'Scale':
      default: return <Scale {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] dark:bg-[#08090f] text-slate-800 dark:text-slate-200 flex flex-col font-sans selection:bg-amber-400/25 selection:text-slate-950">
      <Navbar glass />

      {/* Top Controls Header (Sticky) */}
      <header className="sticky top-0 sm:top-14 z-30 glass-modern-header transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton label={language === 'en' ? 'Back' : 'തിരികെ'} />
            <div className="h-4 w-px bg-slate-300 dark:bg-white/10 hidden sm:block" />
            <div className="min-w-0">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
                Legal Document · v{LEGAL_METADATA.version}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {language === 'en' ? 'Master Terms of Service & Privacy' : 'സേവന നിബന്ധനകളും സ്വകാര്യതാ നയവും'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bilingual Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ml')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  language === 'ml'
                    ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                മലയാളം
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Document"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: 2 Columns on Desktop */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-32 space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0c0d16] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span>Table of Contents</span>
              </div>

              {/* In-Document Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter clauses..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 outline-none focus:border-amber-500 text-slate-900 dark:text-white placeholder-slate-400 transition"
                />
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {LEGAL_SECTIONS.map((sec) => {
                  const isActive = activeSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-start gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-amber-400/15 text-amber-900 dark:text-amber-300 font-bold border-l-2 border-amber-500'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-70 shrink-0 mt-0.5">{sec.number}</span>
                      <span className="line-clamp-1">{sec.title[language]}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Document Meta Information */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c0d16]/50 border border-slate-200/60 dark:border-white/[0.06] text-xs space-y-2.5 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Effective Date: <strong className="text-slate-700 dark:text-slate-300">{LEGAL_METADATA.effectiveDate}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Jurisdiction: <strong className="text-slate-700 dark:text-slate-300">{LEGAL_METADATA.jurisdiction}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Compliance: <strong className="text-slate-700 dark:text-slate-300">DPDPA 2023 · IT Act</strong></span>
              </div>
            </div>
          </aside>

          {/* Right Column: Editorial Document */}
          <main className="lg:col-span-8 min-w-0 space-y-8">
            
            {/* Document Title & Preamble Header */}
            <header className="pb-8 border-b border-slate-200 dark:border-white/10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-400/25">
                <span>OFFICIAL STATUTORY DOCUMENT</span>
                <span>·</span>
                <span>VERSION {LEGAL_METADATA.version}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {language === 'en'
                  ? 'MOMZ\'Z Auto Garage — Master Terms of Service & Data Protection Policy'
                  : 'MOMZ\'Z ഓട്ടോ ഗാരേജ് — സമഗ്ര സേവന നിബന്ധനകളും ഡാറ്റാ സംരക്ഷണ നയവും'}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Last Revised: {LEGAL_METADATA.lastUpdated}</span>
                <span>·</span>
                <span>Governing Law: Republic of India</span>
                <span>·</span>
                <span>Entity: MOMZ\'Z Auto Garage</span>
              </div>

              {/* Legal Notice Preamble */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/[0.05] border-l-4 border-amber-500 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {language === 'en' ? 'IMPORTANT LEGAL NOTICE:' : 'പ്രധാന നിയമ അറിയിപ്പ്:'}
                </p>
                <p>
                  {language === 'en'
                    ? 'Please read these Terms and Conditions carefully. By accessing or using the MOMZ\'Z software platform, registering an account, capturing inspection photographs, managing vehicle service job cards, or accessing the service tracking portal, you acknowledge that you have read, understood, and agree to be bound by all statutory clauses herein. If you do not agree with any part of these terms, you must not access or use the Platform.'
                    : 'ഈ നിബന്ധനകൾ ശ്രദ്ധാപൂർവ്വം വായിക്കുക. MOMZ\'Z സോഫ്റ്റ്‌വെയർ ഉപയോഗിക്കുന്നതിലൂടെയോ, രജിസ്റ്റർ ചെയ്യുന്നതിലൂടെയോ, വാഹന പരിശോധനാ ഫോട്ടോകൾ എടുക്കുന്നതിലൂടെയോ, സർവീസ് വിവരങ്ങൾ പരിശോധിക്കുന്നതിലൂടെയോ നിങ്ങൾ ഈ നിയമപരമായ വ്യവസ്ഥകൾ പൂർണ്ണമായി അംഗീകരിക്കുന്നു.'}
                </p>
              </div>

              {/* Mobile Quick Navigation Chips */}
              <div className="lg:hidden pt-2">
                <p className="text-[11px] font-mono text-slate-500 mb-2">Jump to Section:</p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {LEGAL_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                    >
                      {sec.number}. {sec.title[language].slice(0, 18)}...
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* Document Content Flow (No boxed cards) */}
            <div className="space-y-12">
              {filteredSections.length === 0 ? (
                <div className="text-center py-16 space-y-2 text-slate-500">
                  <Search className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold">No clauses found matching "{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-amber-600 dark:text-amber-400 underline font-bold"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-32 space-y-6 pt-4 border-b border-slate-200/80 dark:border-white/[0.06] pb-10 last:border-b-0"
                  >
                    {/* Section Title Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {getSectionIcon(section.iconName)}
                        <span>SECTION {section.number}</span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {section.title[language]}
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
                        {section.subtitle[language]}
                      </p>

                      {/* Statutory References Pill Row */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {section.statutoryBadges.map((badge, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Clauses in Section */}
                    <div className="space-y-6 pl-0 sm:pl-3">
                      {section.clauses.map((clause) => (
                        <div key={clause.id} className="space-y-2 text-xs sm:text-sm">
                          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-baseline gap-2">
                            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold shrink-0">
                              {clause.clauseNumber}
                            </span>
                            <span>{clause.title[language]}</span>
                          </h3>

                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                            {clause.body[language]}
                          </p>

                          {/* Highlight / Callout */}
                          {clause.highlight && (
                            <div className="border-l-2 border-amber-500 pl-3 py-1 text-xs text-slate-700 dark:text-slate-300 bg-amber-500/[0.03] rounded-r-lg font-medium italic">
                              {clause.highlight[language]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Document Signature & Statutory Closing */}
            <footer className="pt-8 border-t border-slate-200 dark:border-white/10 space-y-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <div className="p-5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <p className="font-bold text-slate-900 dark:text-white text-xs">
                  MOMZ'Z AUTO GARAGE ENTERPRISE
                </p>
                <p>
                  Official Digital Record generated under Section 65B of the Indian Evidence Act, 1872. Version {LEGAL_METADATA.version} is active and legally binding upon all registered platform users, mechanics, and workshop customers.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px]">
                  <span>Support: support@momzz.com</span>
                  <span>·</span>
                  <span>Data Protection Officer: privacy@momzz.com</span>
                  <span>·</span>
                  <span>Security Desk: security@momzz.com</span>
                </div>
              </div>
            </footer>

          </main>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-20 right-6 z-40 p-3 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
