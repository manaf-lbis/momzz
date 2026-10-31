import mongoose, { Schema, Document } from 'mongoose';

export type OtClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IOtClaim extends Document {
  workerId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  ratePerHour: number;
  totalAmount: number;
  status: OtClaimStatus;
  note?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  isSettled: boolean;
  settlementId?: mongoose.Types.ObjectId;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtClaimSchema: Schema = new Schema(
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
    hours: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer hour',
      },
    },
    ratePerHour: {
      type: Number,
      required: true,
      default: 150,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    note: {
      type: String,
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
    rejectionReason: {
      type: String,
      trim: true,
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

OtClaimSchema.index({ workerId: 1, date: 1 });
OtClaimSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IOtClaim>('OtClaim', OtClaimSchema);
