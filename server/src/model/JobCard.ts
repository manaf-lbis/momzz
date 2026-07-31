import mongoose, { Schema, Document } from 'mongoose';
import { TASK_STATUS, TaskStatus } from '../constants/status';

export interface IJobCard extends Document {
  vehicleName: string;
  vehicleNumber: string;
  customerName?: string;
  status: TaskStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobCardSchema: Schema = new Schema(
  {
    vehicleName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true },
    status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.OPEN },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IJobCard>('JobCard', JobCardSchema);
