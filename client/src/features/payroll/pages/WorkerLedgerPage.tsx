import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Filter,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  Gift,
  Sparkles,
  Share2,
  Printer,
  Copy,
  Check,
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
  useRecordIncentiveMutation,
  useUpdateLeaveMutation,
  useDeleteLeaveMutation,
  useUpdateOtClaimMutation,
  useDeleteOtClaimMutation,
  useDeleteTransactionMutation,
  SingleSheetDayEntry,
  MonthlyBreakdownItem,
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
  const [recordIncentive, { isLoading: isRecordingIncentive }] = useRecordIncentiveMutation();
  const [updateLeave, { isLoading: isUpdatingLeave }] = useUpdateLeaveMutation();
  const [deleteLeave, { isLoading: isDeletingLeave }] = useDeleteLeaveMutation();
  const [updateOtClaim, { isLoading: isUpdatingOt }] = useUpdateOtClaimMutation();
  const [deleteOtClaim, { isLoading: isDeletingOt }] = useDeleteOtClaimMutation();
  const [deleteTransaction] = useDeleteTransactionMutation();

  // Modals
  const [showOtModal, setShowOtModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [showEditLeaveModal, setShowEditLeaveModal] = useState(false);
  const [showEditOtModal, setShowEditOtModal] = useState(false);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);

  // OT Form State
  const [otDate, setOtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState<number>(1);
  const [otNote, setOtNote] = useState('');

  // Advance Form State
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceNote, setAdvanceNote] = useState('');

  // Incentive Form State
  const [incentiveAmount, setIncentiveAmount] = useState<number | ''>('');
  const [incentiveDate, setIncentiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incentiveNotes, setIncentiveNotes] = useState('');

  // Edit Leave Form State
  const [editingAdjustmentId, setEditingAdjustmentId] = useState('');
  const [editingLeaveDate, setEditingLeaveDate] = useState('');
  const [editingLeaveType, setEditingLeaveType] = useState<'FULL_LEAVE' | 'HALF_LEAVE'>('FULL_LEAVE');
  const [editingLeaveNote, setEditingLeaveNote] = useState('');

  // Edit OT Form State
  const [editingOtClaimId, setEditingOtClaimId] = useState('');
  const [editingOtDate, setEditingOtDate] = useState('');
  const [editingOtHours, setEditingOtHours] = useState<number>(1);
  const [editingOtNote, setEditingOtNote] = useState('');
  const [editingOtStatus, setEditingOtStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Settle Form State
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [settleEndDate, setSettleEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [settleReference, setSettleReference] = useState('');

  // Share Settlement Slip State
  const [shareSettlement, setShareSettlement] = useState<{ tx: any; day: SingleSheetDayEntry } | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Live IST 5:00 PM Timing Engine
  const [istCountdown, setIstCountdown] = useState<{
    isBeforeCutoff: boolean;
    label: string;
  }>({ isBeforeCutoff: false, label: '' });

  const lastRefetchedDate = useRef<string>('');

  useEffect(() => {
    const checkCutoff = () => {
      const now = new Date();
      const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istDate = new Date(istStr);
      const istHour = istDate.getHours();
      const istMinute = istDate.getMinutes();
      const todayDateStr = istDate.toISOString().split('T')[0];

      if (istHour < 17) {
        const totalMinsLeft = (16 - istHour) * 60 + (59 - istMinute);
        const hrs = Math.floor(totalMinsLeft / 60);
        const mins = totalMinsLeft % 60;
        const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        setIstCountdown({ isBeforeCutoff: true, label });
      } else {
        setIstCountdown({ isBeforeCutoff: false, label: 'Cutoff reached' });
        if (lastRefetchedDate.current !== todayDateStr) {
          lastRefetchedDate.current = todayDateStr;
          refetch();
        }
      }
    };

    checkCutoff();
    const interval = setInterval(checkCutoff, 20000);
    return () => clearInterval(interval);
  }, [refetch]);

  const generateSlipText = (tx: any, dayEntry?: SingleSheetDayEntry) => {
    const workerName = data?.data?.worker?.name || 'Worker';
    const period = tx.periodCovered
      ? `${new Date(tx.periodCovered.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(tx.periodCovered.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : dayEntry?.date || new Date().toISOString().split('T')[0];
    const itemized = tx.itemizedSummary || {};

    return [
      `*Momzz Garage • Salary Slip*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Worker:* ${workerName}`,
      `📅 *Period:* ${period}`,
      itemized.totalWorkingDays !== undefined ? `⚙️ *Days Worked:* ${itemized.totalWorkingDays}` : null,
      itemized.totalOtHours ? `⏱️ *Overtime:* ${itemized.totalOtHours}h (₹${itemized.totalOtAmount || 0})` : null,
      itemized.totalAdvancesDeducted ? `🔻 *Advances Deducted:* ₹${Number(itemized.totalAdvancesDeducted).toLocaleString('en-IN')}` : null,
      itemized.totalIncentives ? `⭐ *Incentives:* +₹${Number(itemized.totalIncentives).toLocaleString('en-IN')}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Paid Amount:* ₹${Number(tx.amount || 0).toLocaleString('en-IN')} via ${tx.paymentMethod || 'Cash'}`,
      tx.referenceNote ? `📝 *Ref:* ${tx.referenceNote}` : null,
      tx.carriedForwardBalance ? `⚠️ *Overhang Carried Forward:* ₹${Number(tx.carriedForwardBalance).toLocaleString('en-IN')}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Momzz Garage Management System_`,
    ].filter(Boolean).join('\n');
  };

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
  const monthlyBreakdown = data?.data?.monthlyBreakdown || [];

  // Month filter state ('ALL' or 'YYYY-MM')
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Progressive Infinite Scroll state
  const [visibleLimit, setVisibleLimit] = useState<number>(30);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter days by month if selected
  const filteredDays = useMemo(() => {
    if (selectedMonth === 'ALL') return days;
    return days.filter((d) => d.date.startsWith(selectedMonth));
  }, [days, selectedMonth]);

  // Progressive items to render
  const visibleDays = useMemo(() => {
    return filteredDays.slice(0, visibleLimit);
  }, [filteredDays, visibleLimit]);

  // Group visible days by Month-Year for continuous sticky sectioning
  const groupedDays = useMemo(() => {
    const groups: { [key: string]: SingleSheetDayEntry[] } = {};
    visibleDays.forEach((day) => {
      const d = new Date(`${day.date}T00:00:00`);
      const monthYear = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(day);
    });
    return groups;
  }, [visibleDays]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleLimit < filteredDays.length) {
          setVisibleLimit((prev) => Math.min(prev + 20, filteredDays.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [filteredDays.length, visibleLimit]);

  const handleSelectMonth = (mKey: string) => {
    setSelectedMonth(mKey);
    setVisibleLimit(30);
  };

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

  // Handle Incentive Submit (Admin only)
  const handleIncentiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !incentiveAmount || Number(incentiveAmount) <= 0 || !incentiveNotes.trim()) return;

    try {
      await recordIncentive({
        workerId: worker.id,
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

  // Handle Edit Leave Submit
  const handleEditLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdjustmentId) return;

    try {
      await updateLeave({
        id: editingAdjustmentId,
        type: editingLeaveType,
        date: editingLeaveDate,
        note: editingLeaveNote,
      }).unwrap();

      setShowEditLeaveModal(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update leave');
    }
  };

  // Handle Delete Leave
  const handleDeleteLeave = async () => {
    if (!editingAdjustmentId) return;
    if (!confirm('Are you sure you want to remove this leave record? The worker will be marked present for this day.')) return;

    try {
      await deleteLeave(editingAdjustmentId).unwrap();
      setShowEditLeaveModal(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to remove leave');
    }
  };

  // Handle Edit OT Claim Submit
  const handleEditOtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOtClaimId || editingOtHours < 1) return;

    try {
      await updateOtClaim({
        id: editingOtClaimId,
        otHours: Math.floor(editingOtHours),
        date: editingOtDate,
        note: editingOtNote,
        status: isAdmin ? editingOtStatus : undefined,
      }).unwrap();

      setShowEditOtModal(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update overtime claim');
    }
  };

  // Handle Delete OT Claim
  const handleDeleteOtClaim = async (claimId?: string) => {
    const targetId = claimId || editingOtClaimId;
    if (!targetId) return;
    if (!confirm('Are you sure you want to cancel this overtime claim?')) return;

    try {
      await deleteOtClaim(targetId).unwrap();
      setShowEditOtModal(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to cancel overtime claim');
    }
  };

  // Handle Delete Wage Transaction (Advance or Incentive)
  const handleDeleteTransaction = async (id: string, type: string, amount: number) => {
    const label = type === 'INCENTIVE' ? 'incentive' : 'cash advance';
    if (!confirm(`Are you sure you want to remove this ${label} of ${formatCurrency(amount)}?`)) return;

    try {
      await deleteTransaction(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || `Failed to delete ${label}`);
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
          backTo={isAdmin ? "/payroll" : "/dashboard"}
          title={worker?.name || (!isAdmin ? user?.name : undefined) || 'Worker Ledger'}
          description="Continuous single-sheet financial ledger"
          icon={
            (worker?.profileImageUrl || (!isAdmin ? user?.profileImageUrl : undefined)) ? (
              <img
                src={worker?.profileImageUrl || (!isAdmin ? user?.profileImageUrl : undefined)}
                alt={worker?.name || user?.name || 'Worker'}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                {(worker?.name || user?.name || 'W')?.charAt(0)?.toUpperCase()}
              </div>
            )
          }
          badge={
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold font-mono">
                {((worker?.dailyWage !== undefined ? worker.dailyWage : user?.dailyWage) || 0) > 0
                  ? `₹${(worker?.dailyWage !== undefined ? worker.dailyWage : user?.dailyWage)}/day`
                  : 'Wage Not Decided'}
              </span>
              {(worker?.firstPayrollDate || data?.data?.firstPayrollDate) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold font-mono">
                  From {worker?.firstPayrollDate || data?.data?.firstPayrollDate}
                </span>
              )}
            </div>
          }
          actions={
            <div className="hidden sm:flex items-center gap-2">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Advance</span>
                  </button>
                  <button
                    onClick={() => {
                      setIncentiveAmount('');
                      setIncentiveNotes('');
                      setShowIncentiveModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition active:scale-95"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-500" />
                    <span>Incentive</span>
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

        {/* Wage Not Decided Warning */}
        {(!data?.data?.hasWageAssigned && ((worker?.dailyWage || user?.dailyWage || 0) === 0)) && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-800 dark:text-amber-200 animate-fadeIn">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Wage Not Yet Decided</h4>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">
                {isAdmin
                  ? 'This worker does not have an active daily wage configured yet. Daily attendance, shift accruals, and overtime tracking will strictly begin from the date you decide their wage in the Payroll Dashboard.'
                  : 'Your daily wage has not been decided yet. Your salary, shift accruals, and overtime tracking will start accumulating from your wage decision date once assigned by management.'}
              </p>
            </div>
          </div>
        )}

        {/* ── HERO DUES CARD ── */}
        <div className="p-4 sm:p-5 rounded-2xl glass-modern-card border-amber-500/30 space-y-3 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase text-slate-500 dark:text-slate-400 block font-semibold">
                  Unsettled Payable Dues
                </span>
                {kpis.netPayable === 0 ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    <span>All Dues Settled</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <span>Active Dues</span>
                  </span>
                )}
                {istCountdown.isBeforeCutoff && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                    <Clock className="w-2.5 h-2.5 animate-pulse text-sky-500" />
                    <span>Shift active (accrues in {istCountdown.label})</span>
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-4xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(kpis.netPayable)}
              </p>
            </div>

            {/* Single button on mobile devices */}
            <div className="sm:hidden">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowMobileActionSheet(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 active:scale-95 transition shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Actions</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOtModal(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 active:scale-95 transition shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Claim OT</span>
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
            {kpis.totalUnsettledIncentives && kpis.totalUnsettledIncentives > 0 ? (
              <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                <Gift className="w-3.5 h-3.5" />
                <span>Includes {formatCurrency(kpis.totalUnsettledIncentives)} in Special Incentives</span>
              </div>
            ) : null}
            {kpis.totalAllowedLeaves && kpis.totalAllowedLeaves > 0 ? (
              <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  Includes {kpis.totalAllowedLeaves} Monthly Allowed Leave{kpis.totalAllowedLeaves > 1 ? 's' : ''} (100% Paid • ₹0 penalty)
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Advance Overhang Alert */}
        {kpis.advanceOverhang && kpis.advanceOverhang > 0 ? (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-xs">Advance Overhang Carried Forward</span>
              <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">
                Cash advance taken exceeds accrued earnings by <strong className="font-mono text-rose-600 dark:text-rose-400">-{formatCurrency(kpis.advanceOverhang)}</strong>. This balance carries forward into the next work cycle before new wages accumulate.
              </p>
            </div>
          </div>
        ) : null}

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

        {/* ── MONTHLY BREAKDOWN CAROUSEL / SPLIT-UP ── */}
        {monthlyBreakdown.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Monthly Earnings Split-Up</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {monthlyBreakdown.length} months recorded
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
              {monthlyBreakdown.map((m) => {
                const isSelected = selectedMonth === m.monthKey;
                return (
                  <button
                    key={m.monthKey}
                    onClick={() => handleSelectMonth(isSelected ? 'ALL' : m.monthKey)}
                    className={`snap-start shrink-0 w-64 p-3 rounded-2xl glass-modern-card text-left transition-all active:scale-[0.98] border ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                        : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {m.monthLabel}
                      </span>
                      {m.isSettled ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                          Settled
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      {formatCurrency(m.netEarnings)}
                    </p>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <div>Days: <span className="font-semibold text-slate-800 dark:text-slate-200">{m.workingDays}d</span></div>
                      <div>OT: <span className="font-semibold text-emerald-600">+{formatCurrency(m.otAmount)}</span></div>
                      <div>Leaves: <span className="font-semibold text-amber-600">-{formatCurrency(m.leaveDeductions)}</span></div>
                      <div>Adv: <span className="font-semibold text-rose-600">-{formatCurrency(m.advances)}</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CONTINUOUS SINGLE-SHEET STREAM & FILTERS ── */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">
                Daily Transaction Stream
              </h2>
            </div>

            {/* Month Filter Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleSelectMonth('ALL')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition whitespace-nowrap ${
                  selectedMonth === 'ALL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Months ({days.length})
              </button>
              {monthlyBreakdown.map((m) => (
                <button
                  key={m.monthKey}
                  onClick={() => handleSelectMonth(m.monthKey)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono transition whitespace-nowrap ${
                    selectedMonth === m.monthKey
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {m.monthLabel.split(' ')[0]} ({m.totalDays})
                </button>
              ))}
            </div>
          </div>

          {filteredDays.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 glass-modern-card rounded-2xl space-y-1">
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                {!data?.data?.hasWageAssigned && ((worker?.dailyWage || user?.dailyWage || 0) === 0)
                  ? 'No payroll entries recorded'
                  : 'No daily entries recorded for this view.'}
              </p>
              {!data?.data?.hasWageAssigned && ((worker?.dailyWage || user?.dailyWage || 0) === 0) && (
                <p className="text-[11px] text-slate-400">
                  Payroll calculation and ledger history will begin on the date this worker's daily wage is decided.
                </p>
              )}
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
                    const isInProgress = day.shiftStatus === 'IN_PROGRESS';

                    return (
                      <div
                        key={day.date}
                        className={`p-3 rounded-xl glass-modern-card space-y-2 transition ${
                          isSun
                            ? 'opacity-65'
                            : isLeave
                            ? day.isAllowedLeave
                              ? 'border-l-4 border-emerald-500 bg-emerald-500/[0.03]'
                              : 'border-l-4 border-amber-500'
                            : isHol
                            ? 'border-l-4 border-purple-500'
                            : isInProgress
                            ? 'border-l-4 border-sky-500'
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
                                <div className="flex flex-col gap-0.5">
                                  {day.isAllowedLeave ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                                      <span>Allowed Leave (Paid • ₹0 penalty)</span>
                                      {isAdmin && !day.isSettled && day.adjustmentId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingAdjustmentId(day.adjustmentId!);
                                            setEditingLeaveDate(day.date);
                                            setEditingLeaveType(day.dayType as 'FULL_LEAVE' | 'HALF_LEAVE');
                                            setEditingLeaveNote(day.adjustmentNote || '');
                                            setShowEditLeaveModal(true);
                                          }}
                                          title="Edit or Remove Leave"
                                          className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                      <span>{day.dayType === 'FULL_LEAVE' ? 'Full Leave' : 'Half Day'} (-₹{day.leaveDeduction})</span>
                                      {isAdmin && !day.isSettled && day.adjustmentId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingAdjustmentId(day.adjustmentId!);
                                            setEditingLeaveDate(day.date);
                                            setEditingLeaveType(day.dayType as 'FULL_LEAVE' | 'HALF_LEAVE');
                                            setEditingLeaveNote(day.adjustmentNote || '');
                                            setShowEditLeaveModal(true);
                                          }}
                                          title="Edit or Remove Leave"
                                          className="p-0.5 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </span>
                                  )}
                                  {day.leaveLastEditedAt && (
                                    <span className="text-[9px] text-amber-600/90 dark:text-amber-400/90 font-medium pl-0.5">
                                      Edited by {day.leaveUpdatedByName || 'Admin'}
                                    </span>
                                  )}
                                </div>
                              ) : isInProgress ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 animate-pulse text-sky-500" />
                                  <span>Shift In Progress (accrues 5 PM)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                  Present (+₹{day.baseWage})
                                </span>
                              )}

                              {/* Overtime chip if present */}
                              {day.otHours > 0 && (
                                <div className="flex flex-col gap-0.5">
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
                                    {!day.isSettled && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingOtClaimId(day.otClaimId || day.adjustmentId || '');
                                          setEditingOtDate(day.date);
                                          setEditingOtHours(day.otHours);
                                          setEditingOtNote(day.otClaimNote || day.adjustmentNote || '');
                                          setEditingOtStatus(day.otStatus || 'PENDING');
                                          setShowEditOtModal(true);
                                        }}
                                        title="Edit Overtime Claim"
                                        className="p-0.5 ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </span>
                                  {day.otFlaggedReason === 'CLAIMED_ON_FULL_LEAVE' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                      ⚠️ Claimed on Full Leave Day
                                    </span>
                                  )}
                                  {day.otLastEditedAt && (
                                    <span className="text-[9px] text-amber-600/90 dark:text-amber-400/90 font-medium pl-0.5">
                                      Edited by {day.otUpdatedByName || 'Admin'}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Settled Badge */}
                              {day.isSettled && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Settled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Day Earnings & Running Balance */}
                          <div className="text-right shrink-0 font-mono">
                            <span
                              className={`text-xs font-bold block ${
                                isInProgress
                                  ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                  : day.netDailyPay > 0
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              {isInProgress ? '₹0 (shift active)' : `+${formatCurrency(day.netDailyPay)}`}
                            </span>
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold block">
                              bal {formatCurrency(day.runningCumulativeBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Note if any */}
                        {(day.adjustmentNote || day.shiftNote) && (
                          <p className="text-[10px] text-slate-400 italic pl-10">
                            Note: {day.shiftNote || day.adjustmentNote}
                          </p>
                        )}

                        {/* Inline Transactions (Advances / Incentives / Settlements) */}
                        {day.inlineTransactions && day.inlineTransactions.length > 0 && (
                          <div className="pl-10 space-y-1">
                            {day.inlineTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                                  tx.type === 'PAYOUT_SETTLEMENT'
                                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20'
                                    : tx.type === 'INCENTIVE'
                                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25'
                                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-500/20'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {tx.type === 'PAYOUT_SETTLEMENT' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : tx.type === 'INCENTIVE' ? (
                                    <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  ) : (
                                    <Banknote className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <span className="font-bold text-[11px] truncate">
                                    {tx.type === 'PAYOUT_SETTLEMENT'
                                      ? 'Settlement Paid'
                                      : tx.type === 'INCENTIVE'
                                      ? `Incentive: ${tx.notes || 'Performance Incentive'}`
                                      : 'Cash Advance Taken'}
                                  </span>
                                  {tx.paymentMethod && tx.type !== 'INCENTIVE' && (
                                    <span className="text-[10px] opacity-75">
                                      ({tx.paymentMethod})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`font-mono font-bold text-xs ${tx.type === 'INCENTIVE' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                    {tx.type === 'INCENTIVE' ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                                  </span>
                                  {tx.type === 'PAYOUT_SETTLEMENT' && (
                                    <button
                                      type="button"
                                      onClick={() => setShareSettlement({ tx, day })}
                                      title="Share Salary Slip via WhatsApp"
                                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition shadow-2xs"
                                    >
                                      <Share2 className="w-3 h-3" />
                                      <span>Share Slip</span>
                                    </button>
                                  )}
                                  {isAdmin && !day.isSettled && tx.type !== 'PAYOUT_SETTLEMENT' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransaction(tx.id, tx.type, tx.amount)}
                                      title={`Delete ${tx.type === 'INCENTIVE' ? 'Incentive' : 'Advance'}`}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
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
            ))
          )}

          {/* ── INFINITE SCROLL SENTINEL & LOAD MORE ── */}
          {filteredDays.length > 0 && (
            <div className="pt-2 pb-4 text-center">
              {visibleLimit < filteredDays.length ? (
                <div ref={observerTarget} className="space-y-2">
                  <button
                    onClick={() => setVisibleLimit((prev) => Math.min(prev + 25, filteredDays.length))}
                    className="px-4 py-2 text-xs font-bold font-mono rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition active:scale-95"
                  >
                    Load More Days ({filteredDays.length - visibleLimit} remaining)
                  </button>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Showing {visibleDays.length} of {filteredDays.length} days • Scroll down to auto-load
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-mono">
                  ✓ All {filteredDays.length} days loaded in ledger stream
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── MODAL: MOBILE QUICK ACTIONS SHEET ── */}
      {showMobileActionSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn sm:hidden">
          <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 mx-1 rounded-3xl p-4 space-y-3 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">
                Quick Actions • {worker?.name}
              </span>
              <button
                onClick={() => setShowMobileActionSheet(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setSettleAmount(kpis.netPayable);
                  setShowSettleModal(true);
                }}
                className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex flex-col items-center gap-1.5 active:scale-95 transition"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-bold">Settle Dues</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setIncentiveAmount('');
                  setIncentiveNotes('');
                  setShowIncentiveModal(true);
                }}
                className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex flex-col items-center gap-1.5 active:scale-95 transition"
              >
                <Gift className="w-5 h-5" />
                <span className="text-xs font-bold">Incentive</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowAdvanceModal(true);
                }}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition"
              >
                <Banknote className="w-5 h-5 text-rose-500" />
                <span className="text-xs font-bold">Advance</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowOtModal(true);
                }}
                className="p-3 rounded-2xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-600/20 flex flex-col items-center gap-1.5 active:scale-95 transition"
              >
                <Zap className="w-5 h-5" />
                <span className="text-xs font-bold">Claim OT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: WORKER CLAIM OVERTIME (Responsive Bottom-Sheet) ── */}
      {showOtModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
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
                {(() => {
                  const dayForDate = days.find((d) => d.date === otDate);
                  if (dayForDate?.dayType === 'FULL_LEAVE') {
                    return (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-200 text-xs space-y-1 animate-fadeIn">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Full Leave Day Warning</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          You are marked on <strong>Full Leave</strong> on this date. Claiming OT on a full leave day requires admin clearance and will be flagged as "Claimed on Full Leave Day" in the admin review queue.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
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

      {/* ── MODAL 4: ADMIN AWARD INCENTIVE ── */}
      {showIncentiveModal && worker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" />
                  Award Staff Incentive
                </h3>
                <p className="text-xs text-slate-400">Worker: {worker.name}</p>
              </div>
              <button
                onClick={() => setShowIncentiveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
              Incentives directly increase the worker&apos;s payable balance and reflect on the continuous ledger with admin remarks.
            </div>

            <form onSubmit={handleIncentiveSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Incentive Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500"
                  value={incentiveAmount}
                  onChange={(e) => setIncentiveAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Award Date
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
                  placeholder="e.g. Festival bonus, exceptional vehicle overhaul..."
                  value={incentiveNotes}
                  onChange={(e) => setIncentiveNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
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
                  {isRecordingIncentive ? 'Awarding...' : 'Award Incentive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: EDIT OR REMOVE LEAVE ── */}
      {showEditLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  Edit or Remove Leave
                </h3>
                <p className="text-xs text-slate-400">Date: {editingLeaveDate}</p>
              </div>
              <button
                onClick={() => setShowEditLeaveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {days.find((d) => d.date === editingLeaveDate)?.isAllowedLeave && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-fadeIn">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>This leave is the <strong>1 Allowed Paid Leave</strong> of this month (₹0 deduction).</span>
              </div>
            )}

            <form onSubmit={handleEditLeaveSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Leave Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLeaveType('FULL_LEAVE')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                      editingLeaveType === 'FULL_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Full Leave (100% Floor)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLeaveType('HALF_LEAVE')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                      editingLeaveType === 'HALF_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Half Day (50% Floor)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Leave Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal emergency, doctor appointment..."
                  value={editingLeaveNote}
                  onChange={(e) => setEditingLeaveNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleDeleteLeave}
                  disabled={isDeletingLeave}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingLeave ? 'Removing...' : 'Delete Leave (Mark Present)'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditLeaveModal(false)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingLeave}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                  >
                    {isUpdatingLeave ? 'Saving...' : 'Update Leave'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: EDIT OR REMOVE OT CLAIM ── */}
      {showEditOtModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Edit Overtime Claim
                </h3>
                <p className="text-xs text-slate-400">Date: {editingOtDate}</p>
              </div>
              <button
                onClick={() => setShowEditOtModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditOtSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Whole Hours
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setEditingOtHours(hr)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        editingOtHours === hr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hr}h (+₹{hr * 150})
                    </button>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Status (Admin)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditingOtStatus(st)}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition capitalize ${
                          editingOtStatus === st
                            ? st === 'APPROVED'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : st === 'REJECTED'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-amber-600 text-white border-amber-600'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {st.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason / Work Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engine disassembly..."
                  value={editingOtNote}
                  onChange={(e) => setEditingOtNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleDeleteOtClaim()}
                  disabled={isDeletingOt}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingOt ? 'Cancelling...' : 'Cancel Claim'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditOtModal(false)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingOt}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                  >
                    {isUpdatingOt ? 'Saving...' : 'Update Claim'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 7: SHARE SETTLEMENT PAY SLIP ── */}
      {shareSettlement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-6 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-500" />
                  Share Pay Slip Voucher
                </h3>
                <p className="text-[11px] text-slate-400">1-Click WhatsApp & Clipboard Export</p>
              </div>
              <button
                onClick={() => {
                  setShareSettlement(null);
                  setCopiedSlip(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Preview Box */}
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-xs whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed max-h-64 overflow-y-auto">
              {generateSlipText(shareSettlement.tx, shareSettlement.day)}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const text = generateSlipText(shareSettlement.tx, shareSettlement.day);
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = generateSlipText(shareSettlement.tx, shareSettlement.day);
                    navigator.clipboard.writeText(text);
                    setCopiedSlip(true);
                    setTimeout(() => setCopiedSlip(false), 3000);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center gap-1.5 transition"
                >
                  {copiedSlip ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
