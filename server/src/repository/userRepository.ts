import User, { IUser } from '../model/User';

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

  async getLeaderboard(limit = 10): Promise<IUser[]> {
    return await User.find({ isApproved: true })
      .select('name role taskCount')
      .sort({ taskCount: -1 })
      .limit(limit);
  }

  async incrementTaskCount(userId: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(userId, { $inc: { taskCount: 1 } }, { new: true });
  }

  async findAllUsers(): Promise<IUser[]> {
    return await User.find({}).select('-password').sort({ createdAt: -1 });
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'BLOCKED'): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
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
}

export const userRepository = new UserRepository();
