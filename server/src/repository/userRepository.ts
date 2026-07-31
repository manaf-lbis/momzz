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
}

export const userRepository = new UserRepository();
