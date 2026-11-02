import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  Banknote,
  Zap,
  Filter,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import {
  useGetAdminOverviewQuery,
  useMarkBatchLeaveMutation,
  useUpdateOtStatusMutation,
  useSettlePayrollMutation,
  useRecordAdvanceMutation,
  useUpdateWorkerWageMutation,
  useGetHolidaysQuery,
  useDeclareHolidayMutation,
  useDeleteHolidayMutation,
  WorkerSummaryItem,
  PendingOtClaimItem,
} from '../api/payrollApi';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const PayrollDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Queries
  const { data: overviewData, isLoading, refetch } = useGetAdminOverviewQuery();
  const { data: holidaysData } = useGetHolidaysQuery();

  // Mutations
  const [markBatchLeave, { isLoading: isMarkingLeave }] = useMarkBatchLeaveMutation();
  const [updateOtStatus, { isLoading: isUpdatingOt }] = useUpdateOtStatusMutation();
  const [settlePayroll, { isLoading: isSettling }] = useSettlePayrollMutation();
  const [recordAdvance, { isLoading: isRecordingAdvance }] = useRecordAdvanceMutation();
  const [updateWorkerWage, { isLoading: isUpdatingWage }] = useUpdateWorkerWageMutation();
  const [declareHoliday, { isLoading: isDeclaringHoliday }] = useDeclareHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  // Modals
  const [showBulkLeaveModal, setShowBulkLeaveModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showWageModal, setShowWageModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Active targets
  const [selectedWorker, setSelectedWorker] = useState<WorkerSummaryItem | null>(null);

  // Bulk Leave Form State
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [leaveDateMode, setLeaveDateMode] = useState<'SINGLE' | 'RANGE'>('SINGLE');
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState<'FULL_LEAVE' | 'HALF_LEAVE'>('FULL_LEAVE');
  const [leaveNote, setLeaveNote] = useState('');

  // Advance Form State
  const [advanceWorkerId, setAdvanceWorkerId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceNote, setAdvanceNote] = useState('');

  // Settle Form State
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleEndDate, setSettleEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [settleReference, setSettleReference] = useState('');

  // Wage Form State
  const [newWage, setNewWage] = useState<number | ''>('');

  // Holiday Form State
  const [holidayDate, setHolidayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayPaid, setHolidayPaid] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  const workers = overviewData?.data?.workers || [];
  const pendingOtClaims = overviewData?.data?.pendingOtClaims || [];
  const kpis = overviewData?.data?.kpis || { totalWorkers: 0, totalUnsettledNet: 0, totalPendingOtCount: 0 };
  const holidays = holidaysData?.data || [];

  const filteredWorkers = useMemo(() => {
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.mobile.includes(searchQuery)
    );
  }, [workers, searchQuery]);

  // Bulk select all workers toggle
  const toggleSelectAllWorkers = () => {
    if (selectedWorkerIds.length === workers.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(workers.map((w) => w.workerId));
    }
  };

  const toggleWorkerSelection = (id: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle Bulk Leave Submit
  const handleBulkLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkerIds.length === 0) return;

    try {
      const datesPayload =
        leaveDateMode === 'SINGLE'
          ? singleDate
          : { startDate, endDate };

      await markBatchLeave({
        workerIds: selectedWorkerIds,
        dates: datesPayload,
        type: leaveType,
        note: leaveNote,
      }).unwrap();

      setShowBulkLeaveModal(false);
      setSelectedWorkerIds([]);
      setLeaveNote('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record leaves');
    }
  };

  // Handle OT Review
  const handleReviewOt = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateOtStatus({ id, status }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update overtime status');
    }
  };

  // Handle Cash Advance Submit
  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceWorkerId || !advanceAmount || Number(advanceAmount) <= 0) return;

    try {
      await recordAdvance({
        workerId: advanceWorkerId,
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

  // Handle Settle Submit
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    try {
      await settlePayroll({
        workerId: selectedWorker.workerId,
        endDate: settleEndDate,
        amountPaid: settleAmount === '' ? undefined : Number(settleAmount),
        paymentMethod,
        referenceNote: settleReference,
      }).unwrap();

      setShowSettleModal(false);
      setSelectedWorker(null);
      setSettleAmount('');
      setSettleReference('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to settle payroll');
    }
  };

  // Handle Wage Update
  const handleWageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || newWage === '' || Number(newWage) < 0) return;

    try {
      await updateWorkerWage({
        workerId: selectedWorker.workerId,
        dailyWage: Number(newWage),
      }).unwrap();

      setShowWageModal(false);
      setSelectedWorker(null);
      setNewWage('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update wage rate');
    }
  };

  // Handle Holiday Submit
  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayTitle.trim()) return;

    try {
      await declareHoliday({
        date: holidayDate,
        title: holidayTitle.trim(),
        isPaid: holidayPaid,
      }).unwrap();

      setShowHolidayModal(false);
      setHolidayTitle('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to declare holiday');
    }
  };

  if (isLoading) {
    return <PageShimmer />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* ── Sticky Page Header ── */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <BackButton />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Wallet className="w-4 h-4" />
                </span>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Payroll & Daily Wages
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                Dynamic daily-wage engine &bull; Floor-100 leave penalty &bull; Unsettled single-sheet ledger
              </p>
            </div>
          </div>

          {/* Right: action buttons — desktop only */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedWorkerIds([]);
                setShowBulkLeaveModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Mark Bulk Leave</span>
            </button>

            <button
              onClick={() => {
                setAdvanceWorkerId(workers[0]?.workerId || '');
                setShowAdvanceModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white border border-zinc-700/60 shadow-sm active:scale-95 transition-all"
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Record Advance</span>
            </button>

            <button
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700/70 shadow-sm active:scale-95 transition-all"
            >
              <PartyPopper className="w-4 h-4 text-purple-500" />
              <span>Holidays</span>
            </button>

            <AnimatedThemeToggle />
          </div>

          {/* Right: theme toggle on mobile */}
          <div className="flex md:hidden items-center gap-2">
            <AnimatedThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-28 md:pb-8 space-y-5">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Active Staff */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Staff
              </span>
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {kpis.totalWorkers}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active daily-wage staff members
            </p>
          </div>

          {/* Total Unsettled Dues */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Unsettled Dues
              </span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(kpis.totalUnsettledNet)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Calculated since last settlement
            </p>
          </div>

          {/* Pending OT */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending OT Verification
              </span>
              <span className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black tabular-nums text-violet-600 dark:text-violet-400">
              {kpis.totalPendingOtCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Claims awaiting approval at ₹150/hr
            </p>
          </div>
        </div>

        {/* ── Pending OT Claims Banner ── */}
        {pendingOtClaims.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-amber-500/30 dark:border-amber-500/20 shadow-sm">
            <Meteors number={10} />
            <div className="p-4">
              {/* Banner Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <Zap className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    Pending Overtime Claims ({pendingOtClaims.length})
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                      Action Required
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Workers claim whole integer hours. Rate is strictly ₹150/hr. Unapproved OT is excluded from wages.
                  </p>
                </div>
              </div>

              {/* OT Claim Cards — full-width on mobile, 3-col on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pendingOtClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="bg-slate-50 dark:bg-zinc-800/70 rounded-xl p-3.5 border border-slate-200 dark:border-zinc-700 flex flex-col gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {claim.workerName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{claim.date}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-violet-600 dark:text-violet-400">
                          {claim.otHours} hr OT
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(claim.potentialAmount)}
                        </span>
                      </div>
                      {claim.note && (
                        <p className="text-[11px] text-slate-500 italic mt-2 bg-white dark:bg-zinc-900/60 p-2 rounded-lg border border-slate-100 dark:border-zinc-700">
                          "{claim.note}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700/60">
                      <button
                        disabled={isUpdatingOt}
                        onClick={() => handleReviewOt(claim.id, 'APPROVED')}
                        className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        disabled={isUpdatingOt}
                        onClick={() => handleReviewOt(claim.id, 'REJECTED')}
                        className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Worker Roster Section ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Worker Roster & Dynamic Ledgers
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                    {filteredWorkers.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap any worker to open their continuous single-sheet ledger.
                </p>
              </div>

              {/* Sticky search */}
              <div className="relative w-full sm:w-64">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or phone…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Daily Wage</th>
                  <th className="py-3 px-4">Gross</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">OT Earned</th>
                  <th className="py-3 px-4">Advances</th>
                  <th className="py-3 px-4">Net Dues</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                      No workers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((w) => (
                    <tr
                      key={w.workerId}
                      className="hover:bg-amber-500/[0.03] dark:hover:bg-amber-500/[0.04] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shrink-0">
                            {w.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{w.name}</div>
                            <div className="text-[11px] text-slate-400">{w.mobile}</div>
                            {w.pendingOtCount > 0 && (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block" />
                                {w.pendingOtCount} pending OT
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                            {formatCurrency(w.dailyWage)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setNewWage(w.dailyWage);
                              setShowWageModal(true);
                            }}
                            title="Edit Daily Wage"
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400">/ day</div>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(w.unsettledGross)}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                        -{formatCurrency(w.unsettledDeductions)}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                        +{formatCurrency(w.unsettledOtAmount)}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                        -{formatCurrency(w.unsettledAdvances)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-black text-xs tabular-nums">
                          {formatCurrency(w.netPayable)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setSettleAmount(w.netPayable);
                              setShowSettleModal(true);
                            }}
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
                          >
                            Settle
                          </button>
                          <button
                            onClick={() => navigate(`/payroll/${w.workerId}`)}
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1 transition-all"
                          >
                            <span>Ledger</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Card List ── */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {filteredWorkers.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                No workers found matching your search.
              </p>
            ) : (
              filteredWorkers.map((w) => (
                <div key={w.workerId} className="p-4 space-y-3">
                  {/* Card Top Row */}
                  <div className="flex items-start gap-3">
                    {/* Initial Avatar */}
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {w.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {w.name}
                          </h3>
                          <p className="text-xs text-slate-400">{w.mobile}</p>
                        </div>
                        {/* Wage Badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-2 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold tabular-nums">
                            ₹{w.dailyWage}/day
                          </span>
                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setNewWage(w.dailyWage);
                              setShowWageModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Pending OT Badge */}
                      {w.pendingOtCount > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block" />
                          {w.pendingOtCount} pending OT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Micro-stats row */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-3 border border-slate-100 dark:border-zinc-800">
                    <div className="text-center">
                      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">Gross</span>
                      <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(w.unsettledGross)}
                      </span>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-zinc-700">
                      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">Deductions</span>
                      <span className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        -{formatCurrency(w.unsettledDeductions)}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">Advances</span>
                      <span className="text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        -{formatCurrency(w.unsettledAdvances)}
                      </span>
                    </div>
                  </div>

                  {/* Net dues + action buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl px-3 py-2">
                      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 block">Net Dues</span>
                      <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(w.netPayable)}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/payroll/${w.workerId}`)}
                      className="flex items-center gap-1 px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      Ledger
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setSettleAmount(w.netPayable);
                        setShowSettleModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── Mobile Floating Bottom Action Bar ── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 flex items-center justify-around px-4 py-3">
        <button
          onClick={() => {
            setSelectedWorkerIds([]);
            setShowBulkLeaveModal(true);
          }}
          className="flex flex-col items-center gap-1 px-4 py-1 text-amber-600 dark:text-amber-400 active:opacity-70 transition"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Bulk Leave</span>
        </button>

        <button
          onClick={() => {
            setAdvanceWorkerId(workers[0]?.workerId || '');
            setShowAdvanceModal(true);
          }}
          className="flex flex-col items-center gap-1 px-4 py-1 text-emerald-600 dark:text-emerald-400 active:opacity-70 transition"
        >
          <Banknote className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Advance</span>
        </button>

        <button
          onClick={() => setShowHolidayModal(true)}
          className="flex flex-col items-center gap-1 px-4 py-1 text-purple-600 dark:text-purple-400 active:opacity-70 transition"
        >
          <PartyPopper className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Holidays</span>
        </button>
      </div>

      {/* ════════════════════════════════════════
          MODAL 1 — Mark Bulk Leave
      ════════════════════════════════════════ */}
      {showBulkLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Mark Bulk Leave
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select workers & dates. Floor-100 deduction rule applies automatically.
                </p>
              </div>
              <button
                onClick={() => setShowBulkLeaveModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkLeaveSubmit} className="space-y-4">
              {/* Worker Multi-Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Workers ({selectedWorkerIds.length}/{workers.length})
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAllWorkers}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {selectedWorkerIds.length === workers.length ? 'Deselect All' : 'Select All Workers'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-700">
                  {workers.map((w) => {
                    const isSelected = selectedWorkerIds.includes(w.workerId);
                    return (
                      <button
                        key={w.workerId}
                        type="button"
                        onClick={() => toggleWorkerSelection(w.workerId)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {w.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leave Type Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Leave Penalty Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('FULL_LEAVE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      leaveType === 'FULL_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Full Leave (Floor 100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('HALF_LEAVE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      leaveType === 'HALF_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Half Day (Half to Next 10)
                  </button>
                </div>
              </div>

              {/* Date Selection Mode */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Dates (Supports Retroactive)
                  </label>
                  <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-zinc-800 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setLeaveDateMode('SINGLE')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        leaveDateMode === 'SINGLE'
                          ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-300 shadow-sm'
                          : 'text-slate-400'
                      }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveDateMode('RANGE')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        leaveDateMode === 'RANGE'
                          ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-300 shadow-sm'
                          : 'text-slate-400'
                      }`}
                    >
                      Range
                    </button>
                  </div>
                </div>

                {leaveDateMode === 'SINGLE' ? (
                  <input
                    type="date"
                    required
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">From Date</span>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">To Date</span>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal work, family function..."
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowBulkLeaveModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarkingLeave || selectedWorkerIds.length === 0}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 shadow-sm transition active:scale-95"
                >
                  {isMarkingLeave ? 'Processing...' : `Mark Leave for ${selectedWorkerIds.length} Workers`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL 2 — Record Cash Advance
      ════════════════════════════════════════ */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                Record Cash Advance Taken
              </h3>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Worker</label>
                <select
                  value={advanceWorkerId}
                  onChange={(e) => setAdvanceWorkerId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {workers.map((w) => (
                    <option key={w.workerId} value={w.workerId}>
                      {w.name} ({w.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Advance Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500, 1000..."
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date</label>
                <input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-week cash advance..."
                  value={advanceNote}
                  onChange={(e) => setAdvanceNote(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingAdvance}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {isRecordingAdvance ? 'Saving...' : 'Record Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL 3 — Settlement Payout
      ════════════════════════════════════════ */}
      {showSettleModal && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Settle Payroll Dues
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Worker: {selectedWorker.name}</p>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              {/* Current dues summary */}
              <div className="p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Calculated Dues</span>
                <span className="text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(selectedWorker.netPayable)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount to Disburse (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Partial payment allowed. Remaining balance carries forward automatically.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Settlement Through Date</label>
                <input
                  type="date"
                  required
                  value={settleEndDate}
                  onChange={(e) => setSettleEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reference / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cash voucher..."
                  value={settleReference}
                  onChange={(e) => setSettleReference(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {isSettling ? 'Processing...' : 'Disburse & Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL 4 — Edit Daily Wage Rate
      ════════════════════════════════════════ */}
      {showWageModal && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                Update Daily Wage
              </h3>
              <button
                onClick={() => setShowWageModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWageSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Worker: <span className="font-bold text-slate-900 dark:text-white">{selectedWorker.name}</span>
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Daily Wage (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newWage}
                  onChange={(e) => setNewWage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Preserves past wage history intact. New wage calculates from today forward.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowWageModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingWage}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingWage ? 'Updating...' : 'Save Wage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL 5 — Garage Holidays
      ════════════════════════════════════════ */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-purple-500" />
                Garage Holidays (100% Paid)
              </h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Holiday Form */}
            <form onSubmit={handleHolidaySubmit} className="space-y-3 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Date</span>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Holiday Title</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali, Onam..."
                    value={holidayTitle}
                    onChange={(e) => setHolidayTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={holidayPaid}
                    onChange={(e) => setHolidayPaid(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>100% Paid Holiday (Full daily wage)</span>
                </label>

                <button
                  type="submit"
                  disabled={isDeclaringHoliday}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {isDeclaringHoliday ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </form>

            {/* Holiday List */}
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Declared Holidays ({holidays.length})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-48 overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No holidays declared yet.</p>
                ) : (
                  holidays.map((h) => (
                    <div key={h._id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{h.title}</span>
                        <span className="text-xs text-slate-400 font-mono">{h.date}</span>
                        {h.isPaid && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            100% Paid
                          </span>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove holiday "${h.title}"?`)) {
                            await deleteHoliday(h._id);
                            refetch();
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-2 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
