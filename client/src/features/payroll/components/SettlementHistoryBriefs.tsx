import React, { useState, useEffect, useRef } from 'react';
import { ModernInfiniteLoader } from '../../../shared/components/common/ModernInfiniteLoader';
import {
  CreditCard,
  Calendar,
  Clock,
  Sparkles,
  Share2,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ISettlementBrief } from '../api/payrollApi';

interface SettlementHistoryBriefsProps {
  settlements: Array<{
    id: string;
    date: string;
    amount: number;
    periodCovered?: { startDate: string; endDate: string };
    notes?: string;
    paymentMethod?: string;
    referenceNote?: string;
    settledByName?: string;
    carriedForwardBalance?: number;
    itemizedSummary?: ISettlementBrief;
  }>;
  workerName: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const SettlementHistoryBriefs: React.FC<SettlementHistoryBriefsProps> = ({
  settlements,
  workerName,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    settlements.length > 0 ? settlements[0].id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreBriefs = visibleCount < settlements.length;
  const visibleSettlements = settlements.slice(0, visibleCount);
  useEffect(() => { setVisibleCount(10); }, [settlements.length]);
  useEffect(() => {
    if (!sentinelRef.current || !hasMoreBriefs) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreBriefs && !isLoadingMore) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + 10, settlements.length));
          setIsLoadingMore(false);
        }, 120);
      }
    }, { rootMargin: '140px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMoreBriefs, isLoadingMore, settlements.length]);

  if (settlements.length === 0) {
    return (
      <div className="p-8 text-center glass-modern-card rounded-2xl space-y-2 text-slate-400">
        <CreditCard className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          No settlements yet
        </p>
      </div>
    );
  }

  const handleShareWhatsApp = (s: any) => {
    const summary = s.itemizedSummary || {};
    const period = s.periodCovered
      ? `${s.periodCovered.startDate} to ${s.periodCovered.endDate}`
      : s.date;

    const text = `*Momzz Garage • Salary Slip Voucher*
👤 *Worker:* ${workerName}
📅 *Period:* ${period}
🗓️ *Days Worked:* ${summary.totalWorkingDays ?? 'N/A'}
⚡ *Overtime:* ${summary.totalOtHours || 0}h (${formatCurrency(summary.totalOtAmount || 0)})
💸 *Advances Deducted:* ${formatCurrency(summary.totalAdvancesDeducted || 0)}
🎁 *Incentives:* ${formatCurrency(summary.totalIncentives || 0)}
💰 *Net Payout:* ${formatCurrency(s.amount)} via ${s.paymentMethod || 'CASH'}
${summary.carriedForwardBalance ? `⚖️ *Carried Balance:* ${formatCurrency(summary.carriedForwardBalance)}\n` : ''}
🏢 *Momzz Garage Systems*`;

    window.open(`https://wa.me/?text=${encodeURI(text)}`, '_blank');
  };

  const handleCopySlip = (s: any) => {
    const summary = s.itemizedSummary || {};
    const period = s.periodCovered
      ? `${s.periodCovered.startDate} to ${s.periodCovered.endDate}`
      : s.date;

    const text = `Momzz Garage • Salary Slip
Worker: ${workerName} | Period: ${period}
Days: ${summary.totalWorkingDays ?? 'N/A'} | OT: ${summary.totalOtHours || 0}h (${formatCurrency(summary.totalOtAmount || 0)})
Advances: ${formatCurrency(summary.totalAdvancesDeducted || 0)} | Incentives: ${formatCurrency(summary.totalIncentives || 0)}
Net Payout: ${formatCurrency(s.amount)} via ${s.paymentMethod || 'CASH'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3">
      {visibleSettlements.map((s, idx) => {
        const isExpanded = expandedId === s.id;
        const item = s.itemizedSummary || ({} as any);

        return (
          <div
            key={s.id}
            className={`rounded-2xl glass-modern-card border transition-all ${
              idx === 0 ? 'border-amber-500/40 shadow-xs' : 'border-slate-200/70 dark:border-white/10'
            }`}
          >
            {/* Brief Header Summary */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : s.id)}
              className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-amber-500/[0.02]"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      Payout Settlement • {formatCurrency(s.amount)}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                      {s.paymentMethod || 'CASH'}
                    </span>
                    {idx === 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.periodCovered
                      ? `${s.periodCovered.startDate} → ${s.periodCovered.endDate}`
                      : s.date}
                    {s.referenceNote ? ` • Ref: ${s.referenceNote}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <span className="text-[11px] font-mono text-slate-400">
                  Settled by {s.settledByName || 'Admin'}
                </span>
                <button
                  type="button"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expanded Itemized Brief */}
            {isExpanded && (
              <div className="p-3 sm:p-4 pt-0 border-t border-slate-100 dark:border-white/5 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono pt-3">
                  <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">Working Days</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.totalWorkingDays ?? '—'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">Gross Base</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.grossWages || 0)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">Approved OT</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(item.totalOtAmount || 0)} ({item.totalOtHours || 0}h)
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">Advances Deducted</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(item.totalAdvancesDeducted || 0)}
                    </span>
                  </div>
                </div>

                {/* Sub-breakdown chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  {item.totalIncentives && item.totalIncentives > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                      Incentive +{formatCurrency(item.totalIncentives)}
                    </span>
                  ) : null}

                  {item.carriedForwardBalance && item.carriedForwardBalance > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold">
                      Carried Forward Balance: {formatCurrency(item.carriedForwardBalance)}
                    </span>
                  ) : null}
                </div>

                {/* Action Buttons: 1-Click WhatsApp & Print */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareWhatsApp(s);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share WhatsApp Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopySlip(s);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition active:scale-95"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.print();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Voucher</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <ModernInfiniteLoader
        sentinelRef={sentinelRef}
        hasMore={hasMoreBriefs}
        isLoading={isLoadingMore}
        totalCount={settlements.length}
        entityName="settlements"
        loadingLabel="Loading settlements..."
      />
    </div>
  );
};
