import mongoose, { Schema, Document } from 'mongoose';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER';
export type PayoutType = 'FULL' | 'PARTIAL';

export interface ISettlementDaySnapshot {
  date: string; // 'YYYY-MM-DD'
  dayName: string; // 'Mon', 'Tue'
  dayType: 'WORKING' | 'HOLIDAY' | 'LEAVE' | 'HALF_DAY' | 'PAID_LEAVE' | 'SUNDAY';
  baseWage: number;
  leaveDeduction: number;
  netDayWage: number;
  otHours: number;
  otAmount: number;
  advancesDeducted?: number;
  totalDayEarnings: number;
  holidayTitle?: string;
  leaveReason?: string;
}

export interface IPayrollSettlement extends Document {
  workerId: mongoose.Types.ObjectId;
  workerName?: string;
  workerMobile?: string;
  baseDailyWageRate?: number;
  startDate: Date;
  endDate: Date;
  // Day Counts Breakdown
  totalWorkingDays: number;
  totalFullLeaveDays: number;
  totalHalfDays: number;
  totalPaidLeaveDays: number;
  totalHolidayDays: number;
  totalSundayDays: number;
  totalPaidDays: number;
  totalCalendarDays: number;
  totalLeaveDays: number;
  // Wage & Earnings Math Metadata
  grossWages: number;
  totalLeaveDeduction: number;
  netBaseWage: number;
  totalOtHours: number;
  otHourlyRate: number;
  totalOtAmount: number;
  totalCashAdvances: number;
  previousBalanceCarriedForward: number;
  netPayable: number;
  amountPaid: number;
  carriedForwardBalance: number;
  payoutType: PayoutType;
  // Transaction Metadata
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  settledBy: mongoose.Types.ObjectId;
  settledByName?: string;
  settledAt: Date;
  // Linked Audit Records & Itemized Snapshot
  settledAdvanceIds: mongoose.Types.ObjectId[];
  settledOtClaimIds: mongoose.Types.ObjectId[];
  settledLeaveIds: mongoose.Types.ObjectId[];
  itemizedDays: ISettlementDaySnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

const SettlementDaySnapshotSchema: Schema = new Schema(
  {
    date: { type: String, required: true },
    dayName: { type: String, required: true },
    dayType: {
      type: String,
      enum: ['WORKING', 'HOLIDAY', 'LEAVE', 'HALF_DAY', 'PAID_LEAVE', 'SUNDAY'],
      required: true,
    },
    baseWage: { type: Number, required: true, default: 0 },
    leaveDeduction: { type: Number, required: true, default: 0 },
    netDayWage: { type: Number, required: true, default: 0 },
    otHours: { type: Number, required: true, default: 0 },
    otAmount: { type: Number, required: true, default: 0 },
    advancesDeducted: { type: Number, default: 0 },
    totalDayEarnings: { type: Number, required: true, default: 0 },
    holidayTitle: { type: String },
    leaveReason: { type: String },
  },
  { _id: false }
);

const PayrollSettlementSchema: Schema = new Schema(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workerName: {
      type: String,
      trim: true,
    },
    workerMobile: {
      type: String,
      trim: true,
    },
    baseDailyWageRate: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    // Day Counts Breakdown
    totalWorkingDays: {
      type: Number,
      required: true,
      default: 0,
    },
    totalFullLeaveDays: {
      type: Number,
      default: 0,
    },
    totalHalfDays: {
      type: Number,
      default: 0,
    },
    totalPaidLeaveDays: {
      type: Number,
      default: 0,
    },
    totalHolidayDays: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSundayDays: {
      type: Number,
      default: 0,
    },
    totalPaidDays: {
      type: Number,
      default: 0,
    },
    totalCalendarDays: {
      type: Number,
      default: 0,
    },
    totalLeaveDays: {
      type: Number,
      required: true,
      default: 0,
    },
    // Wage & Earnings Math Metadata
    grossWages: {
      type: Number,
      required: true,
      default: 0,
    },
    totalLeaveDeduction: {
      type: Number,
      required: true,
      default: 0,
    },
    netBaseWage: {
      type: Number,
      default: 0,
    },
    totalOtHours: {
      type: Number,
      required: true,
      default: 0,
    },
    otHourlyRate: {
      type: Number,
      default: 150,
    },
    totalOtAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCashAdvances: {
      type: Number,
      required: true,
      default: 0,
    },
    previousBalanceCarriedForward: {
      type: Number,
      default: 0,
    },
    netPayable: {
      type: Number,
      required: true,
      default: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
    },
    carriedForwardBalance: {
      type: Number,
      default: 0,
    },
    payoutType: {
      type: String,
      enum: ['FULL', 'PARTIAL'],
      default: 'FULL',
    },
    // Transaction Metadata
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER'],
      default: 'CASH',
    },
    referenceNote: {
      type: String,
      trim: true,
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    settledByName: {
      type: String,
      trim: true,
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
    // Linked Audit Records & Itemized Snapshot
    settledAdvanceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'CashAdvance',
      },
    ],
    settledOtClaimIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'OtClaim',
      },
    ],
    settledLeaveIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PayrollLeave',
      },
    ],
    itemizedDays: [SettlementDaySnapshotSchema],
  },
  {
    timestamps: true,
  }
);

PayrollSettlementSchema.index({ workerId: 1, settledAt: -1 });

export default mongoose.model<IPayrollSettlement>('PayrollSettlement', PayrollSettlementSchema);
