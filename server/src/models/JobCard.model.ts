import mongoose, { Schema, Document } from 'mongoose';

export interface IJobCard extends Document {
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  thumbnailUrl?: string;
  expectedDeliveryDate?: Date;
  status: 'IN_PROGRESS' | 'READY' | 'COMPLETED';
  createdBy?: mongoose.Types.ObjectId;
  isPinnedForAll?: boolean;
  pinnedBy?: mongoose.Types.ObjectId[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
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
    thumbnailUrl: { type: String, trim: true, default: '' },
    expectedDeliveryDate: { type: Date, default: null, index: true },
    status: { type: String, enum: ['IN_PROGRESS', 'READY', 'COMPLETED'], default: 'IN_PROGRESS' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isPinnedForAll: { type: Boolean, default: false },
    pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

JobCardSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
JobCardSchema.index({ isDeleted: 1, isPinnedForAll: -1, createdAt: -1 });
JobCardSchema.index({ isDeleted: 1, vehicleNumber: 1, customerMobile: 1 });
JobCardSchema.index({ isDeleted: 1, verifiedAt: 1, status: 1 });

export const JobCard = mongoose.model<IJobCard>('JobCard', JobCardSchema);
export default JobCard;

