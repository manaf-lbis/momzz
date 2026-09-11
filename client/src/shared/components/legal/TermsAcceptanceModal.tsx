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
} from 'lucide-react';
import { useAcceptTermsMutation, useLogoutApiMutation } from '../../../features/auth/api/authApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateUser, logout, User } from '../../../features/auth/store/authSlice';
import { LEGAL_METADATA } from './legalContent';

interface TermsAcceptanceModalProps {
  user: User;
}

export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({ user }) => {
  const dispatch = useAppDispatch();
  const [acceptTerms, { isLoading }] = useAcceptTermsMutation();
  const [logoutApi] = useLogoutApiMutation();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950 text-slate-100 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0c0d16] border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 id="terms-modal-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Terms of Service & Security Notice
                </h2>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Version {LEGAL_METADATA.version} · Effective {LEGAL_METADATA.effectiveDate}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 shrink-0">
              Required
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="text-slate-700 dark:text-slate-200 font-medium">
            Welcome, <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>. We have updated the MOMZ'Z Auto Garage Master Terms of Service and Data Protection Policies in compliance with Indian regulatory frameworks.
          </p>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            To continue accessing workshop management tools, digital job cards, vehicle cameras, and customer records, you must review and accept these updated terms:
          </p>

          {/* Key Clauses Summary Cards */}
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                <Code className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Anti-Reverse Engineering & Software IP Protection</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                MOMZ'Z software, algorithms, and camera tools are protected trade secrets. Decompiling, extracting source code, scraping, or duplicating the platform is strictly prohibited under the Copyright Act, 1957 and IT Act, 2000.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                <Lock className="w-4 h-4 text-sky-500 shrink-0" />
                <span>DPDPA 2023 Compliance & Zero Data Resale</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                Customer phone numbers, vehicle records, and service notes are never sold or commodified. Data is encrypted (TLS 1.3) and handled strictly for garage service fulfillment.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Technical Security & Incident Liability Shield</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                We maintain reasonable security practices (IT Act Sec 43A). Force majeure incidents, third-party cloud outages, and zero-day vulnerabilities are subject to statutory liability limitations and CERT-In disclosure protocols.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Vehicle Bailment & Pre-Existing Defect Exclusion</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                Intake photographs with tamper-evident burned timestamps serve as evidentiary proof of arrival state. The garage is not liable for prior cosmetic damage, wear-and-tear, or personal items left in vehicles.
              </p>
            </div>
          </div>

          {/* Link to Full Terms */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Need to inspect every full clause?</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span>Read Full Legal Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-3">
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-white/20 text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition">
              I have read, understood, and accept the <span className="font-bold text-slate-900 dark:text-white">MOMZ'Z Terms of Service, Anti-Reverse Engineering Protections, and Data Privacy Policy (v{LEGAL_METADATA.version})</span>.
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleAccept}
            disabled={!agreed || isLoading}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99] ${
              agreed && !isLoading
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Acceptance in Database...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Agree & Continue</span>
              </>
            )}
          </button>

          {/* Sign Out Option */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Decline terms? You can safely exit:
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
