import mongoose, { Schema, Document } from 'mongoose';

export type WageTransactionType = 'PAYOUT_SETTLEMENT' | 'ADVANCE_TAKEN';

export interface IWageTransaction extends Document {
  workerId: mongoose.Types.ObjectId;
  date: Date;
  type: WageTransactionType;
  amount: number;
  periodCovered?: {
    startDate?: Date;
    endDate?: Date;
  };
  notes: string;
  paymentMethod?: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  referenceNote?: string;
  settledByName?: string;
  isSettled?: boolean; // For ADVANCE_TAKEN: whether this advance has been settled in a payout
  settlementId?: mongoose.Types.ObjectId;
  carriedForwardBalance?: number;
  itemizedSummary?: {
    totalWorkingDays?: number;
    totalSundays?: number;
    totalHolidays?: number;
    totalFullLeaves?: number;
    totalHalfDays?: number;
    grossWages?: number;
    totalLeaveDeduction?: number;
    netBaseWage?: number;
    totalOtHours?: number;
    totalOtAmount?: number;
    totalAdvancesDeducted?: number;
    carriedForwardBalance?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WageTransactionSchema: Schema = new Schema(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      enum: ['PAYOUT_SETTLEMENT', 'ADVANCE_TAKEN'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    periodCovered: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER'],
      default: 'CASH',
    },
    referenceNote: {
      type: String,
      default: '',
      trim: true,
    },
    settledByName: {
      type: String,
      default: 'Admin',
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: 'WageTransaction',
      default: null,
    },
    carriedForwardBalance: {
      type: Number,
      default: 0,
    },
    itemizedSummary: {
      totalWorkingDays: Number,
      totalSundays: Number,
      totalHolidays: Number,
      totalFullLeaves: Number,
      totalHalfDays: Number,
      grossWages: Number,
      totalLeaveDeduction: Number,
      netBaseWage: Number,
      totalOtHours: Number,
      totalOtAmount: Number,
      totalAdvancesDeducted: Number,
      carriedForwardBalance: Number,
    },
  },
  {
    timestamps: true,
  }
);

WageTransactionSchema.index({ workerId: 1, date: -1 });

export default mongoose.model<IWageTransaction>('WageTransaction', WageTransactionSchema);
