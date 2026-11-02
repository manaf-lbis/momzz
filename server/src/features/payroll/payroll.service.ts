import mongoose from 'mongoose';
import { PayrollRepository } from './payroll.repository';
import { IUser } from '../../models/User.model';
import { IWageAdjustment } from '../../models/WageAdjustment.model';
import { IGarageHoliday } from '../../models/GarageHoliday.model';
import { IWageTransaction } from '../../models/WageTransaction.model';
import { AppError } from '../../shared/utils/appError';

export const OT_HOURLY_RATE = 150;

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
 * Finds the applicable daily wage for a worker on a specific date string (YYYY-MM-DD)
 */
export function getWageForDate(worker: IUser, dateStr: string): number {
  if (!worker.wageHistory || worker.wageHistory.length === 0) {
    return worker.dailyWage || 0;
  }

  const targetDate = new Date(`${dateStr}T23:59:59.999Z`);
  const sorted = [...worker.wageHistory].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  for (const record of sorted) {
    if (new Date(record.effectiveDate) <= targetDate) {
      return record.wage;
    }
  }

  // Fallback to earliest wage in history or current wage
  const earliest = sorted[sorted.length - 1];
  return earliest ? earliest.wage : worker.dailyWage || 0;
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
  holidayTitle?: string;
  adjustmentId?: string;
  adjustmentNote?: string;
  baseWage: number;
  leaveDeduction: number;
  netDayWage: number;
  otHours: number;
  otAmount: number;
  otStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  netDailyPay: number;
  isSettled: boolean;
  inlineTransactions: Array<{
    id: string;
    type: 'PAYOUT_SETTLEMENT' | 'ADVANCE_TAKEN';
    amount: number;
    notes?: string;
    paymentMethod?: string;
    referenceNote?: string;
    carriedForwardBalance?: number;
  }>;
  runningCumulativeBalance: number;
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

      for (const date of targetDates) {
        const dailyWage = getWageForDate(worker, date);
        const deductionAmount =
          leaveType === 'FULL_LEAVE'
            ? calculateFullLeaveDeduction(dailyWage)
            : calculateHalfDayDeduction(dailyWage);

        const adj = await PayrollRepository.upsertLeaveAdjustment({
          workerId: worker._id.toString(),
          date,
          type: leaveType,
          deductionAmount,
          note: params.note || '',
        });

        results.push({
          workerId: worker._id,
          workerName: worker.name,
          date,
          type: leaveType,
          dailyWage,
          deductionAmount,
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

    const claim = await PayrollRepository.createOtClaim({
      workerId: params.workerId,
      date: params.date,
      otHours: roundedHours,
      note: params.note,
    });

    return {
      message: 'Overtime claim submitted successfully for admin review',
      claim,
      ratePerHour: OT_HOURLY_RATE,
      potentialAmount: roundedHours * OT_HOURLY_RATE,
    };
  }

  /**
   * Admin approves or rejects OT claim
   */
  static async reviewOtClaim(params: {
    claimId: string;
    status: 'APPROVED' | 'REJECTED';
    reviewedBy: string;
    note?: string;
  }) {
    const claim = await PayrollRepository.findWageAdjustmentById(params.claimId);
    if (!claim) throw new AppError('Overtime claim not found', 404);
    if (claim.type !== 'OVERTIME') throw new AppError('Adjustment is not an overtime claim', 400);

    const updated = await PayrollRepository.updateOtStatus(
      params.claimId,
      params.status,
      params.reviewedBy,
      params.note
    );

    return {
      message: `Overtime claim marked as ${params.status}`,
      claim: updated,
    };
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

    // Determine calculation window:
    // If startDate not provided: start from day after lastSettledDate, or worker joining/30 days ago
    let startStr = params.startDate;
    if (!startStr) {
      if (params.includeSettledHistory) {
        // Look back 60 days or worker creation
        const lookback = new Date();
        lookback.setDate(lookback.getDate() - 60);
        startStr = formatDateStr(lookback);
      } else if (worker.lastSettledDate) {
        const nextDay = new Date(worker.lastSettledDate);
        nextDay.setDate(nextDay.getDate() + 1);
        startStr = formatDateStr(nextDay);
      } else {
        // Start from beginning of current month or 30 days ago
        const firstDayMonth = new Date();
        firstDayMonth.setDate(1);
        startStr = formatDateStr(firstDayMonth);
      }
    }

    const endStr = params.endDate || todayStr;

    // If start is after end (e.g. settled today), ensure at least today is shown
    if (startStr > endStr) {
      startStr = endStr;
    }

    // Fetch garage holidays, adjustments, and transactions
    const holidays = await PayrollRepository.findHolidays(startStr, endStr);
    const holidayMap = new Map<string, IGarageHoliday>();
    holidays.forEach((h) => holidayMap.set(h.date, h));

    const adjustments = await PayrollRepository.findWageAdjustments({
      workerId: params.workerId,
      startDate: startStr,
      endDate: endStr,
    });

    const leaveMap = new Map<string, IWageAdjustment>();
    const otMap = new Map<string, IWageAdjustment[]>();

    for (const adj of adjustments) {
      if (adj.type === 'FULL_LEAVE' || adj.type === 'HALF_LEAVE') {
        leaveMap.set(adj.date, adj);
      } else if (adj.type === 'OVERTIME') {
        const list = otMap.get(adj.date) || [];
        list.push(adj);
        otMap.set(adj.date, list);
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

    // Generate day-by-day continuous stream
    const dateList = getDatesBetween(startStr, endStr);
    const dayEntries: SingleSheetDayEntry[] = [];

    let grossWages = 0;
    let totalLeaveDeductions = 0;
    let netBaseWages = 0;
    let totalApprovedOtHours = 0;
    let totalApprovedOtAmount = 0;
    let totalWorkingDays = 0;
    let totalSundays = 0;
    let totalHolidayDays = 0;
    let totalFullLeaveDays = 0;
    let totalHalfDays = 0;
    let runningBalance = 0;

    for (const dStr of dateList) {
      const dObj = new Date(`${dStr}T00:00:00`);
      const isSunday = dObj.getDay() === 0;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dObj.getDay()];

      const holiday = holidayMap.get(dStr);
      const leave = leaveMap.get(dStr);
      const otClaims = otMap.get(dStr) || [];

      const currentDailyWage = getWageForDate(worker, dStr);

      let dayType: SingleSheetDayEntry['dayType'] = 'WORKING';
      let baseWage = currentDailyWage;
      let leaveDeduction = 0;
      let netDayWage = currentDailyWage;

      if (leave) {
        if (leave.type === 'FULL_LEAVE') {
          dayType = 'FULL_LEAVE';
          leaveDeduction = leave.deductionAmount || calculateFullLeaveDeduction(currentDailyWage);
          netDayWage = Math.max(0, currentDailyWage - leaveDeduction);
          totalFullLeaveDays++;
          totalLeaveDeductions += leaveDeduction;
        } else if (leave.type === 'HALF_LEAVE') {
          dayType = 'HALF_LEAVE';
          leaveDeduction = leave.deductionAmount || calculateHalfDayDeduction(currentDailyWage);
          netDayWage = Math.max(0, currentDailyWage - leaveDeduction);
          totalHalfDays++;
          totalLeaveDeductions += leaveDeduction;
        }
      } else if (holiday && holiday.isPaid) {
        dayType = 'HOLIDAY';
        baseWage = currentDailyWage;
        leaveDeduction = 0;
        netDayWage = currentDailyWage;
        totalHolidayDays++;
      } else if (isSunday) {
        dayType = 'SUNDAY';
        baseWage = 0;
        leaveDeduction = 0;
        netDayWage = 0;
        totalSundays++;
      } else {
        dayType = 'WORKING';
        baseWage = currentDailyWage;
        leaveDeduction = 0;
        netDayWage = currentDailyWage;
        totalWorkingDays++;
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

      const netDailyPay = netDayWage + dayOtAmount;
      runningBalance += netDailyPay;

      // Inline transactions for this date
      const inlineTxs = txMap.get(dStr) || [];
      const formattedInline = inlineTxs.map((t) => {
        if (t.type === 'ADVANCE_TAKEN') {
          runningBalance -= t.amount;
        } else if (t.type === 'PAYOUT_SETTLEMENT') {
          runningBalance -= t.amount;
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

      dayEntries.push({
        date: dStr,
        dayName,
        dayType,
        holidayTitle: holiday?.title,
        adjustmentId: leave?._id?.toString(),
        adjustmentNote: leave?.note,
        baseWage,
        leaveDeduction,
        netDayWage,
        otHours: dayOtHours,
        otAmount: dayOtAmount,
        otStatus,
        netDailyPay,
        isSettled: leave?.isSettled || false,
        inlineTransactions: formattedInline,
        runningCumulativeBalance: runningBalance,
      });
    }

    // Dynamic Net Payable Calculation
    const totalEarnings = netBaseWages + totalApprovedOtAmount;
    const netPayable = Math.max(0, totalEarnings - totalUnsettledAdvances);

    return {
      worker: {
        id: worker._id,
        name: worker.name,
        mobile: worker.mobile,
        dailyWage: worker.dailyWage || 0,
        lastSettledDate: worker.lastSettledDate,
      },
      period: {
        startDate: startStr,
        endDate: endStr,
        totalDays: dateList.length,
      },
      kpis: {
        totalWorkingDays,
        totalSundays,
        totalHolidayDays,
        totalFullLeaveDays,
        totalHalfDays,
        grossWages,
        totalLeaveDeductions,
        netBaseWages,
        totalApprovedOtHours,
        totalApprovedOtAmount,
        totalEarnings,
        totalUnsettledAdvances,
        netPayable,
      },
      days: dayEntries.reverse(), // Newest date first for instant viewing
    };
  }

  /**
   * Settle unsettled dues for a worker:
   * 1. Calculates unsettled dues up to endDate
   * 2. Logs PAYOUT_SETTLEMENT WageTransaction
   * 3. Marks WageAdjustments and ADVANCE_TAKEN as settled
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
      includeSettledHistory: false,
    });

    const netPayable = sheet.kpis.netPayable;
    const amountToDisburse = params.amountPaid !== undefined ? params.amountPaid : netPayable;
    const carriedForwardBalance = Math.max(0, netPayable - amountToDisburse);

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
      itemizedSummary: {
        totalWorkingDays: sheet.kpis.totalWorkingDays,
        totalSundays: sheet.kpis.totalSundays,
        totalHolidays: sheet.kpis.totalHolidayDays,
        totalFullLeaves: sheet.kpis.totalFullLeaveDays,
        totalHalfDays: sheet.kpis.totalHalfDays,
        grossWages: sheet.kpis.grossWages,
        totalLeaveDeduction: sheet.kpis.totalLeaveDeductions,
        netBaseWage: sheet.kpis.netBaseWages,
        totalOtHours: sheet.kpis.totalApprovedOtHours,
        totalOtAmount: sheet.kpis.totalApprovedOtAmount,
        totalAdvancesDeducted: sheet.kpis.totalUnsettledAdvances,
        carriedForwardBalance,
      },
    });

    // Mark adjustments and advances settled
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

    // Update worker's lastSettledDate
    await PayrollRepository.updateWorkerLastSettledDate(params.workerId, new Date(`${endDateStr}T23:59:59.999Z`));

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

    return {
      message: `Cash advance of ₹${params.amount} recorded for ${worker.name}`,
      advance: advanceTx,
    };
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
            includeSettledHistory: false,
          });

          return {
            workerId: worker._id,
            name: worker.name,
            mobile: worker.mobile,
            role: worker.role,
            dailyWage: worker.dailyWage || 0,
            lastSettledDate: worker.lastSettledDate,
            unsettledGross: sheet.kpis.grossWages,
            unsettledDeductions: sheet.kpis.totalLeaveDeductions,
            unsettledOtAmount: sheet.kpis.totalApprovedOtAmount,
            unsettledAdvances: sheet.kpis.totalUnsettledAdvances,
            netPayable: sheet.kpis.netPayable,
            pendingOtCount: pendingOtWorkerMap.get(worker._id.toString()) || 0,
          };
        } catch {
          return {
            workerId: worker._id,
            name: worker.name,
            mobile: worker.mobile,
            role: worker.role,
            dailyWage: worker.dailyWage || 0,
            lastSettledDate: worker.lastSettledDate,
            unsettledGross: 0,
            unsettledDeductions: 0,
            unsettledOtAmount: 0,
            unsettledAdvances: 0,
            netPayable: 0,
            pendingOtCount: pendingOtWorkerMap.get(worker._id.toString()) || 0,
          };
        }
      })
    );

    const totalUnsettledNet = workerSummaries.reduce((sum, w) => sum + w.netPayable, 0);
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
        date: c.date,
        otHours: c.otHours,
        potentialAmount: (c.otHours || 0) * OT_HOURLY_RATE,
        note: c.note,
        createdAt: c.createdAt,
      })),
    };
  }
}
