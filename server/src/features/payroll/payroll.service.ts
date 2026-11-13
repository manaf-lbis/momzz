import mongoose from 'mongoose';
import { PayrollRepository } from './payroll.repository';
import { IUser, ISettlementBrief } from '../../models/User.model';
import { IWageAdjustment } from '../../models/WageAdjustment.model';
import { IGarageHoliday } from '../../models/GarageHoliday.model';
import { IWageTransaction, WageTransactionType } from '../../models/WageTransaction.model';
import { AppError } from '../../shared/utils/appError';

export const OT_HOURLY_RATE = 150;

/**
 * Rounds a number to exact 2 decimal places (paise / cents) with epsilon correction.
 */
export const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Floor-100 leave penalty rule:
 * Deduction = floor(dailyWage / 100) * 100
 * e.g., ₹870 -> ₹800 deduction, net day wage = ₹70
 */
export function calculateFullLeaveDeduction(dailyWage: number): number {
  if (dailyWage <= 0) return 0;
  return Math.floor(dailyWage / 100) * 100;
}

/**
 * Half-day leave rule:
 * Worker earns half daily wage rounded to next 10.
 * Deduction = dailyWage - earned
 * e.g., ₹875 -> half = 437.5 -> rounded to next 10 = ₹440 earned, deduction = ₹435
 */
export function calculateHalfDayDeduction(dailyWage: number): number {
  if (dailyWage <= 0) return 0;
  const halfEarned = Math.ceil((dailyWage / 2) / 10) * 10;
  return Math.max(0, dailyWage - halfEarned);
}

/**
 * Returns total days in calendar month for a dateStr 'YYYY-MM-DD'
 */
export function getDaysInCalendarMonth(dateStr: string): number {
  const [y, m] = dateStr.split('-').map(Number);
  // In JS Date constructor, (y, m, 0) gives the last day of month m (1-indexed m becomes month m-1's last day)
  return new Date(y, m, 0).getDate();
}

/**
 * Interface describing wage decision for a worker on a given date.
 */
export interface WageDecision {
  wageType: 'DAILY' | 'MONTHLY';
  baseWageAmount: number; // monthlySalary if MONTHLY, dailyWage if DAILY
  perDayWage: number; // daily wage accrued for that day (monthlySalary / daysInMonth for MONTHLY)
  daysInMonth: number;
}

/**
 * Determines the very first day of existence for a worker's payroll.
 * Rule: Whenever we decide the salary/wages of that person, that is the first day of that person.
 * If no wage update / decision was ever made, returns null (person will not get anything).
 */
export function getWorkerFirstPayrollDate(worker: IUser): string | null {
  if (worker.wageHistory && worker.wageHistory.length > 0) {
    const dates = worker.wageHistory
      .map((entry) => formatDateStr(new Date(entry.effectiveDate)))
      .filter(Boolean)
      .sort();
    if (dates.length > 0) {
      return dates[0];
    }
  }

  const hasWage = (worker.dailyWage && worker.dailyWage > 0) || (worker.monthlySalary && worker.monthlySalary > 0);

  if (hasWage && worker.dailyWageEffectiveDate) {
    return formatDateStr(new Date(worker.dailyWageEffectiveDate));
  }

  if (hasWage) {
    return worker.createdAt ? formatDateStr(new Date(worker.createdAt)) : formatDateStr(new Date());
  }

  return null;
}

/**
 * Resolves wage decision (type, assigned amount, and calculated perDayWage) on a specific date (YYYY-MM-DD).
 * Rule:
 * 1. If date is earlier than worker's first wage decision date, returns 0.
 * 2. If no wage was ever decided, returns 0.
 * 3. Tracks when wages were updated: from that point onwards those wages will be effective.
 * 4. For MONTHLY: perDayWage = round2(monthlySalary / daysInMonth).
 * 5. For DAILY: perDayWage = dailyWage.
 */
export function getWageDecisionForDate(worker: IUser, dateStr: string): WageDecision {
  const daysInMonth = getDaysInCalendarMonth(dateStr);
  const fallbackType: 'DAILY' | 'MONTHLY' = worker.wageType === 'MONTHLY' ? 'MONTHLY' : 'DAILY';

  const firstPayrollDate = getWorkerFirstPayrollDate(worker);
  if (!firstPayrollDate || dateStr < firstPayrollDate) {
    return {
      wageType: fallbackType,
      baseWageAmount: 0,
      perDayWage: 0,
      daysInMonth,
    };
  }

  if (worker.wageHistory && worker.wageHistory.length > 0) {
    const sorted = [...worker.wageHistory]
      .map((entry) => ({
        wage: entry.wage,
        wageType: entry.wageType || fallbackType,
        effectiveDateStr: formatDateStr(new Date(entry.effectiveDate)),
      }))
      .filter((e) => Boolean(e.effectiveDateStr))
      .sort((a, b) => a.effectiveDateStr.localeCompare(b.effectiveDateStr));

    let applicableRecord: { wage: number; wageType: 'DAILY' | 'MONTHLY'; effectiveDateStr: string } | null = null;
    for (const record of sorted) {
      if (record.effectiveDateStr <= dateStr) {
        applicableRecord = record;
      } else {
        break;
      }
    }

    if (applicableRecord) {
      const isMonthly = applicableRecord.wageType === 'MONTHLY';
      const perDayWage = isMonthly
        ? round2(applicableRecord.wage / daysInMonth)
        : applicableRecord.wage;

      return {
        wageType: applicableRecord.wageType,
        baseWageAmount: applicableRecord.wage,
        perDayWage,
        daysInMonth,
      };
    }
  }

  // Fallback to worker root fields
  if (fallbackType === 'MONTHLY') {
    const monthlySalary = worker.monthlySalary || 0;
    const perDayWage = monthlySalary > 0 ? round2(monthlySalary / daysInMonth) : 0;
    return {
      wageType: 'MONTHLY',
      baseWageAmount: monthlySalary,
      perDayWage,
      daysInMonth,
    };
  }

  const dailyWage = worker.dailyWage || 0;
  return {
    wageType: 'DAILY',
    baseWageAmount: dailyWage,
    perDayWage: dailyWage,
    daysInMonth,
  };
}

/**
 * Finds the applicable daily wage for a worker on a specific date string (YYYY-MM-DD).
 */
export function getWageForDate(worker: IUser, dateStr: string): number {
  return getWageDecisionForDate(worker, dateStr).perDayWage;
}

/**
 * Get current date and time parts in Indian Standard Time (IST / Asia/Kolkata)
 */
export function getIstDateTime(): { dateStr: string; hour: number; minute: number } {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = istFormatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

/**
 * Format Date object to 'YYYY-MM-DD' in local/IST string
 */
export function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns next day string in YYYY-MM-DD
 */
export function getNextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  return formatDateStr(dt);
}

/**
 * Generate array of 'YYYY-MM-DD' dates between startDate and endDate inclusive
 */
