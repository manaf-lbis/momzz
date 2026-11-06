import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
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
  Search,
  ArrowUpRight,
  Info,
  Gift,
  Sparkles,
  AlertCircle,
  Share2,
  Printer,
  Copy,
  BarChart3,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import {
  useGetAdminOverviewQuery,
  useMarkBatchLeaveMutation,
  useUpdateOtStatusMutation,
  useSettlePayrollMutation,
  useRecordAdvanceMutation,
  useRecordIncentiveMutation,
  useUpdateWorkerWageMutation,
  useGetHolidaysQuery,
  useDeclareHolidayMutation,
  useDeleteHolidayMutation,
  useGetOtClaimsQuery,
  WorkerSummaryItem,
} from '../api/payrollApi';
import { OvertimeTrackerConsole } from '../components/OvertimeTrackerConsole';

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
  const { data: otClaimsData, refetch: refetchOtClaims } = useGetOtClaimsQuery();

  // Navigation section: 'ROSTER' | 'OT_CONSOLE'
  const [activeSection, setActiveSection] = useState<'ROSTER' | 'OT_CONSOLE'>('ROSTER');

  // OT Rejection modal state
  const [rejectingClaim, setRejectingClaim] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Mutations
  const [markBatchLeave, { isLoading: isMarkingLeave }] = useMarkBatchLeaveMutation();
  const [updateOtStatus, { isLoading: isUpdatingOt }] = useUpdateOtStatusMutation();
  const [settlePayroll, { isLoading: isSettling }] = useSettlePayrollMutation();
  const [recordAdvance, { isLoading: isRecordingAdvance }] = useRecordAdvanceMutation();
  const [recordIncentive, { isLoading: isRecordingIncentive }] = useRecordIncentiveMutation();
  const [updateWorkerWage, { isLoading: isUpdatingWage }] = useUpdateWorkerWageMutation();
  const [declareHoliday, { isLoading: isDeclaringHoliday }] = useDeclareHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  // Modals
  const [showBulkLeaveModal, setShowBulkLeaveModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
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

  // Incentive Form State
  const [incentiveWorkerId, setIncentiveWorkerId] = useState('');
  const [incentiveAmount, setIncentiveAmount] = useState<number | ''>('');
  const [incentiveDate, setIncentiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incentiveNotes, setIncentiveNotes] = useState('');

  // Settle Form State
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleEndDate, setSettleEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [settleReference, setSettleReference] = useState('');

  // Wage Form State
  const [newWage, setNewWage] = useState<number | ''>('');
  const [wageEffectiveDate, setWageEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Holiday Form State
  const [holidayDate, setHolidayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayPaid, setHolidayPaid] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Exclude Admin: ONLY Workers are shown in the salary list/roster
  const allRawWorkers = overviewData?.data?.workers || [];
  const workers = useMemo(() => allRawWorkers.filter((w) => w.role !== 'ADMIN'), [allRawWorkers]);
  const pendingOtClaims = overviewData?.data?.pendingOtClaims || [];
  const allOtClaims = otClaimsData?.data || [];
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
  const handleReviewOt = async (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      await updateOtStatus({
        id,
        status,
        rejectionReason: rejectionReason || undefined,
        note: rejectionReason || undefined,
      }).unwrap();
      refetch();
      refetchOtClaims();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update overtime status');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingClaim) return;
    await handleReviewOt(rejectingClaim.id, 'REJECTED', rejectionReasonInput.trim());
    setRejectingClaim(null);
    setRejectionReasonInput('');
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

  // Handle Incentive Submit
  const handleIncentiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incentiveWorkerId || !incentiveAmount || Number(incentiveAmount) <= 0 || !incentiveNotes.trim()) return;

    try {
      await recordIncentive({
        workerId: incentiveWorkerId,
        amount: Number(incentiveAmount),
        date: incentiveDate,
        notes: incentiveNotes.trim(),
      }).unwrap();

      setShowIncentiveModal(false);
      setIncentiveAmount('');
      setIncentiveNotes('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to award incentive');
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
        effectiveDate: wageEffectiveDate,
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
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      {/* Ambient background glow */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-3 sm:py-4 pb-36 sm:pb-40 md:pb-16 space-y-3 sm:space-y-4">
        {/* Top Page Header */}
        <PageHeader
          backTo="/dashboard"
          title="Payroll & Daily Wages"
          count={kpis.totalWorkers}
          badge={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <Wallet className="w-3.5 h-3.5" />
              Dynamic Engine
            </span>
          }
          actions={
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedWorkerIds([]);
                  setShowBulkLeaveModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Mark Leave</span>
              </button>
              <button
                onClick={() => {
                  setAdvanceWorkerId(workers[0]?.workerId || '');
                  setShowAdvanceModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95"
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                <span>Advance</span>
              </button>
              <button
                onClick={() => {
                  setIncentiveWorkerId(workers[0]?.workerId || '');
                  setShowIncentiveModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95"
              >
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                <span>Incentive</span>
              </button>
              <button
                onClick={() => setShowHolidayModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95"
              >
                <PartyPopper className="w-3.5 h-3.5 text-purple-500" />
                <span>Holidays</span>
              </button>
              <AnimatedThemeToggle variant="icon-only" />
            </div>
          }
        />

        {/* ── MOBILE QUICK ACTION TILES (Native 4-Button Row - Mobile Only) ── */}
        <div className="grid sm:hidden grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              setSelectedWorkerIds([]);
              setShowBulkLeaveModal(true);
            }}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl glass-modern-card text-center transition active:scale-95"
          >
            <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Users className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">
              Leave
            </span>
          </button>

          <button
            onClick={() => {
              setAdvanceWorkerId(workers[0]?.workerId || '');
              setShowAdvanceModal(true);
            }}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl glass-modern-card text-center transition active:scale-95"
          >
            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">
              Advance
            </span>
          </button>

          <button
            onClick={() => {
              setIncentiveWorkerId(workers[0]?.workerId || '');
              setShowIncentiveModal(true);
            }}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl glass-modern-card text-center transition active:scale-95"
          >
            <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Gift className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">
              Incentive
            </span>
          </button>

          <button
            onClick={() => setShowHolidayModal(true)}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl glass-modern-card text-center transition active:scale-95"
          >
            <span className="p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <PartyPopper className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">
              Holidays
            </span>
          </button>
        </div>

        {/* ── PENDING OT CLAIMS ALERT BANNER ── */}
        {pendingOtClaims.length > 0 && (
          <div className="p-3 sm:p-4 rounded-2xl glass-modern-card border-amber-500/30 bg-amber-500/[0.04] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <Zap className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Pending Overtime Claims ({pendingOtClaims.length})
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Whole hours only @ ₹150/hr. Unapproved OT excluded from dues.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {pendingOtClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                          {claim.workerProfileImageUrl ? (
                            <img src={claim.workerProfileImageUrl} alt={claim.workerName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{claim.workerName?.charAt(0)?.toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {claim.workerName}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        +{formatCurrency(claim.potentialAmount)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {claim.date} &bull; <span className="font-semibold">{claim.otHours}h OT</span>
                    </div>
                    {claim.flaggedReason === 'CLAIMED_ON_FULL_LEAVE' && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>Claimed on Full Leave Day</span>
                        </span>
                      </div>
                    )}
                    {claim.lastEditedAt && (
                      <span className="text-[10px] text-amber-500 block mt-0.5">
                        Edited by {claim.updatedByName || 'Admin'}
                      </span>
                    )}
                    {claim.note && (
                      <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">
                        "{claim.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                    <button
                      disabled={isUpdatingOt}
                      onClick={() => handleReviewOt(claim.id, 'APPROVED')}
                      className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      disabled={isUpdatingOt}
                      onClick={() => {
                        setRejectingClaim(claim);
                        setRejectionReasonInput('');
                      }}
                      className="py-1.5 px-3 text-[11px] font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1 transition active:scale-95"
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

        {/* ── KPI METRIC CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          <div className="p-3 sm:p-4 rounded-2xl glass-modern-card shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
                Staff
              </span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {kpis.totalWorkers}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Active workforce</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl glass-modern-card shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
                Pending OT
              </span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {kpis.totalPendingOtCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting review</p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl glass-modern-card shadow-2xs col-span-2 sm:col-span-1 border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-mono uppercase text-amber-600 dark:text-amber-400 font-bold">
                Total Unsettled Dues
              </span>
              <Wallet className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(kpis.totalUnsettledNet)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Calculated dynamically</p>
          </div>
        </div>

        {/* ── WORKFORCE PAYROLL DISTRIBUTION CARD ── */}
        {workers.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl glass-modern-card border border-slate-200/80 dark:border-white/10 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300">
                  Current Cycle Workforce Liability Split
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {workers.length} active worker accounts
              </span>
            </div>

            {/* Proportion Bar */}
            {(() => {
              const totalGross = workers.reduce((s, w) => s + (w.unsettledGross || 0), 0);
              const totalOt = workers.reduce((s, w) => s + (w.unsettledOtAmount || 0), 0);
              const totalAdv = workers.reduce((s, w) => s + (w.unsettledAdvances || 0), 0);
              const totalDeduct = workers.reduce((s, w) => s + (w.unsettledDeductions || 0), 0);
              const totalPool = Math.max(1, totalGross + totalOt);

              const grossPct = Math.round((totalGross / totalPool) * 100);
              const otPct = Math.round((totalOt / totalPool) * 100);

              return (
                <div className="space-y-2">
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex">
                    <div
                      style={{ width: `${grossPct}%` }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title={`Base Wages: ${formatCurrency(totalGross)}`}
                    />
                    <div
                      style={{ width: `${otPct}%` }}
                      className="h-full bg-sky-500 transition-all duration-500"
                      title={`Overtime: ${formatCurrency(totalOt)}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-xs font-mono pt-1 text-center">
                    <div className="p-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Gross Base</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(totalGross)}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Approved OT</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(totalOt)}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Leave Floor Deductions</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        -{formatCurrency(totalDeduct)}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Advances Drawn</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(totalAdv)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── SECTION NAVIGATION TABS: ROSTER vs. OVERTIME TRACKER ── */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection('ROSTER')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeSection === 'ROSTER'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Roster & Dues</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeSection === 'ROSTER' ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-white/10'
              }`}
            >
              {workers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('OT_CONSOLE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeSection === 'OT_CONSOLE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Overtime Tracker & Audit Console</span>
            {pendingOtClaims.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-white font-bold animate-pulse">
                {pendingOtClaims.length}
              </span>
            )}
          </button>
        </div>

        {/* ── VIEW 1: WORKER ROSTER SECTION ── */}
        {activeSection === 'ROSTER' && (
          <section className="space-y-2.5">
          {/* Section Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Staff Roster & Ledgers</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {filteredWorkers.length}
              </span>
            </h2>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-modern-card bg-transparent border-slate-200 dark:border-white/10 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl glass-modern-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/60 dark:bg-white/[0.03] text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-4">Worker</th>
                  <th className="py-2.5 px-4">Daily Wage</th>
                  <th className="py-2.5 px-4">Gross</th>
                  <th className="py-2.5 px-4">Deductions</th>
                  <th className="py-2.5 px-4">Approved OT</th>
                  <th className="py-2.5 px-4">Advances</th>
                  <th className="py-2.5 px-4">Net Dues</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No workers found.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((w) => (
                    <tr
                      key={w.workerId}
                      onClick={() => navigate(`/payroll/${w.workerId}`)}
                      className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.06] transition cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-2xs bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                            {w.profileImageUrl ? (
                              <img
                                src={w.profileImageUrl}
                                alt={w.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{w.name?.charAt(0)?.toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {w.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{w.mobile}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          {w.dailyWage > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatCurrency(w.dailyWage)}
                              </span>
                              {w.firstPayrollDate && (
                                <span className="text-[10px] text-slate-400">
                                  From {w.firstPayrollDate}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-rose-500 font-semibold italic">
                              Not Decided
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorker(w);
                              setNewWage(w.dailyWage || '');
                              setWageEffectiveDate(new Date().toISOString().split('T')[0]);
                              setShowWageModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-500 transition"
                            title="Set / Edit Daily Wage"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(w.unsettledGross)}
                      </td>

                      <td className="py-3 px-4 font-mono text-amber-600 dark:text-amber-400">
                        -{formatCurrency(w.unsettledDeductions)}
                      </td>

                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(w.unsettledOtAmount)}
                      </td>

                      <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400">
                        -{formatCurrency(w.unsettledAdvances)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {formatCurrency(w.netPayable)}
                        </span>
                        {w.advanceOverhang && w.advanceOverhang > 0 ? (
                          <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                            Overhang: -{formatCurrency(w.advanceOverhang)}
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorker(w);
                              setSettleAmount(w.netPayable);
                              setShowSettleModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
                          >
                            Settle
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/payroll/${w.workerId}`);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition"
                          >
                            Ledger &rarr;
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< md) */}
          <div className="md:hidden space-y-2.5">
            {filteredWorkers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 glass-modern-card rounded-2xl">
                No workers found.
              </div>
            ) : (
              filteredWorkers.map((w) => (
                <div
                  key={w.workerId}
                  onClick={() => navigate(`/payroll/${w.workerId}`)}
                  className="p-3.5 rounded-2xl glass-modern-card space-y-2.5 cursor-pointer hover:border-amber-400/50 dark:hover:border-amber-400/30 active:scale-[0.99] transition-all duration-150 group shadow-xs hover:shadow-md"
                >
                  {/* Top Row: Worker Info & Wage */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {w.profileImageUrl ? (
                          <img
                            src={w.profileImageUrl}
                            alt={w.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{w.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {w.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{w.mobile}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                        {w.dailyWage > 0 ? `₹${w.dailyWage}/d` : 'No Wage'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorker(w);
                          setNewWage(w.dailyWage || '');
                          setWageEffectiveDate(new Date().toISOString().split('T')[0]);
                          setShowWageModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500 transition"
                        title="Edit Daily Wage"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Micro Breakdown Row */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] text-center text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Gross</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(w.unsettledGross)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Leaves</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        -{formatCurrency(w.unsettledDeductions)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Advance</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(w.unsettledAdvances)}
                      </span>
                    </div>
                  </div>

                  {/* Net Dues & Actions Row */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-mono block">
                        Net Unsettled
                      </span>
                      <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                        {formatCurrency(w.netPayable)}
                      </span>
                      {w.advanceOverhang && w.advanceOverhang > 0 ? (
                        <span className="text-[10px] text-rose-500 font-semibold block font-mono">
                          Overhang: -{formatCurrency(w.advanceOverhang)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorker(w);
                          setSettleAmount(w.netPayable);
                          setShowSettleModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
                      >
                        Settle Dues
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/payroll/${w.workerId}`);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        )}

        {/* ── VIEW 2: OVERTIME TRACKER & AUDIT CONSOLE ── */}
        {activeSection === 'OT_CONSOLE' && (
          <section className="space-y-3">
            <OvertimeTrackerConsole
              claims={allOtClaims}
              isAdmin={true}
            />
          </section>
        )}
      </main>

      {/* ── MODAL 1: MARK BULK LEAVE (Responsive Bottom-Sheet) ── */}
      {showBulkLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-0 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl mx-1 sm:mx-0">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Mark Bulk Leave
                </h3>
                <p className="text-[11px] text-slate-400">
                  Floor-100 penalty calculates automatically
                </p>
              </div>
              <button
                onClick={() => setShowBulkLeaveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkLeaveSubmit} className="space-y-3.5">
              {/* Worker Multi-Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Staff ({selectedWorkerIds.length}/{workers.length})
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAllWorkers}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {selectedWorkerIds.length === workers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {workers.map((w) => {
                    const isSelected = selectedWorkerIds.includes(w.workerId);
                    return (
                      <div
                        key={w.workerId}
                        onClick={() => toggleWorkerSelection(w.workerId)}
                        className={`cursor-pointer p-2 rounded-lg border text-xs transition flex items-center justify-between gap-1 ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
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
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      leaveType === 'FULL_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Full Leave (Floor 100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('HALF_LEAVE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      leaveType === 'HALF_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Half Day (Next 10)
                  </button>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Date(s)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setLeaveDateMode('SINGLE')}
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        leaveDateMode === 'SINGLE'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
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
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Start</span>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">End</span>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal work..."
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowBulkLeaveModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarkingLeave || selectedWorkerIds.length === 0}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 shadow-xs"
                >
                  {isMarkingLeave ? 'Processing...' : `Mark ${selectedWorkerIds.length} Staff`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RECORD ADVANCE ── */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-0 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl mx-1 sm:mx-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Record Cash Advance
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
                  Select Staff
                </label>
                <select
                  value={advanceWorkerId}
                  onChange={(e) => setAdvanceWorkerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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

      {/* ── MODAL: GIVE INCENTIVE (Reflects directly on payable & ledger) ── */}
      {showIncentiveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-0 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl mx-1 sm:mx-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                Award Staff Incentive
              </h3>
              <button
                onClick={() => setShowIncentiveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIncentiveSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Staff
                </label>
                <select
                  value={incentiveWorkerId}
                  onChange={(e) => setIncentiveWorkerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                  Incentive Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500, 1000..."
                  value={incentiveAmount}
                  onChange={(e) => setIncentiveAmount(e.target.value === '' ? '' : Number(e.target.value))}
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
                  value={incentiveDate}
                  onChange={(e) => setIncentiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Remarks / Reason (Required)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival bonus, exceptional job on paint repair..."
                  value={incentiveNotes}
                  onChange={(e) => setIncentiveNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 block">
                  Reflects directly on worker's payable dues and ledger stream with these remarks.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowIncentiveModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingIncentive}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                >
                  {isRecordingIncentive ? 'Saving...' : 'Award Incentive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: SETTLE DUES ── */}
      {showSettleModal && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-0 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl mx-1 sm:mx-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
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

            <form onSubmit={handleSettleSubmit} className="space-y-3.5">
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
                  Through Date
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

      {/* ── MODAL 4: EDIT DAILY WAGE ── */}
      {showWageModal && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-0 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl mx-1 sm:mx-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
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

            <form onSubmit={handleWageSubmit} className="space-y-3.5">
              <p className="text-xs text-slate-500">
                Staff: <span className="font-bold text-slate-900 dark:text-white">{selectedWorker.name}</span>
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
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Effective From Date
                </label>
                <input
                  type="date"
                  required
                  value={wageEffectiveDate}
                  onChange={(e) => setWageEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 block">
                  {selectedWorker.dailyWage === 0
                    ? "Marks the worker's very first day. All salary, attendance, and OT calculations start from this date."
                    : 'Applies from this date onwards. Previous days retain historical wage rates.'}
                </span>
              </div>

              {newWage !== '' && Number(newWage) !== selectedWorker.dailyWage && (
                (() => {
                  const unsettledDays = selectedWorker.unsettledWorkingDays || 0;
                  const diffPerDay = Number(newWage) - (selectedWorker.dailyWage || 0);
                  const totalDiff = diffPerDay * unsettledDays;
                  const projectedPayable = Math.max(0, selectedWorker.netPayable + totalDiff);

                  return (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-900 dark:text-blue-200 space-y-1 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>Wage Change Impact Preview</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        This worker has <strong>{unsettledDays}</strong> unsettled day(s). Updating from ₹{selectedWorker.dailyWage} to ₹{newWage} will {totalDiff >= 0 ? 'increase' : 'decrease'} their current payable dues by <strong>₹{Math.abs(totalDiff).toLocaleString('en-IN')}</strong> (from ₹{selectedWorker.netPayable.toLocaleString('en-IN')} to ₹{projectedPayable.toLocaleString('en-IN')}).
                      </p>
                    </div>
                  );
                })()
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowWageModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingWage}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                >
                  {isUpdatingWage ? 'Updating...' : 'Save Wage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: GARAGE HOLIDAYS ── */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-2xl p-4 sm:p-6 mb-20 sm:mb-0 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl mx-1 sm:mx-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-purple-500" />
                Garage Holidays (100% Paid)
              </h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="space-y-3 p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Date</span>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Title</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eid, Onam..."
                    value={holidayTitle}
                    onChange={(e) => setHolidayTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                  <span>100% Paid Holiday</span>
                </label>

                <button
                  type="submit"
                  disabled={isDeclaringHoliday}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                >
                  {isDeclaringHoliday ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Existing Holidays ({holidays.length})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-44 overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No holidays declared yet.</p>
                ) : (
                  holidays.map((h) => (
                    <div key={h._id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{h.title}</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">{h.date}</span>
                        {h.isPaid && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            Paid
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
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
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

      {/* ── MODAL: ADMIN REJECT OVERTIME MODAL ── */}
      {rejectingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl glass-modern-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <X className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Reject Overtime Request
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {rejectingClaim.workerName} &bull; {rejectingClaim.date} &bull; {rejectingClaim.otHours}h OT
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingClaim(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                rows={3}
                placeholder="e.g. Work completed in regular hours / supervisor did not pre-authorize..."
                className="w-full p-2.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
              />
              <p className="text-[10px] text-slate-400">
                The mechanic will see this reason in their overtime audit tracker.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setRejectingClaim(null)}
                className="py-1.5 px-3 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingOt}
                onClick={handleConfirmReject}
                className="py-1.5 px-4 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                {isUpdatingOt ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
