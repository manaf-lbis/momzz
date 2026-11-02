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
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
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

  // Day type border/bg helpers
  const getDayRowClasses = (dayType: string) => {
    switch (dayType) {
      case 'SUNDAY':
        return 'border-l-4 border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/30 opacity-60';
      case 'HOLIDAY':
        return 'border-l-4 border-purple-400 bg-purple-50/30 dark:bg-purple-500/5';
      case 'FULL_LEAVE':
        return 'border-l-4 border-amber-400 bg-amber-50/30 dark:bg-amber-500/5';
      case 'HALF_LEAVE':
        return 'border-l-4 border-orange-400 bg-orange-50/30 dark:bg-orange-500/5';
      default:
        return 'border-l-4 border-transparent';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 sm:pb-8">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 py-1">
          <BackButton />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                {worker?.name || 'Worker'}
              </h1>
              {/* Wage badge pill */}
              <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 rounded-full px-3 py-1 text-xs font-bold shrink-0">
                {formatCurrency(worker?.dailyWage || 0)} / day
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              Single-Sheet Ledger &bull; Floor-100 &bull; ₹150/hr OT
            </p>
          </div>
          <AnimatedThemeToggle />
        </div>

        {/* ── KPI SCROLL BAR (mobile: horizontal scroll, desktop: grid) ── */}
        <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto gap-3 no-scrollbar pb-2 sm:pb-0">
          {/* Net Payable */}
          <div className="min-w-[140px] sm:min-w-0 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-1 shrink-0">
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono leading-tight">
              {formatCurrency(kpis.netPayable)}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Net Due
            </span>
          </div>

          {/* Gross Earned */}
          <div className="min-w-[140px] sm:min-w-0 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-1 shrink-0">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono leading-tight">
              {formatCurrency(kpis.grossWages)}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Gross Earned
            </span>
          </div>

          {/* Floor Deductions */}
          <div className="min-w-[140px] sm:min-w-0 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-1 shrink-0">
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono leading-tight">
              -{formatCurrency(kpis.totalLeaveDeductions)}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Deductions
            </span>
          </div>

          {/* Approved OT */}
          <div className="min-w-[140px] sm:min-w-0 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-1 shrink-0">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono leading-tight">
              +{formatCurrency(kpis.totalApprovedOtAmount)}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              OT ({kpis.totalApprovedOtHours}h)
            </span>
          </div>

          {/* Cash Advances */}
          <div className="min-w-[140px] sm:min-w-0 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-start gap-1 shrink-0">
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10">
              <Banknote className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </span>
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono leading-tight">
              -{formatCurrency(kpis.totalUnsettledAdvances)}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Advances
            </span>
          </div>
        </div>

        {/* ── NET PAYABLE HERO CARD ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent dark:from-amber-500/20 dark:via-amber-400/10 dark:to-transparent px-5 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">
                  Amount Due
                </p>
                <p className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                  {formatCurrency(kpis.netPayable)}
                </p>
                {/* Sub-breakdown */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.grossWages)}</span>
                  <span className="mx-1 text-slate-400">−</span>
                  <span className="text-amber-600 dark:text-amber-400">{formatCurrency(kpis.totalLeaveDeductions)}</span>
                  <span className="mx-1 text-slate-400">−</span>
                  <span className="text-rose-600 dark:text-rose-400">{formatCurrency(kpis.totalUnsettledAdvances)}</span>
                  <span className="mx-1 text-slate-400">+</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.totalApprovedOtAmount)}</span>
                  <span className="mx-1 text-slate-400">=</span>
                  <span className="text-slate-800 dark:text-white font-bold">{formatCurrency(kpis.netPayable)}</span>
                </p>
              </div>
              {isAdmin && worker && (
                <button
                  onClick={() => {
                    setSettleAmount(kpis.netPayable);
                    setShowSettleModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all shrink-0"
                >
                  <CreditCard className="w-4 h-4" />
                  Settle Dues
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── DAILY LEDGER STREAM ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-500" />
              Daily Ledger
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {days.length} entries
            </span>
          </div>

          {days.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-12 flex flex-col items-center gap-3 text-center">
              <span className="text-5xl">📋</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No records found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                No daily entries have been recorded yet. Check back after the work period begins.
              </p>
            </div>
          ) : (
            Object.entries(groupedDays).map(([monthYear, monthDays]) => (
              <div
                key={monthYear}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden"
              >
                {/* Sticky Month Header */}
                <div className="sticky top-0 z-10 bg-slate-100/95 dark:bg-zinc-950/95 backdrop-blur-md px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {monthYear}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {monthDays.length} days
                  </span>
                </div>

                {/* Day Rows */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {monthDays.map((day) => {
                    const isSun = day.dayType === 'SUNDAY';
                    const isHol = day.dayType === 'HOLIDAY';
                    const isLeave = day.dayType === 'FULL_LEAVE' || day.dayType === 'HALF_LEAVE';

                    return (
                      <div key={day.date} className={`transition-colors ${getDayRowClasses(day.dayType)}`}>
                        {/* Main Day Row */}
                        <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
                          {/* Date column */}
                          <div className="font-mono text-center w-10 shrink-0">
                            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 block leading-tight">
                              {day.date.split('-')[2]}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase block font-sans tracking-wide">
                              {day.dayName.slice(0, 3)}
                            </span>
                          </div>

                          {/* Status & Note — takes remaining space */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isSun ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-slate-400">
                                  Sunday Off
                                </span>
                              ) : isHol ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                  <span>{day.holidayTitle || 'Garage Holiday'}</span>
                                  <span className="text-[9px] opacity-70">· Paid</span>
                                </span>
                              ) : isLeave ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                  <span>{day.dayType === 'FULL_LEAVE' ? 'Full Leave' : 'Half Day'}</span>
                                  <span className="font-mono text-[9px] opacity-80">-₹{day.leaveDeduction}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                                  Present
                                </span>
                              )}

                              {/* OT badge */}
                              {day.otHours > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                    day.otStatus === 'APPROVED'
                                      ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : day.otStatus === 'REJECTED'
                                      ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                                  }`}
                                >
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  <span>{day.otHours}h OT</span>
                                  {day.otStatus === 'APPROVED' ? (
                                    <span className="font-mono">+{formatCurrency(day.otAmount)}</span>
                                  ) : (
                                    <span className="opacity-70 lowercase">· {day.otStatus}</span>
                                  )}
                                </span>
                              )}
                            </div>

                            {day.adjustmentNote && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate">
                                {day.adjustmentNote}
                              </p>
                            )}
                          </div>

                          {/* Right: earnings + running balance */}
                          <div className="shrink-0 text-right space-y-0.5">
                            <p className={`text-xs font-bold font-mono ${day.netDailyPay > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-zinc-600'}`}>
                              +{formatCurrency(day.netDailyPay)}
                            </p>
                            <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                              {formatCurrency(day.runningCumulativeBalance)}
                            </p>
                          </div>
                        </div>

                        {/* Inline transactions */}
                        {day.inlineTransactions && day.inlineTransactions.length > 0 && (
                          <div className="px-4 pb-2.5 pt-0 ml-10 space-y-1.5">
                            {day.inlineTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                  tx.type === 'PAYOUT_SETTLEMENT'
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="shrink-0">
                                    {tx.type === 'PAYOUT_SETTLEMENT' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Banknote className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    )}
                                  </span>
                                  <span className="font-semibold truncate">
                                    {tx.type === 'PAYOUT_SETTLEMENT' ? 'Settlement Payout' : 'Cash Advance'}
                                  </span>
                                  {tx.paymentMethod && (
                                    <span className="text-[10px] uppercase font-bold opacity-60 shrink-0">
                                      {tx.paymentMethod}
                                    </span>
                                  )}
                                  {tx.notes && (
                                    <span className="text-[10px] opacity-60 truncate hidden sm:block">
                                      · {tx.notes}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-extrabold shrink-0">
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
        </div>
      </main>

      {/* ── MOBILE BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 flex items-center justify-around px-4 py-3 pb-4 sm:hidden">
        {!isAdmin ? (
          /* Worker action bar */
          <button
            onClick={() => setShowOtModal(true)}
            className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold active:scale-95 transition-all shadow-sm"
          >
            <Zap className="w-5 h-5" />
            Claim OT
          </button>
        ) : (
          /* Admin action bar */
          <>
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-[11px] font-semibold active:scale-95 transition-all"
            >
              <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Give Advance
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700" />
            <button
              onClick={() => setShowOtModal(true)}
              className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-[11px] font-semibold active:scale-95 transition-all"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              OT Claim
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700" />
            <button
              onClick={() => {
                setSettleAmount(kpis.netPayable);
                setShowSettleModal(true);
              }}
              className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-[11px] font-semibold active:scale-95 transition-all"
            >
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Settle Dues
            </button>
          </>
        )}
      </div>

      {/* ── OT CLAIM MODAL (bottom-sheet on mobile) ── */}
      {showOtModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border border-slate-200 dark:border-zinc-800 shadow-2xl">
            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-600" />
            </div>

            <div className="px-6 pt-4 pb-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Claim Overtime Hours
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fixed rate: ₹150 / whole hour</p>
                </div>
                <button
                  onClick={() => setShowOtModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning banner */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Overtime Claim Rules</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Rate is strictly <strong>₹150/hr</strong>. Partial minutes are truncated. Claims are subject to admin verification before approval.
                </p>
              </div>

              <form onSubmit={handleOtSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Date of Overtime
                  </label>
                  <input
                    type="date"
                    required
                    value={otDate}
                    onChange={(e) => setOtDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                {/* Hour selector grid */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Hours
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((hr) => (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => setOtHours(hr)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                          otHours === hr
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                        }`}
                      >
                        {hr}h
                      </button>
                    ))}
                  </div>
                  {/* Live earnings preview */}
                  <div className="mt-2 text-center">
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      +₹{otHours * 150}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">you will earn</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                    Subject to admin verification
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Work Description <span className="font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engine disassembly, emergency brake job..."
                    value={otNote}
                    onChange={(e) => setOtNote(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOtModal(false)}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaimingOt}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isClaimingOt ? 'Submitting…' : `Submit ${otHours}h Claim`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN CASH ADVANCE MODAL ── */}
      {showAdvanceModal && worker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border border-slate-200 dark:border-zinc-800 shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-600" />
            </div>

            <div className="px-6 pt-4 pb-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-500" />
                    Give Cash Advance
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">To: {worker.name}</p>
                </div>
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Net payable context */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Current Net Payable</span>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                  {formatCurrency(kpis.netPayable)}
                </span>
              </div>

              <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Advance Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notes <span className="font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mid-week cash advance..."
                    value={advanceNote}
                    onChange={(e) => setAdvanceNote(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanceModal(false)}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRecordingAdvance}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isRecordingAdvance ? 'Saving…' : 'Record Advance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN SETTLE DUES MODAL ── */}
      {showSettleModal && worker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border border-slate-200 dark:border-zinc-800 shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-600" />
            </div>

            <div className="px-6 pt-4 pb-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                    Settle Payroll Dues
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Worker: {worker.name}</p>
                </div>
                <button
                  onClick={() => setShowSettleModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prominent net payable */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide mb-1">
                  Net Payable
                </p>
                <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
                  {formatCurrency(kpis.netPayable)}
                </p>
              </div>

              <form onSubmit={handleSettleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Amount to Disburse (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                {/* Payment method radio pills */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </label>
                  <div className="flex gap-2">
                    {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                          paymentMethod === method
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                        }`}
                      >
                        {method === 'BANK_TRANSFER' ? 'Bank' : method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Settle Through Date
                  </label>
                  <input
                    type="date"
                    required
                    value={settleEndDate}
                    onChange={(e) => setSettleEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reference / Note <span className="font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Cash voucher..."
                    value={settleReference}
                    onChange={(e) => setSettleReference(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSettleModal(false)}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSettling}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all disabled:opacity-60"
                  >
                    {isSettling ? 'Processing…' : 'Disburse & Settle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
