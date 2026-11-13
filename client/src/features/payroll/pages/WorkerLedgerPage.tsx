import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Wallet,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  CreditCard,
  X,
  Banknote,
  Zap,
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
  FileText,
  UserCheck,
  UserX,
  Plus,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { ModernInfiniteLoader } from '../../../shared/components/common/ModernInfiniteLoader';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { useAuth } from '../../../shared/hooks/useAuth';
import { SettlementHistoryBriefs } from '../components/SettlementHistoryBriefs';
import { OvertimeTrackerConsole } from '../components/OvertimeTrackerConsole';
import { MonthlyPaySlipModal } from '../components/MonthlyPaySlipModal';
import {
  useGetWorkerSingleSheetQuery,
  useGetMySingleSheetQuery,
  useMarkBatchLeaveMutation,
  useClaimOvertimeMutation,
  useUpdateOtStatusMutation,
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
  IOtClaimItem,
} from '../api/payrollApi';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
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
  const [markBatchLeave, { isLoading: isMarkingLeave }] = useMarkBatchLeaveMutation();
  const [claimOvertime, { isLoading: isClaimingOt }] = useClaimOvertimeMutation();
  const [updateOtStatus, { isLoading: isUpdatingOtStatus }] = useUpdateOtStatusMutation();
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
  const [showPaySlipModal, setShowPaySlipModal] = useState(false);
  const [paySlipTargetMonth, setPaySlipTargetMonth] = useState<MonthlyBreakdownItem | null>(null);

  // Day Quick Mark state
  const [quickMarkDate, setQuickMarkDate] = useState<string | null>(null);
  const [quickLeaveNote, setQuickLeaveNote] = useState('');
  const [quickOtHours, setQuickOtHours] = useState<number>(1);
  const [quickOtNote, setQuickOtNote] = useState('');
  const [quickTxType, setQuickTxType] = useState<'ADVANCE' | 'INCENTIVE'>('ADVANCE');
  const [quickTxAmount, setQuickTxAmount] = useState<number | ''>('');
  const [quickTxNote, setQuickTxNote] = useState('');

  // Active view tab in ledger
  const [ledgerTab, setLedgerTab] = useState<'STREAM' | 'BRIEFS' | 'OT_TRACKER'>('STREAM');

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
  const settlements = data?.data?.settlements || [];
  const lastSettlementBrief = data?.data?.lastSettlementBrief;

  // Overtime claims list with itemized audit info
  const derivedOtClaims: IOtClaimItem[] = useMemo(() => {
    if (data?.data?.otClaims && data.data.otClaims.length > 0) {
      return data.data.otClaims;
    }
    const list: IOtClaimItem[] = [];
    for (const d of days) {
      if (d.otHours > 0 || d.otClaimId) {
        list.push({
          id: d.otClaimId || d.adjustmentId || `${d.date}-ot`,
          workerId: worker?.id || (!isAdmin ? (user as any)?._id || (user as any)?.id : '') || '',
          workerName: worker?.name || (!isAdmin ? (user as any)?.name : 'Worker') || 'Worker',
          workerMobile: worker?.mobile || (!isAdmin ? (user as any)?.mobile : '') || '',
          workerProfileImageUrl: worker?.profileImageUrl || (!isAdmin ? (user as any)?.profileImageUrl : undefined),
          dailyWage: worker?.dailyWage || (!isAdmin ? (user as any)?.dailyWage : 0) || 0,
          date: d.date,
          otHours: d.otHours,
          amount: d.otAmount || d.otHours * 150,
          status: d.otStatus || 'PENDING',
          note: d.otClaimNote || d.adjustmentNote || '',
          rejectionReason: d.otRejectionReason || '',
          reviewerName: d.otReviewedByName || '',
          reviewedAt: d.otReviewedAt,
          flaggedReason: d.otFlaggedReason,
          updatedByName: d.otUpdatedByName,
          lastEditedAt: d.otLastEditedAt,
          isSettled: d.isSettled,
        });
      }
    }
    return list;
  }, [data?.data?.otClaims, days, worker, user, isAdmin]);

  const pendingOtCount = useMemo(() => {
    return derivedOtClaims.filter((c) => c.status === 'PENDING').length;
  }, [derivedOtClaims]);

  // Month filter state ('ALL' or 'YYYY-MM')
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  useEffect(() => {
    if (monthlyBreakdown.length > 0 && selectedMonth === 'ALL') {
      setSelectedMonth(monthlyBreakdown[0].monthKey);
    }
  }, [monthlyBreakdown]);

  const activeMonthItem = useMemo(() => {
    if (selectedMonth === 'ALL') return monthlyBreakdown[0] || null;
    return monthlyBreakdown.find((m) => m.monthKey === selectedMonth) || null;
  }, [monthlyBreakdown, selectedMonth]);

  // Progressive Infinite Scroll state
  const [visibleLimit, setVisibleLimit] = useState<number>(30);
  const [isLoadingMoreDays, setIsLoadingMoreDays] = useState<boolean>(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const quickMarkDay = useMemo(
    () => (quickMarkDate ? days.find((d) => d.date === quickMarkDate) || null : null),
    [days, quickMarkDate]
  );

  const quickMarkOtClaim = useMemo(
    () => (quickMarkDate ? derivedOtClaims.find((c) => c.date === quickMarkDate) || null : null),
    [derivedOtClaims, quickMarkDate]
  );

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
        if (entries[0]?.isIntersecting && visibleLimit < filteredDays.length && !isLoadingMoreDays) {
          setIsLoadingMoreDays(true);
          setTimeout(() => {
            setVisibleLimit((prev) => Math.min(prev + 20, filteredDays.length));
            setIsLoadingMoreDays(false);
          }, 120);
        }
      },
      { rootMargin: '120px' }
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
  }, [filteredDays.length, visibleLimit, isLoadingMoreDays]);

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
        workerId: isAdmin && worker?.id ? worker.id : undefined,
        date: otDate,
        otHours: Math.floor(otHours),
        note: otNote,
        autoApprove: isAdmin && !!worker?.id,
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
    const label = type === 'INCENTIVE' ? 'incentive' : 'advance';
    if (!confirm(`Remove ${label} of ${formatCurrency(amount)}?`)) return;

    try {
      await deleteTransaction(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || `Failed to delete ${label}`);
    }
  };

  const openQuickMark = (day: SingleSheetDayEntry) => {
    setQuickMarkDate(day.date);
    setQuickLeaveNote(day.adjustmentNote || '');
    setQuickOtHours(day.otHours > 0 ? day.otHours : 1);
    setQuickOtNote(day.otClaimNote || '');
    setQuickTxType('ADVANCE');
    setQuickTxAmount('');
    setQuickTxNote('');
  };

  const handleQuickAttendance = async (target: 'PRESENT' | 'HALF_LEAVE' | 'FULL_LEAVE') => {
    if (!quickMarkDay || !worker || !isAdmin || quickMarkDay.isSettled) return;
    try {
      if (target === 'PRESENT') {
        if (quickMarkDay.adjustmentId) {
          await deleteLeave(quickMarkDay.adjustmentId).unwrap();
          refetch();
        }
        return;
      }
      if (quickMarkDay.adjustmentId) {
        await updateLeave({
          id: quickMarkDay.adjustmentId,
          type: target,
          date: quickMarkDay.date,
          note: quickLeaveNote.trim() || undefined,
        }).unwrap();
      } else {
        await markBatchLeave({
          workerIds: [worker.id],
          dates: [quickMarkDay.date],
          type: target,
          note: quickLeaveNote.trim() || undefined,
        }).unwrap();
      }
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update attendance');
    }
  };

  const handleQuickOtSave = async () => {
    if (!quickMarkDay || quickOtHours < 1) return;
    const claimId = quickMarkDay.otClaimId || quickMarkOtClaim?.id;
    try {
      if (claimId) {
        await updateOtClaim({
          id: claimId,
          otHours: Math.floor(quickOtHours),
          date: quickMarkDay.date,
          note: quickOtNote.trim() || undefined,
          status: isAdmin ? 'APPROVED' : undefined,
        }).unwrap();
      } else {
        await claimOvertime({
          workerId: isAdmin && worker?.id ? worker.id : undefined,
          date: quickMarkDay.date,
          otHours: Math.floor(quickOtHours),
          note: quickOtNote.trim() || undefined,
          autoApprove: isAdmin && !!worker?.id,
        }).unwrap();
      }
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to save overtime');
    }
  };

  const handleQuickOtDecision = async (claimId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateOtStatus({ id: claimId, status }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update overtime status');
    }
  };

  const handleQuickTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMarkDay || !worker || !quickTxAmount || Number(quickTxAmount) <= 0) return;
    try {
      if (quickTxType === 'ADVANCE') {
        await recordAdvance({
          workerId: worker.id,
          amount: Number(quickTxAmount),
          date: quickMarkDay.date,
          notes: quickTxNote.trim() || undefined,
        }).unwrap();
      } else {
        await recordIncentive({
          workerId: worker.id,
          amount: Number(quickTxAmount),
          date: quickMarkDay.date,
          notes: quickTxNote.trim() || 'Day incentive',
        }).unwrap();
      }
      setQuickTxAmount('');
      setQuickTxNote('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record entry');
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
          description="Payroll & daily ledger"
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
                type="button"
                onClick={() => {
                  setPaySlipTargetMonth(activeMonthItem || monthlyBreakdown[0] || null);
                  setShowPaySlipModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Pay Slip</span>
              </button>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs transition active:scale-95"
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

        {/* Wage Not Decided Badge */}
        {(!data?.data?.hasWageAssigned && ((worker?.dailyWage || user?.dailyWage || 0) === 0)) && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 animate-fadeIn">
            <span className="font-bold">Wage not set</span>
            <span className="text-[11px] opacity-80">Set daily wage in Payroll to accrue</span>
          </div>
        )}

        {/* ── TOP HERO SUMMARY BAR ── */}
        <div className="p-4 sm:p-5 rounded-2xl glass-modern-card border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
                  Net Unsettled Dues
                </span>
                {kpis.netPayable === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    <span>Settled</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <span>Due</span>
                  </span>
                )}
                {istCountdown.isBeforeCutoff && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                    <Clock className="w-2.5 h-2.5 animate-pulse text-sky-500" />
                    <span>{istCountdown.label}</span>
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(kpis.netPayable)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPaySlipTargetMonth(activeMonthItem || monthlyBreakdown[0] || null);
                setShowPaySlipModal(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 active:scale-95 transition shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Pay Slip</span>
            </button>

            {isAdmin && kpis.netPayable > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSettleAmount(kpis.netPayable);
                  setShowSettleModal(true);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 flex items-center gap-1.5 active:scale-95 transition shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Settle Dues</span>
              </button>
            )}

            <div className="sm:hidden">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowMobileActionSheet(true)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 active:scale-95 transition"
                >
                  <Sparkles className="w-4 h-4" />
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
        </div>

        {/* Advance Overhang Chip */}
        {kpis.advanceOverhang && kpis.advanceOverhang > 0 ? (
          <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
            <span className="font-bold">Advance Carried Forward</span>
            <span className="font-mono font-bold">-{formatCurrency(kpis.advanceOverhang)}</span>
          </div>
        ) : null}

        {/* ── MONTHLY BREAKDOWN & MONTH SELECTION (DAILY WAGE BASIS) ── */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider font-mono text-slate-600 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Monthly Breakdown</span>
            </div>
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md bg-amber-500/10">
              Daily Wage: ₹{worker?.dailyWage !== undefined ? worker.dailyWage : user?.dailyWage || 0}/day
            </span>
          </div>

          {/* Amazon-style Scrollable Month Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            <button
              type="button"
              onClick={() => handleSelectMonth('ALL')}
              className={`snap-start px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition whitespace-nowrap ${
                selectedMonth === 'ALL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'
              }`}
            >
              All Months
            </button>
            {monthlyBreakdown.map((m) => {
              const isSelected = selectedMonth === m.monthKey;
              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => handleSelectMonth(m.monthKey)}
                  className={`snap-start px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'
                  }`}
                >
                  <span>{m.monthLabel.split(' ')[0]}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected
                        ? 'bg-black/20 text-white'
                        : m.isSettled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {m.isSettled ? 'Paid' : 'Due'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Month Concise Summary Strip */}
          {activeMonthItem && (
            <div className="p-3.5 sm:p-4 rounded-2xl glass-modern-card border border-slate-200/80 dark:border-white/10 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {activeMonthItem.monthLabel}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10">
                    ₹{worker?.dailyWage !== undefined ? worker.dailyWage : user?.dailyWage || 0}/day
                  </span>
                  {activeMonthItem.isSettled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      Settled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      Active
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPaySlipTargetMonth(activeMonthItem);
                    setShowPaySlipModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send Pay Slip</span>
                </button>
              </div>

              {/* Month Compact Numbers Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono pt-2 border-t border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Days Present</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {activeMonthItem.workingDays} days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Base Wages</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(activeMonthItem.grossWages)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Overtime</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(activeMonthItem.otAmount)} ({activeMonthItem.otHours}h)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Deductions</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    -{formatCurrency((activeMonthItem.leaveDeductions || 0) + (activeMonthItem.advances || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Month Net</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    {formatCurrency(activeMonthItem.netEarnings)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── WORKER LEDGER SECTION NAVIGATION TABS ── */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-none shadow-2xs">
          <button
            type="button"
            onClick={() => setLedgerTab('STREAM')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              ledgerTab === 'STREAM'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Continuous Ledger</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                ledgerTab === 'STREAM' ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-white/10'
              }`}
            >
              {days.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLedgerTab('BRIEFS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              ledgerTab === 'BRIEFS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Settlement Briefs</span>
            {settlements.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  ledgerTab === 'BRIEFS'
                    ? 'bg-black/20 text-white'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {settlements.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLedgerTab('OT_TRACKER')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              ledgerTab === 'OT_TRACKER'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Overtime Tracker</span>
            {pendingOtCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-white font-bold animate-pulse">
                {pendingOtCount}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 4: OVERTIME TRACKER CONSOLE ── */}
        {ledgerTab === 'OT_TRACKER' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">
                  Overtime Claims & Audit History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOtModal(true)}
                className="py-1 px-2.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 shadow-2xs transition active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Claim OT</span>
              </button>
            </div>

            <OvertimeTrackerConsole
              claims={derivedOtClaims}
              isAdmin={isAdmin}
              workerDailyWage={(worker?.dailyWage !== undefined ? worker.dailyWage : user?.dailyWage) || 0}
              onEditClaim={(claim) => {
                setEditingOtClaimId(claim.id);
                setEditingOtDate(claim.date);
                setEditingOtHours(claim.otHours);
                setEditingOtNote(claim.note || '');
                setEditingOtStatus(claim.status);
                setShowEditOtModal(true);
              }}
              onCancelClaim={async (claimId) => {
                if (!confirm('Are you sure you want to withdraw this overtime claim?')) return;
                try {
                  await deleteOtClaim(claimId).unwrap();
                  refetch();
                } catch (err: any) {
                  alert(err?.data?.message || 'Failed to cancel overtime claim');
                }
              }}
            />
          </section>
        )}

        {/* ── TAB 2: SETTLEMENT BRIEFS ARCHIVE ── */}
        {ledgerTab === 'BRIEFS' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">
                  Payment History & Settlement Briefs
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {settlements.length} settlement(s) archived
              </span>
            </div>

            <SettlementHistoryBriefs
              settlements={settlements}
              workerName={worker?.name || (!isAdmin ? user?.name : undefined) || 'Worker'}
            />
          </section>
        )}

        {/* ── TAB 1: CONTINUOUS SINGLE-SHEET STREAM & FILTERS ── */}
        {ledgerTab === 'STREAM' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300">
                  Daily Stream {selectedMonth !== 'ALL' ? `• ${activeMonthItem?.monthLabel || selectedMonth}` : '• All Months'}
                </h2>
                <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">
                  {filteredDays.length} days
                </span>
              </div>
              {isAdmin && (
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                  Tap day to mark
                </span>
              )}
            </div>

          {filteredDays.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 glass-modern-card rounded-2xl">
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                No entries recorded
              </p>
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
                        role="button"
                        tabIndex={0}
                        onClick={() => openQuickMark(day)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openQuickMark(day);
                          }
                        }}
                        className={`p-3 rounded-xl glass-modern-card space-y-2 transition cursor-pointer hover:border-amber-500/40 active:scale-[0.995] ${
                          isSun
                            ? 'opacity-70'
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
                                  Sunday
                                </span>
                              ) : isHol ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                                  {day.holidayTitle || 'Holiday'}
                                </span>
                              ) : isLeave ? (
                                <div className="flex flex-col gap-0.5">
                                  {day.isAllowedLeave ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                                      <span>Paid Leave</span>
                                      {isAdmin && !day.isSettled && day.adjustmentId && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
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
                                          onClick={(e) => {
                                            e.stopPropagation();
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
                                  <span>Active shift</span>
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
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                                      On Leave Day
                                    </span>
                                  )}
                                  {day.otLastEditedAt && (
                                    <span className="text-[9px] text-amber-600/90 dark:text-amber-400/90 font-medium pl-0.5">
                                      Edited by {day.otUpdatedByName || 'Admin'}
                                    </span>
                                  )}
                                  {day.otStatus === 'REJECTED' && (
                                    <span className="text-[9px] text-rose-600 dark:text-rose-400 font-medium pl-0.5">
                                      {day.otRejectionReason ? `${day.otRejectionReason}` : 'Rejected'}
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

                          {/* Right: Day Earnings & Running Balance + Quick chevron */}
                          <div className="flex items-center gap-1.5 shrink-0 font-mono">
                            <div className="text-right">
                              <span
                                className={`text-xs font-bold block ${
                                  isInProgress
                                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                    : day.netDailyPay > 0
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400'
                                }`}
                              >
                                {isInProgress ? '₹0' : `+${formatCurrency(day.netDailyPay)}`}
                              </span>
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold block">
                                bal {formatCurrency(day.runningCumulativeBalance)}
                              </span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400/70" />
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareSettlement({ tx, day });
                                      }}
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTransaction(tx.id, tx.type, tx.amount);
                                      }}
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

          {/* ── INFINITE SCROLL LOADER ── */}
          {filteredDays.length > 0 && (
            <ModernInfiniteLoader
              sentinelRef={observerTarget}
              hasMore={visibleLimit < filteredDays.length}
              isLoading={isLoadingMoreDays}
              totalCount={filteredDays.length}
              entityName="days"
            />
          )}
        </section>
      )}
      </main>

      {/* ── MODAL 0: DAY QUICK MARK SHEET ── */}
      {quickMarkDay && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setQuickMarkDate(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 mb-20 sm:mb-0 mx-1 sm:mx-0 rounded-3xl sm:rounded-2xl p-4 sm:p-5 max-h-[calc(85vh-5rem)] overflow-y-auto space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-500" />
                  <span>
                    {new Date(`${quickMarkDay.date}T00:00:00`).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Net +{formatCurrency(quickMarkDay.netDailyPay)}</span>
                  <span>&bull;</span>
                  <span>Bal {formatCurrency(quickMarkDay.runningCumulativeBalance)}</span>
                  {quickMarkDay.isSettled && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      Settled
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickMarkDate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickMarkDay.isSettled && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This day is settled and locked.
              </p>
            )}

            {/* Attendance Quick Mark (Admin, Unsettled, Working Day) */}
            {isAdmin && worker && !quickMarkDay.isSettled && quickMarkDay.dayType !== 'SUNDAY' && quickMarkDay.dayType !== 'HOLIDAY' && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block">
                  Attendance
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isMarkingLeave || isUpdatingLeave || isDeletingLeave}
                    onClick={() => handleQuickAttendance('PRESENT')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 ${
                      quickMarkDay.dayType === 'WORKING'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Present</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMarkingLeave || isUpdatingLeave || isDeletingLeave}
                    onClick={() => handleQuickAttendance('HALF_LEAVE')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 ${
                      quickMarkDay.dayType === 'HALF_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Half Day</span>
                  </button>
                  <button
                    type="button"
                    disabled={isMarkingLeave || isUpdatingLeave || isDeletingLeave}
                    onClick={() => handleQuickAttendance('FULL_LEAVE')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 ${
                      quickMarkDay.dayType === 'FULL_LEAVE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Full Leave</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Leave note (optional)"
                  value={quickLeaveNote}
                  onChange={(e) => setQuickLeaveNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {/* Overtime Quick Mark */}
            {!quickMarkDay.isSettled && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    Overtime (₹150/hr)
                  </span>
                  {quickMarkDay.otHours > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {quickMarkDay.otHours}h • {quickMarkDay.otStatus || 'PENDING'}
                    </span>
                  )}
                </div>

                {quickMarkDay.otHours > 0 && isAdmin && quickMarkDay.otStatus === 'PENDING' && (quickMarkDay.otClaimId || quickMarkOtClaim?.id) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isUpdatingOtStatus}
                      onClick={() => handleQuickOtDecision((quickMarkDay.otClaimId || quickMarkOtClaim?.id)!, 'APPROVED')}
                      className="py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95"
                    >
                      Approve OT
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingOtStatus}
                      onClick={() => handleQuickOtDecision((quickMarkDay.otClaimId || quickMarkOtClaim?.id)!, 'REJECTED')}
                      className="py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95"
                    >
                      Reject OT
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setQuickOtHours(hr)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        quickOtHours === hr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hr}h
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="OT note (optional)"
                    value={quickOtNote}
                    onChange={(e) => setQuickOtNote(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={isClaimingOt || isUpdatingOt}
                    onClick={handleQuickOtSave}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {quickMarkDay.otHours > 0 ? 'Update OT' : isAdmin ? 'Add OT' : 'Claim OT'}
                  </button>
                  {(quickMarkDay.otClaimId || quickMarkOtClaim?.id) && (
                    <button
                      type="button"
                      disabled={isDeletingOt}
                      onClick={() => handleDeleteOtClaim(quickMarkDay.otClaimId || quickMarkOtClaim?.id)}
                      title="Delete OT"
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Advance / Incentive for This Day (Admin only) */}
            {isAdmin && worker && !quickMarkDay.isSettled && (
              <form onSubmit={handleQuickTxSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    Day Entry
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5">
                    <button
                      type="button"
                      onClick={() => setQuickTxType('ADVANCE')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                        quickTxType === 'ADVANCE' ? 'bg-rose-600 text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTxType('INCENTIVE')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                        quickTxType === 'INCENTIVE' ? 'bg-amber-600 text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Incentive
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Amount ₹"
                    value={quickTxAmount}
                    onChange={(e) => setQuickTxAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-28 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder={quickTxType === 'INCENTIVE' ? 'Reason' : 'Note (optional)'}
                    value={quickTxNote}
                    onChange={(e) => setQuickTxNote(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isRecordingAdvance || isRecordingIncentive || !quickTxAmount}
                    className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1 active:scale-95 transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Existing Transactions on This Day */}
            {quickMarkDay.inlineTransactions && quickMarkDay.inlineTransactions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block">
                  Recorded Entries
                </span>
                {quickMarkDay.inlineTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-white/5 flex items-center justify-between text-xs gap-2"
                  >
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                      {tx.type === 'PAYOUT_SETTLEMENT'
                        ? 'Settlement'
                        : tx.type === 'INCENTIVE'
                        ? tx.notes || 'Incentive'
                        : tx.notes || 'Advance'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold">
                        {tx.type === 'INCENTIVE' ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                      </span>
                      {isAdmin && !quickMarkDay.isSettled && tx.type !== 'PAYOUT_SETTLEMENT' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id, tx.type, tx.amount)}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

            <form onSubmit={handleOtSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Date
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
                      <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        Marked Full Leave on this date
                      </p>
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
                  placeholder="e.g. Festival incentive, exceptional vehicle overhaul..."
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
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Paid leave</span>
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
                    Full Leave
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
                    Half Day
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
                  <span>{isDeletingLeave ? 'Removing...' : 'Remove'}</span>
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

      {/* ── MODAL 8: MONTHLY PAY SLIP SNAPSHOT ── */}
      {showPaySlipModal && (
        <MonthlyPaySlipModal
          isOpen={showPaySlipModal}
          onClose={() => {
            setShowPaySlipModal(false);
            setPaySlipTargetMonth(null);
          }}
          worker={{
            id: worker?.id || (user as any)?._id || (user as any)?.id || '',
            name: worker?.name || user?.name || 'Staff Member',
            mobile: worker?.mobile || user?.mobile || '',
            role: (!isAdmin ? user?.role : (worker as any)?.role) || 'Staff / Mechanic',
            dailyWage: ((worker?.dailyWage !== undefined ? worker.dailyWage : user?.dailyWage) || 0),
            profileImageUrl: worker?.profileImageUrl || (user as any)?.profileImageUrl,
          }}
          monthItem={paySlipTargetMonth || activeMonthItem || monthlyBreakdown[0]}
          allDaysInMonth={filteredDays}
          garageName="MOMZZ AUTOMOTIVE GARAGE"
        />
      )}
    </div>
  );
};
