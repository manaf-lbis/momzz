import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Check,
  X,
  Calendar,
  IndianRupee,
  ShieldAlert,
  UserCheck,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { IOtClaimItem, useUpdateOtStatusMutation } from '../api/payrollApi';

interface OvertimeTrackerConsoleProps {
  claims: IOtClaimItem[];
  isAdmin?: boolean;
  workerDailyWage?: number;
  onEditClaim?: (claim: IOtClaimItem) => void;
  onCancelClaim?: (claimId: string) => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const OvertimeTrackerConsole: React.FC<OvertimeTrackerConsoleProps> = ({
  claims,
  isAdmin = false,
  workerDailyWage = 0,
  onEditClaim,
  onCancelClaim,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rejection modal state
  const [rejectingClaim, setRejectingClaim] = useState<IOtClaimItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [updateOtStatus, { isLoading: isUpdating }] = useUpdateOtStatusMutation();

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status === 'PENDING').length;
    const approved = claims.filter((c) => c.status === 'APPROVED').length;
    const rejected = claims.filter((c) => c.status === 'REJECTED').length;
    const approvedAmount = claims
      .filter((c) => c.status === 'APPROVED')
      .reduce((sum, c) => sum + (c.amount || (c.otHours || 0) * 150), 0);
    const pendingAmount = claims
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + (c.amount || (c.otHours || 0) * 150), 0);

    return { total, pending, approved, rejected, approvedAmount, pendingAmount };
  }, [claims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (statusFilter !== 'ALL' && claim.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const workerMatch = claim.workerName?.toLowerCase().includes(term);
        const noteMatch = claim.note?.toLowerCase().includes(term);
        const reasonMatch = claim.rejectionReason?.toLowerCase().includes(term);
        const dateMatch = claim.date?.includes(term);
        if (!workerMatch && !noteMatch && !reasonMatch && !dateMatch) return false;
      }
      return true;
    });
  }, [claims, statusFilter, searchTerm]);

  const handleApprove = async (claimId: string) => {
    try {
      await updateOtStatus({
        id: claimId,
        status: 'APPROVED',
      }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to approve overtime claim');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingClaim) return;
    try {
      await updateOtStatus({
        id: rejectingClaim.id,
        status: 'REJECTED',
        rejectionReason: rejectionReasonInput.trim() || undefined,
        note: rejectionReasonInput.trim() || undefined,
      }).unwrap();
      setRejectingClaim(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to reject overtime claim');
    }
  };

  return (
    <div className="space-y-3.5">
      {/* ── METRICS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-xl glass-modern-card border border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
              Pending Claims
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({formatCurrency(metrics.pendingAmount)})
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-modern-card border border-emerald-500/20 bg-emerald-500/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
              Approved OT
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {metrics.approved}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({formatCurrency(metrics.approvedAmount)})
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-modern-card border border-rose-500/20 bg-rose-500/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
              Rejected
            </span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {metrics.rejected}
            </span>
            <span className="text-[10px] text-slate-500">
              requests
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-modern-card border border-slate-200/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
              Total Submissions
            </span>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {metrics.total}
            </span>
            <span className="text-[10px] text-slate-500">
              all-time
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl glass-modern-card border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            All ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3 h-3" />
            Pending ({metrics.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Approved ({metrics.approved})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <XCircle className="w-3 h-3" />
            Rejected ({metrics.rejected})
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search worker, note, date..."
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* ── OVERTIME CLAIMS LIST ── */}
      {filteredClaims.length === 0 ? (
        <div className="p-8 text-center rounded-2xl glass-modern-card border border-dashed border-slate-200 dark:border-white/10">
          <Clock className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Overtime Requests Found
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try resetting the status filter or search query.'
              : 'Overtime claims submitted by mechanics will appear here for review and tracking.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClaims.map((claim) => {
            const amount = claim.amount || (claim.otHours || 0) * 150;
            return (
              <div
                key={claim.id}
                className="p-3 sm:p-3.5 rounded-2xl glass-modern-card border border-slate-200/80 dark:border-white/10 hover:border-amber-500/30 transition-all space-y-2"
              >
                {/* Header row: Worker info + Status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                      {claim.workerProfileImageUrl ? (
                        <img
                          src={claim.workerProfileImageUrl}
                          alt={claim.workerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{claim.workerName?.charAt(0)?.toUpperCase() || 'W'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {claim.workerName}
                        </span>
                        {claim.workerMobile && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {claim.workerMobile}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{claim.date}</span>
                        <span>&bull;</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {claim.otHours}h OT
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {claim.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
                        <Clock className="w-3 h-3 animate-spin text-amber-500" />
                        <span>Pending Review</span>
                      </span>
                    )}
                    {claim.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Approved</span>
                      </span>
                    )}
                    {claim.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Flagged warning if claimed on full leave day */}
                {claim.flaggedReason === 'CLAIMED_ON_FULL_LEAVE' && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Flagged: Overtime was claimed on a recorded Full Leave Day.</span>
                  </div>
                )}

                {/* Worker's justification note */}
                {claim.note && (
                  <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-[10px] block">
                        Worker's Note:
                      </span>
                      <span>"{claim.note}"</span>
                    </div>
                  </div>
                )}

                {/* REJECTION REASON CALLOUT BOX */}
                {claim.status === 'REJECTED' && (
                  <div className="p-2.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/25 space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs">
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Reason for Rejection</span>
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-5">
                      {claim.rejectionReason
                        ? claim.rejectionReason
                        : 'No specific reason provided by supervisor.'}
                    </p>
                  </div>
                )}

                {/* Audit metadata strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    {claim.reviewerName && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        Reviewed by <strong className="text-slate-600 dark:text-slate-300">{claim.reviewerName}</strong>
                        {claim.reviewedAt && (
                          <span>on {new Date(claim.reviewedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        )}
                      </span>
                    )}
                    {claim.updatedByName && (
                      <span className="text-amber-500">
                        Edited by {claim.updatedByName}
                      </span>
                    )}
                  </div>

                  {/* Actions for Admin on Pending claims */}
                  {isAdmin && claim.status === 'PENDING' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleApprove(claim.id)}
                        className="py-1 px-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition active:scale-95 shadow-2xs"
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => {
                          setRejectingClaim(claim);
                          setRejectionReasonInput('');
                        }}
                        className="py-1 px-2.5 text-xs font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 transition active:scale-95"
                      >
                        <X className="w-3 h-3" />
                        Reject with Reason
                      </button>
                    </div>
                  )}

                  {/* Actions for Worker on Pending claims */}
                  {!isAdmin && claim.status === 'PENDING' && (
                    <div className="flex items-center gap-1.5">
                      {onEditClaim && (
                        <button
                          type="button"
                          onClick={() => onEditClaim(claim)}
                          className="py-1 px-2 text-[10px] font-bold rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-slate-200 transition"
                        >
                          Edit Claim
                        </button>
                      )}
                      {onCancelClaim && (
                        <button
                          type="button"
                          onClick={() => onCancelClaim(claim.id)}
                          className="py-1 px-2 text-[10px] font-bold rounded-md text-rose-600 hover:bg-rose-500/10 transition"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADMIN REJECT OVERTIME MODAL ── */}
      {rejectingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl glass-modern-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <XCircle className="w-5 h-5" />
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
                disabled={isUpdating}
                onClick={handleConfirmReject}
                className="py-1.5 px-4 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                {isUpdating ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
