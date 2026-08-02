import User from '../model/User';
import { RefreshToken } from '../model/RefreshToken';
import { createHash } from 'crypto';

const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class AuthRepository {
  async findByMobile(mobile: string) {
    return await User.findOne({ mobile });
  }

  async findById(id: string) {
    return await User.findById(id).select('-password');
  }

  async createUser(userData: any) {
    return await User.create(userData);
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    return await RefreshToken.create({ userId, token: hashRefreshToken(token), expiresAt });
  }

  async findRefreshToken(token: string) {
    return await RefreshToken.findOne({ token: hashRefreshToken(token) });
  }

  async deleteRefreshToken(token: string) {
    return await RefreshToken.deleteOne({ token: hashRefreshToken(token) });
  }

  async revokeAllUserTokens(userId: string) {
    return await RefreshToken.deleteMany({ userId });
  }
}

export const authRepository = new AuthRepository();
