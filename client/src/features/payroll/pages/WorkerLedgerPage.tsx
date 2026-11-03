import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Wallet,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  X,
  TrendingUp,
  Banknote,
  Zap,
  Info,
  CalendarDays,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  useGetWorkerSingleSheetQuery,
  useGetMySingleSheetQuery,
  useClaimOvertimeMutation,
  useSettlePayrollMutation,
  useRecordAdvanceMutation,
  SingleSheetDayEntry,
} from '../api/payrollApi';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const WorkerLedgerPage: React.FC = () => {
  const { workerId } = useParams<{ workerId: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Determine query to use
  const workerSingleSheetQuery = useGetWorkerSingleSheetQuery(
    { workerId: workerId || '', includeSettledHistory: true },
    { skip: !workerId || !isAdmin }
  );

  const mySingleSheetQuery = useGetMySingleSheetQuery(
    { includeSettledHistory: true },
    { skip: !!workerId && isAdmin }
  );

  const activeQuery = workerId && isAdmin ? workerSingleSheetQuery : mySingleSheetQuery;
  const { data, isLoading, refetch } = activeQuery;

  // Mutations
  const [claimOvertime, { isLoading: isClaimingOt }] = useClaimOvertimeMutation();
  const [settlePayroll, { isLoading: isSettling }] = useSettlePayrollMutation();
  const [recordAdvance, { isLoading: isRecordingAdvance }] = useRecordAdvanceMutation();

  // Modals
  const [showOtModal, setShowOtModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  // OT Form State
  const [otDate, setOtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState<number>(1);
  const [otNote, setOtNote] = useState('');

  // Advance Form State
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceNote, setAdvanceNote] = useState('');

  // Settle Form State
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleEndDate, setSettleEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [settleReference, setSettleReference] = useState('');

  const worker = data?.data?.worker;
  const kpis = data?.data?.kpis || {
    totalWorkingDays: 0,
    totalSundays: 0,
    totalHolidayDays: 0,
    totalFullLeaveDays: 0,
    totalHalfDays: 0,
    grossWages: 0,
    totalLeaveDeductions: 0,
    netBaseWages: 0,
    totalApprovedOtHours: 0,
    totalApprovedOtAmount: 0,
    totalEarnings: 0,
    totalUnsettledAdvances: 0,
    netPayable: 0,
  };
  const days = data?.data?.days || [];

  // Group days by Month-Year for continuous sticky sectioning
  const groupedDays = useMemo(() => {
    const groups: { [key: string]: SingleSheetDayEntry[] } = {};
    days.forEach((day) => {
      const d = new Date(`${day.date}T00:00:00`);
      const monthYear = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(day);
    });
    return groups;
  }, [days]);

  // Handle OT Claim Submit
  const handleOtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otHours || otHours < 1) return;

    try {
      await claimOvertime({
        date: otDate,
        otHours: Math.floor(otHours),
        note: otNote,
      }).unwrap();

      setShowOtModal(false);
      setOtNote('');
      setOtHours(1);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit overtime claim');
    }
  };

  // Handle Advance Submit (Admin only)
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !advanceAmount || Number(advanceAmount) <= 0) return;

    try {
      await recordAdvance({
        workerId: worker.id,
        amount: Number(advanceAmount),
        date: advanceDate,
        notes: advanceNote,
      }).unwrap();

      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceNote('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record cash advance');
    }
  };

  // Handle Settle Submit (Admin only)
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;

    try {
      await settlePayroll({
        workerId: worker.id,
        endDate: settleEndDate,
        amountPaid: settleAmount === '' ? undefined : Number(settleAmount),
        paymentMethod,
        referenceNote: settleReference,
      }).unwrap();

      setShowSettleModal(false);
      setSettleAmount('');
      setSettleReference('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to settle payroll');
    }
  };

  if (isLoading) {
    return <PageShimmer />;
  }

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-3 sm:py-4 pb-36 sm:pb-40 md:pb-16 space-y-3 sm:space-y-4">
        {/* Top Header */}
        <PageHeader
          backTo="/payroll"
          title={worker?.name || 'Worker Ledger'}
          description="Continuous single-sheet financial ledger"
          badge={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold font-mono">
              ₹{worker?.dailyWage || 0}/day
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOtModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Claim OT</span>
              </button>
              {isAdmin && worker && (
                <>
                  <button
                    onClick={() => setShowAdvanceModal(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Advance</span>
                  </button>
                  <button
                    onClick={() => {
                      setSettleAmount(kpis.netPayable);
                      setShowSettleModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Settle Dues</span>
                  </button>
                </>
              )}
              <AnimatedThemeToggle variant="icon-only" />
            </div>
          }
        />

        {/* ── HERO DUES CARD ── */}
        <div className="p-4 sm:p-5 rounded-2xl glass-modern-card border-amber-500/30 space-y-3 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-xs font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                Unsettled Payable Dues
              </span>
              <p className="text-2xl sm:text-4xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(kpis.netPayable)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
              <button
                onClick={() => setShowOtModal(true)}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 active:scale-95 transition"
              >
                <Zap className="w-3 h-3" />
                <span>Claim OT</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setSettleAmount(kpis.netPayable);
                    setShowSettleModal(true);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 active:scale-95 transition"
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Settle</span>
                </button>
              )}
            </div>
          </div>

          {/* Breakdown Equation Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] text-center text-[10px] sm:text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Gross</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatCurrency(kpis.grossWages)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Leave Penalty</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                -{formatCurrency(kpis.totalLeaveDeductions)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Approved OT</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(kpis.totalApprovedOtAmount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Advances Taken</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                -{formatCurrency(kpis.totalUnsettledAdvances)}
              </span>
            </div>
          </div>
        </div>

        {/* ── KPI METRICS 4-GRID ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
              Working Days
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {kpis.totalWorkingDays}
            </p>
            <p className="text-[10px] text-slate-400">Non-Sunday present</p>
          </div>

          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
              Floor Deductions
            </span>
            <p className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              -{formatCurrency(kpis.totalLeaveDeductions)}
            </p>
            <p className="text-[10px] text-slate-400">Floor-100 rule</p>
          </div>

          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
              Overtime Hours
            </span>
            <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {kpis.totalApprovedOtHours}h
            </p>
            <p className="text-[10px] text-slate-400">+{formatCurrency(kpis.totalApprovedOtAmount)}</p>
          </div>

          <div className="p-3 rounded-2xl glass-modern-card shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
              Advances
            </span>
            <p className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              -{formatCurrency(kpis.totalUnsettledAdvances)}
            </p>
            <p className="text-[10px] text-slate-400">Mid-cycle cash</p>
          </div>
        </div>

        {/* ── CONTINUOUS SINGLE-SHEET STREAM ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily Transaction Stream</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              {days.length} entries recorded
            </span>
          </div>

          {days.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 glass-modern-card rounded-2xl">
              No daily entries recorded yet.
            </div>
          ) : (
            Object.entries(groupedDays).map(([monthYear, monthDays]) => (
              <div key={monthYear} className="space-y-2">
                {/* Month Sticky Header */}
                <div className="p-2 sm:px-3 rounded-xl glass-modern-card flex items-center justify-between">
                  <span className="font-bold text-xs uppercase font-mono tracking-wider text-slate-700 dark:text-slate-300">
                    {monthYear}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {monthDays.length} days
                  </span>
                </div>

                {/* Day Rows */}
                <div className="space-y-1.5">
                  {monthDays.map((day) => {
                    const isSun = day.dayType === 'SUNDAY';
                    const isHol = day.dayType === 'HOLIDAY';
                    const isLeave = day.dayType === 'FULL_LEAVE' || day.dayType === 'HALF_LEAVE';

                    return (
                      <div
                        key={day.date}
                        className={`p-3 rounded-xl glass-modern-card space-y-2 transition ${
                          isSun
                            ? 'opacity-65'
                            : isLeave
                            ? 'border-l-4 border-amber-500'
                            : isHol
                            ? 'border-l-4 border-purple-500'
                            : 'border-l-4 border-emerald-500/60'
                        }`}
                      >
                        {/* Main Day Header */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Left: Date & Status Badge */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="font-mono text-center w-8 shrink-0">
                              <span className="text-sm font-black text-slate-900 dark:text-white block leading-none">
                                {day.date.split('-')[2]}
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase font-sans">
                                {day.dayName.slice(0, 3)}
                              </span>
                            </div>

                            <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                              {isSun ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                  Sunday (₹0)
                                </span>
                              ) : isHol ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                  {day.holidayTitle || 'Holiday'} (100% Paid)
                                </span>
                              ) : isLeave ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                  {day.dayType === 'FULL_LEAVE' ? 'Full Leave' : 'Half Day'} (-₹{day.leaveDeduction})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                  Present (+₹{day.baseWage})
                                </span>
                              )}

                              {/* Overtime chip if present */}
                              {day.otHours > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                    day.otStatus === 'APPROVED'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : day.otStatus === 'REJECTED'
                                      ? 'bg-rose-500/10 text-rose-600'
                                      : 'bg-amber-500/10 text-amber-600'
                                  }`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{day.otHours}h OT</span>
                                  {day.otStatus === 'APPROVED' && (
                                    <span className="font-mono">+{formatCurrency(day.otAmount)}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Day Earnings & Running Balance */}
                          <div className="text-right shrink-0 font-mono">
                            <span
                              className={`text-xs font-bold block ${
                                day.netDailyPay > 0
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              +{formatCurrency(day.netDailyPay)}
                            </span>
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold block">
                              bal {formatCurrency(day.runningCumulativeBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Note if any */}
                        {day.adjustmentNote && (
                          <p className="text-[10px] text-slate-400 italic pl-10">
                            Note: {day.adjustmentNote}
                          </p>
                        )}

                        {/* Inline Transactions (Cash Advances taken / Settlement Payouts) */}
                        {day.inlineTransactions && day.inlineTransactions.length > 0 && (
                          <div className="pl-10 space-y-1">
                            {day.inlineTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                                  tx.type === 'PAYOUT_SETTLEMENT'
                                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-500/20'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {tx.type === 'PAYOUT_SETTLEMENT' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Banknote className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                  <span className="font-bold text-[11px]">
                                    {tx.type === 'PAYOUT_SETTLEMENT'
                                      ? 'Settlement Paid'
                                      : 'Cash Advance Taken'}
                                  </span>
                                  {tx.paymentMethod && (
                                    <span className="text-[10px] opacity-75">
                                      ({tx.paymentMethod})
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-xs">
                                  -{formatCurrency(tx.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* ── MODAL 1: WORKER CLAIM OVERTIME (Responsive Bottom-Sheet) ── */}
      {showOtModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Claim Overtime Hours
                </h3>
                <p className="text-[11px] text-slate-400">Fixed rate: ₹150 / whole hour</p>
              </div>
              <button
                onClick={() => setShowOtModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Overtime Claim Rules</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Overtime rate is strictly ₹150/hr. Partial hours (minutes) are truncated. Subject to admin verification.
              </p>
            </div>

            <form onSubmit={handleOtSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Date of Overtime
                </label>
                <input
                  type="date"
                  required
                  value={otDate}
                  onChange={(e) => setOtDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              {/* Whole Hours Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Whole Hours
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setOtHours(hr)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        otHours === hr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hr}h (+₹{hr * 150})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason / Work Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engine disassembly, emergency repair..."
                  value={otNote}
                  onChange={(e) => setOtNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOtModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaimingOt}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                >
                  {isClaimingOt ? 'Submitting...' : `Submit ${otHours}h (+₹${otHours * 150})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADMIN GIVE ADVANCE ── */}
      {showAdvanceModal && worker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Give Cash Advance to {worker.name}
              </h3>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-week cash advance..."
                  value={advanceNote}
                  onChange={(e) => setAdvanceNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingAdvance}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  {isRecordingAdvance ? 'Saving...' : 'Record Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ADMIN SETTLE DUES ── */}
      {showSettleModal && worker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  Settle Payroll Dues
                </h3>
                <p className="text-xs text-slate-400">Worker: {worker.name}</p>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Current Calculated Dues:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 text-sm">
                    {formatCurrency(kpis.netPayable)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Amount to Disburse (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Settlement Through Date
                </label>
                <input
                  type="date"
                  required
                  value={settleEndDate}
                  onChange={(e) => setSettleEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reference / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cash voucher..."
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  {isSettling ? 'Processing...' : 'Disburse & Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
