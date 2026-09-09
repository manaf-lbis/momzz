import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Camera,
  FileText,
  Lock,
  X,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ChevronRight,
  Search,
  Scale,
  Car,
  Database,
  Building,
} from 'lucide-react';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

type TabType = 'TERMS' | 'IMAGE_STORAGE' | 'LIABILITY' | 'PRIVACY';

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('TERMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledToBottom(true);
    }
  };

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
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-500 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    MOMZZ Legal Agreement
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                    Official v2.4
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Terms of Service, Image Storage Policy & Liability Shield
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition active:scale-95 cursor-pointer"
                title="Print Terms Document"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-slate-200/60 dark:border-white/[0.05] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('TERMS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                activeTab === 'TERMS'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. Terms of Use</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('IMAGE_STORAGE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                activeTab === 'IMAGE_STORAGE'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>2. Vehicle & Image Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LIABILITY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                activeTab === 'LIABILITY'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. Damage Disclaimer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PRIVACY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                activeTab === 'PRIVACY'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>4. Data Privacy</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-2 border-b border-slate-200/50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search legal clauses (e.g. photos, damage, warranty, liability)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Body Content (Scrollable) */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed"
          >
            {/* TAB 1: GENERAL TERMS OF SERVICE */}
            {(activeTab === 'TERMS' || searchQuery) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-white/10">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    1. Platform Usage & Operating Terms
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <p>
                    <strong>1.1 Acceptance of Agreement:</strong> By accessing, registering for, or operating the MOMZZ Garage Operating Platform (&ldquo;MOMZZ&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the System&rdquo;), all registered staff members, mechanics, supervisors, workshop proprietors, and client tracking visitors unconditionally agree to be bound by these Terms and Conditions.
                  </p>
                  <p>
                    <strong>1.2 Authorized Workshop Operations:</strong> MOMZZ is deployed exclusively for legitimate automotive workshop service coordination, digital job card authoring, inventory catalog management, technician task delegation, speed bonus tracking, and digital customer updates. Unauthorized reverse engineering, scraping, or automated querying is strictly prohibited.
                  </p>
                  <p>
                    <strong>1.3 Account Security & Shared Pinning:</strong> Each staff account is unique. Account holders are solely responsible for maintaining the confidentiality of their passwords and credentials. Any task sign-offs, photo captures, or parts requisitions recorded under an authenticated account shall be legally attributed to that user.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: VEHICLE & IMAGE STORAGE POLICY (CRITICAL) */}
            {(activeTab === 'IMAGE_STORAGE' || searchQuery) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-white/10">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    2. Vehicle Data & Photographic Proof Storage Policy
                  </h3>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>In-Image Tamper-Evident Proof Clause</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Photographs captured through the MOMZZ Live Camera Inspection Studio are permanently rendered with an indelible forensic watermark burned into the raw image pixels containing: Vehicle Registration Number, Vehicle Model, Exact Timestamp (IST), Garage Inspection ID, and Technician Remarks. These visual proofs cannot be altered after capture.
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <p>
                    <strong>2.1 Photographic Intake Protocol:</strong> Before any physical labor, diagnostic teardown, or service begins, workshop personnel shall capture multi-angle photographic records of the vehicle. These photographs serve as definitive legal proof of the vehicle&rsquo;s physical, cosmetic, and mechanical state upon arrival.
                  </p>
                  <p>
                    <strong>2.2 Irrevocable Owner Consent:</strong> By surrendering a vehicle to the garage service bay, the vehicle owner or authorized agent grants irrevocable consent to capture, store, and digitally process vehicle photographs for operational, QA, and legal dispute prevention purposes.
                  </p>
                  <p>
                    <strong>2.3 Secure Cloud Storage:</strong> All captured inspection media are securely transmitted over TLS 1.3 encryption and stored across enterprise cloud infrastructure (Cloudinary and AWS S3). Files are retained for the statutory period required for tax, warranty, and insurance claim validation.
                  </p>
                  <p>
                    <strong>2.4 Evidentiary Value:</strong> Images stored within MOMZZ with burnt-in metadata shall be recognized as authentic primary evidence in any arbitration, insurance assessment, or consumer dispute regarding vehicle handover condition.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: DAMAGE DISCLAIMER & LIABILITY SHIELD */}
            {(activeTab === 'LIABILITY' || searchQuery) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-white/10">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    3. Pre-Existing Damage Disclaimer & Liability Limitation
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Absolute Exclusion of Liability for Pre-Existing Conditions</span>
                  </div>
                  <p>
                    <strong>3.1 Pre-Existing Defects:</strong> Neither MOMZZ nor the workshop enterprise shall be liable for any scratches, body panel dents, windshield cracks, worn tires, defective electronics, or mechanical wear existing prior to the creation of the job card, as evidenced by the intake photographs.
                  </p>
                  <p>
                    <strong>3.2 Consequential Damages:</strong> Under no circumstances shall MOMZZ software providers, developers, or garage operators be liable for indirect, incidental, punitive, or consequential damages resulting from vehicle roadworthiness, third-party component failures, or towing delays.
                  </p>
                  <p>
                    <strong>3.3 Customer Valuables:</strong> Vehicle owners are strictly advised to remove all personal belongings, cash, and electronic devices prior to service bay entry. The workshop and MOMZZ bear no responsibility for lost personal items.
                  </p>
                  <p>
                    <strong>3.4 Total Liability Cap:</strong> To the maximum extent permitted by applicable law, the cumulative aggregate liability of MOMZZ for any claim arising from system use shall not exceed the subscription fees paid by the workshop during the preceding thirty (30) days.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DATA PRIVACY & COMMUNICATIONS */}
            {(activeTab === 'PRIVACY' || searchQuery) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-white/10">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    4. Customer Data Privacy & Secure Storage
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <p>
                    <strong>4.1 Purpose of Data Collection:</strong> Customer names, mobile numbers, and email addresses are captured solely for servicing dispatch, estimate approvals, digital invoice generation, and WhatsApp delivery readiness alerts.
                  </p>
                  <p>
                    <strong>4.2 Zero Data Resale:</strong> MOMZZ adheres to a strict anti-monetization policy. We do not sell, rent, lease, or monetize customer contact records or vehicle ownership histories to any external marketing agencies, insurers, or data aggregators.
                  </p>
                  <p>
                    <strong>4.3 Technician Audit Trails:</strong> Worker completion times, speed bonuses, and QA sign-offs are stored to uphold transparent garage productivity metrics.
                  </p>
                  <p>
                    <strong>4.4 Jurisdiction & Governing Law:</strong> This agreement and all matters arising out of platform usage shall be governed by and construed in accordance with the laws of the Republic of India.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer & Action Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Legally compliant with Indian Information Technology Act & Consumer Shield</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition active:scale-95 cursor-pointer"
              >
                Close
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
                  <span>I Accept & Agree</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
