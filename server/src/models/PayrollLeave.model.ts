import mongoose, { Schema, Document } from 'mongoose';

export type LeaveType = 'FULL' | 'HALF';

export interface IPayrollLeave extends Document {
  workerId: mongoose.Types.ObjectId;
  date: Date;
  leaveType: LeaveType;
  isMonthlyPaidLeave: boolean;
  dailyWageSnapshot: number;
  deductionAmount: number;
  netDayWage: number;
  reason?: string;
  markedBy: mongoose.Types.ObjectId;
  isSettled: boolean;
  settlementId?: mongoose.Types.ObjectId;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollLeaveSchema: Schema = new Schema(
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
      index: true,
    },
    leaveType: {
      type: String,
      enum: ['FULL', 'HALF'],
      default: 'FULL',
    },
    isMonthlyPaidLeave: {
      type: Boolean,
      default: false,
    },
    dailyWageSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    deductionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    netDayWage: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isSettled: {
      type: Boolean,
      default: false,
      index: true,
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollSettlement',
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

PayrollLeaveSchema.index({ workerId: 1, date: 1 }, { unique: true });

export default mongoose.model<IPayrollLeave>('PayrollLeave', PayrollLeaveSchema);
