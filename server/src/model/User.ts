import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, UserRole } from '../constants/status';

export interface IUser extends Document {
  name: string;
  mobile: string;
  password: string;
  role: UserRole;
  isApproved: boolean;
  status: 'ACTIVE' | 'BLOCKED';
  taskCount: number;
  lastLoginAttempt?: Date;
  totalLoginAttempts: number;
  failedLoginAttempts: number;
  loginLockedUntil?: Date;
  isOnline: boolean;
  lastSeen?: Date;
  profileImageUrl?: string;
  loginAudit: Array<{ timestamp: Date; status: 'SUCCESS' | 'FAILED'; ipAddress: string }>;
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
    status: {
      type: String,
      enum: ['ACTIVE', 'BLOCKED'],
      default: 'ACTIVE',
    },
    taskCount: {
      type: Number,
      default: 0,
    },
    lastLoginAttempt: {
      type: Date,
      default: null,
    },
    totalLoginAttempts: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    loginLockedUntil: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    profileImageUrl: {
      type: String,
      default: '',
    },
    loginAudit: {
      type: [{ timestamp: Date, status: String, ipAddress: String }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
