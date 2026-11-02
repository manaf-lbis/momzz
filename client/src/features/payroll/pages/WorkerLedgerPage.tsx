import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wallet,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  CreditCard,
  User as UserIcon,
  X,
  TrendingUp,
  Banknote,
  Zap,
  Info,
  ChevronRight,
  Sun,
  Coffee,
  Check,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { Meteors } from '../../../shared/components/magicui/Meteors';
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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <UserIcon className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    {worker?.name || 'Worker'}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {formatCurrency(worker?.dailyWage || 0)} / day
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Continuous Single-Sheet Ledger &bull; Floor-100 Leave Penalty &bull; ₹150/hr Overtime
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowOtModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/20 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Claim Overtime</span>
            </button>

            {isAdmin && worker && (
              <>
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-white border border-slate-700/60 shadow-sm active:scale-95 transition-all"
                >
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Give Advance</span>
                </button>

                <button
                  onClick={() => {
                    setSettleAmount(kpis.netPayable);
                    setShowSettleModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Settle Dues</span>
                </button>
              </>
            )}

            <AnimatedThemeToggle />
          </div>
        </div>

        {/* Top Financial KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Unsettled Dues
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono block mt-1">
              {formatCurrency(kpis.netPayable)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Payable to worker</span>
          </div>

          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Gross Earned
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 font-mono block mt-1">
              {formatCurrency(kpis.grossWages)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.totalWorkingDays} working days</span>
          </div>

          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Floor Deductions
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono block mt-1">
              -{formatCurrency(kpis.totalLeaveDeductions)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Floor-100 rule applied</span>
          </div>

          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Approved OT
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
              +{formatCurrency(kpis.totalApprovedOtAmount)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.totalApprovedOtHours} hrs @ ₹150/hr</span>
          </div>

          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/50 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Cash Advances
            </span>
            <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono block mt-1">
              -{formatCurrency(kpis.totalUnsettledAdvances)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Unsettled advances</span>
          </div>
        </div>

        {/* Continuous Single-Sheet Stream View */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-500" />
              Continuous Financial Ledger
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing unbroken daily transaction stream
            </span>
          </div>

          {Object.entries(groupedDays).map(([monthYear, monthDays]) => (
            <div
              key={monthYear}
              className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm overflow-hidden"
            >
              {/* Sticky Month Section Header */}
              <div className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {monthYear}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {monthDays.length} records
                </span>
              </div>

              {/* Day Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {monthDays.map((day) => {
                  const isSun = day.dayType === 'SUNDAY';
                  const isHol = day.dayType === 'HOLIDAY';
                  const isLeave = day.dayType === 'FULL_LEAVE' || day.dayType === 'HALF_LEAVE';

                  return (
                    <div key={day.date} className="transition-colors hover:bg-slate-500/[0.02]">
                      {/* Main Day Bar */}
                      <div className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Left: Date & Status Badge */}
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-center w-12 shrink-0">
                            <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block leading-tight">
                              {day.date.split('-')[2]}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase block font-sans">
                              {day.dayName.slice(0, 3)}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              {isSun ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  Sunday Off (₹0)
                                </span>
                              ) : isHol ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                  <span>{day.holidayTitle || 'Garage Holiday'}</span>
                                  <span className="text-[9px] opacity-75">(100% Paid)</span>
                                </span>
                              ) : isLeave ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                  <span>{day.dayType === 'FULL_LEAVE' ? 'Full Leave' : 'Half Day'}</span>
                                  <span className="font-mono text-[9px]">(-₹{day.leaveDeduction})</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                  Present (+₹{day.baseWage})
                                </span>
                              )}

                              {/* Overtime Badge if present */}
                              {day.otHours > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                    day.otStatus === 'APPROVED'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      : day.otStatus === 'REJECTED'
                                      ? 'bg-rose-500/10 text-rose-600'
                                      : 'bg-amber-500/10 text-amber-600 animate-pulse'
                                  }`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{day.otHours}h OT</span>
                                  <span>({day.otStatus})</span>
                                  {day.otStatus === 'APPROVED' && (
                                    <span className="font-mono">+{formatCurrency(day.otAmount)}</span>
                                  )}
                                </span>
                              )}
                            </div>

                            {day.adjustmentNote && (
                              <p className="text-[11px] text-slate-400 italic">
                                Note: {day.adjustmentNote}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Net Day Earnings & Cumulative Balance */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-mono pl-14 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">
                              Day Earnings
                            </span>
                            <span
                              className={`font-bold ${
                                day.netDailyPay > 0
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              +{formatCurrency(day.netDailyPay)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block uppercase font-sans">
                              Running Total
                            </span>
                            <span className="font-extrabold text-amber-600 dark:text-amber-400">
                              {formatCurrency(day.runningCumulativeBalance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Inline Transactions (Advances / Settlement Events on this day) */}
                      {day.inlineTransactions && day.inlineTransactions.length > 0 && (
                        <div className="px-4 pb-3 space-y-1.5">
                          {day.inlineTransactions.map((tx) => (
                            <div
                              key={tx.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                tx.type === 'PAYOUT_SETTLEMENT'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md bg-white/40 dark:bg-black/20">
                                  {tx.type === 'PAYOUT_SETTLEMENT' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Banknote className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                </span>
                                <div>
                                  <span className="font-bold">
                                    {tx.type === 'PAYOUT_SETTLEMENT'
                                      ? 'Settlement Payout Disbursed'
                                      : 'Cash Advance Taken'}
                                  </span>
                                  {tx.notes && (
                                    <span className="text-[11px] opacity-75 ml-1.5">
                                      &bull; {tx.notes}
                                    </span>
                                  )}
                                  {tx.paymentMethod && (
                                    <span className="text-[10px] ml-1.5 uppercase font-semibold">
                                      ({tx.paymentMethod})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="font-mono font-extrabold">
                                -{formatCurrency(tx.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- WORKER SELF-SERVICE OT CLAIM MODAL --- */}
      {showOtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Claim Overtime Hours
                </h3>
                <p className="text-xs text-slate-400">Fixed rate: ₹150 / whole hour</p>
              </div>
              <button
                onClick={() => setShowOtModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Banner Required by Prompt */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Overtime Claim Rules</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Overtime rate is strictly ₹150/hr. Partial hours (minutes) are truncated. Subject to admin verification.
              </p>
            </div>

            <form onSubmit={handleOtSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Date of Overtime
                </label>
                <input
                  type="date"
                  required
                  value={otDate}
                  onChange={(e) => setOtDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Whole integer hours dropdown / stepper */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Whole Overtime Hours
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setOtHours(hr)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        otHours === hr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hr} hr ({formatCurrency(hr * 150)})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason / Work Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engine disassembly, emergency brake job..."
                  value={otNote}
                  onChange={(e) => setOtNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowOtModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaimingOt}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm"
                >
                  {isClaimingOt ? 'Submitting...' : `Submit ${otHours}h Claim (+₹${otHours * 150})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN CASH ADVANCE MODAL --- */}
      {showAdvanceModal && worker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                Give Cash Advance to {worker.name}
              </h3>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="space-y-4">
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingAdvance}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  {isRecordingAdvance ? 'Saving...' : 'Record Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN SETTLE DUES MODAL --- */}
      {showSettleModal && worker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
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

            <form onSubmit={handleSettleSubmit} className="space-y-4">
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
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
