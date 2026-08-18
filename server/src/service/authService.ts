import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { ROLES } from '../constants/status';
import { AuthRepository } from '../repository/authRepository';
import { userRepository } from '../repository/userRepository';
import { emitUserApproved, emitUserBlocked } from '../config/socket';
import { getCloudinaryUrl, uploadToCloudinary } from '../utils/cloudinaryHelper';

export interface RegisterDTO {
  name: string;
  mobile: string;
  password: string;
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
      // A unique ID makes every browser/device login its own refresh session.
      { id: user._id, mobile: user.mobile, jti: randomUUID() },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
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

    // Public registration is worker-only. Administrator accounts are managed directly in the database.
    const role = ROLES.WORKER;
    const isApproved = false;

    const user = await this.authRepo.createUser({
      name: data.name,
      mobile: data.mobile,
      password: hashedPassword,
      role,
      isApproved,
      taskCount: 0,
      totalLoginAttempts: 0,
      isOnline: false,
    });

    const tokens = this.generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);

    return { user, ...tokens };
  }

  async login(mobile: string, pass: string, ipAddress = 'Unknown') {
    // Record login attempt regardless of success/failure
    await userRepository.recordLoginAttempt(mobile);

    const user = await this.authRepo.findByMobile(mobile);
    if (!user) {
      throw new Error('Invalid mobile number or password');
    }

    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      await userRepository.recordLoginAudit(mobile, 'FAILED', ipAddress);
      throw new Error('Too many failed login attempts. Please try again in 15 minutes.');
    }

    if (user.status === 'BLOCKED') {
      await userRepository.recordLoginAudit(mobile, 'FAILED', ipAddress);
      throw new Error('ACCOUNT_BLOCKED: Your account has been blocked by an administrator.');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      await userRepository.recordFailedPasswordAttempt(user._id.toString());
      await userRepository.recordLoginAudit(mobile, 'FAILED', ipAddress);
      throw new Error('Invalid mobile number or password');
    }

    await userRepository.clearFailedPasswordAttempts(user._id.toString());

    if (!user.isApproved && user.role !== ROLES.ADMIN) {
      await userRepository.recordLoginAudit(mobile, 'FAILED', ipAddress);
      throw new Error('ACCOUNT_PENDING: Waiting for Admin Approval');
    }

    const tokens = this.generateTokens(user);
    await userRepository.recordLoginAudit(mobile, 'SUCCESS', ipAddress);

    // Save Refresh Token for Rotation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);

    return { user, ...tokens };
  }

  async rotateRefreshToken(oldRefreshToken: string) {
    // Consume the token in one database operation so two requests cannot rotate it twice.
    const existingToken = await this.authRepo.consumeRefreshToken(oldRefreshToken);

    // A missing token may be an already-completed parallel refresh. Do not sign every
    // device out: each login maintains an independent refresh session.
    if (!existingToken) {
      throw new Error('Refresh session has expired. Please log in again.');
    }

    const decoded: any = jwt.verify(oldRefreshToken, ENV.JWT_REFRESH_SECRET);
    const user = await this.authRepo.findByMobile(decoded.mobile);
    if (!user) {
      throw new Error('User associated with token not found.');
    }

    if (user.status === 'BLOCKED') {
      throw new Error('ACCOUNT_BLOCKED: Account is blocked.');
    }

    const tokens = this.generateTokens(user);

    // Save new Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);

    return { user, ...tokens };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.authRepo.deleteRefreshToken(refreshToken);
    }
  }

  private formatUser(user: any) {
    if (!user) return user;
    const profile = user.toObject ? user.toObject() : user;
    return {
      ...profile,
      id: profile._id?.toString() || profile.id,
      _id: profile._id?.toString() || profile.id,
      profileImageUrl: getCloudinaryUrl(profile.profileImageUrl)
    };
  }

  async getMe(userId: string) {
    const user = await this.authRepo.findById(userId);
    if (!user) throw new Error('User not found');
    return this.formatUser(user);
  }

  async updateProfileImage(userId: string, imageData: string) {
    const { publicId, url } = await uploadToCloudinary(imageData, 'momzz/profiles');

    // Store ONLY the Cloudinary publicId in the database
    const user = await this.authRepo.updateProfileImage(userId, publicId);
    if (!user) throw new Error('User not found.');
    return this.formatUser(user);
  }

  async approveWorker(userId: string, isApproved: boolean) {
    const user = await userRepository.updateApprovalStatus(userId, isApproved);
    if (!user) throw new Error('Worker user not found.');
    if (isApproved) {
      emitUserApproved(userId);
    }
    return this.formatUser(user);
  }

  async getPendingWorkers() {
    const pendingUsers = await userRepository.findPendingUsers();
    return pendingUsers.map((user) => ({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isApproved: user.isApproved,
      status: user.status || 'ACTIVE',
      taskCount: user.taskCount || 0,
      lastLoginAttempt: user.lastLoginAttempt,
      totalLoginAttempts: user.totalLoginAttempts || 0,
      isOnline: !!user.isOnline,
      lastSeen: user.lastSeen,
      profileImageUrl: getCloudinaryUrl(user.profileImageUrl),
      loginAudit: user.loginAudit || [],
      createdAt: user.createdAt,
    }));
  }

  async getAllUsers() {
    const users = await userRepository.findAllUsers();
    return users.map((user) => ({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isApproved: user.isApproved,
      status: user.status || 'ACTIVE',
      taskCount: user.taskCount || 0,
      lastLoginAttempt: user.lastLoginAttempt,
      totalLoginAttempts: user.totalLoginAttempts || 0,
      isOnline: !!user.isOnline,
      lastSeen: user.lastSeen,
      profileImageUrl: getCloudinaryUrl(user.profileImageUrl),
      loginAudit: user.loginAudit || [],
      updatedAt: user.updatedAt,
      createdAt: user.createdAt,
    }));
  }

  async toggleUserStatus(userId: string, status: 'ACTIVE' | 'BLOCKED') {
    const user = await userRepository.updateUserStatus(userId, status);
    if (!user) throw new Error('User not found.');
    if (status === 'BLOCKED') {
      emitUserBlocked(userId);
    }
    return this.formatUser(user);
  }

  async updateUserRole(userId: string, role: typeof ROLES[keyof typeof ROLES]) {
    const user = await userRepository.updateUserRole(userId, role);
    if (!user) throw new Error('User not found.');
    return this.formatUser(user);
  }

  async adminResetPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const user = await userRepository.updateUserPassword(userId, hashedPassword);
    if (!user) throw new Error('User not found.');
    return { message: 'Password reset successfully.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const user = await userRepository.findByMobile((await userRepository.findById(userId))?.mobile || '');
    if (!user) {
      const rawUser = await (await import('../model/User')).default.findById(userId);
      if (!rawUser) throw new Error('User not found.');
      const isMatch = await bcrypt.compare(currentPassword, rawUser.password);
      if (!isMatch) throw new Error('Current password is incorrect.');
      const salt = await bcrypt.genSalt(10);
      rawUser.password = await bcrypt.hash(newPassword, salt);
      await rawUser.save();
      return { message: 'Password changed successfully.' };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await userRepository.updateUserPassword(userId, hashedPassword);
    return { message: 'Password changed successfully.' };
  }

  async updateUserByAdmin(userId: string, updates: { name?: string; mobile?: string; role?: any; status?: any; isApproved?: boolean }) {
    const user = await userRepository.updateUserByAdmin(userId, updates);
    if (!user) throw new Error('User not found.');
    return this.formatUser(user);
  }
}

export const authService = new AuthService();
