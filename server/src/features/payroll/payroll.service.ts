import mongoose from 'mongoose';
import { IPayrollRepository, PayrollRepository } from './payroll.repository';
import { IOtClaim, OtClaimStatus } from '../../models/OtClaim.model';
import { IPayrollLeave, LeaveType } from '../../models/PayrollLeave.model';
import { ICashAdvance } from '../../models/CashAdvance.model';
import { IHoliday } from '../../models/Holiday.model';
import { IPayrollSettlement, PaymentMethod, PayoutType } from '../../models/PayrollSettlement.model';
import { IUser } from '../../models/User.model';

export interface LedgerDayEntry {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  dayType: 'WORKING' | 'SUNDAY' | 'HOLIDAY' | 'PAID_LEAVE' | 'LEAVE' | 'HALF_DAY';
  holidayTitle?: string;
  leaveId?: string;
  leaveReason?: string;
  baseWage: number;
  leaveDeduction: number;
  netDayWage: number;
  otHours: number;
  otAmount: number;
  otStatus?: OtClaimStatus;
  advancesAmount?: number;
  settlementPaid?: number;
  totalDayEarnings: number;
  isSettled: boolean;
}

export interface WorkerLedgerResult {
  worker: {
    _id: string;
    name: string;
    mobile: string;
    dailyWage: number;
    dailyWageEffectiveDate?: Date;
    profileImageUrl?: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    workingDays: number;
    leaveDays: number;
    halfDays: number;
    paidLeaveDays: number;
    holidayDays: number;
    sundayDays: number;
    totalGrossWages: number;
    totalLeaveDeduction: number;
    totalOtHours: number;
    totalOtAmount: number;
    totalAdvances: number;
    carriedForwardBalance: number;
    netUnsettledEarnings: number;
    hasUsedMonthlyPaidLeave: boolean;
  };
  ledger: LedgerDayEntry[];
  unsettledAdvances: ICashAdvance[];
  recentSettlements: IPayrollSettlement[];
}

export interface AdminWorkerSummary {
  workerId: string;
  name: string;
  mobile: string;
  dailyWage: number;
  unsettledDaysCount: number;
  unsettledBalance: number;
  pendingOtHours: number;
  lastSettlementDate?: Date;
}

export interface CommonCalendarResult {
  holidays: IHoliday[];
  leaves: Array<{
    _id: string;
    workerId: string;
    workerName: string;
    date: string;
    leaveType: LeaveType;
    isMonthlyPaidLeave: boolean;
    reason?: string;
  }>;
  workers: Array<{ _id: string; name: string; mobile: string; dailyWage: number }>;
}

export class PayrollService {
  constructor(private repo: IPayrollRepository = new PayrollRepository()) {}

  /**
   * Helper to normalize a date to midnight local date string YYYY-MM-DD
   */
  private formatDateKey(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Resolve historical wage for a specific date:
   * Only calculates the new wage from its effectiveDate onwards;
   * past dates retain their historical wage rate.
   */
  getWageForDate(worker: IUser, targetDate: Date): number {
    const history = worker.wageHistory || [];
    if (history.length === 0) {
      return worker.dailyWage || 0;
    }

    const t = new Date(targetDate);
    t.setHours(23, 59, 59, 999);

    const applicable = history.filter((h) => new Date(h.effectiveDate) <= t);
    if (applicable.length > 0) {
      applicable.sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
      );
      return applicable[0].wage;
    }

    return history[0].wage;
  }

  /**
   * Calculate leave deduction according to business rules:
   * 1. If Monthly Paid Leave -> deduction = 0
   * 2. If Half-Day -> earns ceil((wage / 2) / 10) * 10; deduction = wage - earned
   * 3. If Full-Day unpaid -> deduction = floor(wage / 100) * 100; netDayWage = wage - deduction
   */
  calculateLeaveDeduction(
    dailyWage: number,
    leaveType: LeaveType,
    isMonthlyPaidLeave: boolean
  ): { deductionAmount: number; netDayWage: number } {
    if (isMonthlyPaidLeave && leaveType === 'FULL') {
      return { deductionAmount: 0, netDayWage: dailyWage };
    }

    if (leaveType === 'HALF') {
      const halfWage = dailyWage / 2;
      const roundedEarned = Math.ceil(halfWage / 10) * 10;
      const deduction = Math.max(0, dailyWage - roundedEarned);
      return { deductionAmount: deduction, netDayWage: roundedEarned };
    }

    // Full day unpaid leave -> floor to 100
    const deduction = Math.floor(dailyWage / 100) * 100;
    const netDayWage = Math.max(0, dailyWage - deduction);
    return { deductionAmount: deduction, netDayWage };
  }

