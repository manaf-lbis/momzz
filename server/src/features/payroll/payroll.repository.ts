import mongoose from 'mongoose';
import User, { IUser } from '../../models/User.model';
import WageAdjustment, { IWageAdjustment, WageAdjustmentType, WageAdjustmentStatus } from '../../models/WageAdjustment.model';
import GarageHoliday, { IGarageHoliday } from '../../models/GarageHoliday.model';
import WageTransaction, { IWageTransaction, WageTransactionType } from '../../models/WageTransaction.model';
import { ROLES } from '../../shared/constants/status';
import { emitPayrollWageUpdated } from '../../config/socket';

export class PayrollRepository {
  static async findWorkerById(workerId: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(workerId)) return null;
    return User.findById(workerId).select('-password');
  }

  static async findAllWorkers(): Promise<IUser[]> {
    return User.find({
      role: ROLES.WORKER,
      isApproved: true,
      status: 'ACTIVE',
    })
      .select('name mobile role dailyWage dailyWageEffectiveDate wageHistory lastSettledDate payrollSnapshot profileImageUrl createdAt')
      .sort({ name: 1 });
  }

  static async updateWorkerWage(workerId: string, dailyWage: number, effectiveDate?: Date | string): Promise<IUser | null> {
    const worker = await User.findById(workerId);
    if (!worker) return null;

    let effDateObj: Date;
    if (effectiveDate) {
      if (typeof effectiveDate === 'string') {
        const [y, m, d] = effectiveDate.split('-').map(Number);
        effDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      } else {
        const d = new Date(effectiveDate);
        effDateObj = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
      }
    } else {
      const now = new Date();
      const istStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const [y, m, d] = istStr.split('-').map(Number);
      effDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }

    const effDateStr = effDateObj.toISOString().split('T')[0];

    if (!worker.wageHistory) {
      worker.wageHistory = [];
    }

    // Check if an entry already exists for this exact effective date
    const existingIndex = worker.wageHistory.findIndex((h) => {
      const hDateStr = new Date(h.effectiveDate).toISOString().split('T')[0];
      return hDateStr === effDateStr;
    });

    if (existingIndex >= 0) {
      worker.wageHistory[existingIndex].wage = dailyWage;
      worker.wageHistory[existingIndex].effectiveDate = effDateObj;
      worker.wageHistory[existingIndex].createdAt = new Date();
    } else {
      // If worker already had dailyWage > 0 without history, seed the first record
      if (worker.wageHistory.length === 0 && worker.dailyWage && worker.dailyWage > 0) {
        const initialDate = worker.dailyWageEffectiveDate || effDateObj;
        worker.wageHistory.push({
          wage: worker.dailyWage,
          effectiveDate: initialDate,
          createdAt: worker.createdAt || new Date(),
        });
      }

      worker.wageHistory.push({
        wage: dailyWage,
        effectiveDate: effDateObj,
        createdAt: new Date(),
      });
    }

    // Sort wage history ascending by effectiveDate
    worker.wageHistory.sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    worker.dailyWage = dailyWage;
    // The very first effective date marks the worker's start of payroll existence
    if (!worker.dailyWageEffectiveDate) {
      worker.dailyWageEffectiveDate = worker.wageHistory[0]?.effectiveDate || effDateObj;
    }

    const saved = await worker.save();
    try {
      const { cacheService } = await import('../cache/cache.service');
      await cacheService.del([`user:session:${workerId}`, `user:profile:${workerId}`]);
    } catch {
      // cache invalidation non-fatal
    }
    try {
      emitPayrollWageUpdated(workerId, { dailyWage, effectiveDate: effDateObj });
    } catch {
      // socket non-fatal
    }
    return saved;
  }

  static async updateWorkerPayrollSnapshot(workerId: string, snapshot: any): Promise<void> {
    try {
      await User.findByIdAndUpdate(workerId, {
        $set: { payrollSnapshot: snapshot },
      });
    } catch (err) {
      console.error('[PAYROLL DB] Failed to persist payrollSnapshot:', err);
    }
  }

  static async updateWorkerLastSettledDate(workerId: string, lastSettledDate: Date): Promise<IUser | null> {
    return User.findByIdAndUpdate(workerId, { lastSettledDate }, { new: true });
  }

  static async findWageAdjustments(filter: {
    workerId?: string;
    workerIds?: string[];
    startDate?: string;
    endDate?: string;
    type?: WageAdjustmentType;
    types?: WageAdjustmentType[];
    status?: WageAdjustmentStatus;
    isSettled?: boolean;
  }): Promise<IWageAdjustment[]> {
    const query: any = {};

    if (filter.workerId && mongoose.Types.ObjectId.isValid(filter.workerId)) {
      query.workerId = new mongoose.Types.ObjectId(filter.workerId);
    } else if (filter.workerIds && filter.workerIds.length > 0) {
      query.workerId = { $in: filter.workerIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    if (filter.startDate && filter.endDate) {
      query.date = { $gte: filter.startDate, $lte: filter.endDate };
    } else if (filter.startDate) {
      query.date = { $gte: filter.startDate };
    } else if (filter.endDate) {
      query.date = { $lte: filter.endDate };
    }

    if (filter.type) query.type = filter.type;
    else if (filter.types) query.type = { $in: filter.types };

    if (filter.status) query.status = filter.status;
    if (filter.isSettled !== undefined) query.isSettled = filter.isSettled;

    return WageAdjustment.find(query).sort({ date: 1, createdAt: 1 });
  }

  static async findPendingOtClaims(): Promise<IWageAdjustment[]> {
    return WageAdjustment.find({
      type: 'OVERTIME',
      status: 'PENDING',
    })
      .populate('workerId', 'name mobile dailyWage profileImageUrl')
      .sort({ date: -1, createdAt: -1 });
  }

  static async findWageAdjustmentById(id: string): Promise<IWageAdjustment | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return WageAdjustment.findById(id).populate('workerId', 'name mobile dailyWage profileImageUrl');
  }

  static async upsertLeaveAdjustment(data: {
    workerId: string;
    date: string;
    type: 'FULL_LEAVE' | 'HALF_LEAVE';
    deductionAmount: number;
    isAllowedLeave?: boolean;
    note?: string;
  }): Promise<IWageAdjustment> {
    return WageAdjustment.findOneAndUpdate(
      {
        workerId: new mongoose.Types.ObjectId(data.workerId),
        date: data.date,
        type: { $in: ['FULL_LEAVE', 'HALF_LEAVE'] },
      },
      {
        workerId: new mongoose.Types.ObjectId(data.workerId),
        date: data.date,
        type: data.type,
        status: 'APPROVED',
        deductionAmount: data.deductionAmount,
        isAllowedLeave: data.isAllowedLeave || false,
        note: data.note || '',
        otHours: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async createOtClaim(data: {
    workerId: string;
    date: string;
    otHours: number;
    note?: string;
    flaggedReason?: string;
  }): Promise<IWageAdjustment> {
    return WageAdjustment.create({
      workerId: new mongoose.Types.ObjectId(data.workerId),
      date: data.date,
      type: 'OVERTIME',
      otHours: data.otHours,
      status: 'PENDING',
      deductionAmount: 0,
      note: data.note || '',
      flaggedReason: data.flaggedReason || null,
    });
  }

  static async updateOtStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    rejectionReason?: string,
    reviewerName?: string
  ): Promise<IWageAdjustment | null> {
    const updateOps: any = {
      status,
      reviewedBy: new mongoose.Types.ObjectId(reviewedBy),
      reviewedAt: new Date(),
    };
    if (reviewerName) updateOps.reviewerName = reviewerName;
    if (rejectionReason !== undefined) updateOps.rejectionReason = rejectionReason;

    return WageAdjustment.findByIdAndUpdate(id, updateOps, { new: true });
  }

  static async findAllOtClaims(filter: {
    workerId?: string;
    status?: WageAdjustmentStatus | 'ALL';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<IWageAdjustment[]> {
    const query: any = { type: 'OVERTIME' };
    if (filter.workerId) query.workerId = new mongoose.Types.ObjectId(filter.workerId);
    if (filter.status && filter.status !== 'ALL') query.status = filter.status;
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }
    const q = WageAdjustment.find(query)
      .populate('workerId', 'name mobile dailyWage profileImageUrl')
      .populate('reviewedBy', 'name')
      .sort({ date: -1, createdAt: -1 });
    if (filter.limit && filter.limit > 0) {
      q.limit(filter.limit);
    }
    return q;
  }

  static async updateWageAdjustment(
    id: string,
    updates: Partial<{
      type: WageAdjustmentType;
      otHours: number;
      status: WageAdjustmentStatus;
      deductionAmount: number;
      isAllowedLeave?: boolean;
      note: string;
      date: string;
      reviewedBy?: mongoose.Types.ObjectId;
      reviewedAt?: Date;
      flaggedReason?: string;
      updatedBy?: mongoose.Types.ObjectId;
      updatedByName?: string;
      lastEditedAt?: Date;
    }>,
    editLog?: any
  ): Promise<IWageAdjustment | null> {
    const updateOps: any = { $set: updates };
    if (editLog) {
      updateOps.$push = { editHistory: editLog };
    }
    return WageAdjustment.findByIdAndUpdate(id, updateOps, { new: true });
  }

  static async deleteWageAdjustment(id: string): Promise<boolean> {
    const res = await WageAdjustment.findByIdAndDelete(id);
    return !!res;
  }

  // --- Garage Holidays ---
  static async findHolidays(startDate?: string, endDate?: string): Promise<IGarageHoliday[]> {
    const query: any = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }
    return GarageHoliday.find(query).sort({ date: 1 });
  }

  static async createHoliday(date: string, title: string, isPaid: boolean = true, createdBy?: string): Promise<IGarageHoliday> {
    return GarageHoliday.findOneAndUpdate(
      { date },
      { date, title, isPaid, ...(createdBy ? { createdBy: new mongoose.Types.ObjectId(createdBy) } : {}) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async deleteHoliday(idOrDate: string): Promise<boolean> {
    const res = mongoose.Types.ObjectId.isValid(idOrDate)
      ? await GarageHoliday.findByIdAndDelete(idOrDate)
      : await GarageHoliday.findOneAndDelete({ date: idOrDate });
    return !!res;
  }

  // --- Wage Transactions (Advances, Incentives & Settlements) ---
  static async createWageTransaction(data: {
    workerId: string;
    type: WageTransactionType;
    amount: number;
    date?: Date;
    periodCovered?: { startDate?: Date; endDate?: Date };
    notes?: string;
    paymentMethod?: 'CASH' | 'UPI' | 'BANK_TRANSFER';
    referenceNote?: string;
    settledByName?: string;
    carriedForwardBalance?: number;
    itemizedSummary?: any;
    isSettled?: boolean;
  }): Promise<IWageTransaction> {
    return WageTransaction.create({
      workerId: new mongoose.Types.ObjectId(data.workerId),
      type: data.type,
      amount: data.amount,
      date: data.date || new Date(),
      periodCovered: data.periodCovered,
      notes: data.notes || '',
      paymentMethod: data.paymentMethod || 'CASH',
      referenceNote: data.referenceNote || '',
      settledByName: data.settledByName || 'Admin',
      carriedForwardBalance: data.carriedForwardBalance || 0,
      itemizedSummary: data.itemizedSummary,
      isSettled: data.isSettled !== undefined ? data.isSettled : false,
    });
  }

  static async findWageTransactions(filter: {
    workerId?: string;
    type?: WageTransactionType;
    isSettled?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IWageTransaction[]> {
    const query: any = {};
    if (filter.workerId && mongoose.Types.ObjectId.isValid(filter.workerId)) {
      query.workerId = new mongoose.Types.ObjectId(filter.workerId);
    }
    if (filter.type) query.type = filter.type;
    if (filter.isSettled !== undefined) query.isSettled = filter.isSettled;
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }
    return WageTransaction.find(query).populate('workerId', 'name mobile dailyWage').sort({ date: -1 });
  }

  static async findLastSettlement(workerId: string): Promise<IWageTransaction | null> {
    if (!mongoose.Types.ObjectId.isValid(workerId)) return null;
    return WageTransaction.findOne({
      workerId: new mongoose.Types.ObjectId(workerId),
      type: 'PAYOUT_SETTLEMENT',
    }).sort({ date: -1 });
  }

  static async markAdjustmentsSettled(workerId: string, endDate: string, settlementId: mongoose.Types.ObjectId): Promise<number> {
    const res = await WageAdjustment.updateMany(
      {
        workerId: new mongoose.Types.ObjectId(workerId),
        date: { $lte: endDate },
        isSettled: { $ne: true },
      },
      {
        isSettled: true,
        settlementId,
        settledAt: new Date(),
      }
    );
    return res.modifiedCount;
  }

  static async markAdvancesSettled(workerId: string, endDate: Date, settlementId: mongoose.Types.ObjectId): Promise<number> {
    const res = await WageTransaction.updateMany(
      {
        workerId: new mongoose.Types.ObjectId(workerId),
        type: 'ADVANCE_TAKEN',
        date: { $lte: endDate },
        isSettled: { $ne: true },
      },
      {
        isSettled: true,
        settlementId,
      }
    );
    return res.modifiedCount;
  }

  static async markIncentivesSettled(workerId: string, endDate: Date, settlementId: mongoose.Types.ObjectId): Promise<number> {
    const res = await WageTransaction.updateMany(
      {
        workerId: new mongoose.Types.ObjectId(workerId),
        type: 'INCENTIVE',
        date: { $lte: endDate },
        isSettled: { $ne: true },
      },
      {
        isSettled: true,
        settlementId,
      }
    );
    return res.modifiedCount;
  }

  static async findWageTransactionById(id: string): Promise<IWageTransaction | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return WageTransaction.findById(id).populate('workerId', 'name mobile dailyWage profileImageUrl');
  }

  static async deleteWageTransaction(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await WageTransaction.findByIdAndDelete(id);
    return Boolean(res);
  }
}
