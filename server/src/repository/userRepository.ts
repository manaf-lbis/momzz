import User, { IUser } from '../model/User';
import Task from '../model/Task';

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

  async getLeaderboard(limit?: number): Promise<IUser[]> {
    const users = await User.find({ 
      isApproved: true, 
      status: { $ne: 'BLOCKED' }
    })
      .select('name role taskCount profileImageUrl mobile status isApproved createdAt')
      .lean();

    const completedTasks = await Task.find({ status: 'COMPLETED' })
      .select('completedBy partners isShared');

    const pointsMap: Record<string, number> = {};
    users.forEach((u) => {
      pointsMap[u._id.toString()] = 0;
    });

    for (const t of completedTasks) {
      const primaryId = t.completedBy ? t.completedBy.toString() : null;
      const partnerIds = (t.partners || []).map((p) => p.toString()).filter(Boolean);

      if (t.isShared && partnerIds.length > 0) {
        const allWorkerIds = Array.from(new Set([primaryId, ...partnerIds].filter(Boolean) as string[]));
        const ptsEach = 1 / allWorkerIds.length;
        for (const wid of allWorkerIds) {
          if (wid in pointsMap) {
            pointsMap[wid] = (pointsMap[wid] || 0) + ptsEach;
          }
        }
      } else if (primaryId && primaryId in pointsMap) {
        pointsMap[primaryId] = (pointsMap[primaryId] || 0) + 1;
      }
    }

    const userObjects = users.map((u) => {
      const computedPts = parseFloat((pointsMap[u._id.toString()] || 0).toFixed(2));
      if (u.taskCount !== computedPts) {
        User.findByIdAndUpdate(u._id, { taskCount: computedPts }).catch(() => {});
        u.taskCount = computedPts;
      }
      return {
        ...u,
        id: u._id.toString(), // Explicitly set id to match frontend expectation
      } as unknown as IUser;
    });

    userObjects.sort((a, b) => {
      if (b.taskCount !== a.taskCount) {
        return b.taskCount - a.taskCount;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return limit ? userObjects.slice(0, limit) : userObjects;
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
}

export const userRepository = new UserRepository();
