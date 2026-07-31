import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { ROLES, UserRole } from '../constants/status';
import { AuthRepository } from '../repository/authRepository';
import { userRepository } from '../repository/userRepository';

export interface RegisterDTO {
  name: string;
  mobile: string;
  password: string;
  role?: string;
}

export class AuthService {
  private authRepo = new AuthRepository();

  generateTokens(user: any) {
    const accessToken = jwt.sign(
      { id: user._id, name: user.name, mobile: user.mobile, role: user.role, isApproved: user.isApproved },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, mobile: user.mobile },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: '15d' }
    );

    return { accessToken, refreshToken };
  }

  async register(data: RegisterDTO) {
    const existing = await this.authRepo.findByMobile(data.mobile);
    if (existing) {
      throw new Error('Mobile number already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const role = data.role && Object.values(ROLES).includes(data.role as UserRole) ? data.role : ROLES.WORKER;
    const isApproved = role === ROLES.ADMIN;

    const user = await this.authRepo.createUser({
      name: data.name,
      mobile: data.mobile,
      password: hashedPassword,
      role,
      isApproved,
      taskCount: 0,
    });

    const tokens = this.generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);
    await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);

    return { user, ...tokens };
  }

  async login(mobile: string, pass: string) {
    const user = await this.authRepo.findByMobile(mobile);
    if (!user) {
      throw new Error('Invalid mobile number or password');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new Error('Invalid mobile number or password');
    }

    if (!user.isApproved && user.role !== ROLES.ADMIN) {
      throw new Error('ACCOUNT_PENDING: Waiting for Admin Approval');
    }

    const tokens = this.generateTokens(user);

    // Save Refresh Token for Rotation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);
    await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);

    return { user, ...tokens };
  }

  async rotateRefreshToken(oldRefreshToken: string) {
    const existingToken = await this.authRepo.findRefreshToken(oldRefreshToken);

    // Automatic Reuse Detection: Token hijacked!
    if (!existingToken) {
      try {
        const decoded: any = jwt.verify(oldRefreshToken, ENV.JWT_REFRESH_SECRET);
        await this.authRepo.revokeAllUserTokens(decoded.id);
      } catch (err) {}
      throw new Error('Security Alert: Compromised Refresh Token. Please Login Again.');
    }

    // Delete used token (Rotation)
    await this.authRepo.deleteRefreshToken(oldRefreshToken);

    const decoded: any = jwt.verify(oldRefreshToken, ENV.JWT_REFRESH_SECRET);
    const user = await this.authRepo.findByMobile(decoded.mobile);
    if (!user) {
      throw new Error('User associated with token not found.');
    }

    const tokens = this.generateTokens(user);

    // Save new Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);
    await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);

    return { user, ...tokens };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.authRepo.deleteRefreshToken(refreshToken);
    }
  }

  async getMe(userId: string) {
    const user = await this.authRepo.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async approveWorker(userId: string, isApproved: boolean) {
    const user = await userRepository.updateApprovalStatus(userId, isApproved);
    if (!user) throw new Error('Worker user not found.');
    return user;
  }

  async getPendingWorkers() {
    return await userRepository.findPendingUsers();
  }
}

export const authService = new AuthService();
