import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Code,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scale,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAcceptTermsMutation, useLogoutApiMutation } from '../../../features/auth/api/authApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateUser, logout, User } from '../../../features/auth/store/authSlice';
import { LEGAL_METADATA, LEGAL_SECTIONS, LegalLanguage } from './legalContent';

interface TermsAcceptanceModalProps {
  user: User;
}

export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({ user }) => {
  const dispatch = useAppDispatch();
  const [acceptTerms, { isLoading }] = useAcceptTermsMutation();
  const [logoutApi] = useLogoutApiMutation();
  const [language, setLanguage] = useState<LegalLanguage>('en');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // Ignore API logout errors
    } finally {
      dispatch(logout());
    }
  };

  const handleAccept = async () => {
    if (!agreed || isLoading) return;
    setError(null);
    try {
      const response = await acceptTerms({ version: LEGAL_METADATA.version }).unwrap();
      if (response.data) {
        dispatch(updateUser(response.data));
      }
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to record acceptance. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#fafafc] dark:bg-[#07080f] text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-screen-title"
    >
      {/* ── 1. Top Modern App Header ── */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#07080f]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              M'Z
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xs sm:text-sm tracking-wider uppercase truncate">
                  MOMZ<span className="text-amber-500">'Z</span> GARAGE
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 shrink-0">
                  v{LEGAL_METADATA.version}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                Updated Terms of Service & Privacy
              </p>
            </div>
          </div>

          {/* Controls: Language Switcher & Exit */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switch */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg text-[10px] transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ml')}
                className={`px-2 py-1 rounded-lg text-[10px] transition cursor-pointer ${
                  language === 'ml'
                    ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                മലയാളം
              </button>
            </div>

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              title="Sign Out / Exit"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Scrollable Body Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Welcome Banner */}
          <section className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Action Required Before Continuing</span>
            </div>
            <h1
              id="terms-screen-title"
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight"
            >
              {language === 'en'
                ? 'Review & Accept Updated Terms'
                : 'പുതുക്കിയ സേവന നിബന്ധനകൾ അംഗീകരിക്കുക'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {language === 'en' ? (
                <>
                  Hello <strong className="text-slate-900 dark:text-white">{user.name}</strong>. In order to protect garage operations, customer data, and technician intellectual property, please review and accept the MOMZ'Z Master Terms of Service.
                </>
              ) : (
                <>
                  നമസ്കാരം <strong className="text-slate-900 dark:text-white">{user.name}</strong>. ഗാരേജ് പ്രവർത്തനങ്ങൾ, ഉപഭോക്തൃ ഡാറ്റ, സാങ്കേതിക വിവരങ്ങൾ എന്നിവയുടെ സുരക്ഷക്കായി ദയവായി താഴെ പറയുന്ന സേവന നിബന്ധനകൾ പരിശോധിച്ച് അംഗീകരിക്കുക.
                </>
              )}
            </p>
          </section>

          {/* Key Legal Guarantees */}
          <section className="space-y-3 pt-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {language === 'en' ? 'Core Guarantees & Protections' : 'പ്രധാന നിയമപരമായ സുരക്ഷകൾ'}
            </h2>

            <div className="divide-y divide-slate-200/80 dark:divide-white/[0.08] border-y border-slate-200/80 dark:border-white/[0.08]">
              {/* Point 1: Reverse Engineering */}
              <div className="py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Code className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {language === 'en'
                      ? 'Anti-Reverse Engineering & Software Protection'
                      : 'സോഫ്റ്റ്‌വെയർ കോപ്പിറൈറ്റ് & സുരക്ഷ'}
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'MOMZ\'Z software code, algorithms, and camera tools are strictly protected trade secrets under the Indian Copyright Act, 1957 and IT Act, 2000. Decompiling, copying, or reverse engineering is prohibited.'
                      : 'MOMZ\'Z സോഫ്റ്റ്‌വെയർ കോഡുകൾ, ക്യാമറ ടൂളുകൾ എന്നിവ പകർപ്പവകാശ നിയമപ്രകാരം സംരക്ഷിക്കപ്പെട്ടിട്ടുള്ളതാണ്. സോഫ്റ്റ്‌വെയർ പകർത്താനോ റിവേഴ്സ് എഞ്ചിനീയറിംഗ് ചെയ്യാനോ പാടില്ല.'}
                  </p>
                </div>
              </div>

              {/* Point 2: Data Privacy */}
              <div className="py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {language === 'en'
                      ? 'DPDPA 2023 Compliance & Zero Data Resale'
                      : 'ഡാറ്റാ സംരക്ഷണം & സ്വകാര്യത (DPDPA 2023)'}
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Customer phone numbers, job cards, and vehicle records are encrypted (TLS 1.3) and never sold. Data is strictly processed for automotive garage service fulfillment.'
                      : 'ഉപഭോക്താക്കളുടെ ഫോൺ നമ്പറുകൾ, വാഹന രേഖകൾ എന്നിവ പൂർണ്ണമായും സുരക്ഷിതമാണ്. ഗാരേജ് സർവീസ് ആവശ്യങ്ങൾക്കല്ലാതെ മറ്റൊന്നിനും ഈ വിവരങ്ങൾ പങ്കുവെക്കില്ല.'}
                  </p>
                </div>
              </div>

              {/* Point 3: Technical Security */}
              <div className="py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {language === 'en'
                      ? 'Reasonable Security & Liability Shield'
                      : 'സാങ്കേതിക സുരക്ഷയും ബാധ്യതാ പരിരക്ഷയും'}
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'We maintain standard enterprise cybersecurity practices (IT Act Sec 43A). Cloud hosting incidents and force majeure events follow statutory liability limitations.'
                      : 'ഐടി നിയമപ്രകാരമുള്ള സുരക്ഷാ മുൻകരുതലുകൾ പ്ലാറ്റ്‌ഫോം പാലിക്കുന്നു. അപ്രതീക്ഷിത നെറ്റ്‌വർക്ക് പ്രശ്നങ്ങൾക്കും ക്ലൗഡ് തടസ്സങ്ങൾക്കും നിയമാനുസൃത പരിരക്ഷ ബാധകമാണ്.'}
                  </p>
                </div>
              </div>

              {/* Point 4: Vehicle Bailment */}
              <div className="py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {language === 'en'
                      ? 'Vehicle Bailment & Condition Photo Proof'
                      : 'വാഹന സൂക്ഷിപ്പും ഫോട്ടോ തെളിവുകളും'}
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'en'
                      ? 'Intake inspection photographs with burned timestamps serve as proof of vehicle condition upon arrival under Indian Contract Act bailment rules.'
                      : 'വാഹനം വർക്ക്‌ഷോപ്പിൽ എത്തുമ്പോഴുള്ള ഫോട്ടോകൾ വാഹനത്തിന്റെ അന്നത്തെ അവസ്ഥയുടെ നിയമപരമായ തെളിവായിരിക്കും.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Link to Full Document */}
          <div className="pt-2 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">
              {language === 'en' ? 'Need to inspect every full clause?' : 'മുഴുവൻ നിയമരേഖ കാണണോ?'}
            </span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span>{language === 'en' ? 'Read Full Legal Document' : 'പൂർണ്ണ രേഖ കാണുക'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </main>

      {/* ── 3. Bottom Modern Agreement Action Bar ── */}
      <footer className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#07080f]/95 backdrop-blur-xl py-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Checkbox Agreement */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-white/20 text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition">
              {language === 'en' ? (
                <>
                  I have read, understood, and accept the{' '}
                  <strong className="text-slate-900 dark:text-white">
                    MOMZ'Z Master Terms of Service, Anti-Reverse Engineering Protections, and Data Privacy Policy (v{LEGAL_METADATA.version})
                  </strong>.
                </>
              ) : (
                <>
                  ഞാൻ{' '}
                  <strong className="text-slate-900 dark:text-white">
                    MOMZ'Z സേവന നിബന്ധനകളും സ്വകാര്യതാ നയവും (v{LEGAL_METADATA.version})
                  </strong>{' '}
                  വായിച്ചു മനസ്സിലാക്കി പൂർണ്ണമായും അംഗീകരിക്കുന്നു.
                </>
              )}
            </span>
          </label>

          {/* Agree Button */}
          <button
            type="button"
            onClick={handleAccept}
            disabled={!agreed || isLoading}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99] shadow-sm ${
              agreed && !isLoading
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {language === 'en' ? 'Recording Acceptance...' : 'രേഖപ്പെടുത്തുന്നു...'}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {language === 'en' ? 'Agree & Continue' : 'സമ്മതിച്ച് തുടരുക'}
                </span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

