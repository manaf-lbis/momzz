import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  jobCardId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'OPEN' | 'COMPLETED';
  completedBy?: mongoose.Types.ObjectId;
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
    status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    activityLog: [{ action: { type: String, enum: ['COMPLETED', 'REOPENED'], required: true }, user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
