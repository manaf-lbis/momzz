import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, UserRole } from '../shared/constants/status';

export interface IWageHistoryItem {
  wage: number;
  effectiveDate: Date;
  createdAt: Date;
}

export interface IPayrollSnapshot {
  netPayable: number;
  unsettledGross: number;
  unsettledDeductions: number;
  unsettledOtAmount: number;
  unsettledAdvances: number;
  unsettledIncentives: number;
  advanceOverhang: number;
  unsettledWorkingDays: number;
  firstPayrollDate?: string;
  lastSettledDate?: Date;
  lastCalculatedAt: Date;
}

export interface IUser extends Document {
  name: string;
  mobile: string;
  password: string;
  role: UserRole;
  isApproved: boolean;
  status: 'ACTIVE' | 'BLOCKED';
  lastLoginAttempt?: Date;
  totalLoginAttempts: number;
  failedLoginAttempts: number;
  loginLockedUntil?: Date;
  isOnline: boolean;
  lastSeen?: Date;
  profileImageUrl?: string;
  loginAudit: Array<{ timestamp: Date; status: 'SUCCESS' | 'FAILED'; ipAddress: string }>;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: Date;
  dailyWage?: number;
  dailyWageEffectiveDate?: Date;
  lastSettledDate?: Date;
  wageHistory?: IWageHistoryItem[];
  payrollSnapshot?: IPayrollSnapshot;
  mcpToken?: string;
  mcpTokenHash?: string;
  mcpTokenCreatedAt?: Date;
  mcpTokenRevoked?: boolean;
  mcpTokenLastUsed?: Date;
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
    acceptedTermsVersion: {
      type: String,
      default: '',
    },
    acceptedTermsAt: {
      type: Date,
      default: null,
    },
    dailyWage: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSettledDate: {
      type: Date,
      default: null,
    },
    dailyWageEffectiveDate: {
      type: Date,
      default: null,
    },
    wageHistory: [
      {
        wage: { type: Number, required: true },
        effectiveDate: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    payrollSnapshot: {
      type: {
        netPayable: { type: Number, default: 0 },
        unsettledGross: { type: Number, default: 0 },
        unsettledDeductions: { type: Number, default: 0 },
        unsettledOtAmount: { type: Number, default: 0 },
        unsettledAdvances: { type: Number, default: 0 },
        unsettledIncentives: { type: Number, default: 0 },
        advanceOverhang: { type: Number, default: 0 },
        unsettledWorkingDays: { type: Number, default: 0 },
        firstPayrollDate: { type: String, default: null },
        lastSettledDate: { type: Date, default: null },
        lastCalculatedAt: { type: Date, default: null },
      },
      default: null,
    },
    mcpToken: {
      type: String,
      default: null,
    },
    mcpTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    mcpTokenCreatedAt: {
      type: Date,
      default: null,
    },
    mcpTokenRevoked: {
      type: Boolean,
      default: false,
    },
    mcpTokenLastUsed: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ isApproved: 1, status: 1 });

export default mongoose.model<IUser>('User', UserSchema);


