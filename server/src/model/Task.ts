import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  jobCardId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'OPEN' | 'COMPLETED';
  completedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    jobCardId: { type: Schema.Types.ObjectId, ref: 'JobCard', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
