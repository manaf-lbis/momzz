import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, UserRole } from '../constants/status';

export interface IUser extends Document {
  name: string;
  mobile: string;
  password: string;
  role: UserRole;
  isApproved: boolean;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.WORKER,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    taskCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
