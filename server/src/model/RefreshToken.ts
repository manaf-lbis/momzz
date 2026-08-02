import { Schema, model, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Schema.Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
