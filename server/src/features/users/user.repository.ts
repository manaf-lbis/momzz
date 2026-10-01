import User, { IUser } from '../../models/User.model';

export class UserRepository {
  async findByMobile(mobile: string): Promise<IUser | null> {
    return await User.findOne({ mobile });
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id).select('-password');
  }

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  async updateApprovalStatus(id: string, isApproved: boolean): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, { isApproved }, { new: true }).select('-password');
  }

  async findPendingUsers(): Promise<IUser[]> {
    return await User.find({ isApproved: false }).select('-password').sort({ createdAt: -1 });
  }

  async findAllUsers(): Promise<IUser[]> {
    return await User.find({}).select('-password').sort({ isOnline: -1, lastSeen: -1, updatedAt: -1, createdAt: -1 });
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'BLOCKED'): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
  }

  async updateUserRole(id: string, role: IUser['role']): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true });
  }

  async recordLoginAttempt(mobile: string): Promise<void> {
    await User.updateOne(
      { mobile },
      {
        $inc: { totalLoginAttempts: 1 },
        $set: { lastLoginAttempt: new Date() },
      }
    );
  }

  async recordLoginAudit(mobile: string, status: 'SUCCESS' | 'FAILED', ipAddress: string): Promise<void> {
    await User.updateOne(
      { mobile },
      { $push: { loginAudit: { $each: [{ timestamp: new Date(), status, ipAddress }], $slice: -5 } } }
    );
  }

  async recordFailedPasswordAttempt(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.failedLoginAttempts = failedLoginAttempts;
    if (failedLoginAttempts >= 5) {
      user.loginLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();
  }

  async clearFailedPasswordAttempts(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: { failedLoginAttempts: 0, loginLockedUntil: null },
    });
  }

  async setUserOnlineStatus(userId: string, isOnline: boolean): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isOnline,
          lastSeen: new Date(),
        },
      },
      { new: true }
    ).select('-password');
  }

  async updateUserByAdmin(userId: string, updates: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('-password');
  }

  async setMcpToken(userId: string, token: string, tokenHash: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          mcpToken: token,
          mcpTokenHash: tokenHash,
          mcpTokenCreatedAt: new Date(),
          mcpTokenRevoked: false,
        },
      },
      { new: true }
    );
  }

  async revokeMcpToken(userId: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          mcpTokenRevoked: true,
        },
      },
      { new: true }
    );
  }

  async findByMobileWithMcp(mobile: string): Promise<IUser | null> {
    return await User.findOne({ mobile });
  }

  async recordMcpTokenUse(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { mcpTokenLastUsed: new Date() } });
  }
}

export const userRepository = new UserRepository();
