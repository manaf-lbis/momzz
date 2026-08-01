import { JobCard, IJobCard } from '../model/JobCard';
import { Task, ITask } from '../model/Task';
import User from '../model/User';

export class JobRepository {
  async createJobCard(data: { vehicleName: string; vehicleNumber: string; createdBy: string }): Promise<IJobCard> {
    return await JobCard.create(data);
  }

  async createSubTasks(tasks: { jobCardId: any; title: string }[]): Promise<ITask[]> {
    return await Task.insertMany(tasks);
  }

  async findAllJobs(): Promise<IJobCard[]> {
    return await JobCard.find().sort({ createdAt: -1 });
  }

  async findPaginatedJobs(options: {
    page?: number;
    limit?: number;
    timeframe?: string;
  }): Promise<{ jobs: IJobCard[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    const query: any = {};

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
      JobCard.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      JobCard.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return { jobs, total, page, totalPages };
  }

  async findTasksByJobCardId(jobCardId: string): Promise<ITask[]> {
    return await Task.find({ jobCardId }).populate('completedBy', 'name mobile role');
  }

  async findJobById(jobCardId: string): Promise<IJobCard | null> {
    return await JobCard.findById(jobCardId);
  }

  async updateJobStatus(jobCardId: string, status: 'IN_PROGRESS' | 'COMPLETED'): Promise<IJobCard | null> {
    return await JobCard.findByIdAndUpdate(jobCardId, { status }, { new: true });
  }

  async findTaskById(taskId: string): Promise<ITask | null> {
    return await Task.findById(taskId);
  }

  async toggleTaskStatus(taskId: string, userId: string): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;

    if (task.status === 'COMPLETED') {
      task.status = 'OPEN';
      const prevUser = task.completedBy;
      task.completedBy = undefined;
      task.completedAt = undefined;
      if (prevUser) {
        await User.findByIdAndUpdate(prevUser, { $inc: { taskCount: -1 } });
      }
    } else {
      task.status = 'COMPLETED';
      task.completedBy = userId as any;
      task.completedAt = new Date();
      await User.findByIdAndUpdate(userId, { $inc: { taskCount: 1 } });
    }

    await task.save();

    // Check sibling tasks completion status for parent job update
    const siblingTasks = await Task.find({ jobCardId: task.jobCardId });
    const allCompleted = siblingTasks.every((t) => t.status === 'COMPLETED');
    await JobCard.findByIdAndUpdate(task.jobCardId, {
      status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    });

    return await Task.findById(taskId).populate('completedBy', 'name mobile role');
  }

  async addTaskToJob(jobCardId: string, title: string): Promise<ITask> {
    const newTask = await Task.create({
      jobCardId,
      title: title.trim(),
    });
    await JobCard.findByIdAndUpdate(jobCardId, { status: 'IN_PROGRESS' });
    return newTask;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const task = await Task.findById(taskId);
    if (!task) return false;

    if (task.completedBy) {
      await User.findByIdAndUpdate(task.completedBy, { $inc: { taskCount: -1 } });
    }

    const jobCardId = task.jobCardId;
    await Task.findByIdAndDelete(taskId);

    const remainingTasks = await Task.find({ jobCardId });
    if (remainingTasks.length > 0) {
      const allCompleted = remainingTasks.every((t) => t.status === 'COMPLETED');
      await JobCard.findByIdAndUpdate(jobCardId, {
        status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      });
    }

    return true;
  }

  async deleteJobCard(jobCardId: string): Promise<boolean> {
    const job = await JobCard.findById(jobCardId);
    if (!job) return false;

    const tasks = await Task.find({ jobCardId });
    for (const t of tasks) {
      if (t.completedBy) {
        await User.findByIdAndUpdate(t.completedBy, { $inc: { taskCount: -1 } });
      }
    }

    await Task.deleteMany({ jobCardId });
    await JobCard.findByIdAndDelete(jobCardId);
    return true;
  }
}

export const jobRepository = new JobRepository();
