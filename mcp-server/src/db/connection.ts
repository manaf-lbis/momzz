import mongoose, { Schema, Document, Model } from 'mongoose';
import { config } from '../config.js';

export interface IPersonalAccessToken extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  tokenHash: string; // One-way SHA-256 hash of the secret PAT
  prefix: string;    // e.g. "momzz_pat_ab12..." (non-secret prefix for audit/display)
  scopes: string[];
  expiresAt?: Date | null;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalAccessTokenSchema = new Schema<IPersonalAccessToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      default: ['profile:read', 'jobs:read', 'inventory:read'],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'personal_access_tokens',
  }
);

PersonalAccessTokenSchema.index({ tokenHash: 1, revokedAt: 1 });

export const PersonalAccessToken: Model<IPersonalAccessToken> =
  mongoose.models.PersonalAccessToken ||
  mongoose.model<IPersonalAccessToken>('PersonalAccessToken', PersonalAccessTokenSchema);

export interface IUserDoc extends Document {
  name: string;
  mobile: string;
  role: 'ADMIN' | 'WORKER';
  status: 'ACTIVE' | 'BLOCKED';
  isApproved: boolean;
  profileImageUrl?: string;
}

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    role: { type: String, enum: ['ADMIN', 'WORKER'], default: 'WORKER' },
    status: { type: String, enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' },
    isApproved: { type: Boolean, default: false },
    profileImageUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

export const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) return;

  try {
    await mongoose.connect(config.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[DB] MCP Server successfully connected to MongoDB');
  } catch (error) {
    console.error('[DB ERROR] Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[DB] Disconnected from MongoDB');
};
