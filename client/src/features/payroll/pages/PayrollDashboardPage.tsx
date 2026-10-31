import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  CreditCard,
  Edit2,
  Trash2,
  PartyPopper,
  Users,
  Check,
  X,
  FileSpreadsheet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Banknote,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import {
  useGetAdminOverviewQuery,
  useGetMoneyFlowQuery,
  useGetCommonCalendarQuery,
  useGetAdminOtClaimsQuery,
  useReviewOtClaimMutation,
  useMarkLeaveMutation,
  useRecordCashAdvanceMutation,
  useUpdateCashAdvanceMutation,
  useUpdateWorkerWageMutation,
  useSettlePayrollMutation,
  useGetHolidaysQuery,
  useDeclareHolidayMutation,
  useDeleteHolidayMutation,
  AdminWorkerSummary,
} from '../api/payrollApi';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const PayrollDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Primary Tab: ROSTER or COMMON_CALENDAR
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'COMMON_CALENDAR' | 'MONEY_FLOW'>('ROSTER');
  const [moneyFlowType, setMoneyFlowType] = useState<'ALL' | 'ADVANCE' | 'SETTLEMENT' | 'OT'>('ALL');
  const [moneyFlowWorkerId, setMoneyFlowWorkerId] = useState<string>('');

  // Month navigation for Common Calendar
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const calendarYear = calendarMonthDate.getFullYear();
  const calendarMonth = calendarMonthDate.getMonth() + 1;

  const { data: overviewData, isLoading: isOverviewLoading, refetch: refetchOverview } =
    useGetAdminOverviewQuery();
  const { data: commonCalendarData, refetch: refetchCommonCalendar } =
    useGetCommonCalendarQuery({ year: calendarYear, month: calendarMonth });
  const { data: pendingOtData, isLoading: isOtLoading, refetch: refetchOt } =
    useGetAdminOtClaimsQuery({ status: 'PENDING' });
  const { data: holidaysData, refetch: refetchHolidays } = useGetHolidaysQuery();
  const { data: moneyFlowData, isLoading: isMoneyFlowLoading, refetch: refetchMoneyFlow } =
    useGetMoneyFlowQuery({
      workerId: moneyFlowWorkerId || undefined,
      type: moneyFlowType,
    });

  const [reviewOtClaim, { isLoading: isReviewingOt }] = useReviewOtClaimMutation();
  const [markLeave, { isLoading: isMarkingLeave }] = useMarkLeaveMutation();
  const [recordCashAdvance, { isLoading: isRecordingAdvance }] = useRecordCashAdvanceMutation();
  const [updateCashAdvance, { isLoading: isUpdatingAdvance }] = useUpdateCashAdvanceMutation();
  const [updateWorkerWage, { isLoading: isUpdatingWage }] = useUpdateWorkerWageMutation();
  const [settlePayroll, { isLoading: isSettling }] = useSettlePayrollMutation();
  const [declareHoliday, { isLoading: isDeclaringHoliday }] = useDeclareHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  // Active Modals & Dialogs
  const [selectedWorker, setSelectedWorker] = useState<AdminWorkerSummary | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  // Mark Leave Modal (Advanced single date / date range)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isRangeLeave, setIsRangeLeave] = useState(false);
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState<'FULL' | 'HALF'>('FULL');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Cash Advance Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  // Daily Wage Modal (With Effective Date Versioning)
  const [isWageModalOpen, setIsWageModalOpen] = useState(false);
  const [wageValue, setWageValue] = useState<string>('');
  const [wageEffectiveDate, setWageEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Settle Payroll Modal (With Custom Partial Payout)
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleCutoffDate, setSettleCutoffDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isPartialSettlement, setIsPartialSettlement] = useState(false);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [settleNote, setSettleNote] = useState('');
  const [settleError, setSettleError] = useState<string | null>(null);

  // Holidays Modal
  const [isHolidaysModalOpen, setIsHolidaysModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [holidayTitle, setHolidayTitle] = useState('');

  // Reject OT Modal
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Common Calendar Day Click Drawer
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [commonLeaveWorkerId, setCommonLeaveWorkerId] = useState('');
  const [commonLeaveType, setCommonLeaveType] = useState<'FULL' | 'HALF'>('FULL');

  if (isOverviewLoading || isOtLoading) {
    return <PageShimmer label="Loading payroll workstation..." />;
  }

  const overview = overviewData?.data;
  const pendingOtList = pendingOtData?.data || [];
  const holidays = holidaysData?.data || [];
  const commonCalendar = commonCalendarData?.data;

  const handleReviewOt = async (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await reviewOtClaim({ id, status, rejectionReason: reason }).unwrap();
      setRejectingClaimId(null);
      setRejectionReason('');
      refetchOt();
      refetchOverview();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update OT claim.');
    }
  };

  const handleMarkLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setLeaveError(null);
    try {
      await markLeave({
        workerId: selectedWorker.workerId,
        date: leaveDate,
        endDate: isRangeLeave && leaveEndDate ? leaveEndDate : undefined,
        leaveType,
        reason: leaveReason.trim() || undefined,
      }).unwrap();
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      refetchOverview();
      refetchCommonCalendar();
    } catch (err: any) {
      setLeaveError(err?.data?.message || 'Failed to record leave.');
    }
  };

  const handleRecordAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setAdvanceError(null);
    const amount = Number(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      setAdvanceError('Please enter a valid positive amount');
      return;
    }
    try {
      await recordCashAdvance({
        workerId: selectedWorker.workerId,
        amount,
        date: advanceDate,
        reason: advanceReason.trim() || undefined,
      }).unwrap();
      setIsAdvanceModalOpen(false);
      setAdvanceAmount('');
      setAdvanceReason('');
      refetchOverview();
    } catch (err: any) {
      setAdvanceError(err?.data?.message || 'Failed to record advance.');
    }
  };

  const handleUpdateWageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    const dailyWage = Number(wageValue);
    if (isNaN(dailyWage) || dailyWage < 0) return;
    try {
      await updateWorkerWage({
        workerId: selectedWorker.workerId,
        dailyWage,
        effectiveDate: wageEffectiveDate || undefined,
      }).unwrap();
      setIsWageModalOpen(false);
      refetchOverview();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update daily wage.');
    }
  };

  const handleSettlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setSettleError(null);

    let customPaid: number | undefined = undefined;
    if (isPartialSettlement) {
      const parsed = Number(partialAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setSettleError('Please enter a valid partial payout amount');
        return;
      }
      customPaid = parsed;
    }

    try {
      await settlePayroll({
        workerId: selectedWorker.workerId,
        endDate: settleCutoffDate,
        paymentMethod,
        referenceNote: settleNote.trim() || undefined,
        amountPaid: customPaid,
      }).unwrap();
      setIsSettleModalOpen(false);
      setSettleNote('');
      setPartialAmount('');
      refetchOverview();
    } catch (err: any) {
      setSettleError(err?.data?.message || 'Failed to settle payroll.');
    }
  };

  const handleDeclareHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayTitle.trim()) return;
    try {
      await declareHoliday({
        date: holidayDate,
        title: holidayTitle.trim(),
      }).unwrap();
      setHolidayTitle('');
      refetchHolidays();
      refetchOverview();
      refetchCommonCalendar();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to declare holiday.');
    }
  };

  // Common Calendar calculations
  const commonDays = (() => {
    const year = calendarYear;
    const month = calendarMonth - 1;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      holiday?: any;
      leaves: any[];
    }> = [];

    const holidayMap = new Map<string, any>();
    if (commonCalendar?.holidays) {
      for (const h of commonCalendar.holidays) {
        const d = new Date(h.date).toISOString().split('T')[0];
        holidayMap.set(d, h);
      }
    }

    const leavesMap = new Map<string, any[]>();
    if (commonCalendar?.leaves) {
      for (const l of commonCalendar.leaves) {
        const arr = leavesMap.get(l.date) || [];
        arr.push(l);
        leavesMap.set(l.date, arr);
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(calendarMonth).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateString = `${year}-${monthStr}-${dayStr}`;

      days.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        holiday: holidayMap.get(dateString),
        leaves: leavesMap.get(dateString) || [],
      });
    }

    return { firstDayIndex, days };
  })();

  const getLeaveDeductionPreview = () => {
    if (!selectedWorker) return '';
    const wage = selectedWorker.dailyWage;
    if (leaveType === 'FULL') {
      const deduction = Math.floor(wage / 100) * 100;
      const net = wage - deduction;
      return `Floor to 100: Deduction -${formatCurrency(deduction)}, Worker retains ${formatCurrency(net)} (or ₹0 deduction if 1st paid leave this month)`;
    } else {
      const halfWage = wage / 2;
      const earned = Math.ceil(halfWage / 10) * 10;
      const deduction = wage - earned;
      return `Round to next 10: Worker earns ${formatCurrency(earned)}, Deduction -${formatCurrency(deduction)}`;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col pb-24 sm:pb-20 font-sans transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <Meteors number={6} />
      </div>

      <Navbar glass />

      {/* ── Mobile Sticky Header (Hidden on sm+) ── */}
      <header className="sm:hidden sticky top-0 z-30 px-4 py-3 glass-modern-header flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <BackButton />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
              <h1 className="text-sm font-black text-slate-900 dark:text-white truncate">
                Payroll Workstation
              </h1>
            </div>
            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Admin Control Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AnimatedThemeToggle variant="icon-only" />
          <button
            onClick={() => setIsHolidaysModalOpen(true)}
            className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 active:scale-95 transition"
            title="Paid Holidays"
          >
            <PartyPopper className="w-4 h-4" />
          </button>
        </div>
      </header>

            <main className="app-container relative z-10 flex-1 pt-4 sm:pt-6 pb-12 flex flex-col gap-5">
        {/* ── Mobile Tab Bar (Hidden on sm+) ── */}
        <div className="sm:hidden flex items-center justify-between gap-2">
          <div className="glass-modern-card p-1 rounded-xl flex items-center gap-1 w-full max-w-[340px]">
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                activeTab === 'ROSTER'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Roster</span>
            </button>
            <button
              onClick={() => setActiveTab('COMMON_CALENDAR')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                activeTab === 'COMMON_CALENDAR'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            onClick={() => setIsHolidaysModalOpen(true)}
            className="glass-modern-card px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
          >
            <PartyPopper className="w-3.5 h-3.5 text-purple-500" />
            <span>Holidays ({holidays.length})</span>
          </button>
        </div>
        {/* Header */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-amber-500" />
                  Payroll & Daily Wages Workstation
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Admin Central
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Arbitrary settlements • Floor to ₹100 leave deductions • ₹150/hr overtime approvals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher: Roster vs Common Calendar */}
            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1">
              <button
                onClick={() => setActiveTab('ROSTER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'ROSTER'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff Roster</span>
              </button>
              <button
                onClick={() => setActiveTab('COMMON_CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'COMMON_CALENDAR'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Common Calendar</span>
              </button>
            </div>

            <button
              onClick={() => setIsHolidaysModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition shadow-sm flex items-center gap-2"
            >
              <PartyPopper className="w-4 h-4 text-purple-500" />
              Paid Holidays ({holidays.length})
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-modern-card rounded-3xl border border-amber-500/30 p-5 relative overflow-hidden shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span>Total Accrued Wage Liability</span>
              <Wallet className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(overview?.totalUnsettledWages || 0)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Unsettled across {overview?.workers?.length || 0} active workers
            </p>
          </div>

          <div className="glass-modern-card rounded-3xl p-5 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span>Pending Overtime Approvals</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingOtList.length}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Worker claims waiting for sign-off
            </p>
          </div>

          <div className="glass-modern-card rounded-3xl p-5 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span>Active Wage Workers</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.workers?.length || 0}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Staff with daily wage rates</p>
          </div>
        </div>

        {/* Pending OT Approvals Queue */}
        {pendingOtList.length > 0 && (
          <div className="mb-8 glass-modern-card rounded-3xl border border-amber-500/30 p-5 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Pending Overtime Approvals</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {pendingOtList.length} ACTION REQUIRED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingOtList.map((claim) => (
                <div
                  key={claim._id}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {claim.workerId?.name || 'Worker'}
                        </h3>
                        <p className="text-[11px] text-slate-500">{claim.workerId?.mobile}</p>
                      </div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(claim.totalAmount)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-800">
                        {claim.hours} {claim.hours === 1 ? 'Hour' : 'Hours'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-500">
                        {new Date(claim.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    {claim.note && (
                      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        "{claim.note}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setRejectingClaimId(claim._id)}
                      disabled={isReviewingOt}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-800 transition"
                    >
                      Reject...
                    </button>
                    <button
                      onClick={() => handleReviewOt(claim._id, 'APPROVED')}
                      disabled={isReviewingOt}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm"
                    >
                      Approve (+{formatCurrency(claim.totalAmount)})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 1: STAFF ROSTER & MANAGEMENT ─── */}
        {activeTab === 'ROSTER' && (
          <div className="glass-modern-card rounded-3xl overflow-hidden shadow-sm dark:shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Staff Daily Wages & Settlement Roster
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any worker to open interactive Calendar & Single-Sheet view
                </p>
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Worker</th>
                    <th className="py-3.5 px-4 text-right">Daily Wage Rate</th>
                    <th className="py-3.5 px-4 text-center">Unsettled Days</th>
                    <th className="py-3.5 px-4 text-right">Accrued Balance</th>
                    <th className="py-3.5 px-4 text-center">Last Payout</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                  {overview?.workers?.map((w) => (
                    <tr key={w.workerId} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{w.name}</div>
                        <div className="text-[11px] text-slate-500">{w.mobile}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedWorker(w);
                            setWageValue(String(w.dailyWage));
                            setWageEffectiveDate(new Date().toISOString().split('T')[0]);
                            setIsWageModalOpen(true);
                          }}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 transition shadow-2xs"
                        >
                          <span className="font-bold">{formatCurrency(w.dailyWage)}/day</span>
                          <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-amber-500" />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          {w.unsettledDaysCount} days
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {formatCurrency(w.unsettledBalance)}
                        </div>
                        {w.pendingOtHours > 0 && (
                          <div className="text-[10px] text-amber-500 font-semibold">
                            +{w.pendingOtHours}h OT pending
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-500">
                        {w.lastSettlementDate ? (
                          <span>
                            {new Date(w.lastSettlementDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">No prior payouts</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/payroll/${w.workerId}`)}
                            title="View Interactive Calendar & Single Sheet"
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                            <span>Calendar & Sheet</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setIsLeaveModalOpen(true);
                            }}
                            title="Mark Leave (Single or Range)"
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                          >
                            <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>Leave</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setIsAdvanceModalOpen(true);
                            }}
                            title="Record Cash Advance"
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                            <span>Advance</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setIsPartialSettlement(false);
                              setPartialAmount('');
                              setIsSettleModalOpen(true);
                            }}
                            title="Settle & Payout"
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Settle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Workers List (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-200/80 dark:divide-white/10">
              {overview?.workers?.map((w) => (
                <div key={w.workerId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm font-display">{w.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">{w.mobile}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-amber-600 dark:text-amber-400 font-display">
                        {formatCurrency(w.unsettledBalance)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {w.unsettledDaysCount} unpaid days
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setWageValue(String(w.dailyWage));
                        setWageEffectiveDate(new Date().toISOString().split('T')[0]);
                        setIsWageModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs"
                    >
                      <span>Rate: {formatCurrency(w.dailyWage)}/day</span>
                      <Edit2 className="w-3 h-3 text-amber-500" />
                    </button>

                    {w.pendingOtHours > 0 && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        ⚡ +{w.pendingOtHours}h OT
                      </span>
                    )}
                  </div>

                  {/* Mobile Actions Grid */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => navigate(`/payroll/${w.workerId}`)}
                      className="py-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                      <span>Ledger</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setIsLeaveModalOpen(true);
                      }}
                      className="py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Leave</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setIsAdvanceModalOpen(true);
                      }}
                      className="py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Advance</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setIsPartialSettlement(false);
                        setPartialAmount('');
                        setIsSettleModalOpen(true);
                      }}
                      className="py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-[11px] font-black flex flex-col items-center justify-center gap-1 active:scale-95 transition shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 2: COMMON COMPANY CALENDAR ─── */}
        {activeTab === 'COMMON_CALENDAR' && (
          <div className="glass-modern-card rounded-3xl overflow-hidden shadow-sm dark:shadow-xl mb-8">
            {/* Calendar Controls */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setCalendarMonthDate((prev) => {
                      const d = new Date(prev);
                      d.setMonth(d.getMonth() - 1);
                      return d;
                    })
                  }
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {calendarMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() =>
                    setCalendarMonthDate((prev) => {
                      const d = new Date(prev);
                      d.setMonth(d.getMonth() + 1);
                      return d;
                    })
                  }
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Click any date to mark a holiday or worker leave
                </span>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 text-center py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="text-rose-500 font-semibold">SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {/* Padding before month */}
              {Array.from({ length: commonDays.firstDayIndex }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[105px] p-2 bg-slate-100/30 dark:bg-slate-950/30 opacity-30" />
              ))}

              {commonDays.days.map((d) => {
                const isSelected = calendarSelectedDate === d.dateString;
                const hasHoliday = !!d.holiday;
                const leavesCount = d.leaves.length;

                return (
                  <div
                    key={d.dateString}
                    onClick={() => {
                      setCalendarSelectedDate(d.dateString);
                      setHolidayDate(d.dateString);
                      setLeaveDate(d.dateString);
                    }}
                    className={`min-h-[105px] p-2.5 transition flex flex-col justify-between cursor-pointer group hover:bg-slate-100/60 dark:hover:bg-slate-800/40 ${
                      isSelected ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {d.dayNumber}
                      </span>
                      {hasHoliday && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          Holiday
                        </span>
                      )}
                    </div>

                    <div className="my-1 space-y-1">
                      {hasHoliday && (
                        <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 truncate">
                          🎉 {d.holiday.title}
                        </div>
                      )}

                      {leavesCount > 0 && (
                        <div className="space-y-0.5">
                          {d.leaves.slice(0, 2).map((l, idx) => (
                            <div
                              key={idx}
                              className="text-[9px] font-medium px-1 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 truncate"
                            >
                              {l.workerName}: {l.leaveType === 'HALF' ? 'Half' : 'Leave'}
                            </div>
                          ))}
                          {leavesCount > 2 && (
                            <span className="text-[9px] text-slate-400 block">
                              +{leavesCount - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-400">
                      {leavesCount === 0 && !hasHoliday ? 'Working day' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Actions in Common Calendar */}
            {calendarSelectedDate && (
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Selected: {new Date(calendarSelectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Declare a paid holiday or mark leave for a specific staff member on this date.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setHolidayDate(calendarSelectedDate);
                      setIsHolidaysModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <PartyPopper className="w-3.5 h-3.5" />
                    <span>Declare Holiday</span>
                  </button>

                  <button
                    onClick={() => {
                      setLeaveDate(calendarSelectedDate);
                      setIsRangeLeave(false);
                      if (overview?.workers?.[0]) setSelectedWorker(overview.workers[0]);
                      setIsLeaveModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Mark Worker Leave</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        
        {/* ─── TAB 3: MONEY FLOW & CASHFLOW LEDGER (GIVING & TAKING MONEY) ─── */}
        {activeTab === 'MONEY_FLOW' && (
          <div className="space-y-6">
            {/* Money Flow KPIs Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="glass-modern-card rounded-3xl p-4 sm:p-5 group">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span className="font-semibold tracking-wide uppercase text-[10px]">Net Cash Disbursed</span>
                  <Banknote className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-display">
                  {formatCurrency(moneyFlowData?.data?.kpis?.netCashDisbursed || 0)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  Advances + Settlement Payouts
                </p>
              </div>

              <div className="glass-modern-card rounded-3xl p-4 sm:p-5 group">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span className="font-semibold tracking-wide uppercase text-[10px]">Unsettled Advances</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-display">
                  {formatCurrency(moneyFlowData?.data?.kpis?.unsettledAdvancesTotal || 0)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  To be deducted on next payout
                </p>
              </div>

              <div className="glass-modern-card rounded-3xl p-4 sm:p-5 group">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span className="font-semibold tracking-wide uppercase text-[10px]">Settlements Paid</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-display">
                  {formatCurrency(moneyFlowData?.data?.kpis?.totalSettlementsDisbursed || 0)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  Formal cycle disbursements
                </p>
              </div>

              <div className="glass-modern-card rounded-3xl p-4 sm:p-5 group">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span className="font-semibold tracking-wide uppercase text-[10px]">Approved Overtime</span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
                  {formatCurrency(moneyFlowData?.data?.kpis?.totalOtApproved || 0)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  Total wage overtime bonuses
                </p>
              </div>
            </div>

            {/* Filter & Action Bar */}
            <div className="glass-modern-card rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Pills */}
                {(['ALL', 'ADVANCE', 'SETTLEMENT', 'OT'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMoneyFlowType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      moneyFlowType === type
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {type === 'ALL' && 'All Activity'}
                    {type === 'ADVANCE' && 'Cash Advances (Giving)'}
                    {type === 'SETTLEMENT' && 'Settlements (Payouts)'}
                    {type === 'OT' && 'Overtime Credits'}
                  </button>
                ))}

                {/* Worker Filter Dropdown */}
                <select
                  value={moneyFlowWorkerId}
                  onChange={(e) => setMoneyFlowWorkerId(e.target.value)}
                  className="bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Workers</option>
                  {overview?.workers.map((w) => (
                    <option key={w.workerId} value={w.workerId}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (overview?.workers?.[0]) setSelectedWorker(overview.workers[0]);
                    setIsAdvanceModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Give Cash Advance</span>
                </button>
              </div>
            </div>

            {/* Money Flow Activity Table & Mobile Cards */}
            <div className="glass-modern-card rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-white/10">
              <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base font-display flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-amber-500" />
                    Giving & Taking Money Activity Stream
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    Audit trail of all cash disbursements, advance deductions, and overtime credits.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {moneyFlowData?.data?.transactions?.length || 0} Transactions
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 font-mono font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Date / Time</th>
                      <th className="py-3.5 px-4">Worker</th>
                      <th className="py-3.5 px-4">Type & Flow Direction</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Method & Note</th>
                      <th className="py-3.5 px-4 text-right">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06] font-medium">
                    {(!moneyFlowData?.data?.transactions || moneyFlowData.data.transactions.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No transactions found matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      moneyFlowData.data.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-amber-500/[0.03] transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-800 dark:text-slate-200">
                            <div className="font-bold">
                              {new Date(tx.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(tx.date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{tx.workerName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{tx.workerMobile}</div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.transactionType === 'CASH_ADVANCE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                <ArrowDownRight className="w-3 h-3" />
                                <span>Giving Advance</span>
                              </span>
                            )}
                            {tx.transactionType === 'SETTLEMENT_PAYOUT' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{tx.category}</span>
                              </span>
                            )}
                            {tx.transactionType === 'OVERTIME_CREDIT' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                <Zap className="w-3 h-3" />
                                <span>Overtime Credit</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                            <span
                              className={`text-sm font-display ${
                                tx.direction === 'GIVING_TO_WORKER'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === 'SETTLED' || tx.status === 'COMPLETED'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 mr-1.5">
                              {tx.paymentMethod}
                            </span>
                            <span>{tx.notes}</span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {tx.authorizedBy}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Transactions View */}
              <div className="md:hidden divide-y divide-slate-200/80 dark:divide-white/10">
                {(!moneyFlowData?.data?.transactions || moneyFlowData.data.transactions.length === 0) ? (
                  <p className="py-12 text-center text-xs text-slate-500">
                    No transactions found.
                  </p>
                ) : (
                  moneyFlowData.data.transactions.map((tx) => (
                    <div key={tx.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{tx.workerName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                tx.transactionType === 'CASH_ADVANCE'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : tx.transactionType === 'SETTLEMENT_PAYOUT'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {tx.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(tx.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            • via {tx.paymentMethod}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-sm font-black font-display ${
                              tx.direction === 'GIVING_TO_WORKER'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {tx.status}
                          </span>
                        </div>
                      </div>

                      {tx.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-white/[0.02] p-1.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reject OT Claim with Note */}
        {rejectingClaimId && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <button
                onClick={() => setRejectingClaimId(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Reject Overtime Claim
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Optional note will be visible to the worker
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason for Rejection (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="E.g. Not pre-approved by workshop lead"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setRejectingClaimId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReviewOt(rejectingClaimId, 'REJECTED', rejectionReason)}
                    disabled={isReviewingOt}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Mark Leave */}
        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Mark Worker Leave
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Supports retroactive dates and date ranges</p>
                </div>
              </div>

              {leaveError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                  {leaveError}
                </div>
              )}

              <form onSubmit={handleMarkLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Worker
                  </label>
                  <select
                    value={selectedWorker?.workerId || ''}
                    onChange={(e) => {
                      const found = overview?.workers.find((w) => w.workerId === e.target.value);
                      if (found) setSelectedWorker(found);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {overview?.workers.map((w) => (
                      <option key={w.workerId} value={w.workerId}>
                        {w.name} ({formatCurrency(w.dailyWage)}/day)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Leave Duration Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRangeLeave(false)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        !isRangeLeave
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Single Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRangeLeave(true)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        isRangeLeave
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

                {!isRangeLeave ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Leave Date
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={leaveDate}
                        onChange={(e) => setLeaveDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Leave Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveType('FULL')}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        leaveType === 'FULL'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Full Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType('HALF')}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        leaveType === 'HALF'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Half Day
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-white mb-0.5">Deduction Preview:</div>
                  <div>{getLeaveDeductionPreview()}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="E.g. Medical emergency"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isMarkingLeave}
                    className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {isMarkingLeave ? 'Recording...' : 'Record Leave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cash Advance */}
        {isAdvanceModalOpen && selectedWorker && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Issue Cash Advance: {selectedWorker.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Auto-deducted from next settlement</p>
                </div>
              </div>

              {advanceError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                  {advanceError}
                </div>
              )}

              <form onSubmit={handleRecordAdvanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Advance Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="E.g. 500, 1000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date Handed Over
                  </label>
                  <input
                    type="date"
                    required
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    placeholder="E.g. Mid-week cash request"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdvanceModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRecordingAdvance}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {isRecordingAdvance ? 'Saving...' : 'Record Advance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Update Daily Wage (Historical Wage Versioning) */}
        {isWageModalOpen && selectedWorker && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsWageModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Configure Wage: {selectedWorker.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Updating wage preserves all previous days with their historical rates intact.
              </p>

              <form onSubmit={handleUpdateWageSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Daily Wage Rate (₹ / Day)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={wageValue}
                    onChange={(e) => setWageValue(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={wageEffectiveDate}
                    onChange={(e) => setWageEffectiveDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Salary only increases from this date onwards; old days remain unaffected.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWageModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingWage}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {isUpdatingWage ? 'Updating...' : 'Save Rate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Settle Payroll (Supports Partial Payout) */}
        {isSettleModalOpen && selectedWorker && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Settle & Payout: {selectedWorker.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Full or custom partial settlement</p>
                </div>
              </div>

              {settleError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                  {settleError}
                </div>
              )}

              <form onSubmit={handleSettlePayrollSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Settlement Cut-Off Date
                  </label>
                  <input
                    type="date"
                    required
                    value={settleCutoffDate}
                    onChange={(e) => setSettleCutoffDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Net Accrued:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {formatCurrency(selectedWorker.unsettledBalance)}
                  </span>
                </div>

                {/* Full vs Partial Payout Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payout Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPartialSettlement(false)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        !isPartialSettlement
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Full Payout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPartialSettlement(true);
                        setPartialAmount(String(Math.floor(selectedWorker.unsettledBalance / 2)));
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        isPartialSettlement
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Partial Payout
                    </button>
                  </div>
                </div>

                {isPartialSettlement && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Partial Amount to Pay Now (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                    {Number(partialAmount) > 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                        Remaining {formatCurrency(Math.max(0, selectedWorker.unsettledBalance - Number(partialAmount)))} will be carried forward to next settlement.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((mode) => (
                      <button
                        type="button"
                        key={mode}
                        onClick={() => setPaymentMethod(mode)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          paymentMethod === mode
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reference / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={settleNote}
                    onChange={(e) => setSettleNote(e.target.value)}
                    placeholder="E.g. Sunday partial wages"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettleModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSettling}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {isSettling ? 'Settling...' : 'Confirm Payout'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Paid Holidays Manager */}
        {isHolidaysModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modern-panel rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <PartyPopper className="w-5 h-5 text-purple-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Paid Shop & Public Holidays</h3>
                </div>
                <button
                  onClick={() => setIsHolidaysModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add New Holiday Form */}
              <form onSubmit={handleDeclareHolidaySubmit} className="pt-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Holiday Date
                    </label>
                    <input
                      type="date"
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Title / Occasion
                    </label>
                    <input
                      type="text"
                      required
                      value={holidayTitle}
                      onChange={(e) => setHolidayTitle(e.target.value)}
                      placeholder="E.g. Diwali, Eid"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isDeclaringHoliday}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                >
                  {isDeclaringHoliday ? 'Adding...' : 'Declare Paid Holiday'}
                </button>
              </form>

              {/* Holiday List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 pt-2">
                {holidays.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">
                    No holidays declared yet.
                  </p>
                ) : (
                  holidays.map((h) => (
                    <div key={h._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{h.title}</span>
                        <span className="text-slate-500 ml-2">
                          ({new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove holiday "${h.title}"?`)) {
                            await deleteHoliday(h._id);
                            refetchHolidays();
                            refetchOverview();
                            refetchCommonCalendar();
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
