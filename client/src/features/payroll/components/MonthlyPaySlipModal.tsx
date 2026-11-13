import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Share2,
  Calendar,
  User,
  ShieldCheck,
  CreditCard,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { MonthlyBreakdownItem, SingleSheetDayEntry } from '../api/payrollApi';

export interface MonthlyPaySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: {
    id: string;
    name: string;
    mobile?: string;
    role?: string;
    dailyWage: number;
    profileImageUrl?: string;
  };
  monthItem?: MonthlyBreakdownItem;
  allDaysInMonth?: SingleSheetDayEntry[];
  garageName?: string;
}

export const MonthlyPaySlipModal: React.FC<MonthlyPaySlipModalProps> = ({
  isOpen,
  onClose,
  worker,
  monthItem,
  garageName = 'MOMZZ AUTOMOTIVE GARAGE',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !monthItem) return null;

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const dailyWage = worker.dailyWage || 0;
  const grossBase = monthItem.workingDays * dailyWage;
  const grossEarnings = grossBase + (monthItem.otAmount || 0) + (monthItem.incentives || 0);
  const totalDeductions = (monthItem.leaveDeductions || 0) + (monthItem.advances || 0);
  const netSalary = Math.max(0, grossEarnings - totalDeductions);
  const isSettled = monthItem.isSettled;

  // Build formatted text for WhatsApp and Clipboard
  const generateSlipText = () => {
    return `🏢 *${garageName}*
📄 *MONTHLY SALARY PAY SLIP*
━━━━━━━━━━━━━━━━━━━━
👤 *Worker:* ${worker.name} (${worker.role || 'Staff'})
📱 *Mobile:* ${worker.mobile || 'N/A'}
📅 *Period:* ${monthItem.monthLabel}
💰 *Daily Wage Rate:* ₹${dailyWage.toLocaleString('en-IN')} / day

📊 *ATTENDANCE SUMMARY:*
• Working Days Present: ${monthItem.workingDays} days
• Sundays / Weekly Offs: ${monthItem.sundays} days
• Paid Holidays: ${monthItem.holidays} days
• Leaves Taken: ${monthItem.leaveDays} days (Allowed: ${monthItem.allowedLeaveDays}d)

💵 *EARNINGS:*
• Base Wages (${monthItem.workingDays}d × ₹${dailyWage}): ₹${grossBase.toLocaleString('en-IN')}
• Overtime (${monthItem.otHours} hrs): +₹${(monthItem.otAmount || 0).toLocaleString('en-IN')}
• Incentives: +₹${(monthItem.incentives || 0).toLocaleString('en-IN')}
• *Gross Earnings:* ₹${grossEarnings.toLocaleString('en-IN')}

📉 *DEDUCTIONS:*
• Leave Deductions: -₹${(monthItem.leaveDeductions || 0).toLocaleString('en-IN')}
• Advances Taken: -₹${(monthItem.advances || 0).toLocaleString('en-IN')}
• *Total Deductions:* -₹${totalDeductions.toLocaleString('en-IN')}

━━━━━━━━━━━━━━━━━━━━
✨ *NET SALARY:* ₹${netSalary.toLocaleString('en-IN')}
📌 *Settlement Status:* ${isSettled ? '✅ PAID & SETTLED' : '⏳ ACTIVE / DUE'}
━━━━━━━━━━━━━━━━━━━━
Issued on ${todayStr} • Momzz Garage Management System`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateSlipText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateSlipText());
    const phone = worker.mobile ? worker.mobile.replace(/\D/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-payslip-card, #print-payslip-card * {
            visibility: visible !important;
          }
          #print-payslip-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pay Slip Snapshot • {monthItem.monthLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Printable Pay Slip Card */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          <div
            id="print-payslip-card"
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4"
          >
            {/* Slip Header */}
            <div className="border-b border-slate-200 dark:border-white/10 pb-3 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-900 dark:text-white font-black tracking-tight text-base sm:text-lg">
                  <Building2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{garageName}</span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Monthly Wage Pay Slip
                </p>
              </div>
              <div className="text-center sm:text-right">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  {monthItem.monthLabel}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Date: {todayStr}</p>
              </div>
            </div>

            {/* Worker & Daily Wage Meta Grid */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Worker Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{worker.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Designation / Role</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {worker.role || 'Staff / Mechanic'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Daily Wage Rate</span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  ₹{dailyWage.toLocaleString('en-IN')} / day
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Mobile Contact</span>
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {worker.mobile || 'Not registered'}
                </span>
              </div>
            </div>

            {/* Attendance Breakdown (Days Worked) */}
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 font-mono tracking-wider block mb-1.5">
                Attendance Breakdown
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[9px] uppercase">Working Days</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {monthItem.workingDays}d
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[9px] uppercase">Sundays</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {monthItem.sundays}d
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[9px] uppercase">Holidays</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {monthItem.holidays}d
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[9px] uppercase">Leaves Taken</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {monthItem.leaveDays}d
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Financials: Earnings vs Deductions */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
              <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 font-mono tracking-wider block">
                Earnings & Deductions
              </span>

              <div className="space-y-1.5 text-xs font-mono">
                {/* Earnings rows */}
                <div className="flex justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-slate-600 dark:text-slate-400">
                    Base Daily Wages ({monthItem.workingDays} days × ₹{dailyWage})
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{grossBase.toLocaleString('en-IN')}
                  </span>
                </div>

                {monthItem.otAmount > 0 && (
                  <div className="flex justify-between py-1 px-2 rounded-lg bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
                    <span>Approved Overtime ({monthItem.otHours} hrs)</span>
                    <span className="font-bold">+₹{monthItem.otAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {Boolean(monthItem.incentives && monthItem.incentives > 0) && (
                  <div className="flex justify-between py-1 px-2 rounded-lg bg-amber-500/5 text-amber-700 dark:text-amber-400">
                    <span>Incentives / Day Rewards</span>
                    <span className="font-bold">+₹{(monthItem.incentives || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                {/* Deductions rows */}
                {monthItem.leaveDeductions > 0 && (
                  <div className="flex justify-between py-1 px-2 rounded-lg bg-rose-500/5 text-rose-700 dark:text-rose-400">
                    <span>Leave Deductions (unpaid leaves)</span>
                    <span className="font-bold">-₹{monthItem.leaveDeductions.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {monthItem.advances > 0 && (
                  <div className="flex justify-between py-1 px-2 rounded-lg bg-rose-500/5 text-rose-700 dark:text-rose-400">
                    <span>Cash Advances Recovered</span>
                    <span className="font-bold">-₹{monthItem.advances.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Net Amount Highlight Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  Net Salary Payable
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                  ₹{netSalary.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                {isSettled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Settled / Paid</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Active Dues</span>
                  </span>
                )}
              </div>
            </div>

            {/* Footer Disclaimer */}
            <p className="text-[9px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100 dark:border-white/5">
              Momzz Garage Management • Daily wage attendance ledger snapshot
            </p>
          </div>
        </div>

        {/* Modal Action Buttons (No-print) */}
        <div className="no-print p-3 sm:p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 active:scale-95 transition shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 active:scale-95 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 active:scale-95 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
