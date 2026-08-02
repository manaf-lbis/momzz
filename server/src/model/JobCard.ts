import mongoose, { Schema, Document } from 'mongoose';

export interface IJobCard extends Document {
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  status: 'IN_PROGRESS' | 'READY' | 'COMPLETED';
  createdBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobCardSchema: Schema = new Schema(
  {
    vehicleName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true, index: true },
    vehicleColor: { type: String, trim: true },
    customerName: { type: String, trim: true },
    customerMobile: { type: String, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ['IN_PROGRESS', 'READY', 'COMPLETED'], default: 'IN_PROGRESS' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const JobCard = mongoose.model<IJobCard>('JobCard', JobCardSchema);
export default JobCard;