export function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDateStr}T00:00:00`);
  const stop = new Date(`${endDateStr}T00:00:00`);

  while (curr <= stop) {
    dates.push(formatDateStr(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export interface SingleSheetDayEntry {
  date: string; // YYYY-MM-DD
  dayName: string;
  dayType: 'WORKING' | 'SUNDAY' | 'HOLIDAY' | 'FULL_LEAVE' | 'HALF_LEAVE';
  wageType?: 'DAILY' | 'MONTHLY';
  monthlySalary?: number;
  isAllowedLeave?: boolean;
  holidayTitle?: string;
  adjustmentId?: string;
  adjustmentNote?: string;
  leaveUpdatedByName?: string;
  leaveLastEditedAt?: Date;
  baseWage: number;
  leaveDeduction: number;
  netDayWage: number;
  shiftStatus?: 'IN_PROGRESS' | 'COMPLETED' | 'SUNDAY' | 'HOLIDAY' | 'LEAVE';
  shiftNote?: string;
  otHours: number;
  otAmount: number;
  otStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  otClaimId?: string;
  otClaimNote?: string;
  otFlaggedReason?: string;
  otRejectionReason?: string;
  otReviewedByName?: string;
  otReviewedAt?: Date;
  otUpdatedByName?: string;
  otLastEditedAt?: Date;
  netDailyPay: number;
  isSettled: boolean;
  inlineTransactions: Array<{
    id: string;
    type: WageTransactionType;
    amount: number;
    notes?: string;
    paymentMethod?: string;
    referenceNote?: string;
    carriedForwardBalance?: number;
  }>;
  runningCumulativeBalance: number;
}

export interface MonthlyBreakdownItem {
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // 'November 2026'
  wageType?: 'DAILY' | 'MONTHLY';
  monthlySalary?: number;
  perDayWage?: number;
  daysInMonth?: number;
  totalDays: number;
  workingDays: number;
  sundays: number;
  holidays: number;
  leaveDays: number;
  allowedLeaveDays: number;
  grossWages: number;
  leaveDeductions: number;
  netBaseWages: number;
  otHours: number;
  otAmount: number;
  advances: number;
  incentives: number;
  payouts: number;
  netEarnings: number;
  isSettled: boolean;
}

export class PayrollService {
  /**
   * Batch mark leave for one or more workers across one or more dates.
   * Calculates Floor-100 deduction for each worker and stores in WageAdjustment.
   */
  static async markBatchLeave(params: {
    workerIds: string[];
    dates: string[] | string | { startDate: string; endDate: string };
    type?: 'FULL_LEAVE' | 'HALF_LEAVE';
    note?: string;
  }) {
    const leaveType = params.type || 'FULL_LEAVE';
    let targetDates: string[] = [];

    if (Array.isArray(params.dates)) {
      targetDates = params.dates;
    } else if (typeof params.dates === 'string') {
      targetDates = [params.dates];
    } else if (params.dates && params.dates.startDate && params.dates.endDate) {
      targetDates = getDatesBetween(params.dates.startDate, params.dates.endDate);
    }

    if (targetDates.length === 0) {
      throw new AppError('No valid dates provided for leave marking', 400);
    }

    const results = [];

    for (const workerId of params.workerIds) {
      const worker = await PayrollRepository.findWorkerById(workerId);
      if (!worker) continue;

      const workerFirstPayrollDate = getWorkerFirstPayrollDate(worker);
      if (!workerFirstPayrollDate) continue; // cannot mark leave if worker has no wage decided

      // Sort target dates chronologically
      const sortedDates = [...targetDates].sort();

      for (const date of sortedDates) {
        if (date < workerFirstPayrollDate) continue; // cannot mark leave prior to worker's first wage date

        const wageDecision = getWageDecisionForDate(worker, date);
        const dailyWage = wageDecision.perDayWage;
        const mKey = date.substring(0, 7);
        const monthStart = `${mKey}-01`;
        const monthEnd = `${mKey}-31`;

        // Check if worker already has another leave in this calendar month
        const monthLeaves = await PayrollRepository.findWageAdjustments({
          workerId: worker._id.toString(),
          startDate: monthStart,
          endDate: monthEnd,
          types: ['FULL_LEAVE', 'HALF_LEAVE'],
        });

        const otherLeavesInMonth = monthLeaves.filter((l) => l.date !== date);
        otherLeavesInMonth.sort((a, b) => a.date.localeCompare(b.date));

        // First leave in this month is the 1 Allowed Paid Leave with ₹0 deduction
        const isFirstInMonth = otherLeavesInMonth.length === 0 || date < otherLeavesInMonth[0].date;

        let deductionAmount = 0;
        let isAllowedLeave = false;

        if (isFirstInMonth) {
          deductionAmount = 0;
          isAllowedLeave = true;
        } else if (wageDecision.wageType === 'MONTHLY') {
          // Monthly salary worker: unpaid leave reduces 1 day's salary (or half day for HALF_LEAVE)
          deductionAmount =
            leaveType === 'FULL_LEAVE'
              ? dailyWage
              : round2(dailyWage / 2);
        } else {
          // Daily wage worker: floor 100 deduction
          deductionAmount =
            leaveType === 'FULL_LEAVE'
              ? calculateFullLeaveDeduction(dailyWage)
              : calculateHalfDayDeduction(dailyWage);
        }

        const adj = await PayrollRepository.upsertLeaveAdjustment({
          workerId: worker._id.toString(),
          date,
          type: leaveType,
          deductionAmount,
          isAllowedLeave,
          note: params.note || (isAllowedLeave ? 'Paid Leave' : ''),
        });

        results.push({
          workerId: worker._id,
          workerName: worker.name,
          date,
          type: leaveType,
          dailyWage,
          deductionAmount,
          isAllowedLeave,
          netDayWage: Math.max(0, dailyWage - deductionAmount),
          adjustmentId: adj._id,
        });
      }
    }

    return {
      message: `Successfully processed ${results.length} leave entries across ${params.workerIds.length} workers`,
      recordsCount: results.length,
      results,
    };
  }

  /**
   * Worker Overtime Claim: whole integer hours only, starts as PENDING
   */
  static async claimOvertime(params: {
    workerId: string;
    date: string;
    otHours: number;
    note?: string;
  }) {
    // Round to whole integer (truncate minutes)
    const roundedHours = Math.floor(params.otHours);
    if (roundedHours < 1) {
      throw new AppError('Overtime must be at least 1 whole hour. Minutes are discarded.', 400);
    }

    const worker = await PayrollRepository.findWorkerById(params.workerId);
    if (!worker) throw new AppError('Worker not found', 404);

    const firstPayrollDate = getWorkerFirstPayrollDate(worker);
    if (!firstPayrollDate) {
      throw new AppError('Worker daily wage has not been decided yet. Overtime cannot be claimed without an active wage.', 400);
    }
    if (params.date < firstPayrollDate) {
      throw new AppError(`Cannot claim overtime for ${params.date} prior to wage effective date (${firstPayrollDate}).`, 400);
    }

    // Check if worker was marked on Full Leave for this date
    const existingAdjustments = await PayrollRepository.findWageAdjustments({
      workerId: params.workerId,
      startDate: params.date,
      endDate: params.date,
    });
    const hasFullLeave = existingAdjustments.some((a) => a.type === 'FULL_LEAVE');
    const flaggedReason = hasFullLeave ? 'CLAIMED_ON_FULL_LEAVE' : undefined;

    const claim = await PayrollRepository.createOtClaim({
      workerId: params.workerId,
      date: params.date,
      otHours: roundedHours,
      note: params.note,
      flaggedReason,
    });

    return {
      message: hasFullLeave
        ? 'Overtime claim submitted. Flagged for admin review due to Full Leave marked on this date.'
        : 'Overtime claim submitted successfully for admin review',
      claim,
      ratePerHour: OT_HOURLY_RATE,
      potentialAmount: roundedHours * OT_HOURLY_RATE,
      flaggedReason,
    };
  }

  /**
   * Admin approves or rejects OT claim with optional rejection reason & audit info
   */
  static async reviewOtClaim(params: {
    claimId: string;
    status: 'APPROVED' | 'REJECTED';
    reviewedBy: string;
    reviewerName?: string;
    note?: string;
    rejectionReason?: string;
  }) {
    const claim = await PayrollRepository.findWageAdjustmentById(params.claimId);
    if (!claim) throw new AppError('Overtime claim not found', 404);
    if (claim.type !== 'OVERTIME') throw new AppError('Adjustment is not an overtime claim', 400);

    const effectiveRejectionReason =
      params.rejectionReason || (params.status === 'REJECTED' ? params.note : undefined);

    const updated = await PayrollRepository.updateOtStatus(
      params.claimId,
      params.status,
      params.reviewedBy,
      effectiveRejectionReason,
      params.reviewerName
    );

    try {
      const { emitPayrollOtReviewed } = await import('../../config/socket');
      const workerIdStr = (claim.workerId as any)?._id?.toString() || claim.workerId?.toString();
      emitPayrollOtReviewed(workerIdStr, {
        claimId: params.claimId,
        date: claim.date,
        status: params.status,
        otHours: claim.otHours,
        potentialAmount: (claim.otHours || 0) * OT_HOURLY_RATE,
        note: params.note,
        rejectionReason: effectiveRejectionReason,
        reviewerName: params.reviewerName,
      });
    } catch {
      // Socket emission non-fatal
    }

    return {
      message: `Overtime claim marked as ${params.status}`,
      claim: updated,
    };
  }

  /**
   * Fetches OT claims with status filter and itemized audit tracking
   */
  static async getOtClaimsList(params: {
    workerId?: string;
    status?: any;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const claims = await PayrollRepository.findAllOtClaims({
      workerId: params.workerId,
      status: params.status,
      startDate: params.startDate,
      endDate: params.endDate,
      limit: params.limit,
    });

    return claims.map((c: any) => ({
      id: c._id.toString(),
      workerId: c.workerId?._id?.toString() || c.workerId?.toString(),
      workerName: c.workerId?.name || 'Worker',
      workerMobile: c.workerId?.mobile || '',
      workerProfileImageUrl: c.workerId?.profileImageUrl || '',
      dailyWage: c.workerId?.dailyWage || 0,
      date: c.date,
      otHours: c.otHours,
      amount: (c.otHours || 0) * OT_HOURLY_RATE,
      status: c.status,
      note: c.note || '',
      rejectionReason: c.rejectionReason || '',
      reviewedBy: (c.reviewedBy as any)?._id?.toString() || c.reviewedBy?.toString() || null,
      reviewerName: (c.reviewedBy as any)?.name || c.reviewerName || null,
      reviewedAt: c.reviewedAt,
      flaggedReason: c.flaggedReason || null,
      updatedByName: c.updatedByName || null,
      lastEditedAt: c.lastEditedAt || null,
      isSettled: Boolean(c.isSettled),
      settledAt: c.settledAt || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Computes the dynamic Single-Sheet Ledger from lastSettledDate (or cycle start) to current date.
   * Zero Cron Jobs: 100% on-the-fly computation.
   */
  static async getWorkerSingleSheet(params: {
    workerId: string;
    startDate?: string;
    endDate?: string;
    includeSettledHistory?: boolean;
  }) {
    const worker = await PayrollRepository.findWorkerById(params.workerId);
    if (!worker) throw new AppError('Worker not found', 404);

    const todayStr = formatDateStr(new Date());

    // Check if worker has previous settlement with carried forward balance
    const lastSettlement = await PayrollRepository.findLastSettlement(params.workerId);
    const previousBalanceCarriedForward = lastSettlement?.carriedForwardBalance || 0;
    
    // Resolve lastSettledDate accurately from User document OR lastSettlement
    let lastSettledDateObj: Date | null = worker.lastSettledDate ? new Date(worker.lastSettledDate) : null;
    if (lastSettlement) {
      const settlementEnd =
        (lastSettlement as any).settledUpToDate
          ? new Date((lastSettlement as any).settledUpToDate)
          : lastSettlement.periodCovered?.endDate
          ? new Date(lastSettlement.periodCovered.endDate)
          : (lastSettlement.itemizedSummary as any)?.periodCovered?.endDate
          ? new Date((lastSettlement.itemizedSummary as any).periodCovered.endDate)
          : (lastSettlement.itemizedSummary as any)?.settledUpToDate
          ? new Date((lastSettlement.itemizedSummary as any).settledUpToDate)
          : (lastSettlement as any).endDate
          ? new Date((lastSettlement as any).endDate)
          : null;

      // Only update worker.lastSettledDate if it was an explicit settlement period end AND carriedForwardBalance === 0
      if (settlementEnd && (lastSettlement.carriedForwardBalance === 0 || lastSettlement.carriedForwardBalance === undefined)) {
        if (!lastSettledDateObj || settlementEnd > lastSettledDateObj) {
          lastSettledDateObj = settlementEnd;
          PayrollRepository.updateWorkerLastSettledDate(params.workerId, settlementEnd).catch(() => {});
        }
      }
    }
    const lastSettledDateStr = lastSettledDateObj ? formatDateStr(lastSettledDateObj) : null;

    const firstPayrollDateStr = getWorkerFirstPayrollDate(worker);

    if (!firstPayrollDateStr) {
      // Worker has no wage decided yet - returns 0 and empty period
      const emptyKpis = {
        totalWorkingDays: 0,
        totalSundays: 0,
        totalHolidayDays: 0,
        totalFullLeaveDays: 0,
        totalHalfDays: 0,
        totalAllowedLeaves: 0,
        unsettledAllowedLeaves: 0,
        grossWages: 0,
        totalLeaveDeductions: 0,
        netBaseWages: 0,
        previousBalanceCarriedForward: 0,
        totalApprovedOtHours: 0,
        totalApprovedOtAmount: 0,
        totalEarnings: 0,
        totalUnsettledAdvances: 0,
        totalUnsettledIncentives: 0,
        netPayable: 0,
        advanceOverhang: 0,
        unsettledWorkingDays: 0,
        unsettledGrossWages: 0,
        unsettledLeaveDeductions: 0,
        unsettledNetBaseWages: 0,
        unsettledApprovedOtHours: 0,
        unsettledApprovedOtAmount: 0,
      };

      // Persist snapshot to database
      await PayrollRepository.updateWorkerPayrollSnapshot(params.workerId, {
        ...emptyKpis,
        firstPayrollDate: null,
        lastSettledDate: worker.lastSettledDate || null,
        lastCalculatedAt: new Date(),
        lastSettlementBrief: null,
      });

      return {
        worker: {
          id: worker._id,
          name: worker.name,
          mobile: worker.mobile,
          profileImageUrl: worker.profileImageUrl || '',
          wageType: worker.wageType || 'DAILY',
          monthlySalary: worker.monthlySalary || 0,
          dailyWage: 0,
          dailyWageEffectiveDate: undefined,
          lastSettledDate: worker.lastSettledDate,
          firstPayrollDate: null,
        },
        period: {
          startDate: todayStr,
          endDate: todayStr,
          totalDays: 0,
        },
        kpis: emptyKpis,
        monthlyBreakdown: [],
        days: [],
        hasWageAssigned: false,
        settlements: [],
        lastSettlementBrief: null,
      };
    }

    // Determine calculation window:
    // First day of worker is strictly the day their wage was decided!
    let startStr = params.startDate;
    if (!startStr) {
      if (params.includeSettledHistory !== false) {
        // Starts on worker's first day of wage decision!
        startStr = firstPayrollDateStr;
      } else if (lastSettledDateStr) {
        // Unsettled only: start from day after last settlement, clamped to first wage date
        const dayAfter = getNextDayStr(lastSettledDateStr);
        startStr = dayAfter < firstPayrollDateStr ? firstPayrollDateStr : dayAfter;
      } else {
        // Unsettled with no previous settlement: strictly starts on first wage decision date
        startStr = firstPayrollDateStr;
      }
    } else {
      // Clamped so it never looks back earlier than the worker's first wage decision date
      if (startStr < firstPayrollDateStr) {
        startStr = firstPayrollDateStr;
      }
    }

    const endStr = params.endDate || todayStr;
    const isFullySettled = params.includeSettledHistory === false && startStr > endStr;
    const dateList = isFullySettled ? [] : getDatesBetween(startStr, endStr);

    // Fetch garage holidays, adjustments, and transactions
    const holidays = await PayrollRepository.findHolidays(startStr, endStr);
    const holidayMap = new Map<string, IGarageHoliday>();
    holidays.forEach((h) => holidayMap.set(h.date, h));

    // Fetch adjustments starting from 1st of earliest month in range to accurately track the 1 allowed leave per month
    const startMonthFirstDay = `${startStr.substring(0, 7)}-01`;
    const adjustments = await PayrollRepository.findWageAdjustments({
      workerId: params.workerId,
      startDate: startMonthFirstDay,
      endDate: endStr,
    });

    const leaveMap = new Map<string, IWageAdjustment>();
    const otMap = new Map<string, IWageAdjustment[]>();
    const leavesByMonth = new Map<string, IWageAdjustment[]>();

    for (const adj of adjustments) {
      if (adj.type === 'FULL_LEAVE' || adj.type === 'HALF_LEAVE') {
        leaveMap.set(adj.date, adj);
        const mKey = adj.date.substring(0, 7);
        const list = leavesByMonth.get(mKey) || [];
        list.push(adj);
        leavesByMonth.set(mKey, list);
      } else if (adj.type === 'OVERTIME') {
        const list = otMap.get(adj.date) || [];
        list.push(adj);
        otMap.set(adj.date, list);
      }
    }

    // Determine the allowed leave for each month (the chronologically first leave taken in each calendar month)
    const allowedLeaveDateSet = new Set<string>();
    for (const [_mKey, mLeaves] of leavesByMonth.entries()) {
      mLeaves.sort((a, b) => a.date.localeCompare(b.date));
      if (mLeaves.length > 0 && mLeaves[0].date) {
        allowedLeaveDateSet.add(mLeaves[0].date);
      }
    }

    // Fetch transactions in this range for inline logging
    const transactions = await PayrollRepository.findWageTransactions({
      workerId: params.workerId,
      startDate: new Date(`${startStr}T00:00:00.000Z`),
      endDate: new Date(`${endStr}T23:59:59.999Z`),
    });

    const txMap = new Map<string, IWageTransaction[]>();
    for (const tx of transactions) {
      const txDateStr = formatDateStr(new Date(tx.date));
      const list = txMap.get(txDateStr) || [];
      list.push(tx);
      txMap.set(txDateStr, list);
    }

    // Fetch unsettled advances specifically (for KPI calculation)
    const unsettledAdvances = await PayrollRepository.findWageTransactions({
      workerId: params.workerId,
      type: 'ADVANCE_TAKEN',
      isSettled: false,
    });
    const totalUnsettledAdvances = unsettledAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Fetch unsettled incentives (increases net payable & earnings)
    const unsettledIncentives = await PayrollRepository.findWageTransactions({
      workerId: params.workerId,
      type: 'INCENTIVE',
      isSettled: false,
    });
    const totalUnsettledIncentives = unsettledIncentives.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Current IST time for shift cutoff (wage accrues after 5:00 PM / 17:00 IST)
    const istNow = getIstDateTime();
    const todayIstStr = istNow.dateStr;
    const currentIstHour = istNow.hour;

    // Period metrics (all days in the queried range)
    let totalWorkingDays = 0;
    let totalSundays = 0;
    let totalHolidayDays = 0;
    let totalFullLeaveDays = 0;
    let totalHalfDays = 0;
    let totalAllowedLeaves = 0;
    let grossWages = 0;
    let totalLeaveDeductions = 0;
    let netBaseWages = 0;
    let totalApprovedOtHours = 0;
    let totalApprovedOtAmount = 0;

    // Unsettled metrics (strictly for days/adjustments that are NOT settled yet)
    let unsettledWorkingDays = 0;
    let unsettledAllowedLeaves = 0;
    let unsettledGrossWages = 0;
    let unsettledLeaveDeductions = 0;
    let unsettledNetBaseWages = 0;
    let unsettledApprovedOtHours = 0;
    let unsettledApprovedOtAmount = 0;

    let runningBalance = params.includeSettledHistory !== false ? 0 : previousBalanceCarriedForward;
    const dayEntries: SingleSheetDayEntry[] = [];

    // Pre-calculate total settlement payouts in this history/period to drive FIFO settlement allocation
    const totalSettlementsInPeriod = round2(
      transactions
        .filter((t) => t.type === 'PAYOUT_SETTLEMENT')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
    );
    let remainingSettlementCredit = totalSettlementsInPeriod;

    for (const dStr of dateList) {
      const dObj = new Date(`${dStr}T00:00:00`);
      const isSunday = dObj.getDay() === 0;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dObj.getDay()];

      const holiday = holidayMap.get(dStr);
      const leave = leaveMap.get(dStr);
      const otClaims = otMap.get(dStr) || [];

      const wageDecision = getWageDecisionForDate(worker, dStr);
      const currentDailyWage = wageDecision.perDayWage;

      const isToday = dStr === todayIstStr;
      // Shift is in progress if it is today and current time is before 5:00 PM IST (17:00)
      const isShiftInProgress = isToday && currentIstHour < 17;

      let dayType: SingleSheetDayEntry['dayType'] = 'WORKING';
      let baseWage = currentDailyWage;
      let leaveDeduction = 0;
      let netDayWage = currentDailyWage;
      let shiftStatus: SingleSheetDayEntry['shiftStatus'] = undefined;
      let shiftNote: string | undefined = undefined;
      let isAllowedLeave = false;

      if (leave) {
        const isMonthAllowedLeave = allowedLeaveDateSet.has(dStr);
        isAllowedLeave = isMonthAllowedLeave;

        if (leave.type === 'FULL_LEAVE') {
          dayType = 'FULL_LEAVE';
          if (isMonthAllowedLeave) {
            leaveDeduction = 0;
            netDayWage = currentDailyWage; // Paid leave! Full daily wage paid
            shiftStatus = 'LEAVE';
            shiftNote = 'Paid Leave';
          } else {
            leaveDeduction =
              leave.deductionAmount !== undefined
                ? leave.deductionAmount
                : wageDecision.wageType === 'MONTHLY'
                ? currentDailyWage
                : calculateFullLeaveDeduction(currentDailyWage);
            netDayWage = Math.max(0, round2(currentDailyWage - leaveDeduction));
            shiftStatus = 'LEAVE';
          }
          totalFullLeaveDays++;
          totalLeaveDeductions += leaveDeduction;
        } else if (leave.type === 'HALF_LEAVE') {
          dayType = 'HALF_LEAVE';
          if (isMonthAllowedLeave) {
            leaveDeduction = 0;
            netDayWage = currentDailyWage; // Paid leave! Full daily wage paid
            shiftStatus = 'LEAVE';
            shiftNote = 'Half Day (Paid)';
          } else {
            leaveDeduction =
              leave.deductionAmount !== undefined
                ? leave.deductionAmount
                : wageDecision.wageType === 'MONTHLY'
                ? round2(currentDailyWage / 2)
                : calculateHalfDayDeduction(currentDailyWage);
            if (isShiftInProgress) {
              // Worker marked half-day on running day: balance wage ONLY accrues after 5:00 PM IST
              baseWage = currentDailyWage;
              netDayWage = 0;
              shiftStatus = 'IN_PROGRESS';
              shiftNote = 'Half-day in progress';
            } else {
              baseWage = currentDailyWage;
              netDayWage = Math.max(0, round2(currentDailyWage - leaveDeduction));
              shiftStatus = 'COMPLETED';
            }
          }
          totalHalfDays++;
          totalLeaveDeductions += leaveDeduction;
        }
      } else if (holiday && holiday.isPaid) {
        dayType = 'HOLIDAY';
        baseWage = currentDailyWage;
        leaveDeduction = 0;
        netDayWage = currentDailyWage;
        totalHolidayDays++;
        shiftStatus = 'HOLIDAY';
      } else if (isSunday) {
        dayType = 'SUNDAY';
        if (wageDecision.wageType === 'MONTHLY') {
          // Sundays are paid days off for monthly salary workers
          baseWage = currentDailyWage;
          leaveDeduction = 0;
          netDayWage = currentDailyWage;
          shiftStatus = 'SUNDAY';
          shiftNote = 'Paid Sunday';
        } else {
          baseWage = 0;
          leaveDeduction = 0;
          netDayWage = 0;
          shiftStatus = 'SUNDAY';
        }
        totalSundays++;
      } else {
        dayType = 'WORKING';
        totalWorkingDays++;
        if (isShiftInProgress) {
          // Worker is currently working shift: wage accrues after 5:00 PM
          baseWage = currentDailyWage;
          leaveDeduction = 0;
          netDayWage = 0;
          shiftStatus = 'IN_PROGRESS';
          shiftNote = 'In progress';
        } else {
          baseWage = currentDailyWage;
          leaveDeduction = 0;
          netDayWage = currentDailyWage;
          shiftStatus = 'COMPLETED';
        }
      }

      grossWages += baseWage;
      netBaseWages += netDayWage;

      // Calculate Overtime on this day
      let dayOtHours = 0;
      let dayOtAmount = 0;
      let otStatus: SingleSheetDayEntry['otStatus'] = undefined;

      for (const ot of otClaims) {
        dayOtHours += ot.otHours || 0;
        if (ot.status === 'APPROVED') {
          dayOtAmount += (ot.otHours || 0) * OT_HOURLY_RATE;
          otStatus = 'APPROVED';
        } else if (ot.status === 'PENDING' && otStatus !== 'APPROVED') {
          otStatus = 'PENDING';
        } else if (ot.status === 'REJECTED' && !otStatus) {
          otStatus = 'REJECTED';
        }
      }

      totalApprovedOtHours += otStatus === 'APPROVED' ? dayOtHours : 0;
      totalApprovedOtAmount += dayOtAmount;

      const netDailyPay = round2(netDayWage + dayOtAmount);
      runningBalance = round2(runningBalance + netDailyPay);

      // Inline transactions for this date
      const inlineTxs = txMap.get(dStr) || [];
      const formattedInline = inlineTxs.map((t) => {
        if (t.type === 'ADVANCE_TAKEN') {
          runningBalance = round2(runningBalance - t.amount);
        } else if (t.type === 'PAYOUT_SETTLEMENT') {
          runningBalance = round2(runningBalance - t.amount);
        } else if (t.type === 'INCENTIVE') {
          runningBalance = round2(runningBalance + t.amount);
        }
        return {
          id: t._id.toString(),
          type: t.type,
          amount: t.amount,
          notes: t.notes,
          paymentMethod: t.paymentMethod,
          referenceNote: t.referenceNote,
          carriedForwardBalance: t.carriedForwardBalance,
        };
      });

      // Earned net on this day (wages + approved OT) eligible for FIFO settlement absorption
      const dayNetEarned = isShiftInProgress ? 0 : round2(netDayWage + (otStatus === 'APPROVED' ? dayOtAmount : 0));

      let isDaySettled = false;
      let dayUnsettledGross = 0;
      let dayUnsettledDeduction = 0;
      let dayUnsettledNetWage = 0;
      let dayUnsettledOtAmount = 0;
      let dayUnsettledWorkFraction = 0;

      const baseWorkFraction =
        (dayType === 'WORKING' && !isShiftInProgress) ||
        isAllowedLeave ||
        (wageDecision.wageType === 'MONTHLY' && (dayType === 'SUNDAY' || dayType === 'HOLIDAY'))
          ? 1
          : dayType === 'HALF_LEAVE' && !isShiftInProgress
          ? 0.5
          : 0;

      if (remainingSettlementCredit >= dayNetEarned && dayNetEarned > 0) {
        // Shift fully covered by settlement payout
        remainingSettlementCredit = round2(remainingSettlementCredit - dayNetEarned);
        isDaySettled = true;
      } else if (remainingSettlementCredit > 0 && dayNetEarned > 0) {
        // Shift partially covered by settlement payout
        const uncoveredNet = round2(dayNetEarned - remainingSettlementCredit);
        remainingSettlementCredit = 0;
        isDaySettled = false;
        const coverageRatio = uncoveredNet / dayNetEarned;

        dayUnsettledGross = round2(baseWage * coverageRatio);
        dayUnsettledDeduction = round2(leaveDeduction * coverageRatio);
        dayUnsettledNetWage = uncoveredNet;
        dayUnsettledOtAmount = otStatus === 'APPROVED' ? round2(dayOtAmount * coverageRatio) : 0;
        dayUnsettledWorkFraction = round2(baseWorkFraction * coverageRatio);
      } else {
        // Shift is completely unsettled
        isDaySettled = false;
        dayUnsettledGross = baseWage;
        dayUnsettledDeduction = leaveDeduction;
        dayUnsettledNetWage = isShiftInProgress ? 0 : netDayWage;
        dayUnsettledOtAmount = otStatus === 'APPROVED' ? dayOtAmount : 0;
        dayUnsettledWorkFraction = baseWorkFraction;
      }

      if (isAllowedLeave) {
        totalAllowedLeaves++;
        if (!isDaySettled) {
          unsettledAllowedLeaves++;
        }
      }

      // Unsettled tallies strictly accumulated for uncovered portions
      if (!isDaySettled) {
        unsettledWorkingDays = round2(unsettledWorkingDays + dayUnsettledWorkFraction);
        unsettledGrossWages = round2(unsettledGrossWages + dayUnsettledGross);
        unsettledLeaveDeductions = round2(unsettledLeaveDeductions + dayUnsettledDeduction);
        unsettledNetBaseWages = round2(unsettledNetBaseWages + dayUnsettledNetWage);
        if (otStatus === 'APPROVED') {
          unsettledApprovedOtHours += dayOtHours;
          unsettledApprovedOtAmount = round2(unsettledApprovedOtAmount + dayUnsettledOtAmount);
        }
      }

      dayEntries.push({
        date: dStr,
        dayName,
        dayType,
        wageType: wageDecision.wageType,
        monthlySalary: wageDecision.wageType === 'MONTHLY' ? wageDecision.baseWageAmount : undefined,
        isAllowedLeave,
        holidayTitle: holiday?.title,
        adjustmentId: leave?._id?.toString(),
        adjustmentNote: leave?.note,
        leaveUpdatedByName: leave?.updatedByName,
        leaveLastEditedAt: leave?.lastEditedAt,
        baseWage,
        leaveDeduction,
        netDayWage,
        shiftStatus,
        shiftNote,
        otHours: dayOtHours,
        otAmount: dayOtAmount,
        otStatus,
        otClaimId: otClaims[0]?._id?.toString(),
        otClaimNote: otClaims[0]?.note,
        otFlaggedReason: otClaims.find((o) => o.flaggedReason)?.flaggedReason,
        otRejectionReason: otClaims.find((o) => o.rejectionReason)?.rejectionReason,
        otReviewedByName: otClaims[0]?.reviewerName,
        otReviewedAt: otClaims[0]?.reviewedAt,
        otUpdatedByName: otClaims[0]?.updatedByName,
        otLastEditedAt: otClaims[0]?.lastEditedAt,
        netDailyPay,
        isSettled: isDaySettled,
        inlineTransactions: formattedInline,
        runningCumulativeBalance: runningBalance,
      });
    }

    // In a single-sheet ledger, the worker's true net unsettled dues at the end of the calculation stream is the cumulative ledger balance
    const finalLedgerBalance = dayEntries.length > 0
      ? dayEntries[dayEntries.length - 1].runningCumulativeBalance
      : round2(previousBalanceCarriedForward + totalUnsettledIncentives - totalUnsettledAdvances);

    const netPayable = Math.max(0, round2(finalLedgerBalance));
    const advanceOverhang = finalLedgerBalance < 0 ? Math.abs(round2(finalLedgerBalance)) : 0;

    const unsettledEarnings = round2(unsettledNetBaseWages + unsettledApprovedOtAmount + totalUnsettledIncentives);

    // Monthly breakdown aggregation
    const monthGroups = new Map<string, MonthlyBreakdownItem>();

    for (const entry of dayEntries) {
      const monthKey = entry.date.slice(0, 7); // 'YYYY-MM'
      const [y, m] = monthKey.split('-').map(Number);
      const mDate = new Date(y, m - 1, 1);
      const monthLabel = mDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      let group = monthGroups.get(monthKey);
      if (!group) {
        group = {
          monthKey,
          monthLabel,
          wageType: entry.wageType || worker.wageType || 'DAILY',
          monthlySalary: entry.monthlySalary || worker.monthlySalary || 0,
          perDayWage: entry.baseWage,
          daysInMonth: getDaysInCalendarMonth(entry.date),
          totalDays: 0,
          workingDays: 0,
          sundays: 0,
          holidays: 0,
          leaveDays: 0,
          allowedLeaveDays: 0,
          grossWages: 0,
          leaveDeductions: 0,
          netBaseWages: 0,
          otHours: 0,
          otAmount: 0,
          advances: 0,
          incentives: 0,
          payouts: 0,
          netEarnings: 0,
          isSettled: true,
        };
        monthGroups.set(monthKey, group);
      }

      group.totalDays++;
      if (entry.dayType === 'WORKING' && entry.shiftStatus !== 'IN_PROGRESS') group.workingDays++;
      if (entry.dayType === 'SUNDAY') group.sundays++;
      if (entry.dayType === 'HOLIDAY') group.holidays++;
      if (entry.dayType === 'FULL_LEAVE' || entry.dayType === 'HALF_LEAVE') group.leaveDays++;
      if (entry.isAllowedLeave) group.allowedLeaveDays++;

      group.grossWages = round2(group.grossWages + entry.baseWage);
      group.leaveDeductions = round2(group.leaveDeductions + entry.leaveDeduction);
      group.netBaseWages = round2(group.netBaseWages + entry.netDayWage);
      group.otHours += entry.otHours;
      group.otAmount = round2(group.otAmount + entry.otAmount);

      for (const tx of entry.inlineTransactions) {
        if (tx.type === 'ADVANCE_TAKEN') group.advances = round2(group.advances + tx.amount);
        if (tx.type === 'INCENTIVE') group.incentives = round2(group.incentives + tx.amount);
        if (tx.type === 'PAYOUT_SETTLEMENT') group.payouts = round2(group.payouts + tx.amount);
      }
    }

    for (const group of monthGroups.values()) {
      group.netEarnings = round2((group.netBaseWages + group.otAmount + group.incentives) - (group.advances + group.payouts));
      group.isSettled = group.netEarnings <= 0;
    }

    const monthlyBreakdown = Array.from(monthGroups.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    const kpiSummary = {
      totalWorkingDays,
      totalSundays,
      totalHolidayDays,
      totalFullLeaveDays,
      totalHalfDays,
      totalAllowedLeaves,
      unsettledAllowedLeaves,
      grossWages: round2(grossWages),
      totalLeaveDeductions: round2(totalLeaveDeductions),
      netBaseWages: round2(netBaseWages),
      previousBalanceCarriedForward: round2(previousBalanceCarriedForward),
      totalApprovedOtHours,
      totalApprovedOtAmount: round2(totalApprovedOtAmount),
      totalEarnings: unsettledEarnings,
      totalUnsettledAdvances: round2(totalUnsettledAdvances),
      totalUnsettledIncentives: round2(totalUnsettledIncentives),
      netPayable,
      advanceOverhang,
      unsettledWorkingDays: round2(unsettledWorkingDays),
      unsettledGrossWages: round2(unsettledGrossWages),
      unsettledLeaveDeductions: round2(unsettledLeaveDeductions),
      unsettledNetBaseWages: round2(unsettledNetBaseWages),
      unsettledApprovedOtHours,
      unsettledApprovedOtAmount: round2(unsettledApprovedOtAmount),
    };

    // Fetch historical settlements for archive briefs
    const settlements = await PayrollRepository.findWageTransactions({
      workerId: params.workerId,
      type: 'PAYOUT_SETTLEMENT',
    });

    const formattedSettlements = settlements.map((s) => ({
      id: s._id.toString(),
      date: formatDateStr(new Date(s.date)),
      amount: s.amount,
      periodCovered: s.periodCovered
        ? {
            startDate: s.periodCovered.startDate ? formatDateStr(new Date(s.periodCovered.startDate)) : '',
            endDate: s.periodCovered.endDate ? formatDateStr(new Date(s.periodCovered.endDate)) : '',
          }
        : undefined,
      notes: s.notes,
      paymentMethod: s.paymentMethod,
      referenceNote: s.referenceNote,
      settledByName: s.settledByName,
      carriedForwardBalance: s.carriedForwardBalance || 0,
      itemizedSummary: s.itemizedSummary,
    }));

    const lastSettlementBrief: ISettlementBrief | null =
      (worker.payrollSnapshot as any)?.lastSettlementBrief ||
      (formattedSettlements.length > 0 && formattedSettlements[0].itemizedSummary
        ? {
            settlementId: formattedSettlements[0].id,
            settledAt: new Date(settlements[0].date),
            settledUpToDate: formattedSettlements[0].periodCovered?.endDate || '',
            periodCovered: formattedSettlements[0].periodCovered || { startDate: '', endDate: '' },
            dailyWageAtSettlement: formattedSettlements[0].itemizedSummary.dailyWageAtSettlement || worker.dailyWage || 0,
            totalWorkingDays: formattedSettlements[0].itemizedSummary.totalWorkingDays || 0,
            totalSundays: formattedSettlements[0].itemizedSummary.totalSundays || 0,
            totalHolidays: formattedSettlements[0].itemizedSummary.totalHolidays || 0,
            totalFullLeaves: formattedSettlements[0].itemizedSummary.totalFullLeaves || 0,
            totalHalfDays: formattedSettlements[0].itemizedSummary.totalHalfDays || 0,
            allowedLeaveDays: formattedSettlements[0].itemizedSummary.allowedLeaveDays || 0,
            grossWages: formattedSettlements[0].itemizedSummary.grossWages || 0,
            totalLeaveDeduction: formattedSettlements[0].itemizedSummary.totalLeaveDeduction || 0,
            netBaseWage: formattedSettlements[0].itemizedSummary.netBaseWage || 0,
            totalOtHours: formattedSettlements[0].itemizedSummary.totalOtHours || 0,
            totalOtAmount: formattedSettlements[0].itemizedSummary.totalOtAmount || 0,
            totalAdvancesDeducted: formattedSettlements[0].itemizedSummary.totalAdvancesDeducted || 0,
            totalIncentives: formattedSettlements[0].itemizedSummary.totalIncentives || 0,
            netPayableBeforePayout: formattedSettlements[0].itemizedSummary.netPayableBeforePayout || formattedSettlements[0].amount,
            amountSettled: formattedSettlements[0].amount,
            carriedForwardBalance: formattedSettlements[0].carriedForwardBalance || 0,
            advanceOverhang: formattedSettlements[0].itemizedSummary.advanceOverhang || 0,
            paymentMethod: formattedSettlements[0].paymentMethod || 'CASH',
            referenceNote: formattedSettlements[0].referenceNote,
            settledByName: formattedSettlements[0].settledByName || 'Admin',
          }
        : null);

    // Persist real-time snapshot to the database for instant queries & data resilience
    await PayrollRepository.updateWorkerPayrollSnapshot(params.workerId, {
      netPayable,
      unsettledGross: round2(unsettledGrossWages),
      unsettledDeductions: round2(unsettledLeaveDeductions),
      unsettledOtAmount: round2(unsettledApprovedOtAmount),
      unsettledAdvances: round2(totalUnsettledAdvances),
      unsettledIncentives: round2(totalUnsettledIncentives),
      advanceOverhang,
      unsettledWorkingDays: round2(unsettledWorkingDays),
      firstPayrollDate: firstPayrollDateStr,
      lastSettledDate: worker.lastSettledDate || null,
      lastCalculatedAt: new Date(),
      lastSettlementBrief,
    });

    const allOtClaims = Array.from(otMap.values())
      .flat()
      .map((c) => ({
        id: c._id.toString(),
        date: c.date,
        otHours: c.otHours,
        amount: (c.otHours || 0) * OT_HOURLY_RATE,
        status: c.status,
        note: c.note || '',
        rejectionReason: c.rejectionReason || '',
        reviewerName: c.reviewerName || '',
        reviewedAt: c.reviewedAt,
        flaggedReason: c.flaggedReason || '',
        isSettled: Boolean(c.isSettled),
        settledAt: c.settledAt,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      worker: {
        id: worker._id,
        name: worker.name,
        mobile: worker.mobile,
        profileImageUrl: worker.profileImageUrl || '',
        wageType: worker.wageType || 'DAILY',
        monthlySalary: worker.monthlySalary || 0,
        dailyWage: worker.dailyWage || 0,
        dailyWageEffectiveDate: worker.dailyWageEffectiveDate,
        lastSettledDate: worker.lastSettledDate,
        firstPayrollDate: firstPayrollDateStr,
      },
      period: {
        startDate: startStr,
        endDate: endStr,
        totalDays: dateList.length,
      },
      kpis: kpiSummary,
      monthlyBreakdown,
      days: dayEntries.reverse(), // Newest date first for instant viewing
      hasWageAssigned: true,
      lastSettlementBrief,
      settlements: formattedSettlements,
      otClaims: allOtClaims,
    };
  }

  /**
   * Settle unsettled dues for a worker:
   * 1. Calculates unsettled dues up to endDate
   * 2. Logs PAYOUT_SETTLEMENT WageTransaction
   * 3. Marks WageAdjustments, ADVANCE_TAKEN, and INCENTIVE as settled
   * 4. Updates worker.lastSettledDate
   */
  static async settlePayroll(params: {
    workerId: string;
    endDate?: string;
    amountPaid?: number;
    paymentMethod?: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    referenceNote?: string;
    settledByName?: string;
  }) {
    const worker = await PayrollRepository.findWorkerById(params.workerId);
    if (!worker) throw new AppError('Worker not found', 404);

    const endDateStr = params.endDate || formatDateStr(new Date());

    // Compute exact unsettled dues up to endDateStr
    const sheet = await this.getWorkerSingleSheet({
      workerId: params.workerId,
      endDate: endDateStr,
      includeSettledHistory: true,
    });

    const netPayable = sheet.kpis.netPayable;
    const amountToDisburse = params.amountPaid !== undefined ? params.amountPaid : netPayable;
    const carriedForwardBalance = Math.max(0, netPayable - amountToDisburse);

    const settlementBrief: ISettlementBrief = {
      settlementId: '',
      settledAt: new Date(),
      settledUpToDate: endDateStr,
      periodCovered: {
        startDate: sheet.period.startDate,
        endDate: endDateStr,
      },
      wageType: worker.wageType || 'DAILY',
      monthlySalaryAtSettlement: worker.monthlySalary || 0,
      dailyWageAtSettlement: worker.dailyWage || 0,
      totalWorkingDays: sheet.kpis.totalWorkingDays,
      totalSundays: sheet.kpis.totalSundays,
      totalHolidays: sheet.kpis.totalHolidayDays,
      totalFullLeaves: sheet.kpis.totalFullLeaveDays,
      totalHalfDays: sheet.kpis.totalHalfDays,
      allowedLeaveDays: sheet.kpis.totalAllowedLeaves || 0,
      grossWages: sheet.kpis.grossWages,
      totalLeaveDeduction: sheet.kpis.totalLeaveDeductions,
      netBaseWage: sheet.kpis.netBaseWages,
      totalOtHours: sheet.kpis.totalApprovedOtHours,
      totalOtAmount: sheet.kpis.totalApprovedOtAmount,
      totalAdvancesDeducted: sheet.kpis.totalUnsettledAdvances,
      totalIncentives: (sheet.kpis as any).totalUnsettledIncentives || 0,
      netPayableBeforePayout: netPayable,
      amountSettled: amountToDisburse,
      carriedForwardBalance,
      advanceOverhang: sheet.kpis.advanceOverhang || 0,
      paymentMethod: params.paymentMethod || 'CASH',
      referenceNote: params.referenceNote || '',
      settledByName: params.settledByName || 'Admin',
    };

    // Create Settlement WageTransaction
    const settlementTx = await PayrollRepository.createWageTransaction({
      workerId: params.workerId,
      type: 'PAYOUT_SETTLEMENT',
      amount: amountToDisburse,
      date: new Date(),
      periodCovered: {
        startDate: new Date(`${sheet.period.startDate}T00:00:00.000Z`),
        endDate: new Date(`${endDateStr}T23:59:59.999Z`),
      },
      notes: `Settlement payout for period ${sheet.period.startDate} to ${endDateStr}`,
      paymentMethod: params.paymentMethod || 'CASH',
      referenceNote: params.referenceNote || '',
      settledByName: params.settledByName || 'Admin',
      carriedForwardBalance,
      itemizedSummary: settlementBrief as any,
    });

    settlementBrief.settlementId = settlementTx._id.toString();

    // Mark adjustments, advances, and incentives settled
    await PayrollRepository.markAdjustmentsSettled(
      params.workerId,
      endDateStr,
      settlementTx._id as mongoose.Types.ObjectId
    );

    await PayrollRepository.markAdvancesSettled(
      params.workerId,
      new Date(`${endDateStr}T23:59:59.999Z`),
      settlementTx._id as mongoose.Types.ObjectId
    );

    await PayrollRepository.markIncentivesSettled(
      params.workerId,
      new Date(`${endDateStr}T23:59:59.999Z`),
      settlementTx._id as mongoose.Types.ObjectId
    );

    // Sync to legacy PayrollSettlement collection for 100% data consistency
    await PayrollRepository.syncLegacySettlementRecord({
      workerId: params.workerId,
      workerName: worker.name,
      workerMobile: worker.mobile,
      dailyWage: worker.dailyWage || 0,
      startDate: new Date(`${sheet.period.startDate}T00:00:00.000Z`),
      endDate: new Date(`${endDateStr}T23:59:59.999Z`),
      totalWorkingDays: sheet.kpis.totalWorkingDays,
      totalSundays: sheet.kpis.totalSundays,
      totalHolidays: sheet.kpis.totalHolidayDays,
      totalFullLeaves: sheet.kpis.totalFullLeaveDays,
      totalHalfDays: sheet.kpis.totalHalfDays,
      grossWages: sheet.kpis.grossWages,
      totalLeaveDeduction: sheet.kpis.totalLeaveDeductions,
      totalOtHours: sheet.kpis.totalApprovedOtHours,
      totalOtAmount: sheet.kpis.totalApprovedOtAmount,
      totalAdvancesDeducted: sheet.kpis.totalUnsettledAdvances,
      netPayable,
      amountPaid: amountToDisburse,
      paymentMethod: params.paymentMethod || 'CASH',
      settledBy: params.settledByName,
    });

    // Update worker's lastSettledDate at clean midday UTC to prevent timezone rollover
    const [sy, sm, sd] = endDateStr.split('-').map(Number);
    const settledUtcDate = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
    await PayrollRepository.updateWorkerLastSettledDate(params.workerId, settledUtcDate);

    // Persist settled snapshot to DB with the brief
    await PayrollRepository.updateWorkerPayrollSnapshot(params.workerId, {
      netPayable: carriedForwardBalance,
      unsettledGross: 0,
      unsettledDeductions: 0,
      unsettledOtAmount: 0,
      unsettledAdvances: 0,
      unsettledIncentives: 0,
      advanceOverhang: 0,
      unsettledWorkingDays: 0,
      firstPayrollDate: getWorkerFirstPayrollDate(worker),
      lastSettledDate: settledUtcDate,
      lastCalculatedAt: new Date(),
      lastSettlementBrief: settlementBrief,
    });

    try {
      const { emitPayrollSettled } = await import('../../config/socket');
      emitPayrollSettled(params.workerId, {
        settlementId: settlementTx._id,
        workerName: worker.name,
        amount: amountToDisburse,
        paymentMethod: params.paymentMethod || 'CASH',
        period: { startDate: sheet.period.startDate, endDate: endDateStr },
        carriedForwardBalance,
        totalWorkingDays: sheet.kpis.totalWorkingDays,
        totalApprovedOtHours: sheet.kpis.totalApprovedOtHours,
      });
    } catch {
      // Socket emission non-fatal
    }

    return {
      message: `Payroll successfully settled for ${worker.name}`,
      settlement: settlementTx,
      netPayable,
      amountPaid: amountToDisburse,
      carriedForwardBalance,
    };
  }

  /**
   * Record Cash Advance (ADVANCE_TAKEN)
   */
  static async recordCashAdvance(params: {
    workerId: string;
    amount: number;
    date?: string;
    notes?: string;
    recordedByName?: string;
  }) {
    const worker = await PayrollRepository.findWorkerById(params.workerId);
    if (!worker) throw new AppError('Worker not found', 404);

    const advanceTx = await PayrollRepository.createWageTransaction({
      workerId: params.workerId,
      type: 'ADVANCE_TAKEN',
      amount: params.amount,
      date: params.date ? new Date(`${params.date}T12:00:00.000Z`) : new Date(),
      notes: params.notes || 'Mid-cycle cash advance',
      settledByName: params.recordedByName || 'Admin',
    });

    try {
      await this.getWorkerSingleSheet({ workerId: params.workerId, includeSettledHistory: true });
    } catch {
      // Snapshot sync non-fatal
    }

    return {
      message: `Cash advance of ₹${params.amount} recorded for ${worker.name}`,
      advance: advanceTx,
    };
  }

  /**
   * Record Performance/Special Incentive (INCENTIVE)
   * Decided by Admin with proper remarks, reflects directly on payable & ledger
   */
  static async recordIncentive(params: {
    workerId: string;
    amount: number;
    date?: string;
    notes?: string;
    recordedByName?: string;
  }) {
    const worker = await PayrollRepository.findWorkerById(params.workerId);
    if (!worker) throw new AppError('Worker not found', 404);
    if (!params.amount || params.amount <= 0) {
      throw new AppError('Incentive amount must be greater than zero', 400);
    }

    const incentiveTx = await PayrollRepository.createWageTransaction({
      workerId: params.workerId,
      type: 'INCENTIVE',
      amount: params.amount,
      date: params.date ? new Date(`${params.date}T12:00:00.000Z`) : new Date(),
      notes: params.notes || 'Performance Incentive',
      settledByName: params.recordedByName || 'Admin',
      isSettled: false,
    });

    try {
      const { emitPayrollIncentiveAwarded } = await import('../../config/socket');
      emitPayrollIncentiveAwarded(params.workerId, {
        id: incentiveTx._id,
        amount: params.amount,
        notes: params.notes || 'Performance Incentive',
        workerName: worker.name,
        date: params.date || new Date().toISOString().split('T')[0],
      });
    } catch {
      // Socket emission non-fatal
    }

    try {
      await this.getWorkerSingleSheet({ workerId: params.workerId, includeSettledHistory: true });
    } catch {
      // Snapshot sync non-fatal
    }

    return {
      message: `Incentive of ₹${params.amount} awarded to ${worker.name}`,
      incentive: incentiveTx,
    };
  }

  /**
   * Edit existing leave adjustment (Full Leave <-> Half Day, Date, Note)
   */
  static async updateLeaveAdjustment(params: {
    adjustmentId: string;
    type?: 'FULL_LEAVE' | 'HALF_LEAVE';
    date?: string;
    note?: string;
    updatedBy?: string;
    updatedByName?: string;
  }) {
    const adj = await PayrollRepository.findWageAdjustmentById(params.adjustmentId);
    if (!adj) throw new AppError('Leave record not found', 404);
    if (adj.isSettled) throw new AppError('Cannot edit settled leave', 400);

    const workerIdStr = (adj.workerId as any)?._id?.toString() || adj.workerId?.toString();
    const worker = await PayrollRepository.findWorkerById(workerIdStr);
    if (!worker) throw new AppError('Worker not found', 404);

    const targetDate = params.date || adj.date;
    const leaveType = params.type || (adj.type as 'FULL_LEAVE' | 'HALF_LEAVE');
    const wageDecision = getWageDecisionForDate(worker, targetDate);
    const dailyWage = wageDecision.perDayWage;

    const mKey = targetDate.substring(0, 7);
    const monthLeaves = await PayrollRepository.findWageAdjustments({
      workerId: workerIdStr,
      startDate: `${mKey}-01`,
      endDate: `${mKey}-31`,
      types: ['FULL_LEAVE', 'HALF_LEAVE'],
    });

    const otherLeavesInMonth = monthLeaves.filter((l) => l._id.toString() !== params.adjustmentId);
    otherLeavesInMonth.sort((a, b) => a.date.localeCompare(b.date));

    // First leave in month is the Allowed Paid Leave with ₹0 deduction
    const isFirstInMonth = otherLeavesInMonth.length === 0 || targetDate <= otherLeavesInMonth[0].date;

    let deductionAmount = 0;
    let isAllowedLeave = false;
    if (isFirstInMonth) {
      deductionAmount = 0;
      isAllowedLeave = true;
    } else if (wageDecision.wageType === 'MONTHLY') {
      deductionAmount = leaveType === 'FULL_LEAVE' ? dailyWage : round2(dailyWage / 2);
    } else if (leaveType === 'FULL_LEAVE') {
      deductionAmount = calculateFullLeaveDeduction(dailyWage);
    } else if (leaveType === 'HALF_LEAVE') {
      deductionAmount = calculateHalfDayDeduction(dailyWage);
    }

    const editLog = params.updatedBy
      ? {
          editedBy: new mongoose.Types.ObjectId(params.updatedBy),
          editedByName: params.updatedByName || 'Admin',
          editedAt: new Date(),
          previousValues: {
            type: adj.type,
            date: adj.date,
            deductionAmount: adj.deductionAmount,
            note: adj.note,
          },
          note: `Updated to ${leaveType === 'FULL_LEAVE' ? 'Full Leave' : 'Half Day'}${isAllowedLeave ? ' (Paid)' : ''}`,
        }
      : undefined;

    const updated = await PayrollRepository.updateWageAdjustment(
      params.adjustmentId,
      {
        type: leaveType,
        date: targetDate,
        deductionAmount,
        isAllowedLeave,
        note: params.note !== undefined ? params.note : adj.note,
        updatedBy: params.updatedBy ? new mongoose.Types.ObjectId(params.updatedBy) : undefined,
        updatedByName: params.updatedByName || 'Admin',
        lastEditedAt: new Date(),
      },
      editLog
    );

    return {
      message: 'Leave updated successfully',
      adjustment: updated,
    };
  }

  /**
   * Edit OT claim (hours, date, note, status)
   */
  static async updateOtClaim(params: {
    claimId: string;
    otHours?: number;
    date?: string;
    note?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy?: string;
    updatedBy?: string;
    updatedByName?: string;
  }) {
    const claim = await PayrollRepository.findWageAdjustmentById(params.claimId);
    if (!claim) throw new AppError('Overtime claim not found', 404);
    if (claim.isSettled) throw new AppError('Cannot edit settled overtime claim', 400);

    const updates: any = {};
    if (params.otHours !== undefined) {
      const roundedHours = Math.floor(params.otHours);
      if (roundedHours < 1) throw new AppError('Overtime must be at least 1 whole hour', 400);
      updates.otHours = roundedHours;
    }
    if (params.date) updates.date = params.date;
    if (params.note !== undefined) updates.note = params.note;
    if (params.status) {
      updates.status = params.status;
      if (params.reviewedBy) updates.reviewedBy = new mongoose.Types.ObjectId(params.reviewedBy);
      updates.reviewedAt = new Date();
    }

    const editLog = params.updatedBy
      ? {
          editedBy: new mongoose.Types.ObjectId(params.updatedBy),
          editedByName: params.updatedByName || 'Admin',
          editedAt: new Date(),
          previousValues: {
            otHours: claim.otHours,
            date: claim.date,
            note: claim.note,
            status: claim.status,
          },
          note: `Modified OT claim`,
        }
      : undefined;

    if (params.updatedBy) {
      updates.updatedBy = new mongoose.Types.ObjectId(params.updatedBy);
      updates.updatedByName = params.updatedByName || 'Admin';
      updates.lastEditedAt = new Date();
    }

    const updated = await PayrollRepository.updateWageAdjustment(params.claimId, updates, editLog);
    return {
      message: 'Overtime claim updated successfully',
      claim: updated,
    };
  }

  /**
   * Delete unsettled wage transaction (accidental cash advance or incentive)
   */
  static async deleteWageTransaction(id: string) {
    const tx = await PayrollRepository.findWageTransactionById(id);
    if (!tx) throw new AppError('Transaction not found', 404);
    if (tx.isSettled || tx.type === 'PAYOUT_SETTLEMENT') {
      throw new AppError('Cannot delete settled transaction or settlement payout', 400);
    }
    const workerIdStr = (tx.workerId as any)?._id?.toString() || tx.workerId?.toString();
    await PayrollRepository.deleteWageTransaction(id);
    try {
      await this.getWorkerSingleSheet({ workerId: workerIdStr, includeSettledHistory: true });
    } catch {
      // Snapshot sync non-fatal
    }
    return { message: 'Transaction removed successfully' };
  }

  /**
   * Admin Roster Overview: lists all workers with current daily wage, last settlement, unsettled dues,
   * and pending OT claim counts.
   */
  static async getAdminOverview() {
    const workers = await PayrollRepository.findAllWorkers();
    const pendingOtClaims = await PayrollRepository.findPendingOtClaims();

    const pendingOtWorkerMap = new Map<string, number>();
    for (const claim of pendingOtClaims) {
      const wId = (claim.workerId as any)?._id?.toString() || claim.workerId?.toString();
      pendingOtWorkerMap.set(wId, (pendingOtWorkerMap.get(wId) || 0) + 1);
    }

    const workerSummaries = await Promise.all(
      workers.map(async (worker) => {
        try {
          const sheet = await this.getWorkerSingleSheet({
            workerId: worker._id.toString(),
            includeSettledHistory: true,
          });

          const hasWageAssigned =
            (sheet as any).hasWageAssigned !== false &&
            (worker.wageType === 'MONTHLY'
              ? Boolean(worker.monthlySalary && worker.monthlySalary > 0)
              : Boolean(worker.dailyWage && worker.dailyWage > 0));

          return {
            workerId: worker._id,
            name: worker.name,
            mobile: worker.mobile,
            profileImageUrl: worker.profileImageUrl || '',
            role: worker.role,
            wageType: worker.wageType || 'DAILY',
            monthlySalary: worker.monthlySalary || 0,
            dailyWage: worker.dailyWage || 0,
            dailyWageEffectiveDate: worker.dailyWageEffectiveDate,
            lastSettledDate: worker.lastSettledDate,
            firstPayrollDate: (sheet.worker as any).firstPayrollDate || getWorkerFirstPayrollDate(worker) || null,
            hasWageAssigned,
            unsettledGross: sheet.kpis.unsettledGrossWages ?? sheet.kpis.grossWages,
            unsettledDeductions: sheet.kpis.unsettledLeaveDeductions ?? sheet.kpis.totalLeaveDeductions,
            unsettledOtAmount: sheet.kpis.unsettledApprovedOtAmount ?? sheet.kpis.totalApprovedOtAmount,
            unsettledAdvances: sheet.kpis.totalUnsettledAdvances,
            unsettledIncentives: (sheet.kpis as any).totalUnsettledIncentives || 0,
            netPayable: sheet.kpis.netPayable,
            advanceOverhang: sheet.kpis.advanceOverhang || 0,
            unsettledWorkingDays: sheet.kpis.unsettledWorkingDays || 0,
            pendingOtCount: pendingOtWorkerMap.get(worker._id.toString()) || 0,
          };
        } catch {
          return {
            workerId: worker._id,
            name: worker.name,
            mobile: worker.mobile,
            profileImageUrl: worker.profileImageUrl || '',
            role: worker.role,
            wageType: worker.wageType || 'DAILY',
            monthlySalary: worker.monthlySalary || 0,
            dailyWage: worker.dailyWage || 0,
            dailyWageEffectiveDate: worker.dailyWageEffectiveDate,
            lastSettledDate: worker.lastSettledDate,
            firstPayrollDate: getWorkerFirstPayrollDate(worker) || null,
            hasWageAssigned:
              worker.wageType === 'MONTHLY'
                ? Boolean(worker.monthlySalary && worker.monthlySalary > 0)
                : Boolean(worker.dailyWage && worker.dailyWage > 0),
            unsettledGross: 0,
            unsettledDeductions: 0,
            unsettledOtAmount: 0,
            unsettledAdvances: 0,
            unsettledIncentives: 0,
            netPayable: 0,
            advanceOverhang: 0,
            unsettledWorkingDays: 0,
            pendingOtCount: pendingOtWorkerMap.get(worker._id.toString()) || 0,
          };
        }
      })
    );

    const totalUnsettledNet = round2(workerSummaries.reduce((sum, w) => sum + w.netPayable, 0));
    const totalPendingOtCount = pendingOtClaims.length;

    return {
      kpis: {
        totalWorkers: workers.length,
        totalUnsettledNet,
        totalPendingOtCount,
      },
      workers: workerSummaries,
      pendingOtClaims: pendingOtClaims.map((c: any) => ({
        id: c._id,
        workerId: c.workerId?._id || c.workerId,
        workerName: c.workerId?.name || 'Worker',
        workerMobile: c.workerId?.mobile || '',
        workerProfileImageUrl: c.workerId?.profileImageUrl || '',
        date: c.date,
        otHours: c.otHours,
        potentialAmount: (c.otHours || 0) * OT_HOURLY_RATE,
        note: c.note,
        flaggedReason: c.flaggedReason,
        updatedByName: c.updatedByName,
        lastEditedAt: c.lastEditedAt,
        createdAt: c.createdAt,
      })),
    };
  }
}
