import mongoose from 'mongoose';
import OtClaim, { IOtClaim, OtClaimStatus } from '../../models/OtClaim.model';
import PayrollLeave, { IPayrollLeave, LeaveType } from '../../models/PayrollLeave.model';
import CashAdvance, { ICashAdvance } from '../../models/CashAdvance.model';
import Holiday, { IHoliday } from '../../models/Holiday.model';
import PayrollSettlement, { IPayrollSettlement } from '../../models/PayrollSettlement.model';
import User, { IUser } from '../../models/User.model';

export interface IPayrollRepository {
  // Workers
  findActiveWorkers(): Promise<IUser[]>;
  findWorkerById(workerId: string): Promise<IUser | null>;
  updateWorkerWage(workerId: string, dailyWage: number, effectiveDate?: Date): Promise<IUser | null>;

  // OT Claims
  createOtClaim(data: Partial<IOtClaim>): Promise<IOtClaim>;
  findOtClaimById(id: string): Promise<IOtClaim | null>;
  findOtClaims(filter: {
    workerId?: string;
    status?: OtClaimStatus;
    isSettled?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IOtClaim[]>;
  updateOtClaim(id: string, update: Partial<IOtClaim>): Promise<IOtClaim | null>;
  deleteOtClaim(id: string): Promise<IOtClaim | null>;
  markOtClaimsSettled(ids: string[], settlementId: string): Promise<void>;

  // Leaves
  createLeave(data: Partial<IPayrollLeave>): Promise<IPayrollLeave>;
  findLeaveById(id: string): Promise<IPayrollLeave | null>;
  findLeaves(filter: {
    workerId?: string;
    isSettled?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IPayrollLeave[]>;
  findLeaveByWorkerAndDate(workerId: string, date: Date): Promise<IPayrollLeave | null>;
  countMonthlyPaidLeaves(workerId: string, startOfMonth: Date, endOfMonth: Date): Promise<number>;
  deleteLeave(id: string): Promise<IPayrollLeave | null>;
  markLeavesSettled(ids: string[], settlementId: string): Promise<void>;

  // Holidays
  createHoliday(data: Partial<IHoliday>): Promise<IHoliday>;
  findHolidays(startDate?: Date, endDate?: Date): Promise<IHoliday[]>;
  findHolidayByDate(date: Date): Promise<IHoliday | null>;
  findHolidayById(id: string): Promise<IHoliday | null>;
  deleteHoliday(id: string): Promise<IHoliday | null>;

  // Cash Advances
  createCashAdvance(data: Partial<ICashAdvance>): Promise<ICashAdvance>;
  findCashAdvances(filter: { workerId?: string; isSettled?: boolean }): Promise<ICashAdvance[]>;
  findCashAdvanceById(id: string): Promise<ICashAdvance | null>;
  updateCashAdvance(id: string, update: Partial<ICashAdvance>): Promise<ICashAdvance | null>;
  deleteCashAdvance(id: string): Promise<ICashAdvance | null>;
  markAdvancesSettled(ids: string[], settlementId: string): Promise<void>;

  // Settlements
  createSettlement(data: Partial<IPayrollSettlement>): Promise<IPayrollSettlement>;
  findSettlements(workerId?: string): Promise<IPayrollSettlement[]>;
  findLatestSettlement(workerId: string): Promise<IPayrollSettlement | null>;
}

export class PayrollRepository implements IPayrollRepository {
  async findActiveWorkers(): Promise<IUser[]> {
    return User.find({
      role: 'WORKER',
      isApproved: true,
      status: 'ACTIVE',
    }).sort({ name: 1 });
  }

  async findWorkerById(workerId: string): Promise<IUser | null> {
    return User.findById(workerId);
  }

  async updateWorkerWage(workerId: string, dailyWage: number, effectiveDate?: Date): Promise<IUser | null> {
    const eff = effectiveDate ? new Date(effectiveDate) : new Date();
    eff.setHours(0, 0, 0, 0);

    const worker = await User.findById(workerId);
    if (!worker) return null;

    // If no wageHistory exists yet, but previous dailyWage exists, preserve old wage with worker's createdAt
    const history = worker.wageHistory || [];
    if (history.length === 0 && worker.dailyWage && worker.dailyWage > 0) {
      history.push({
        wage: worker.dailyWage,
        effectiveDate: worker.dailyWageEffectiveDate || worker.createdAt || new Date(2020, 0, 1),
        createdAt: new Date(),
      });
    }

    history.push({
      wage: dailyWage,
      effectiveDate: eff,
      createdAt: new Date(),
    });

    // Sort by effectiveDate ascending
    history.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    worker.dailyWage = dailyWage;
    worker.dailyWageEffectiveDate = eff;
    worker.wageHistory = history;

    return worker.save();
  }

  async createOtClaim(data: Partial<IOtClaim>): Promise<IOtClaim> {
    return OtClaim.create(data);
  }

  async findOtClaimById(id: string): Promise<IOtClaim | null> {
    return OtClaim.findById(id).populate('workerId', 'name mobile dailyWage');
  }

  async findOtClaims(filter: {
    workerId?: string;
    status?: OtClaimStatus;
    isSettled?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IOtClaim[]> {
    const query: Record<string, any> = {};
    if (filter.workerId) query.workerId = filter.workerId;
    if (filter.status) query.status = filter.status;
    if (filter.isSettled !== undefined) query.isSettled = filter.isSettled;
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }
    return OtClaim.find(query).populate('workerId', 'name mobile dailyWage').sort({ date: -1 });
  }

  async updateOtClaim(id: string, update: Partial<IOtClaim>): Promise<IOtClaim | null> {
    return OtClaim.findByIdAndUpdate(id, update, { new: true });
  }

  async deleteOtClaim(id: string): Promise<IOtClaim | null> {
    return OtClaim.findByIdAndDelete(id);
  }

  async markOtClaimsSettled(ids: string[], settlementId: string): Promise<void> {
    if (ids.length === 0) return;
    await OtClaim.updateMany(
      { _id: { $in: ids } },
      { isSettled: true, settlementId: new mongoose.Types.ObjectId(settlementId), settledAt: new Date() }
    );
  }

  async createLeave(data: Partial<IPayrollLeave>): Promise<IPayrollLeave> {
    return PayrollLeave.create(data);
  }

  async findLeaveById(id: string): Promise<IPayrollLeave | null> {
    return PayrollLeave.findById(id);
  }

  async findLeaves(filter: {
    workerId?: string;
    isSettled?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IPayrollLeave[]> {
    const query: Record<string, any> = {};
    if (filter.workerId) query.workerId = filter.workerId;
    if (filter.isSettled !== undefined) query.isSettled = filter.isSettled;
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }
    return PayrollLeave.find(query).populate('workerId', 'name mobile').sort({ date: -1 });
  }

  async findLeaveByWorkerAndDate(workerId: string, date: Date): Promise<IPayrollLeave | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return PayrollLeave.findOne({
      workerId,
      date: { $gte: start, $lte: end },
    });
  }

  async countMonthlyPaidLeaves(workerId: string, startOfMonth: Date, endOfMonth: Date): Promise<number> {
    return PayrollLeave.countDocuments({
      workerId,
      isMonthlyPaidLeave: true,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });
  }

  async deleteLeave(id: string): Promise<IPayrollLeave | null> {
    return PayrollLeave.findByIdAndDelete(id);
  }

  async markLeavesSettled(ids: string[], settlementId: string): Promise<void> {
    if (ids.length === 0) return;
    await PayrollLeave.updateMany(
      { _id: { $in: ids } },
      { isSettled: true, settlementId: new mongoose.Types.ObjectId(settlementId), settledAt: new Date() }
    );
  }

  async createHoliday(data: Partial<IHoliday>): Promise<IHoliday> {
    return Holiday.create(data);
  }

  async findHolidays(startDate?: Date, endDate?: Date): Promise<IHoliday[]> {
    const query: Record<string, any> = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    return Holiday.find(query).sort({ date: 1 });
  }

  async findHolidayByDate(date: Date): Promise<IHoliday | null> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return Holiday.findOne({ date: { $gte: start, $lte: end } });
  }

  async findHolidayById(id: string): Promise<IHoliday | null> {
    return Holiday.findById(id);
  }

  async deleteHoliday(id: string): Promise<IHoliday | null> {
    return Holiday.findByIdAndDelete(id);
  }

  async createCashAdvance(data: Partial<ICashAdvance>): Promise<ICashAdvance> {
    return CashAdvance.create(data);
  }

  async findCashAdvances(filter: { workerId?: string; isSettled?: boolean }): Promise<ICashAdvance[]> {
    const query: Record<string, any> = {};
    if (filter.workerId) query.workerId = filter.workerId;
    if (filter.isSettled !== undefined) query.isSettled = filter.isSettled;
    return CashAdvance.find(query).populate('workerId', 'name mobile').sort({ date: -1 });
  }

  async findCashAdvanceById(id: string): Promise<ICashAdvance | null> {
    return CashAdvance.findById(id);
  }

  async updateCashAdvance(id: string, update: Partial<ICashAdvance>): Promise<ICashAdvance | null> {
    return CashAdvance.findByIdAndUpdate(id, update, { new: true });
  }

  async deleteCashAdvance(id: string): Promise<ICashAdvance | null> {
    return CashAdvance.findByIdAndDelete(id);
  }

  async markAdvancesSettled(ids: string[], settlementId: string): Promise<void> {
    if (ids.length === 0) return;
    await CashAdvance.updateMany(
      { _id: { $in: ids } },
      { isSettled: true, settlementId: new mongoose.Types.ObjectId(settlementId), settledAt: new Date() }
    );
  }

  async createSettlement(data: Partial<IPayrollSettlement>): Promise<IPayrollSettlement> {
    return PayrollSettlement.create(data);
  }

  async findSettlements(workerId?: string): Promise<IPayrollSettlement[]> {
    const query: Record<string, any> = {};
    if (workerId) query.workerId = workerId;
    return PayrollSettlement.find(query)
      .populate('workerId', 'name mobile dailyWage')
      .populate('settledBy', 'name')
      .sort({ settledAt: -1 });
  }

  async findLatestSettlement(workerId: string): Promise<IPayrollSettlement | null> {
    return PayrollSettlement.findOne({ workerId }).sort({ endDate: -1 });
  }
}
