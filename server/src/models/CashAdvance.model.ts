import mongoose, { Schema, Document } from 'mongoose';

export interface ICashAdvance extends Document {
  workerId: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  reason?: string;
  givenBy: mongoose.Types.ObjectId;
  isSettled: boolean;
  settlementId?: mongoose.Types.ObjectId;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CashAdvanceSchema: Schema = new Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      trim: true,
    },
    givenBy: {
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

CashAdvanceSchema.index({ workerId: 1, isSettled: 1 });

export default mongoose.model<ICashAdvance>('CashAdvance', CashAdvanceSchema);
