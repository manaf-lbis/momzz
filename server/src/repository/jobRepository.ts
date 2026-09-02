import mongoose from 'mongoose';
import { JobCard, IJobCard } from '../model/JobCard';
import { Task, ITask } from '../model/Task';
import User from '../model/User';
import { catalogRepository } from './catalogRepository';
import { cacheService } from '../service/cacheService';


export class JobRepository {
  async createJobCard(data: {
    vehicleName: string;
    vehicleNumber: string;
    vehicleColor?: string;
    customerName?: string;
    customerMobile?: string;
    customerEmail?: string;
    thumbnailUrl?: string;
    expectedDeliveryDate?: Date | string | null;
    createdBy: string;
  }): Promise<IJobCard> {
    return await JobCard.create(data);
  }


  async createSubTasks(tasks: Array<{ jobCardId: any; title?: string | { itemId: string; quantityUsed?: number; discountAmount?: number }; itemId?: string; quantityUsed?: number; discountAmount?: number }>): Promise<ITask[]> {
    const normalized = await Promise.all(tasks.map(async (task) => {
      const taskValue = task.title ?? (task.itemId ? {
        itemId: task.itemId,
        quantityUsed: task.quantityUsed,
        discountAmount: task.discountAmount,
      } : undefined);

      if (typeof taskValue === 'string') return { jobCardId: task.jobCardId, title: taskValue.trim() };
      if (!taskValue?.itemId) throw new Error('Each selected inventory item needs an item id.');

      const item = await catalogRepository.findItem(taskValue.itemId);
      if (!item) throw new Error('Selected inventory item was not found.');
      const quantity = Math.max(1, Number(taskValue.quantityUsed || 1));
      const stockTracked = item.itemType === 'PRODUCT' && item.trackStock !== false;
      if (stockTracked && !await catalogRepository.deductStock(item._id.toString(), quantity)) throw new Error('Insufficient stock for this item.');
      const discountAmount = Math.max(0, Number(taskValue.discountAmount || 0));
      return { jobCardId: task.jobCardId, title: item.title, inventoryItem: item._id, itemType: item.itemType, quantityUsed: quantity, stockTracked, unitPrice: item.price, discountAmount, finalPrice: Math.max(0, item.price * quantity - discountAmount) } as any;
    }));
    return await Task.insertMany(normalized) as unknown as ITask[];
  }

  async findAllJobs(): Promise<IJobCard[]> {
    return await JobCard.find({ isDeleted: { $ne: true } })
      .populate('verifiedBy', 'name mobile role')
      .populate('createdBy', 'name mobile role profileImageUrl')
      .sort({ isPinnedForAll: -1, status: -1, createdAt: -1 });
  }

  async findLiveJobs(): Promise<IJobCard[]> {
    return await JobCard.find({
      isDeleted: { $ne: true },
      $or: [
        { status: 'IN_PROGRESS' },
        { verifiedAt: null }
      ]
    })
      .populate('verifiedBy', 'name mobile role')
      .populate('createdBy', 'name mobile role profileImageUrl')
      .sort({ isPinnedForAll: -1, status: -1, createdAt: -1 });
  }

  async getJobStats(): Promise<{
    activeCount: number;
    totalCount: number;
    pendingVerificationCount: number;
    totalCompletedTasks: number;
  }> {
    const [activeCount, totalCount, pendingVerificationCount, totalCompletedTasks] = await Promise.all([
      JobCard.countDocuments({ isDeleted: { $ne: true }, status: 'IN_PROGRESS' }),
      JobCard.countDocuments({ isDeleted: { $ne: true } }),
      JobCard.countDocuments({ isDeleted: { $ne: true }, status: 'COMPLETED', verifiedAt: null }),
      Task.countDocuments({ status: 'COMPLETED' }),
    ]);

    return {
      activeCount,
      totalCount,
      pendingVerificationCount,
      totalCompletedTasks,
    };
  }