  /**
   * Mark a worker leave on a single date or date range.
   */
  async markLeave(
    workerId: string,
    dateInput: string | Date,
    leaveType: LeaveType,
    reason: string | undefined,
    adminId: string,
    endDateInput?: string | Date
  ): Promise<{ affectedCount: number; leave?: IPayrollLeave }> {
    const worker = await this.repo.findWorkerById(workerId);
    if (!worker) throw new Error('Worker not found');

    const start = new Date(dateInput);
    start.setHours(0, 0, 0, 0);

    const end = endDateInput ? new Date(endDateInput) : new Date(start);
    end.setHours(0, 0, 0, 0);

    if (end < start) throw new Error('End date cannot be earlier than start date');

    const holidays = await this.repo.findHolidays(start, end);
    const holidayDates = new Set(holidays.map((h) => this.formatDateKey(h.date)));

    let affectedCount = 0;
    let lastLeave: IPayrollLeave | undefined;

    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0 is Sunday
      const dateKey = this.formatDateKey(curr);

      if (dayOfWeek !== 0 && !holidayDates.has(dateKey)) {
        const res = await this.toggleLeave(
          workerId,
          new Date(curr),
          leaveType,
          adminId,
          reason
        );
        if (res.leave) lastLeave = res.leave;
        affectedCount++;
      }
      curr.setDate(curr.getDate() + 1);
    }

