import { JobCard, IJobCard } from '../model/JobCard';
import { Task, ITask } from '../model/Task';
import User from '../model/User';

export class JobRepository {
  async createJobCard(data: {
    vehicleName: string;
    vehicleNumber: string;
    vehicleColor?: string;
    customerName?: string;
    customerMobile?: string;
    customerEmail?: string;
    createdBy: string;
  }): Promise<IJobCard> {
    return await JobCard.create(data);
  }


  async createSubTasks(tasks: { jobCardId: any; title: string }[]): Promise<ITask[]> {
    return await Task.insertMany(tasks);
  }

  async findAllJobs(): Promise<IJobCard[]> {
    return await JobCard.find({ isDeleted: { $ne: true } }).populate('verifiedBy', 'name mobile role').sort({ status: -1, createdAt: -1 });
  }

  async findPaginatedJobs(options: {
    page?: number;
    limit?: number;
    timeframe?: string;
  }): Promise<{ jobs: IJobCard[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: { $ne: true } };

    if (options.timeframe && options.timeframe !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (options.timeframe.toLowerCase()) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'year':
          startDate.setDate(now.getDate() - 365);
          break;
        default:
          break;
      }
      query.createdAt = { $gte: startDate };
    }

    const [jobs, total] = await Promise.all([
      JobCard.find(query).populate('verifiedBy', 'name mobile role').sort({ status: -1, createdAt: -1 }).skip(skip).limit(limit),
      JobCard.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return { jobs, total, page, totalPages };
  }

  async findTasksByJobCardId(jobCardId: string): Promise<ITask[]> {
    return await Task.find({ jobCardId }).populate('completedBy', 'name mobile role').populate('activityLog.user', 'name mobile role');
  }

  async findJobById(jobCardId: string): Promise<IJobCard | null> {
    return await JobCard.findOne({ _id: jobCardId, isDeleted: { $ne: true } });
  }

  async updateJobCard(jobCardId: string, data: Partial<Pick<IJobCard, 'vehicleName' | 'vehicleNumber' | 'vehicleColor' | 'customerName' | 'customerMobile' | 'customerEmail'>>) {
    return await JobCard.findOneAndUpdate(
      { _id: jobCardId, isDeleted: { $ne: true } },
      { $set: { ...data, verifiedBy: null, verifiedAt: null } },
      { new: true, runValidators: true }
    );
  }

  async findPublicJobs(vehicleNumber: string, contact: { mobile?: string; email?: string }) {
    const contactQuery = contact.mobile
      ? { customerMobile: contact.mobile.trim() }
      : { customerEmail: contact.email!.trim().toLowerCase() };
    return await JobCard.find({
      isDeleted: { $ne: true },
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      ...contactQuery,
    }).sort({ status: -1, createdAt: -1 });
  }

  async updateJobStatus(jobCardId: string, status: 'IN_PROGRESS' | 'COMPLETED'): Promise<IJobCard | null> {
    return await JobCard.findByIdAndUpdate(jobCardId, { status }, { new: true });
  }

  async verifyJobCard(jobCardId: string, userId: string): Promise<IJobCard | null> {
    return await JobCard.findOneAndUpdate(
      { _id: jobCardId, isDeleted: { $ne: true }, verifiedAt: null },
      { $set: { verifiedBy: userId, verifiedAt: new Date(), status: 'COMPLETED' } },
      { new: true }
    ).populate('verifiedBy', 'name mobile role');
  }

  async findTaskById(taskId: string): Promise<ITask | null> {
    return await Task.findById(taskId);
  }

  /**
   * Explicit set task status — NOT a toggle.
   * Accepts the desired target action ('COMPLETE' or 'REOPEN') to prevent race conditions
   * when two workers click at the same time.
   */
  async setTaskStatus(
    taskId: string,
    action: 'COMPLETE' | 'REOPEN',
    userId: string
  ): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;

    if (action === 'COMPLETE') {
      // If already completed, this is a no-op (idempotent)
      if (task.status === 'COMPLETED') {
        return await Task.findById(taskId).populate('completedBy', 'name mobile role');
      }

      task.status = 'COMPLETED';
      task.completedBy = userId as any;
      task.completedAt = new Date();
      task.activityLog.push({ action: 'COMPLETED', user: userId as any, at: new Date() });
      await User.findByIdAndUpdate(userId, { $inc: { taskCount: 1 } });
    } else {
      // REOPEN
      if (task.status === 'OPEN') {
        return await Task.findById(taskId).populate('completedBy', 'name mobile role');
      }

      const prevUser = task.completedBy;
      task.status = 'OPEN';
      task.completedBy = undefined;
      task.completedAt = undefined;
      task.activityLog.push({ action: 'REOPENED', user: userId as any, at: new Date() });
      if (prevUser) {
        await User.findByIdAndUpdate(prevUser, { $inc: { taskCount: -1 } });
      }
      // Reopening work invalidates the completed cross-check.
      await JobCard.findByIdAndUpdate(task.jobCardId, { $set: { verifiedBy: null, verifiedAt: null } });
    }

    await task.save();

    // Recalculate parent job card status from sibling tasks
    const siblingTasks = await Task.find({ jobCardId: task.jobCardId });
    const allCompleted = siblingTasks.every((t) => t.status === 'COMPLETED');
    await JobCard.findByIdAndUpdate(task.jobCardId, {
      status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    });

    return await Task.findById(taskId).populate('completedBy', 'name mobile role').populate('activityLog.user', 'name mobile role');
  }

  async addTaskToJob(jobCardId: string, title: string): Promise<ITask> {
    const newTask = await Task.create({
      jobCardId,
      title: title.trim(),
    });
    await JobCard.findByIdAndUpdate(jobCardId, { $set: { status: 'IN_PROGRESS', verifiedBy: null, verifiedAt: null } });
    return newTask;
  }

  async deleteTask(taskId: string): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;

    if (task.completedBy) {
      await User.findByIdAndUpdate(task.completedBy, { $inc: { taskCount: -1 } });
    }

    const jobCardId = task.jobCardId;
    await Task.findByIdAndDelete(taskId);
    await JobCard.findByIdAndUpdate(jobCardId, { $set: { verifiedBy: null, verifiedAt: null } });

    const remainingTasks = await Task.find({ jobCardId });
    if (remainingTasks.length > 0) {
      const allCompleted = remainingTasks.every((t) => t.status === 'COMPLETED');
      await JobCard.findByIdAndUpdate(jobCardId, {
        status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      });
    }

    return task; // Return the task so the controller can access jobCardId
  }


  async deleteJobCard(jobCardId: string, deletedBy: string): Promise<boolean> {
    const job = await JobCard.findOneAndUpdate(
      { _id: jobCardId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
      },
      { new: true }
    );

    // Keep the job card and its tasks so the record can be restored or audited later.
    return !!job;
  }
}

export const jobRepository = new JobRepository();
