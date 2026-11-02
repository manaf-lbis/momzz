import mongoose, { Schema, Document } from 'mongoose';

export type WageAdjustmentType = 'FULL_LEAVE' | 'HALF_LEAVE' | 'OVERTIME';
export type WageAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IWageAdjustment extends Document {
  workerId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  type: WageAdjustmentType;
  otHours: number;
  status: WageAdjustmentStatus;
  deductionAmount: number;
  note: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  isSettled: boolean;
  settlementId?: mongoose.Types.ObjectId;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WageAdjustmentSchema: Schema = new Schema(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['FULL_LEAVE', 'HALF_LEAVE', 'OVERTIME'],
      required: true,
    },
    otHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: function (this: any) {
        return this.type === 'OVERTIME' ? 'PENDING' : 'APPROVED';
      },
    },
    deductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    isSettled: {
      type: Boolean,
      default: false,
      index: true,
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: 'WageTransaction',
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

// Compound index for fast queries by worker and date range
WageAdjustmentSchema.index({ workerId: 1, date: 1, type: 1 });
WageAdjustmentSchema.index({ type: 1, status: 1 });

export default mongoose.model<IWageAdjustment>('WageAdjustment', WageAdjustmentSchema);
