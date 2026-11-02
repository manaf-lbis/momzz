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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Wallet className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Payroll & Daily Wages
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic daily-wage engine &bull; Floor-100 leave penalty &bull; Unsettled single-sheet ledger
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedWorkerIds([]);
                setShowBulkLeaveModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/20 active:scale-95 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Mark Bulk Leave</span>
            </button>

            <button
              onClick={() => {
                setAdvanceWorkerId(workers[0]?.workerId || '');
                setShowAdvanceModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-white border border-slate-700/60 shadow-sm active:scale-95 transition-all"
            >
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Record Advance</span>
            </button>

            <button
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm active:scale-95 transition-all"
            >
              <PartyPopper className="w-4 h-4 text-purple-500" />
              <span>Garage Holidays</span>
            </button>

            <AnimatedThemeToggle />
          </div>
        </div>

        {/* Pending OT Claims Alert Banner (Admin Instant Inline Review) */}
        {pendingOtClaims.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 backdrop-blur-sm">
            <Meteors number={10} />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <Zap className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Pending Overtime Claims ({pendingOtClaims.length})
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      Action Required
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Workers claim whole integer hours. Rate is strictly ₹150/hr. Unapproved OT is excluded from wages until approved.
                  </p>
                </div>
              </div>
            </div>

            {/* Inline Claims Cards */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingOtClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {claim.workerName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{claim.date}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {claim.otHours} hr OT (+{formatCurrency(claim.potentialAmount)})
                        </span>
                      </div>
                      {claim.note && (
                        <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          "{claim.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/40">
                    <button
                      disabled={isUpdatingOt}
                      onClick={() => handleReviewOt(claim.id, 'APPROVED')}
                      className="flex-1 py-1.5 px-3 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      disabled={isUpdatingOt}
                      onClick={() => handleReviewOt(claim.id, 'REJECTED')}
                      className="py-1.5 px-3 text-[11px] font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1 transition-all active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Staff
              </span>
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {kpis.totalWorkers}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active daily-wage staff members
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Unsettled Dues
              </span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(kpis.totalUnsettledNet)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Calculated dynamically since last settlement
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending OT Verification
              </span>
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {kpis.totalPendingOtCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Claims awaiting approval at ₹150/hr
            </div>
          </div>
        </div>

        {/* Worker Roster Section */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm overflow-hidden">
          {/* Table Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Worker Roster & Dynamic Ledgers
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {filteredWorkers.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click any worker to open their continuous single-sheet ledger stream.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search worker by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Table View (Desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Daily Wage Rate</th>
                  <th className="py-3 px-4">Unsettled Gross</th>
                  <th className="py-3 px-4">Floor Deductions</th>
                  <th className="py-3 px-4">Approved OT</th>
                  <th className="py-3 px-4">Advances</th>
                  <th className="py-3 px-4">Net Unsettled Dues</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500 dark:text-slate-400">
                      No workers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((w) => (
                    <tr
                      key={w.workerId}
                      className="hover:bg-amber-500/[0.02] dark:hover:bg-amber-500/[0.04] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {w.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{w.mobile}</div>
                        {w.pendingOtCount > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Clock className="w-2.5 h-2.5" />
                            {w.pendingOtCount} pending OT
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(w.dailyWage)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedWorker(w);
                              setNewWage(w.dailyWage);
                              setShowWageModal(true);
                            }}
                            title="Edit Daily Wage"
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400">/ day</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(w.unsettledGross)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-amber-600 dark:text-amber-400">
                        -{formatCurrency(w.unsettledDeductions)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(w.unsettledOtAmount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-rose-600 dark:text-rose-400">
                        -{formatCurrency(w.unsettledAdvances)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                        <span className="px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
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
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
                          >
                            Settle
                          </button>
                          <button
                            onClick={() => navigate(`/payroll/${w.workerId}`)}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1 transition-all"
                          >
                            <span>Single Sheet</span>
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

          {/* Mobile Card Roster View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredWorkers.map((w) => (
              <div key={w.workerId} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                    <p className="text-xs text-slate-400">{w.mobile}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Wage: {formatCurrency(w.dailyWage)}/day
                      </span>
                      <button
                        onClick={() => {
                          setSelectedWorker(w);
                          setNewWage(w.dailyWage);
                          setShowWageModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Unsettled Dues</span>
                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                      {formatCurrency(w.netPayable)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Gross</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {formatCurrency(w.unsettledGross)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Deductions</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                      -{formatCurrency(w.unsettledDeductions)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Advances</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                      -{formatCurrency(w.unsettledAdvances)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedWorker(w);
                      setSettleAmount(w.netPayable);
                      setShowSettleModal(true);
                    }}
                    className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white text-center shadow-sm"
                  >
                    Settle Dues
                  </button>
                  <button
                    onClick={() => navigate(`/payroll/${w.workerId}`)}
                    className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-center"
                  >
                    View Single Sheet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* --- MODAL 1: PRIMARY MARK BULK LEAVE MODAL --- */}
      {showBulkLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Mark Bulk Leave
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select workers & dates. Floor-100 deduction rule applies automatically.
                </p>
              </div>
              <button
                onClick={() => setShowBulkLeaveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {workers.map((w) => {
                    const isSelected = selectedWorkerIds.includes(w.workerId);
                    return (
                      <div
                        key={w.workerId}
                        onClick={() => toggleWorkerSelection(w.workerId)}
                        className={`cursor-pointer p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate">{w.name}</span>
                        <span className="text-[10px] opacity-75 font-mono">₹{w.dailyWage}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave Type Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Leave Penalty Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('FULL_LEAVE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      leaveType === 'FULL_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Full Leave (Floor 100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('HALF_LEAVE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      leaveType === 'HALF_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Half Day (Half to Next 10)
                  </button>
                </div>
              </div>

              {/* Date Selection Mode */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Dates (Supports Retroactive Dates)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setLeaveDateMode('SINGLE')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        leaveDateMode === 'SINGLE'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      Single Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveDateMode('RANGE')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        leaveDateMode === 'RANGE'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>

                {leaveDateMode === 'SINGLE' ? (
                  <input
                    type="date"
                    required
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">To Date</span>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal work, family function..."
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowBulkLeaveModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarkingLeave || selectedWorkerIds.length === 0}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 shadow-sm"
                >
                  {isMarkingLeave ? 'Processing...' : `Mark Leave for ${selectedWorkerIds.length} Workers`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: RECORD CASH ADVANCE MODAL --- */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                Record Cash Advance Taken
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
                  Select Worker
                </label>
                <select
                  value={advanceWorkerId}
                  onChange={(e) => setAdvanceWorkerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  {workers.map((w) => (
                    <option key={w.workerId} value={w.workerId}>
                      {w.name} ({w.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500, 1000..."
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

      {/* --- MODAL 3: SETTLEMENT PAYOUT MODAL --- */}
      {showSettleModal && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Settle Payroll Dues
                </h3>
                <p className="text-xs text-slate-400">Worker: {selectedWorker.name}</p>
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
                    {formatCurrency(selectedWorker.netPayable)}
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
                <span className="text-[10px] text-slate-400 block">
                  Partial payment allowed. Remaining balance carries forward automatically.
                </span>
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

      {/* --- MODAL 4: EDIT DAILY WAGE RATE --- */}
      {showWageModal && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Update Daily Wage
              </h3>
              <button
                onClick={() => setShowWageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWageSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Worker: <span className="font-bold text-slate-900 dark:text-white">{selectedWorker.name}</span>
              </p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Daily Wage (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newWage}
                  onChange={(e) => setNewWage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
                <span className="text-[10px] text-slate-400 block">
                  Preserves past wage history intact. New wage calculates from today forward.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowWageModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingWage}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm"
                >
                  {isUpdatingWage ? 'Updating...' : 'Save Wage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: GARAGE HOLIDAYS MODAL --- */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-purple-500" />
                Garage Holidays (100% Paid)
              </h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Date</span>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
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
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
                >
                  {isDeclaringHoliday ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Declared Holidays ({holidays.length})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No holidays declared yet.</p>
                ) : (
                  holidays.map((h) => (
                    <div key={h._id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{h.title}</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-mono">{h.date}</span>
                        {h.isPaid && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
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
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
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
