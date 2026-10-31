import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wallet,
  Banknote,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  FileText,
  User as UserIcon,
  X,
  History,
  TrendingUp,
  Table as TableIcon,
  CalendarDays,
  Trash2,
  Check,
  Ban,
  Zap,
  Info,
  ArrowUpRight,
  Sun,
  Coffee,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  useGetWorkerLedgerQuery,
  useClaimOvertimeMutation,
  useCancelOtClaimMutation,
  useGetWorkerOtClaimsQuery,
  useToggleLeaveMutation,
  LedgerDayEntry,
} from '../api/payrollApi';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const WorkerLedgerPage: React.FC = () => {
  const { workerId: routeWorkerId } = useParams<{ workerId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const effectiveWorkerId = isAdmin && routeWorkerId ? routeWorkerId : undefined;

  // View Mode: CALENDAR or SHEET
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'SHEET'>('CALENDAR');

  // Month navigation state
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const { data: ledgerData, isLoading, refetch } = useGetWorkerLedgerQuery(
    effectiveWorkerId ? { workerId: effectiveWorkerId } : undefined
  );

  const { data: otClaimsData, refetch: refetchOtClaims } = useGetWorkerOtClaimsQuery();
  const [claimOvertime, { isLoading: isSubmittingOt }] = useClaimOvertimeMutation();
  const [cancelOtClaim, { isLoading: isCancellingOt }] = useCancelOtClaimMutation();
  const [toggleLeave, { isLoading: isTogglingLeave }] = useToggleLeaveMutation();

  // OT Claim Modal State
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [otDate, setOtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState<number>(1);
  const [otNote, setOtNote] = useState('');
  const [otFeedback, setOtFeedback] = useState<string | null>(null);

  // OT Claims List Drawer
  const [isOtListOpen, setIsOtListOpen] = useState(false);

  // Settlements Drawer State
  const [isSettlementHistoryOpen, setIsSettlementHistoryOpen] = useState(false);

  // Selected Day for Interactive Quick Preview
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const ledgerResult = ledgerData?.data;
  const workerOtClaims = otClaimsData?.data || [];

  // Create date lookup map from ledger entries
  const ledgerMap = useMemo(() => {
    const map = new Map<string, LedgerDayEntry>();
    if (ledgerResult?.ledger) {
      for (const entry of ledgerResult.ledger) {
        map.set(entry.date, entry);
      }
    }
    return map;
  }, [ledgerResult?.ledger]);

  // Calendar Days calculation for currentMonthDate
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      entry?: LedgerDayEntry;
    }> = [];

    // Preceding padding days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const yearStr = prevDate.getFullYear();
      const monthStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dayNum).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        entry: ledgerMap.get(dateString),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const yearStr = year;
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        entry: ledgerMap.get(dateString),
      });
    }

    // Trailing padding days to fill 35 or 42 grid
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const yearStr = nextDate.getFullYear();
      const monthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({
        dateString,
        dayNumber: i,
        isCurrentMonth: false,
        entry: ledgerMap.get(dateString),
      });
    }

    return days;
  }, [currentMonthDate, ledgerMap]);

  // Selected Day object resolved from ledgerMap or fallback
  const activeSelectedDay = useMemo(() => {
    if (selectedDayDate && ledgerMap.has(selectedDayDate)) {
      return ledgerMap.get(selectedDayDate)!;
    }
    // Default to today if in current month or the latest entry in ledger
    const todayStr = new Date().toISOString().split('T')[0];
    if (ledgerMap.has(todayStr)) {
      return ledgerMap.get(todayStr)!;
    }
    if (ledgerResult?.ledger && ledgerResult.ledger.length > 0) {
      return ledgerResult.ledger[0];
    }
    return null;
  }, [selectedDayDate, ledgerMap, ledgerResult?.ledger]);

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleTodayMonth = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentMonthDate(d);
    setSelectedDayDate(new Date().toISOString().split('T')[0]);
  };

  const handleClaimOt = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtFeedback(null);
    try {
      await claimOvertime({
        date: otDate,
        hours: Number(otHours),
        note: otNote.trim() || undefined,
      }).unwrap();
      setIsOtModalOpen(false);
      setOtNote('');
      setOtHours(1);
      refetch();
      refetchOtClaims();
    } catch (err: any) {
      setOtFeedback(err?.data?.message || 'Failed to submit overtime claim.');
    }
  };

  const handleCancelOt = async (claimId: string) => {
    if (!confirm('Cancel this pending overtime claim?')) return;
    try {
      await cancelOtClaim(claimId).unwrap();
      refetch();
      refetchOtClaims();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to cancel overtime claim.');
    }
  };

  const handleAdminToggleLeave = async (
    targetDate: string,
    leaveType: 'FULL' | 'HALF' | 'CLEAR'
  ) => {
    if (!isAdmin || !ledgerResult?.worker?._id) return;
    try {
      await toggleLeave({
        workerId: ledgerResult.worker._id,
        date: targetDate,
        leaveType,
      }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to toggle leave.');
    }
  };

  const openClaimOtForDate = (dateStr: string) => {
    setOtDate(dateStr);
    setIsOtModalOpen(true);
  };

  if (isLoading) {
    return <PageShimmer label="Loading single-sheet earnings ledger & calendar..." />;
  }

  if (!ledgerResult) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080911] text-slate-900 dark:text-white flex flex-col font-sans">
        <Navbar glass />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass-modern-card rounded-3xl p-8 max-w-md text-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Record Not Found</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Unable to load daily earnings for this account.
            </p>
            <BackButton />
          </div>
        </div>
      </div>
    );
  }

  const { worker, metrics, ledger, unsettledAdvances, recentSettlements } = ledgerResult;

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col pb-24 sm:pb-20 font-sans transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <Meteors number={6} />
      </div>

      {/* Desktop Standard Navbar */}
      <Navbar glass />

      {/* ── Mobile Sticky Header (Hidden on sm+) ── */}
      <header className="sm:hidden sticky top-0 z-30 px-4 py-3 glass-modern-header flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <BackButton />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
              <h1 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {isAdmin && routeWorkerId ? `${worker.name}'s Wages` : 'My Daily Earnings'}
              </h1>
            </div>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Rate: <span className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(worker.dailyWage)}/day</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AnimatedThemeToggle variant="icon-only" />
          {!isAdmin && (
            <button
              onClick={() => setIsOtModalOpen(true)}
              className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
              title="Claim OT"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </header>

      <main className="app-container relative z-10 flex-1 pt-4 sm:pt-6 pb-12 flex flex-col gap-5">
        {/* ── Desktop & Tablet Page Header (sm:flex) ── */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-2xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  {isAdmin && routeWorkerId ? `${worker.name}'s Wage Ledger` : 'My Daily Earnings'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Daily Wages
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Current Wage: <span className="font-bold text-slate-900 dark:text-slate-200">{formatCurrency(worker.dailyWage)} / day</span>
                {worker.dailyWageEffectiveDate && (
                  <span className="text-slate-400 dark:text-slate-500 ml-1.5 font-mono text-[11px]">
                    (active from {new Date(worker.dailyWageEffectiveDate).toLocaleDateString('en-IN')})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="glass-modern-card p-1 rounded-xl flex items-center gap-1 shadow-2xs">
              <button
                onClick={() => setViewMode('CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'CALENDAR'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('SHEET')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'SHEET'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Single Sheet</span>
              </button>
            </div>

            {/* My OT Claims Button */}
            {!isAdmin && (
              <button
                onClick={() => setIsOtListOpen(true)}
                className="glass-modern-card px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-2 hover:border-amber-400/40"
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <span>My OT</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                  {workerOtClaims.length}
                </span>
              </button>
            )}

            {/* Past Payouts History */}
            {recentSettlements.length > 0 && (
              <button
                onClick={() => setIsSettlementHistoryOpen(true)}
                className="glass-modern-card px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-2 hover:border-amber-400/40"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>Payouts</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {recentSettlements.length}
                </span>
              </button>
            )}

            {/* Claim OT Button */}
            {!isAdmin && (
              <button
                onClick={() => setIsOtModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Claim Overtime</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile Mode Switcher Bar (Hidden on sm+) ── */}
        <div className="sm:hidden flex items-center justify-between gap-2">
          <div className="glass-modern-card p-1 rounded-xl flex items-center gap-1 w-full max-w-[240px]">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                viewMode === 'CALENDAR'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('SHEET')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                viewMode === 'SHEET'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {!isAdmin && (
              <button
                onClick={() => setIsOtListOpen(true)}
                className="glass-modern-card px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>OT ({workerOtClaims.length})</span>
              </button>
            )}
            {recentSettlements.length > 0 && (
              <button
                onClick={() => setIsSettlementHistoryOpen(true)}
                className="glass-modern-card px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Payouts</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Primary Metrics Dashboard ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Net Unsettled Balance */}
          <div className="col-span-2 sm:col-span-1 glass-modern-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span className="font-semibold tracking-wide uppercase text-[10px]">Unsettled Net Balance</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-display">
              {formatCurrency(metrics.netUnsettledEarnings)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Across <span className="font-bold text-slate-800 dark:text-slate-200">{metrics.workingDays + metrics.holidayDays + metrics.paidLeaveDays} paid days</span>
              {metrics.carriedForwardBalance > 0 && (
                <span className="text-amber-500 block font-semibold mt-0.5">
                  (+{formatCurrency(metrics.carriedForwardBalance)} carried forward)
                </span>
              )}
            </p>
          </div>

          {/* Working Days & Leaves */}
          <div className="glass-modern-card rounded-2xl p-4 sm:p-5 group">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
              <span className="font-semibold tracking-wide uppercase text-[10px]">Work Attendance</span>
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
              {metrics.workingDays}{' '}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">days worked</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px]">
              <span className="text-rose-500 dark:text-rose-400 font-bold">{metrics.leaveDays} full leave</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{metrics.halfDays} half</span>
            </div>
          </div>

          {/* Approved Overtime */}
          <div className="glass-modern-card rounded-2xl p-4 sm:p-5 group">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
              <span className="font-semibold tracking-wide uppercase text-[10px]">Approved OT Pay</span>
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              {formatCurrency(metrics.totalOtAmount)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
              {metrics.totalOtHours} hrs total (@ ₹150/hr)
            </p>
          </div>

          {/* Cash Advances Deducted */}
          <div className="glass-modern-card rounded-2xl p-4 sm:p-5 group">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
              <span className="font-semibold tracking-wide uppercase text-[10px]">Advances Deducted</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-display">
              {formatCurrency(metrics.totalAdvances)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {unsettledAdvances.length} advance payment(s)
            </p>
          </div>
        </div>

        {/* ── Monthly Paid Leave Allowance Card ── */}
        <div className="glass-modern-card rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Monthly Paid Leave Allowance
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">1 Day/Mo</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                First full-day leave of each calendar month is 100% paid with ₹0 wage deduction.
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 border ${
              metrics.hasUsedMonthlyPaidLeave
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 animate-pulse'
            }`}
          >
            {metrics.hasUsedMonthlyPaidLeave ? 'Used this month' : '1 Free Day Ready'}
          </span>
        </div>

                {/* ── Money Flow Breakdown (Giving & Taking Transparency) ── */}
        <div className="glass-modern-card rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-white/5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-amber-500" />
              Earnings & Deductions Cashflow Breakdown
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Net: <strong className="text-emerald-600 dark:text-emerald-400 font-display">{formatCurrency(metrics.netUnsettledEarnings)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Gross Wages Earned</span>
              <span className="font-bold text-slate-900 dark:text-white">+{formatCurrency(metrics.totalGrossWages)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] uppercase font-mono block">Overtime Added</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(metrics.totalOtAmount)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-rose-700 dark:text-rose-300 text-[10px] uppercase font-mono block">Leave Deductions</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(metrics.totalLeaveDeduction)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-rose-700 dark:text-rose-300 text-[10px] uppercase font-mono block">Cash Advances Taken</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(metrics.totalAdvances)}</span>
            </div>
          </div>
        </div>

        {/* ─── CALENDAR VIEW ─── */}
        {viewMode === 'CALENDAR' && (
          <div className="space-y-4">
            <div className="glass-modern-card rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-white/10">
              {/* Calendar Controls Header */}
              <div className="p-3.5 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/40 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white font-display">
                    {currentMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleTodayMonth}
                    className="ml-1 sm:ml-2 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-medium">
                    Tap any date for daily breakdown preview
                  </span>
                  {isAdmin && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Sparkles className="w-3 h-3" />
                      Admin Leave Control
                    </span>
                  )}
                </div>
              </div>

              {/* Weekday Names Header */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-950/40 text-center py-2 text-[10px] sm:text-[11px] font-bold font-mono">
                <span className="text-rose-500">SUN</span>
                <span className="text-slate-600 dark:text-slate-400">MON</span>
                <span className="text-slate-600 dark:text-slate-400">TUE</span>
                <span className="text-slate-600 dark:text-slate-400">WED</span>
                <span className="text-slate-600 dark:text-slate-400">THU</span>
                <span className="text-slate-600 dark:text-slate-400">FRI</span>
                <span className="text-slate-600 dark:text-slate-400">SAT</span>
              </div>

              {/* Calendar Grid (Mobile & Desktop Responsive) */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                {calendarDays.map((cell, idx) => {
                  const entry = cell.entry;
                  const isSunday = idx % 7 === 0;
                  const isHoliday = entry?.dayType === 'HOLIDAY';
                  const isPaidLeave = entry?.dayType === 'PAID_LEAVE';
                  const isLeave = entry?.dayType === 'LEAVE';
                  const isHalfDay = entry?.dayType === 'HALF_DAY';
                  const hasOt = entry && entry.otHours > 0 && entry.otStatus === 'APPROVED';
                  const hasAdvance = entry && entry.advancesAmount && entry.advancesAmount > 0;
                  const hasSettlement = entry && entry.settlementPaid && entry.settlementPaid > 0;

                  const isSelected = activeSelectedDay?.date === cell.dateString;

                  return (
                    <div
                      key={cell.dateString}
                      onClick={() => {
                        setSelectedDayDate(cell.dateString);
                      }}
                      className={`min-h-[72px] sm:min-h-[105px] p-1.5 sm:p-2.5 transition flex flex-col justify-between cursor-pointer select-none relative group ${
                        !cell.isCurrentMonth
                          ? 'opacity-30 bg-slate-100/30 dark:bg-slate-950/20'
                          : isSunday
                          ? 'bg-rose-500/[0.02] dark:bg-rose-500/[0.03]'
                          : 'hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.06]'
                      } ${
                        isSelected
                          ? 'ring-2 ring-amber-500 bg-amber-500/10 dark:bg-amber-500/15 z-10'
                          : ''
                      }`}
                    >
                      {/* Top Row: Date Number & Badges */}
                      <div className="flex items-start justify-between gap-0.5">
                        <span
                          className={`text-xs sm:text-xs font-bold rounded-lg w-5 h-5 flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : isSunday
                              ? 'text-rose-500 font-extrabold'
                              : cell.isCurrentMonth
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Status Badges: Compact chip on desktop, dot on mobile */}
                        <div className="flex items-center gap-1">
                          {isSunday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hidden sm:inline">
                              Off
                            </span>
                          )}
                          {isHoliday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                              <span className="hidden sm:inline">Holiday</span>
                              <span className="sm:hidden text-purple-500">★</span>
                            </span>
                          )}
                          {isPaidLeave && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                              <span className="hidden sm:inline">Paid</span>
                              <span className="sm:hidden text-blue-500">✓</span>
                            </span>
                          )}
                          {isLeave && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                              <span className="hidden sm:inline">Leave</span>
                              <span className="sm:hidden text-rose-500">✕</span>
                            </span>
                          )}
                          {isHalfDay && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                              <span className="hidden sm:inline">Half</span>
                              <span className="sm:hidden text-amber-500">½</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Prominent Daily Net Earnings */}
                      <div className="my-0.5 sm:my-1">
                        {entry && entry.totalDayEarnings > 0 ? (
                          <div className="text-[11px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center gap-0.5">
                            <span>+{formatCurrency(entry.totalDayEarnings)}</span>
                          </div>
                        ) : entry && isSunday ? (
                          <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
                            —
                          </div>
                        ) : entry && entry.leaveDeduction > 0 ? (
                          <div className="text-[10px] font-bold text-rose-500">
                            -{formatCurrency(entry.leaveDeduction)}
                          </div>
                        ) : null}
                      </div>

                      {/* Bottom Info: Micro badges */}
                      <div className="space-y-0.5 text-[9px] font-medium leading-none">
                        {hasOt && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 truncate">
                            <Zap className="w-2.5 h-2.5 shrink-0" />
                            <span>+{entry.otHours}h</span>
                          </div>
                        )}
                        {hasAdvance && (
                          <div className="text-rose-500 font-semibold truncate hidden sm:block">
                            Adv -{formatCurrency(entry.advancesAmount!)}
                          </div>
                        )}
                        {hasSettlement && (
                          <div className="text-amber-600 dark:text-amber-400 font-bold truncate">
                            Paid
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── QUICK PREVIEW ON CALENDAR FOR WORKER (ITEMIZED MATH BREAKDOWN) ─── */}
            {activeSelectedDay ? (
              <div className="glass-modern-card rounded-3xl p-4 sm:p-6 shadow-xl border border-amber-500/30 relative overflow-hidden transition-all animate-fadeIn">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex flex-col items-center justify-center font-black text-amber-600 dark:text-amber-400 shadow-xs">
                      <span className="text-xs uppercase font-mono leading-none">
                        {new Date(activeSelectedDay.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                      <span className="text-base font-display leading-tight">
                        {new Date(activeSelectedDay.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight font-display">
                          {new Date(activeSelectedDay.date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            activeSelectedDay.dayType === 'WORKING'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : activeSelectedDay.dayType === 'HOLIDAY'
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                              : activeSelectedDay.dayType === 'PAID_LEAVE'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                              : activeSelectedDay.dayType === 'LEAVE'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                              : activeSelectedDay.dayType === 'HALF_DAY'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {activeSelectedDay.dayType === 'WORKING' && 'Standard Working Day'}
                          {activeSelectedDay.dayType === 'HOLIDAY' && `Shop Holiday: ${activeSelectedDay.holidayTitle || 'Declared'}`}
                          {activeSelectedDay.dayType === 'PAID_LEAVE' && 'Monthly Paid Leave (100% Paid)'}
                          {activeSelectedDay.dayType === 'LEAVE' && 'Full Day Leave (Floor to ₹100)'}
                          {activeSelectedDay.dayType === 'HALF_DAY' && 'Half Day (Ceil to ₹10)'}
                          {activeSelectedDay.dayType === 'SUNDAY' && 'Sunday (Shop Weekly Off)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Daily Wage Breakdown & Continuous Ledger Snapshot
                      </p>
                    </div>
                  </div>

                  {/* Net Takeaway Highlight Badge */}
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-right">
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                      Net Takeaway For This Day
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display">
                      {formatCurrency(activeSelectedDay.totalDayEarnings)}
                    </span>
                  </div>
                </div>

                {/* Itemized Math Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4 text-xs">
                  {/* Base Wage */}
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Base Daily Rate</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeSelectedDay.dayType === 'SUNDAY' ? '₹0 (Sunday Off)' : formatCurrency(activeSelectedDay.baseWage)}
                    </span>
                  </div>

                  {/* Overtime */}
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Overtime Added</span>
                    {activeSelectedDay.otHours > 0 ? (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(activeSelectedDay.otAmount)}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({activeSelectedDay.otHours}h @ ₹150/h • {activeSelectedDay.otStatus})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No Overtime</span>
                    )}
                  </div>

                  {/* Leave Deduction */}
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Leave Deduction</span>
                    {activeSelectedDay.leaveDeduction > 0 ? (
                      <span className="text-sm font-bold text-rose-500">
                        -{formatCurrency(activeSelectedDay.leaveDeduction)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">(Floor to 100)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">₹0 (No deduction)</span>
                    )}
                  </div>

                  {/* Advances or Payout */}
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Settlement Status</span>
                    {activeSelectedDay.isSettled ? (
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Settled in cycle
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        Accruing in Unsettled Balance
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions: Claim OT or Admin Leave Toggle */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span>
                      {activeSelectedDay.holidayTitle
                        ? `Special Holiday: "${activeSelectedDay.holidayTitle}"`
                        : activeSelectedDay.leaveReason
                        ? `Note: ${activeSelectedDay.leaveReason}`
                        : 'Accrual calculation is dynamic and reflects continuous wage settlements.'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isAdmin && activeSelectedDay.dayType !== 'SUNDAY' && (
                      <button
                        onClick={() => openClaimOtForDate(activeSelectedDay.date)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-xs flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Claim OT for this Date</span>
                      </button>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Admin Action:</span>
                        <button
                          onClick={() => handleAdminToggleLeave(activeSelectedDay.date, 'FULL')}
                          disabled={isTogglingLeave}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition shadow-2xs"
                        >
                          Mark Full Leave
                        </button>
                        <button
                          onClick={() => handleAdminToggleLeave(activeSelectedDay.date, 'HALF')}
                          disabled={isTogglingLeave}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow-2xs"
                        >
                          Mark Half Day
                        </button>
                        <button
                          onClick={() => handleAdminToggleLeave(activeSelectedDay.date, 'CLEAR')}
                          disabled={isTogglingLeave}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-2xs"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ─── CONTINUOUS SINGLE-SHEET VIEW ─── */}
        {viewMode === 'SHEET' && (
          <div className="space-y-4">
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block glass-modern-card rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-white/10">
              <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 font-display">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Continuous Single-Sheet Earnings
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Day-by-day continuous ledger with overtime, advances, and payout receipts.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-mono font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Date / Day</th>
                      <th className="py-3.5 px-4">Daily Status</th>
                      <th className="py-3.5 px-4 text-right">Base Wage</th>
                      <th className="py-3.5 px-4 text-right">Leave Deduction</th>
                      <th className="py-3.5 px-4 text-right">Overtime (₹150/h)</th>
                      <th className="py-3.5 px-4 text-right">Net Daily Pay</th>
                      <th className="py-3.5 px-4 text-center">Settlement</th>
                      {isAdmin && <th className="py-3.5 px-4 text-right">Admin Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06] font-medium">
                    {ledger.map((entry) => {
                      const isSunday = entry.dayType === 'SUNDAY';
                      const isHoliday = entry.dayType === 'HOLIDAY';
                      const isPaidLeave = entry.dayType === 'PAID_LEAVE';
                      const isLeave = entry.dayType === 'LEAVE';
                      const isHalfDay = entry.dayType === 'HALF_DAY';

                      return (
                        <tr
                          key={entry.date}
                          className={`hover:bg-amber-500/[0.03] transition-colors ${
                            isSunday ? 'opacity-65 bg-slate-50/60 dark:bg-slate-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-slate-200">
                              {new Date(entry.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[11px] text-slate-400 font-semibold font-mono">
                              {entry.dayName}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isSunday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Sunday Off
                              </span>
                            )}
                            {isHoliday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                Holiday (Paid)
                              </span>
                            )}
                            {isPaidLeave && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                Monthly Paid Leave
                              </span>
                            )}
                            {isLeave && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                Full Leave (Floor ₹100)
                              </span>
                            )}
                            {isHalfDay && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                Half Day (Ceil ₹10)
                              </span>
                            )}
                            {entry.dayType === 'WORKING' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                Working
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {isSunday ? '—' : formatCurrency(entry.baseWage)}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {entry.leaveDeduction > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                -{formatCurrency(entry.leaveDeduction)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {entry.otHours > 0 ? (
                              <div>
                                {entry.otStatus === 'APPROVED' ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    +{formatCurrency(entry.otAmount)} ({entry.otHours}h)
                                  </span>
                                ) : (
                                  <span className="text-amber-500 text-[11px] font-semibold">
                                    {entry.otHours}h ({entry.otStatus})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                            <span
                              className={
                                entry.totalDayEarnings > 0
                                  ? 'text-slate-900 dark:text-white font-extrabold text-sm'
                                  : 'text-slate-400'
                              }
                            >
                              {formatCurrency(entry.totalDayEarnings)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {entry.isSettled ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                Settled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Accruing
                              </span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {entry.dayType === 'WORKING' ? (
                                  <button
                                    onClick={() => handleAdminToggleLeave(entry.date, 'FULL')}
                                    disabled={isTogglingLeave}
                                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                                  >
                                    Leave
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAdminToggleLeave(entry.date, 'CLEAR')}
                                    disabled={isTogglingLeave}
                                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stacked Card View (md:hidden) */}
            <div className="md:hidden space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                <span>Recent Daily Records</span>
                <span className="font-mono">{ledger.length} Days</span>
              </div>

              {ledger.map((entry) => {
                const isSunday = entry.dayType === 'SUNDAY';
                const isHoliday = entry.dayType === 'HOLIDAY';
                const isPaidLeave = entry.dayType === 'PAID_LEAVE';
                const isLeave = entry.dayType === 'LEAVE';
                const isHalfDay = entry.dayType === 'HALF_DAY';

                return (
                  <div
                    key={entry.date}
                    onClick={() => {
                      setSelectedDayDate(entry.date);
                      setViewMode('CALENDAR');
                    }}
                    className="glass-modern-card rounded-2xl p-3.5 space-y-2 shadow-xs active:scale-[0.99] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-xs">
                          {new Date(entry.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {isSunday && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Sunday Off
                          </span>
                        )}
                        {isHoliday && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                            Holiday
                          </span>
                        )}
                        {isPaidLeave && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
                            Paid Leave
                          </span>
                        )}
                        {isLeave && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300">
                            Full Leave
                          </span>
                        )}
                        {isHalfDay && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            Half Day
                          </span>
                        )}
                      </div>

                      {/* Net Pay for Day */}
                      <div className="text-right">
                        <span
                          className={`text-sm font-black font-display ${
                            entry.totalDayEarnings > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          +{formatCurrency(entry.totalDayEarnings)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <span>Base: {formatCurrency(entry.baseWage)}</span>
                        {entry.otHours > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            OT: +{entry.otHours}h ({formatCurrency(entry.otAmount)})
                          </span>
                        )}
                        {entry.leaveDeduction > 0 && (
                          <span className="text-rose-500 font-semibold">
                            Ded: -{formatCurrency(entry.leaveDeduction)}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Worker OT Claims Drawer / Modal ── */}
        {isOtListOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
                    My Overtime Claims & History
                  </h3>
                </div>
                <button
                  onClick={() => setIsOtListOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 dark:divide-white/10 pt-3">
                {workerOtClaims.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-12">
                    No overtime claims submitted yet.
                  </p>
                ) : (
                  workerOtClaims.map((claim) => (
                    <div key={claim._id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{claim.hours} {claim.hours === 1 ? 'Hour' : 'Hours'}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            +{formatCurrency(claim.totalAmount)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Date: {new Date(claim.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {claim.note && <p className="text-[11px] text-slate-400 mt-0.5">Note: {claim.note}</p>}
                        {claim.rejectionReason && (
                          <p className="text-[11px] text-rose-500 mt-0.5 font-semibold">
                            Rejection Note: {claim.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            claim.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : claim.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {claim.status}
                        </span>

                        {claim.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelOt(claim._id)}
                            disabled={isCancellingOt}
                            className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Claim OT Modal ── */}
        {isOtModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsOtModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-display">Claim Overtime Hours</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">₹150 / hour • Whole hours (1, 2, 3...)</p>
                </div>
              </div>

              {otFeedback && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
                  {otFeedback}
                </div>
              )}

              <form onSubmit={handleClaimOt} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date of Overtime
                  </label>
                  <input
                    type="date"
                    required
                    value={otDate}
                    onChange={(e) => setOtDate(e.target.value)}
                    className="w-full bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Hours (Rounded)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setOtHours(h)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          otHours === h
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-slate-100/70 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-400/40'
                        }`}
                      >
                        {h} {h === 1 ? 'Hour' : 'Hours'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Total Claim Amount:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-base font-display">
                    {otHours}h × ₹150 = {formatCurrency(otHours * 150)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Job / Work Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={otNote}
                    onChange={(e) => setOtNote(e.target.value)}
                    placeholder="E.g. Completed late engine repair for Job #1042"
                    className="w-full bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOtModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOt}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition disabled:opacity-50"
                  >
                    {isSubmittingOt ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Past Settlements History Modal ── */}
        {isSettlementHistoryOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-display">Settlement & Payout Receipts</h3>
                </div>
                <button
                  onClick={() => setIsSettlementHistoryOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 dark:divide-white/10 pt-3">
                {recentSettlements.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-12">
                    No past payout receipts recorded yet.
                  </p>
                ) : (
                  recentSettlements.map((s) => (
                    <div
                      key={s._id}
                      className="py-4 space-y-2.5 text-xs group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white text-base font-display">
                            {formatCurrency(s.amountPaid)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-mono">
                            via {s.paymentMethod}
                          </span>
                          {s.payoutType === 'PARTIAL' || (s.carriedForwardBalance && s.carriedForwardBalance > 0) ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                              Partial Payout (Bal: {formatCurrency(s.carriedForwardBalance || 0)})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                              Full Settlement
                            </span>
                          )}
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                          Paid on {new Date(s.settledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Itemized Days & Attendance Metadata */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-100/50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <div>
                          <span className="text-slate-400 text-[10px] font-mono block">Days Worked</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {s.totalWorkingDays || 0} days
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-mono block">Holidays & Paid Lv</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {(s.totalHolidayDays || 0) + (s.totalPaidLeaveDays || 0)} paid
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-mono block">Overtime Approved</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {s.totalOtHours || 0} hrs ({formatCurrency(s.totalOtAmount || 0)})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-mono block">Advances Deducted</span>
                          <span className="font-bold text-rose-500">
                            -{formatCurrency(s.totalCashAdvances || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>
                          Cycle: {new Date(s.startDate).toLocaleDateString('en-IN')} to{' '}
                          {new Date(s.endDate).toLocaleDateString('en-IN')}
                        </span>
                        {s.settledByName && (
                          <span>Authorized by: {s.settledByName}</span>
                        )}
                      </div>

                      {s.referenceNote && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-white/[0.03] p-2 rounded-lg border border-slate-200/60 dark:border-white/5">
                          Note: {s.referenceNote}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