  async findPaginatedJobs(options: {
    page?: number;
    limit?: number;
    timeframe?: string;
    tab?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ jobs: IJobCard[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 12);
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: { $ne: true } };

    if (options.tab) {
      const tabUpper = options.tab.toUpperCase();
      if (tabUpper === 'PENDING_VERIFICATION' || tabUpper === 'VERIFY') {
        query.verifiedAt = null;
        query.status = 'COMPLETED';
      } else if (tabUpper === 'MY_JOBS') {
        query.status = 'IN_PROGRESS';
      }
    }

    if (options.search && options.search.trim()) {
      const s = options.search.trim();
      const cleanPlate = s.replace(/[\s-]+/g, '');
      query.$or = [
        { vehicleName: { $regex: s, $options: 'i' } },
        { vehicleNumber: { $regex: s, $options: 'i' } },
        { vehicleNumber: { $regex: cleanPlate, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { customerMobile: { $regex: s, $options: 'i' } },
      ];
    }

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

    const sortConfig: any = { isPinnedForAll: -1 };
    const direction = options.sortOrder === 'asc' ? 1 : -1;
    if (options.sortBy === 'expectedDeliveryDate') {
      sortConfig.expectedDeliveryDate = direction;
    } else if (options.sortBy === 'vehicleName') {
      sortConfig.vehicleName = direction;
    } else if (options.sortBy === 'createdAt') {
      sortConfig.createdAt = direction;
    } else {
      sortConfig.status = -1;
      sortConfig.createdAt = -1;
    }

    const [jobs, total] = await Promise.all([
      JobCard.find(query)
        .populate('verifiedBy', 'name mobile role')
        .populate('createdBy', 'name mobile role profileImageUrl')
        .sort(sortConfig)
        .skip(skip)
        .limit(limit),
      JobCard.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return { jobs, total, page, totalPages };
  }

  async findTasksByJobCardId(jobCardId: string): Promise<ITask[]> {
    return await Task.find({ jobCardId })
      .populate('completedBy', 'name mobile role profileImageUrl')
      .populate('partners', 'name mobile role profileImageUrl')
      .populate('activityLog.user', 'name mobile role profileImageUrl')
      .populate('inventoryItem', 'title thumbnailUrl itemType stockQuantity');
  }

  async findTasksForJobs(jobCardIds: (string | mongoose.Types.ObjectId)[], isDetailed: boolean = false): Promise<Record<string, ITask[]>> {
    if (!jobCardIds || jobCardIds.length === 0) return {};

    let query = Task.find({ jobCardId: { $in: jobCardIds } });
    if (!isDetailed) {
      // Lightweight projection for lists — includes partner co-workers for shared points tracking
      query = query
        .select('title status jobCardId isPinned completedBy partners isShared createdAt completedAt')
        .populate('completedBy', 'name role profileImageUrl')
        .populate('partners', 'name role profileImageUrl') as any;
    } else {
      query = query
        .populate('completedBy', 'name mobile role profileImageUrl')
        .populate('partners', 'name mobile role profileImageUrl')
        .populate('activityLog.user', 'name mobile role profileImageUrl')
        .populate('inventoryItem', 'title thumbnailUrl itemType stockQuantity') as any;
    }

    const tasks = await query;

    const map: Record<string, ITask[]> = {};
    for (const t of tasks) {
      const key = t.jobCardId ? t.jobCardId.toString() : '';
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    }
    return map;
  }



  async findJobById(jobCardId: string): Promise<IJobCard | null> {
    if (!jobCardId || !mongoose.Types.ObjectId.isValid(jobCardId)) {
      return null;
    }
    return await JobCard.findOne({ _id: jobCardId, isDeleted: { $ne: true } })
      .populate('verifiedBy', 'name mobile role')
      .populate('createdBy', 'name mobile role profileImageUrl');
  }

  async updateJobThumbnail(jobCardId: string, publicId: string): Promise<IJobCard | null> {
    return await JobCard.findByIdAndUpdate(
      jobCardId,
      { thumbnailUrl: publicId },
      { new: true }
    )
      .populate('verifiedBy', 'name mobile role')
      .populate('createdBy', 'name mobile role profileImageUrl');
  }

  async togglePinJobCard(jobCardId: string, userId: string, mode: 'ALL' | 'ME'): Promise<IJobCard | null> {
    const job = await JobCard.findOne({ _id: jobCardId, isDeleted: { $ne: true } });
    if (!job) return null;

    if (mode === 'ALL') {
      job.isPinnedForAll = !job.isPinnedForAll;
    } else if (mode === 'ME') {
      const pinnedArray = (job.pinnedBy || []).map((id: any) => id.toString());
      const userIdx = pinnedArray.indexOf(userId.toString());
      if (userIdx > -1) {
        pinnedArray.splice(userIdx, 1);
      } else {
        pinnedArray.push(userId.toString());
      }
      job.pinnedBy = pinnedArray as any;
    }

    await job.save();

    return await JobCard.findById(jobCardId)
      .populate('verifiedBy', 'name mobile role')
      .populate('createdBy', 'name mobile role profileImageUrl');
  }

  async updateJobCard(jobCardId: string, data: Partial<Pick<IJobCard, 'vehicleName' | 'vehicleNumber' | 'vehicleColor' | 'customerName' | 'customerMobile' | 'customerEmail' | 'expectedDeliveryDate'>>) {
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
   * Explicit set task status.
   * Supports multiple co-workers: points = 1 / (1 + partners.length) for each person.
   */
  async setTaskStatus(
    taskId: string,
    action: 'COMPLETE' | 'REOPEN',
    userId: string,
    partnerIds?: string[]
  ): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;

    if (action === 'COMPLETE') {
      if (task.status === 'COMPLETED') {
        return await Task.findById(taskId)
          .populate('completedBy', 'name mobile role profileImageUrl')
          .populate('partners', 'name mobile role profileImageUrl');
      }

      // Filter out the current user from partners list (safety guard)
      const validPartnerIds = (partnerIds || []).filter((id) => id && id !== userId);
      const isShared = validPartnerIds.length > 0;
      // Total workers = primary + N partners; each gets an equal fraction
      const totalWorkers = 1 + validPartnerIds.length;
      const pointsEach = parseFloat((1 / totalWorkers).toFixed(4));

      task.status = 'COMPLETED';
      task.completedBy = userId as any;
      task.partners = isShared ? (validPartnerIds as any[]) : [];
      task.isShared = isShared;
      task.completedAt = new Date();
      task.activityLog.push({ action: 'COMPLETED', user: userId as any, at: new Date() });

      // Award points to primary worker
      await User.findByIdAndUpdate(userId, { $inc: { taskCount: pointsEach } });

      // Award equal points to each co-worker
      for (const pid of validPartnerIds) {
        await User.findByIdAndUpdate(pid, { $inc: { taskCount: pointsEach } });
      }
    } else {
      // REOPEN
      if (task.status === 'OPEN') {
        return await Task.findById(taskId)
          .populate('completedBy', 'name mobile role profileImageUrl')
          .populate('partners', 'name mobile role profileImageUrl');
      }

      const prevUser = task.completedBy;
      const prevPartners: any[] = (task.partners as any) || [];
      const wasShared = !!task.isShared;
      const totalWorkers = 1 + prevPartners.length;
      const pointsEach = parseFloat((1 / totalWorkers).toFixed(4));

      task.status = 'OPEN';
      task.completedBy = undefined;
      task.partners = [];
      task.isShared = false;
      task.completedAt = undefined;
      task.activityLog.push({ action: 'REOPENED', user: userId as any, at: new Date() });

      if (wasShared) {
        if (prevUser) await User.findByIdAndUpdate(prevUser, { $inc: { taskCount: -pointsEach } });
        for (const pid of prevPartners) {
          await User.findByIdAndUpdate(pid, { $inc: { taskCount: -pointsEach } });
        }
      } else {
        if (prevUser) await User.findByIdAndUpdate(prevUser, { $inc: { taskCount: -1 } });
      }

      await JobCard.findByIdAndUpdate(task.jobCardId, { $set: { verifiedBy: null, verifiedAt: null } });
    }

    await task.save();

    // Recalculate parent job card status from sibling tasks
    const siblingTasks = await Task.find({ jobCardId: task.jobCardId });
    const allCompleted = siblingTasks.every((t) => t.status === 'COMPLETED');
    await JobCard.findByIdAndUpdate(task.jobCardId, {
      status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    });

    // Invalidate cached leaderboard
    cacheService.delByPrefix('cache:leaderboard').catch(() => {});

    return await Task.findById(taskId)
      .populate('completedBy', 'name mobile role profileImageUrl')
      .populate('partners', 'name mobile role profileImageUrl')
      .populate('activityLog.user', 'name mobile role profileImageUrl');
  }

  async togglePinTask(taskId: string): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;
    task.isPinned = !task.isPinned;
    await task.save();
    return await Task.findById(taskId)
      .populate('completedBy', 'name mobile role profileImageUrl')
      .populate('partners', 'name mobile role profileImageUrl')
      .populate('activityLog.user', 'name mobile role profileImageUrl')
      .populate('inventoryItem', 'title thumbnailUrl itemType stockQuantity');
  }

  async addCustomTask(jobCardId: string, data: { title: string; itemType?: 'PRODUCT' | 'SERVICE'; unitPrice?: number; quantityUsed?: number; discountAmount?: number }): Promise<ITask> {
    const quantity = Math.max(1, data.quantityUsed || 1);
    const unitPrice = data.unitPrice !== undefined ? Number(data.unitPrice) : 0;
    const discount = Number(data.discountAmount || 0);
    const finalPrice = Math.max(0, unitPrice * quantity - discount);
    const newTask = await Task.create({
      jobCardId,
      title: data.title.trim(),
      itemType: data.itemType || 'SERVICE',
      quantityUsed: quantity,
      stockTracked: false,
      unitPrice,
      discountAmount: discount,
      finalPrice,
    });
    await JobCard.findByIdAndUpdate(jobCardId, { $set: { status: 'IN_PROGRESS', verifiedBy: null, verifiedAt: null } });
    return newTask;
  }

  async addTaskToJob(jobCardId: string, title: string): Promise<ITask> {
    return this.addCustomTask(jobCardId, { title });
  }

  async addInventoryTask(jobCardId: string, itemId: string, quantityUsed: number, discountAmount: number): Promise<ITask> {
    const item = await catalogRepository.findItem(itemId);
    if (!item || !item.isAvailable) throw new Error('Inventory item is unavailable.');
    const stockTracked = item.itemType === 'PRODUCT' && item.trackStock !== false;
    const quantity = item.itemType === 'PRODUCT' ? quantityUsed : 1;
    if (stockTracked && !await catalogRepository.deductStock(itemId, quantity)) throw new Error('Insufficient stock for this item.');
    try {
      const finalPrice = Math.max(0, item.price * quantity - discountAmount);
      const task = await Task.create({ jobCardId, title: item.title, inventoryItem: item._id, itemType: item.itemType, quantityUsed: quantity, stockTracked, unitPrice: item.price, discountAmount, finalPrice });
      await JobCard.findByIdAndUpdate(jobCardId, { $set: { status: 'IN_PROGRESS', verifiedBy: null, verifiedAt: null } });
      return task;
    } catch (error) { if (stockTracked) await catalogRepository.restoreStock(itemId, quantity); throw error; }
  }

  async deleteTask(taskId: string): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;

    // Fix: reverse correct fractional points for all workers
    if (task.completedBy) {
      const taskPartners: any[] = (task.partners as any) || [];
      const wasShared = !!task.isShared && taskPartners.length > 0;
      const totalWorkers = wasShared ? 1 + taskPartners.length : 1;
      const deductEach = parseFloat((1 / totalWorkers).toFixed(4));

      await User.findByIdAndUpdate(task.completedBy, { $inc: { taskCount: -deductEach } });
      if (wasShared) {
        for (const pid of taskPartners) {
          const pidStr = pid?.toString();
          if (pidStr) await User.findByIdAndUpdate(pidStr, { $inc: { taskCount: -deductEach } });
        }
      }
    }

    const jobCardId = task.jobCardId;
    if (task.inventoryItem && task.itemType === 'PRODUCT' && task.stockTracked !== false) await catalogRepository.restoreStock(task.inventoryItem.toString(), task.quantityUsed || 1);
    await Task.findByIdAndDelete(taskId);
    await JobCard.findByIdAndUpdate(jobCardId, { $set: { verifiedBy: null, verifiedAt: null } });

    const remainingTasks = await Task.find({ jobCardId });
    if (remainingTasks.length > 0) {
      const allCompleted = remainingTasks.every((t) => t.status === 'COMPLETED');
      await JobCard.findByIdAndUpdate(jobCardId, {
        status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      });
    }

    // Invalidate cached leaderboard
    cacheService.delByPrefix('cache:leaderboard').catch(() => {});

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
