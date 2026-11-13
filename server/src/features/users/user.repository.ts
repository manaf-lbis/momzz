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

  async findPaginatedUsers(options: {
    page?: number;
    limit?: number;
    q?: string;
    role?: string;
    status?: string;
  }): Promise<{ users: IUser[]; total: number; page: number; limit: number; totalPages: number; hasMore: boolean }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (options.role && options.role !== 'ALL') {
      query.role = options.role.toUpperCase();
    }
    if (options.status && options.status !== 'ALL') {
      const sUpper = options.status.toUpperCase();
      if (sUpper === 'ONLINE') query.isOnline = true;
      else if (sUpper === 'PENDING') query.isApproved = false;
      else if (sUpper === 'BLOCKED' || sUpper === 'ACTIVE') query.status = sUpper;
    }
    if (options.q && options.q.trim()) {
      const escaped = options.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ name: regex }, { mobile: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ isOnline: -1, lastSeen: -1, updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      users,
      total,
      page,
      limit,
      totalPages,
      hasMore: skip + users.length < total,
    };
  }

  async getUserStats() {
    const [totalUsers, onlineUsers, adminCount, workerCount, blockedUsers, pendingApproval] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ role: 'ADMIN' }),
      User.countDocuments({ role: 'WORKER' }),
      User.countDocuments({ status: 'BLOCKED' }),
      User.countDocuments({ isApproved: false }),
    ]);
    return { totalUsers, onlineUsers, adminCount, workerCount, blockedUsers, pendingApproval };
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