    return { affectedCount, leave: lastLeave };
  }

  /**
   * 1-click Leave Toggle:
   * Sets FULL, HALF, or CLEAR (removes leave) on a specific day.
   */
  async toggleLeave(
    workerId: string,
    dateInput: string | Date,
    leaveType: 'FULL' | 'HALF' | 'CLEAR',
    adminId: string,
    reason?: string
  ): Promise<{ action: 'CREATED' | 'UPDATED' | 'DELETED'; leave?: IPayrollLeave | null }> {
    const targetDate = new Date(dateInput);
    targetDate.setHours(0, 0, 0, 0);

    const worker = await this.repo.findWorkerById(workerId);
    if (!worker) throw new Error('Worker not found');

    const existing = await this.repo.findLeaveByWorkerAndDate(workerId, targetDate);

    if (leaveType === 'CLEAR') {
      if (existing) {
        if (existing.isSettled) throw new Error('Cannot delete a settled leave record');
        await this.repo.deleteLeave(existing._id.toString());
        return { action: 'DELETED' };
      }
      return { action: 'DELETED' };
    }

    const wage = this.getWageForDate(worker, targetDate);

    let isMonthlyPaidLeave = false;
    if (leaveType === 'FULL') {
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const usedPaidLeaves = await this.repo.countMonthlyPaidLeaves(workerId, startOfMonth, endOfMonth);
      if (usedPaidLeaves === 0 || (existing && existing.isMonthlyPaidLeave)) {
        isMonthlyPaidLeave = true;
      }
    }

    const { deductionAmount, netDayWage } = this.calculateLeaveDeduction(
      wage,
      leaveType,
      isMonthlyPaidLeave
    );

    if (existing) {
      if (existing.isSettled) throw new Error('Cannot modify a settled leave record');
      existing.leaveType = leaveType;
      existing.isMonthlyPaidLeave = isMonthlyPaidLeave;
      existing.dailyWageSnapshot = wage;
      existing.deductionAmount = deductionAmount;
      existing.netDayWage = netDayWage;
      if (reason !== undefined) existing.reason = reason;
      await existing.save();
      return { action: 'UPDATED', leave: existing };
    }

    const newLeave = await this.repo.createLeave({
      workerId: new mongoose.Types.ObjectId(workerId),
      date: targetDate,
      leaveType,
      isMonthlyPaidLeave,
      dailyWageSnapshot: wage,
      deductionAmount,
      netDayWage,
      reason,
      markedBy: new mongoose.Types.ObjectId(adminId),
      isSettled: false,
    });

    return { action: 'CREATED', leave: newLeave };
  }

  async removeLeave(leaveId: string): Promise<IPayrollLeave | null> {
    const leave = await this.repo.findLeaveById(leaveId);
    if (!leave) throw new Error('Leave record not found');
    if (leave.isSettled) throw new Error('Cannot remove a settled leave record');
    return this.repo.deleteLeave(leaveId);
  }

  /**
   * Submit OT Claim by Worker
   */
  async claimOvertime(
    workerId: string,
    dateInput: string | Date,
    hours: number,
    note?: string
  ): Promise<IOtClaim> {
    if (!Number.isInteger(hours) || hours <= 0) {
      throw new Error('Overtime hours must be a whole positive integer (1, 2, 3...)');
    }

    const targetDate = new Date(dateInput);
    targetDate.setHours(0, 0, 0, 0);

    const ratePerHour = 150;
    const totalAmount = hours * ratePerHour;

    return this.repo.createOtClaim({
      workerId: new mongoose.Types.ObjectId(workerId),
      date: targetDate,
      hours,
      ratePerHour,
      totalAmount,
      status: 'PENDING',
      note,
      isSettled: false,
    });
  }

  /**
   * Worker can cancel/delete their own PENDING OT Claim
   */
  async cancelOtClaim(claimId: string, workerId: string): Promise<IOtClaim | null> {
    const claim = await this.repo.findOtClaimById(claimId);
    if (!claim) throw new Error('Overtime claim not found');

    const claimWorkerId = (claim.workerId as any)?._id?.toString() || claim.workerId?.toString();
    if (claimWorkerId !== workerId) {
      throw new Error('Unauthorized to cancel this overtime claim');
    }

    if (claim.status !== 'PENDING') {
      throw new Error('Only pending overtime claims can be cancelled');
    }

    return this.repo.deleteOtClaim(claimId);
  }

  /**
   * Admin reviews OT Claim (Approve or Reject with custom reason)
   */
  async reviewOtClaim(
    claimId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId: string,
    rejectionReason?: string
  ): Promise<IOtClaim> {
    const claim = await this.repo.findOtClaimById(claimId);
    if (!claim) throw new Error('Overtime claim not found');
    if (claim.isSettled) throw new Error('Cannot modify a settled OT claim');

    const updated = await this.repo.updateOtClaim(claimId, {
      status,
      reviewedBy: new mongoose.Types.ObjectId(adminId),
      reviewedAt: new Date(),
      rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
    });

    if (!updated) throw new Error('Failed to update overtime claim');
    return updated;
  }

  /**
   * Cash Advance
   */
  async recordCashAdvance(
    workerId: string,
    amount: number,
    dateInput: string | Date,
    reason: string | undefined,
    adminId: string
  ): Promise<ICashAdvance> {
    if (amount <= 0) throw new Error('Advance amount must be greater than 0');

    const date = new Date(dateInput);
    return this.repo.createCashAdvance({
      workerId: new mongoose.Types.ObjectId(workerId),
      date,
      amount,
      reason,
      givenBy: new mongoose.Types.ObjectId(adminId),
      isSettled: false,
    });
  }

  async updateCashAdvance(
    advanceId: string,
    amount: number,
    dateInput: string | Date,
    reason?: string
  ): Promise<ICashAdvance | null> {
    if (amount <= 0) throw new Error('Advance amount must be greater than 0');

    const advance = await this.repo.findCashAdvanceById(advanceId);
    if (!advance) throw new Error('Cash advance not found');
    if (advance.isSettled) throw new Error('Cannot edit a settled cash advance');

    const date = new Date(dateInput);
    return this.repo.updateCashAdvance(advanceId, {
      amount,
      date,
      reason,
    });
  }

  async removeCashAdvance(advanceId: string): Promise<ICashAdvance | null> {
    const advance = await this.repo.findCashAdvanceById(advanceId);
    if (!advance) throw new Error('Cash advance not found');
    if (advance.isSettled) throw new Error('Cannot delete a settled cash advance');
    return this.repo.deleteCashAdvance(advanceId);
  }

  /**
   * Holidays
   */
  async declareHoliday(dateInput: string | Date, title: string, adminId: string): Promise<IHoliday> {
    const targetDate = new Date(dateInput);
    targetDate.setHours(0, 0, 0, 0);

    const existing = await this.repo.findHolidayByDate(targetDate);
    if (existing) throw new Error('Holiday already declared for this date');

    return this.repo.createHoliday({
      date: targetDate,
      title,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });
  }

  async removeHoliday(holidayId: string): Promise<IHoliday | null> {
    return this.repo.deleteHoliday(holidayId);
  }

  async getHolidays(startDate?: Date, endDate?: Date): Promise<IHoliday[]> {
    return this.repo.findHolidays(startDate, endDate);
  }

  /**
   * Common Calendar View across entire company
   */
  async getCommonCalendar(year: number, month: number): Promise<CommonCalendarResult> {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [holidays, leaves, workers] = await Promise.all([
      this.repo.findHolidays(start, end),
      this.repo.findLeaves({ startDate: start, endDate: end }),
      this.repo.findActiveWorkers(),
    ]);

    const formattedLeaves = leaves.map((l) => ({
      _id: l._id.toString(),
      workerId: ((l.workerId as any)?._id || l.workerId).toString(),
      workerName: (l.workerId as any)?.name || 'Worker',
      date: this.formatDateKey(l.date),
      leaveType: l.leaveType,
      isMonthlyPaidLeave: l.isMonthlyPaidLeave,
      reason: l.reason,
    }));

    return {
      holidays,
      leaves: formattedLeaves,
      workers: workers.map((w) => ({
        _id: w._id.toString(),
        name: w.name,
        mobile: w.mobile,
        dailyWage: w.dailyWage || 0,
      })),
    };
  }

  /**
   * Update worker wage with effective date:
   */
  async updateWorkerWage(
    workerId: string,
    dailyWage: number,
    effectiveDate?: string | Date
  ): Promise<IUser | null> {
    if (dailyWage < 0) throw new Error('Daily wage cannot be negative');
    const eff = effectiveDate ? new Date(effectiveDate) : new Date();
    return this.repo.updateWorkerWage(workerId, dailyWage, eff);
  }

  /**
   * Build Continuous Single-Sheet & Calendar Ledger
   */
  async getWorkerLedger(
    workerId: string,
    customStartDate?: string | Date,
    customEndDate?: string | Date
  ): Promise<WorkerLedgerResult> {
    const worker = await this.repo.findWorkerById(workerId);
    if (!worker) throw new Error('Worker not found');

    const latestSettlement = await this.repo.findLatestSettlement(workerId);
    const recentSettlements = await this.repo.findSettlements(workerId);

    let start: Date;
    if (customStartDate) {
      start = new Date(customStartDate);
    } else if (latestSettlement) {
      start = new Date(latestSettlement.endDate);
      start.setDate(start.getDate() + 1);
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);

    let end: Date;
    if (customEndDate) {
      end = new Date(customEndDate);
    } else {
      end = new Date();
    }
    end.setHours(23, 59, 59, 999);

    const [leaves, holidays, otClaims, allAdvances] = await Promise.all([
      this.repo.findLeaves({ workerId }),
      this.repo.findHolidays(),
      this.repo.findOtClaims({ workerId }),
      this.repo.findCashAdvances({ workerId }),
    ]);

    const unsettledAdvances = allAdvances.filter((a) => !a.isSettled);

    const leaveMap = new Map<string, IPayrollLeave>();
    for (const l of leaves) {
      leaveMap.set(this.formatDateKey(l.date), l);
    }

    const holidayMap = new Map<string, IHoliday>();
    for (const h of holidays) {
      holidayMap.set(this.formatDateKey(h.date), h);
    }

    const otMap = new Map<string, IOtClaim>();
    for (const ot of otClaims) {
      otMap.set(this.formatDateKey(ot.date), ot);
    }

    const advanceMap = new Map<string, number>();
    for (const adv of allAdvances) {
      const k = this.formatDateKey(adv.date);
      advanceMap.set(k, (advanceMap.get(k) || 0) + adv.amount);
    }

    const settlementMap = new Map<string, number>();
    for (const s of recentSettlements) {
      const k = this.formatDateKey(s.settledAt);
      settlementMap.set(k, (settlementMap.get(k) || 0) + s.amountPaid);
    }

    const ledger: LedgerDayEntry[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let workingDays = 0;
    let leaveDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let holidayDays = 0;
    let sundayDays = 0;
    let totalGrossWages = 0;
    let totalLeaveDeduction = 0;
    let totalOtHours = 0;
    let totalOtAmount = 0;

    const curr = new Date(start);
    while (curr <= end) {
      const dateKey = this.formatDateKey(curr);
      const dayOfWeek = curr.getDay(); // 0 is Sunday
      const dayName = dayNames[dayOfWeek];

      const historicalWage = this.getWageForDate(worker, curr);

      const holiday = holidayMap.get(dateKey);
      const leave = leaveMap.get(dateKey);
      const ot = otMap.get(dateKey);
      const dayAdvance = advanceMap.get(dateKey);
      const daySettlement = settlementMap.get(dateKey);

      let dayType: LedgerDayEntry['dayType'] = 'WORKING';
      let holidayTitle: string | undefined;
      let leaveId: string | undefined;
      let leaveReason: string | undefined;
      let baseWage = historicalWage;
      let leaveDeduction = 0;
      let netDayWage = historicalWage;
      let isSettled = false;

      if (dayOfWeek === 0) {
        dayType = 'SUNDAY';
        baseWage = 0;
        leaveDeduction = 0;
        netDayWage = 0;
        sundayDays++;
      } else if (holiday) {
        dayType = 'HOLIDAY';
        holidayTitle = holiday.title;
        baseWage = historicalWage;
        leaveDeduction = 0;
        netDayWage = historicalWage;
        holidayDays++;
        totalGrossWages += historicalWage;
      } else if (leave) {
        leaveId = leave._id.toString();
        isSettled = leave.isSettled;
        leaveReason = leave.reason;
        if (leave.isMonthlyPaidLeave) {
          dayType = 'PAID_LEAVE';
          baseWage = historicalWage;
          leaveDeduction = 0;
          netDayWage = historicalWage;
          paidLeaveDays++;
          totalGrossWages += historicalWage;
        } else if (leave.leaveType === 'HALF') {
          dayType = 'HALF_DAY';
          baseWage = historicalWage;
          leaveDeduction = leave.deductionAmount;
          netDayWage = leave.netDayWage;
          halfDays++;
          totalGrossWages += historicalWage;
          totalLeaveDeduction += leaveDeduction;
        } else {
          dayType = 'LEAVE';
          baseWage = historicalWage;
          leaveDeduction = leave.deductionAmount;
          netDayWage = leave.netDayWage;
          leaveDays++;
          totalGrossWages += historicalWage;
          totalLeaveDeduction += leaveDeduction;
        }
      } else {
        dayType = 'WORKING';
        baseWage = historicalWage;
        leaveDeduction = 0;
        netDayWage = historicalWage;
        workingDays++;
        totalGrossWages += historicalWage;
      }

      let dayOtHours = 0;
      let dayOtAmount = 0;
      let otStatus: OtClaimStatus | undefined;
      if (ot) {
        dayOtHours = ot.hours;
        otStatus = ot.status;
        if (ot.status === 'APPROVED') {
          dayOtAmount = ot.totalAmount;
          totalOtHours += dayOtHours;
          totalOtAmount += dayOtAmount;
        }
        if (ot.isSettled) {
          isSettled = true;
        }
      }

      ledger.push({
        date: dateKey,
        dayName,
        dayType,
        holidayTitle,
        leaveId,
        leaveReason,
        baseWage,
        leaveDeduction,
        netDayWage,
        otHours: dayOtHours,
        otAmount: dayOtAmount,
        otStatus,
        advancesAmount: dayAdvance,
        settlementPaid: daySettlement,
        totalDayEarnings: netDayWage + dayOtAmount,
        isSettled,
      });

      curr.setDate(curr.getDate() + 1);
    }

    ledger.reverse();

    const totalAdvances = unsettledAdvances.reduce((sum, a) => sum + a.amount, 0);
    const carriedForwardBalance = latestSettlement?.carriedForwardBalance || 0;
    const netUnsettledEarnings =
      totalGrossWages - totalLeaveDeduction + totalOtAmount - totalAdvances + carriedForwardBalance;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyPaidLeaveCount = await this.repo.countMonthlyPaidLeaves(
      workerId,
      startOfCurrentMonth,
      endOfCurrentMonth
    );

    return {
      worker: {
        _id: worker._id.toString(),
        name: worker.name,
        mobile: worker.mobile,
        dailyWage: worker.dailyWage || 0,
        dailyWageEffectiveDate: worker.dailyWageEffectiveDate,
        profileImageUrl: worker.profileImageUrl,
      },
      period: {
        startDate: this.formatDateKey(start),
        endDate: this.formatDateKey(end),
      },
      metrics: {
        workingDays,
        leaveDays,
        halfDays,
        paidLeaveDays,
        holidayDays,
        sundayDays,
        totalGrossWages,
        totalLeaveDeduction,
        totalOtHours,
        totalOtAmount,
        totalAdvances,
        carriedForwardBalance,
        netUnsettledEarnings,
        hasUsedMonthlyPaidLeave: monthlyPaidLeaveCount > 0,
      },
      ledger,
      unsettledAdvances,
      recentSettlements: recentSettlements.slice(0, 10),
    };
  }

  /**
   * Admin Overview across all workers
   */
  async getAdminOverview(): Promise<{
    workers: AdminWorkerSummary[];
    pendingOtClaimsCount: number;
    totalUnsettledWages: number;
  }> {
    const activeWorkers = await this.repo.findActiveWorkers();
    const pendingOtClaims = await this.repo.findOtClaims({ status: 'PENDING' });

    let totalUnsettledWages = 0;
    const workerSummaries: AdminWorkerSummary[] = [];

    for (const worker of activeWorkers) {
      const ledgerResult = await this.getWorkerLedger(worker._id.toString());
      const workerPendingOt = pendingOtClaims.filter(
        (c) =>
          c.workerId.toString() === worker._id.toString() ||
          (c.workerId as any)?._id?.toString() === worker._id.toString()
      );
      const pendingHours = workerPendingOt.reduce((sum, c) => sum + c.hours, 0);

      totalUnsettledWages += ledgerResult.metrics.netUnsettledEarnings;

      const latestSettlement = ledgerResult.recentSettlements[0];

      workerSummaries.push({
        workerId: worker._id.toString(),
        name: worker.name,
        mobile: worker.mobile,
        dailyWage: worker.dailyWage || 0,
        unsettledDaysCount: ledgerResult.metrics.workingDays + ledgerResult.metrics.holidayDays,
        unsettledBalance: ledgerResult.metrics.netUnsettledEarnings,
        pendingOtHours: pendingHours,
        lastSettlementDate: latestSettlement?.endDate,
      });
    }

    return {
      workers: workerSummaries,
      pendingOtClaimsCount: pendingOtClaims.length,
      totalUnsettledWages,
    };
  }

  /**
   * Settle and Payout (Supports Custom Partial Payout with complete audit metadata)
   */
  async settleWorkerPayroll(
    workerId: string,
    endDateInput: string | Date,
    paymentMethod: PaymentMethod,
    referenceNote: string | undefined,
    adminId: string,
    customAmountPaid?: number
  ): Promise<IPayrollSettlement> {
    const end = new Date(endDateInput);
    end.setHours(23, 59, 59, 999);

    const ledgerResult = await this.getWorkerLedger(workerId, undefined, end);
    const { metrics, period, ledger } = ledgerResult;

    if (metrics.netUnsettledEarnings < 0) {
      throw new Error('Net payable is negative due to advances exceeding earnings');
    }

    const netPayable = metrics.netUnsettledEarnings;
    const amountPaid = customAmountPaid !== undefined ? customAmountPaid : netPayable;
    if (amountPaid < 0) {
      throw new Error('Payout amount cannot be negative');
    }
    const carriedForwardBalance = Math.max(0, netPayable - amountPaid);
    const payoutType: PayoutType = amountPaid < netPayable ? 'PARTIAL' : 'FULL';

    const [workerUser, adminUser, leaves, approvedOt, advances] = await Promise.all([
      this.repo.findWorkerById(workerId),
      this.repo.findWorkerById(adminId),
      this.repo.findLeaves({ workerId, isSettled: false, endDate: end }),
      this.repo.findOtClaims({ workerId, status: 'APPROVED', isSettled: false, endDate: end }),
      this.repo.findCashAdvances({ workerId, isSettled: false }),
    ]);

    const totalPaidDays =
      metrics.workingDays + metrics.holidayDays + metrics.paidLeaveDays + metrics.halfDays * 0.5;
    const totalCalendarDays =
      metrics.workingDays +
      metrics.holidayDays +
      metrics.paidLeaveDays +
      metrics.leaveDays +
      metrics.halfDays +
      metrics.sundayDays;
    const netBaseWage = metrics.totalGrossWages - metrics.totalLeaveDeduction;

    // Snapshot of every day in the cycle for complete audit trail
    const itemizedDays = (ledger || []).map((entry) => ({
      date: entry.date,
      dayName: entry.dayName,
      dayType: entry.dayType,
      baseWage: entry.baseWage,
      leaveDeduction: entry.leaveDeduction,
      netDayWage: entry.netDayWage,
      otHours: entry.otHours,
      otAmount: entry.otAmount,
      advancesDeducted: entry.advancesAmount || 0,
      totalDayEarnings: entry.totalDayEarnings,
      holidayTitle: entry.holidayTitle,
      leaveReason: entry.leaveReason,
    }));

    const settlement = await this.repo.createSettlement({
      workerId: new mongoose.Types.ObjectId(workerId),
      workerName: workerUser?.name || ledgerResult.worker.name,
      workerMobile: workerUser?.mobile || ledgerResult.worker.mobile,
      baseDailyWageRate: workerUser?.dailyWage || ledgerResult.worker.dailyWage || 0,
      startDate: new Date(period.startDate),
      endDate: end,
      // Day Counts Breakdown
      totalWorkingDays: metrics.workingDays,
      totalFullLeaveDays: metrics.leaveDays,
      totalHalfDays: metrics.halfDays,
      totalPaidLeaveDays: metrics.paidLeaveDays,
      totalHolidayDays: metrics.holidayDays,
      totalSundayDays: metrics.sundayDays,
      totalPaidDays,
      totalCalendarDays,
      totalLeaveDays: metrics.leaveDays + metrics.halfDays,
      // Wage & Earnings Math Metadata
      grossWages: metrics.totalGrossWages,
      totalLeaveDeduction: metrics.totalLeaveDeduction,
      netBaseWage,
      totalOtHours: metrics.totalOtHours,
      otHourlyRate: 150,
      totalOtAmount: metrics.totalOtAmount,
      totalCashAdvances: metrics.totalAdvances,
      previousBalanceCarriedForward: metrics.carriedForwardBalance || 0,
      netPayable,
      amountPaid,
      carriedForwardBalance,
      payoutType,
      // Transaction Metadata
      paymentMethod,
      referenceNote,
      settledBy: new mongoose.Types.ObjectId(adminId),
      settledByName: adminUser?.name || 'Admin',
      settledAt: new Date(),
      // Linked Records & Snapshots
      settledAdvanceIds: advances.map((a) => a._id),
      settledOtClaimIds: approvedOt.map((o) => o._id),
      settledLeaveIds: leaves.map((l) => l._id),
      itemizedDays,
    });

    const settlementId = settlement._id.toString();

    await Promise.all([
      this.repo.markLeavesSettled(leaves.map((l) => l._id.toString()), settlementId),
      this.repo.markOtClaimsSettled(approvedOt.map((o) => o._id.toString()), settlementId),
      this.repo.markAdvancesSettled(advances.map((a) => a._id.toString()), settlementId),
    ]);

    return settlement;
  }
}
