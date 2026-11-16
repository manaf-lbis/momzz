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
    wageType?: 'DAILY' | 'MONTHLY';
    monthlySalary?: number;
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

  const isMonthly = (monthItem.wageType || worker.wageType) === 'MONTHLY';
  const monthlySalary = monthItem.monthlySalary || worker.monthlySalary || 0;
  const dailyWage = worker.dailyWage || 0;

  // Proper Mathematical Calculation:
  // For Monthly: base is the agreed monthly salary (or gross month wages).
  // For Daily: base is strictly the actual earned wages for days worked (workingDays × dailyWage).
  const grossBase = isMonthly
    ? (monthItem.grossWages || monthlySalary)
    : (monthItem.workingDays * dailyWage);

  const grossEarnings = grossBase + (monthItem.otAmount || 0) + (monthItem.incentives || 0);

  // Leave deductions only apply to monthly salaried employees.
  // For daily wage workers, unpaid leave days are already excluded from workingDays, so 0 leave deduction.
  const leaveDeduction = isMonthly ? (monthItem.leaveDeductions || 0) : 0;
  const totalDeductions = leaveDeduction + (monthItem.advances || 0);
  const netSalary = Math.max(0, grossEarnings - totalDeductions);
  const isSettled = monthItem.isSettled;

  // Build formatted text for WhatsApp and Clipboard
  const generateSlipText = () => {
    const deductionsLines: string[] = [];
    if (leaveDeduction > 0) {
      deductionsLines.push(`• Leave Deductions: -₹${leaveDeduction.toLocaleString('en-IN')}`);
    }
    if (monthItem.advances > 0) {
      deductionsLines.push(`• Advances Taken: -₹${monthItem.advances.toLocaleString('en-IN')}`);
    }
    if (deductionsLines.length === 0) {
      deductionsLines.push(`• Deductions: ₹0`);
    }

    return `🏢 *${garageName}*
📄 *MONTHLY SALARY PAY SLIP*
━━━━━━━━━━━━━━━━━━━━
👤 *Worker:* ${worker.name} (${worker.role || 'Staff'})
📱 *Mobile:* ${worker.mobile || 'N/A'}
📅 *Period:* ${monthItem.monthLabel}
${isMonthly ? `💰 *Salary Scheme:* Fixed Monthly (₹${monthlySalary.toLocaleString('en-IN')}/mo)` : `💰 *Daily Wage Rate:* ₹${dailyWage.toLocaleString('en-IN')} / day`}

📊 *ATTENDANCE SUMMARY:*
• Working Days: ${monthItem.workingDays} days
• Sundays: ${monthItem.sundays} days ${isMonthly ? '(Paid)' : '(Off)'}
• Paid Holidays: ${monthItem.holidays} days
• Leaves: ${monthItem.leaveDays} days

💵 *EARNINGS:*
• Base ${isMonthly ? 'Monthly Salary' : `Wages (${monthItem.workingDays}d × ₹${dailyWage})`}: ₹${grossBase.toLocaleString('en-IN')}
${monthItem.otAmount > 0 ? `• Overtime (${monthItem.otHours} hrs): +₹${monthItem.otAmount.toLocaleString('en-IN')}\n` : ''}${monthItem.incentives && monthItem.incentives > 0 ? `• Incentives: +₹${monthItem.incentives.toLocaleString('en-IN')}\n` : ''}• *Gross Earnings:* ₹${grossEarnings.toLocaleString('en-IN')}

📉 *DEDUCTIONS:*
${deductionsLines.join('\n')}
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
    >
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

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(88vh-4rem)] sm:max-h-[92vh] mb-20 sm:mb-0 pb-safe"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden mt-2.5 mb-1 shrink-0" />

        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              Pay Slip Snapshot • {monthItem.monthLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Printable Pay Slip Card */}
        <div className="overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4 flex-1">
          <div
            id="print-payslip-card"
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-3.5 sm:space-y-4"
          >
            {/* Slip Header */}
            <div className="border-b border-slate-200 dark:border-white/10 pb-3 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-900 dark:text-white font-black tracking-tight text-base sm:text-lg">
                  <Building2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="truncate">{garageName}</span>
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
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Worker Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{worker.name}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Designation</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                  {worker.role || 'Staff / Mechanic'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">{isMonthly ? 'Scheme' : 'Daily Rate'}</span>
                <span className="font-black text-amber-600 dark:text-amber-400 truncate block">
                  {isMonthly ? `₹${monthlySalary.toLocaleString('en-IN')}/mo` : `₹${dailyWage.toLocaleString('en-IN')}/day`}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase block truncate">Mobile</span>
                <span className="font-medium text-slate-600 dark:text-slate-400 truncate block">
                  {worker.mobile || 'Not registered'}
                </span>
              </div>
            </div>

            {/* Attendance Breakdown (Days Worked) */}
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 font-mono tracking-wider block mb-1.5">
                Attendance Breakdown
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[10px] uppercase truncate">Working Days</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                    {monthItem.workingDays}d
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[10px] uppercase truncate">Sundays</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                    {monthItem.sundays}d
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[10px] uppercase truncate">Holidays</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                    {monthItem.holidays}d
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03]">
                  <span className="text-slate-400 block text-[10px] uppercase truncate">Leaves Taken</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-sm sm:text-base">
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
                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] gap-2">
                  <span className="text-slate-600 dark:text-slate-400 min-w-0 truncate">
                    {isMonthly
                      ? `Base Monthly Salary`
                      : `Base Daily Wages (${monthItem.workingDays}d × ₹${dailyWage})`}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                    ₹{grossBase.toLocaleString('en-IN')}
                  </span>
                </div>

                {monthItem.otAmount > 0 && (
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 gap-2">
                    <span className="min-w-0 truncate">Approved Overtime ({monthItem.otHours} hrs)</span>
                    <span className="font-bold shrink-0">+₹{monthItem.otAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {Boolean(monthItem.incentives && monthItem.incentives > 0) && (
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-amber-500/5 text-amber-700 dark:text-amber-400 gap-2">
                    <span className="min-w-0 truncate">Incentives / Day Rewards</span>
                    <span className="font-bold shrink-0">+₹{(monthItem.incentives || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                {/* Deductions rows */}
                {leaveDeduction > 0 && (
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-rose-500/5 text-rose-700 dark:text-rose-400 gap-2">
                    <span className="min-w-0 truncate">Leave Deductions</span>
                    <span className="font-bold shrink-0">-₹{leaveDeduction.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {monthItem.advances > 0 && (
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-rose-500/5 text-rose-700 dark:text-rose-400 gap-2">
                    <span className="min-w-0 truncate">Cash Advances Recovered</span>
                    <span className="font-bold shrink-0">-₹{monthItem.advances.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Net Amount Highlight Banner */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold truncate">
                  Net Salary Payable
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 truncate block">
                  ₹{netSalary.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right shrink-0">
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
            <p className="text-[10px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100 dark:border-white/5">
              Momzz Garage Management • Daily wage attendance ledger snapshot
            </p>
          </div>
        </div>

        {/* Modal Action Buttons (No-print) */}
        <div className="no-print p-3 sm:p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full sm:flex-1 py-3 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 active:scale-95 transition shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Send on WhatsApp</span>
          </button>

          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition flex items-center justify-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
