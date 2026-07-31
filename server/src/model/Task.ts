import mongoose, { Schema, Document } from 'mongoose';
import { TASK_STATUS, TaskStatus } from '../constants/status';

export interface ITask extends Document {
  jobCardId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  completedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    jobCardId: { type: Schema.Types.ObjectId, ref: 'JobCard', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.OPEN },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<ITask>('Task', TaskSchema);
