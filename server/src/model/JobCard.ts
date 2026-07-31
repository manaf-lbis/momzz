import mongoose, { Schema, Document } from 'mongoose';

export interface IJobCard extends Document {
  vehicleName: string;
  vehicleNumber: string;
  customerName?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobCardSchema: Schema = new Schema(
  {
    vehicleName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
    customerName: { type: String, trim: true },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const JobCard = mongoose.model<IJobCard>('JobCard', JobCardSchema);
export default JobCard;
