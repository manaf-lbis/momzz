import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  jobCardId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  inventoryItem?: mongoose.Types.ObjectId;
  itemType?: 'PRODUCT' | 'SERVICE';
  quantityUsed: number;
  stockTracked: boolean;
  unitPrice?: number;
  discountAmount: number;
  finalPrice?: number;
  status: 'OPEN' | 'COMPLETED';
  completedBy?: mongoose.Types.ObjectId;
  /** Array of co-worker IDs when task is shared among multiple workers */
  partners?: mongoose.Types.ObjectId[];
  isShared?: boolean;
  isPinned?: boolean;
  completedAt?: Date;
  activityLog: { action: 'COMPLETED' | 'REOPENED'; user: mongoose.Types.ObjectId; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    jobCardId: { type: Schema.Types.ObjectId, ref: 'JobCard', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
    itemType: { type: String, enum: ['PRODUCT', 'SERVICE'], default: null },
    quantityUsed: { type: Number, default: 1, min: 1 },
    stockTracked: { type: Boolean, default: true },
    unitPrice: { type: Number, default: null, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, default: null, min: 0 },
    status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** Co-workers who shared this task */
    partners: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isShared: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    activityLog: [
      {
        action: { type: String, enum: ['COMPLETED', 'REOPENED'], required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
