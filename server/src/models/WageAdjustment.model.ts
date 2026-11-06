import mongoose, { Schema, Document } from 'mongoose';

export type WageAdjustmentType = 'FULL_LEAVE' | 'HALF_LEAVE' | 'OVERTIME';
export type WageAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IWageAdjustmentEditLog {
  editedBy: mongoose.Types.ObjectId;
  editedByName?: string;
  editedAt: Date;
  previousValues: Record<string, any>;
  note?: string;
}

export interface IWageAdjustment extends Document {
  workerId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  type: WageAdjustmentType;
  otHours: number;
  status: WageAdjustmentStatus;
  deductionAmount: number;
  isAllowedLeave?: boolean;
  note: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewerName?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  flaggedReason?: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedByName?: string;
  lastEditedAt?: Date;
  editHistory?: IWageAdjustmentEditLog[];
  isSettled: boolean;
  settlementId?: mongoose.Types.ObjectId;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WageAdjustmentEditLogSchema: Schema = new Schema(
  {
    editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editedByName: { type: String, default: '' },
    editedAt: { type: Date, default: Date.now },
    previousValues: { type: Schema.Types.Mixed, default: {} },
    note: { type: String, default: '' },
  },
  { _id: false }
);

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
      default: 'APPROVED',
    },
    deductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAllowedLeave: {
      type: Boolean,
      default: false,
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
    reviewerName: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    flaggedReason: {
      type: String,
      default: null,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedByName: {
      type: String,
      default: null,
      trim: true,
    },
    lastEditedAt: {
      type: Date,
      default: null,
    },
    editHistory: {
      type: [WageAdjustmentEditLogSchema],
      default: [],
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
