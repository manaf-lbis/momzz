import { Request, Response } from 'express';
import { jobRepository } from './job.repository';
import { sendSuccess, sendError } from '../../shared/utils/response.handler';
import {
  emitJobCreated,
  emitJobUpdated,
  emitJobDeleted,
  emitTaskAdded,
  emitTaskUpdated,
  emitTaskDeleted,
} from '../../config/socket';
import { getCloudinaryUrl, uploadToCloudinary, extractPublicId } from '../../shared/utils/cloudinary.helper';
import { cacheService } from '../cache/cache.service';


/**
 * Maps all populated image fields in a job card object through getCloudinaryUrl().
 */
const mapJobCardImages = (jobObj: any) => {
  if (!jobObj) return jobObj;
  if (jobObj.thumbnailUrl) {
    jobObj.thumbnailUrl = getCloudinaryUrl(jobObj.thumbnailUrl);
  }
  if (jobObj.createdBy?.profileImageUrl) {
    jobObj.createdBy.profileImageUrl = getCloudinaryUrl(jobObj.createdBy.profileImageUrl);
  }
  return jobObj;
};

/**
 * Maps all populated image fields in a task object through getCloudinaryUrl().
 * Handles completedBy.profileImageUrl, partners[].profileImageUrl,
 * activityLog[].user.profileImageUrl, and inventoryItem.thumbnailUrl.
 */
const mapTaskImages = (taskObj: any) => {
  if (!taskObj) return taskObj;
  // completedBy
  if (taskObj.completedBy?.profileImageUrl) {
    taskObj.completedBy.profileImageUrl = getCloudinaryUrl(taskObj.completedBy.profileImageUrl);
  }
  // partners
  if (Array.isArray(taskObj.partners)) {
    taskObj.partners = taskObj.partners.map((p: any) => {
      if (p?.profileImageUrl) p.profileImageUrl = getCloudinaryUrl(p.profileImageUrl);
      return p;
    });
  }
  // activityLog
  if (Array.isArray(taskObj.activityLog)) {
    taskObj.activityLog = taskObj.activityLog.map((entry: any) => {
      if (entry?.user?.profileImageUrl) entry.user.profileImageUrl = getCloudinaryUrl(entry.user.profileImageUrl);
      return entry;
    });
  }
  // inventoryItem thumbnail
  if (taskObj.inventoryItem?.thumbnailUrl) {
    taskObj.inventoryItem.thumbnailUrl = getCloudinaryUrl(taskObj.inventoryItem.thumbnailUrl);
  }
  return taskObj;
};

export const createJobWithTasks = async (req: Request, res: Response) => {
  try {
    const { vehicleName, vehicleNumber, vehicleColor, customerName, customerMobile, customerEmail, thumbnailUrl, expectedDeliveryDate, tasks } = req.body;

    if (!vehicleName || !vehicleNumber || !Array.isArray(tasks) || tasks.length === 0) {
      return sendError(res, 'Vehicle Name, Vehicle Number, and at least one Task are required.', 400);
    }

    let photoPublicId = undefined;
    if (thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.trim()) {
      if (thumbnailUrl.startsWith('data:image')) {
        const { publicId } = await uploadToCloudinary(thumbnailUrl, 'momzz/vehicles');
        photoPublicId = publicId;
      } else {
        photoPublicId = extractPublicId(thumbnailUrl);
      }
    }

    const newJob = await jobRepository.createJobCard({
      vehicleName,
      vehicleNumber,
      vehicleColor: vehicleColor?.trim() || undefined,
      customerName: customerName?.trim() || undefined,
      customerMobile: customerMobile?.trim() || undefined,
      customerEmail: customerEmail?.trim() || undefined,
      thumbnailUrl: photoPublicId,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      createdBy: req.user?.id!,
    });

    const createdTasks = [];
    for (const task of tasks) {
      // Keep accepting legacy text tasks, while allowing the job creator to send
      // catalog products/services with their selected quantity and discount.
      if (typeof task === 'string') {
        createdTasks.push(await jobRepository.addTaskToJob(newJob._id.toString(), task));
        continue;
      }

      if (!task?.itemId) throw new Error('Each selected inventory item needs an item id.');
      createdTasks.push(await jobRepository.addInventoryTask(
        newJob._id.toString(),
        task.itemId,
        Number(task.quantityUsed || 1),
        Number(task.discountAmount || 0),
      ));
    }

    const populatedNewJob = await jobRepository.findJobById(newJob._id.toString());
    const fullJob = mapJobCardImages({
      ...(populatedNewJob ? populatedNewJob.toObject() : newJob.toObject()),
      id: newJob._id.toString(),
      tasks: createdTasks.map((t) => mapTaskImages({ ...t.toObject(), id: t._id.toString() })),
    });

    emitJobCreated(fullJob);
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(res, 'Job Card Published!', fullJob, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create job card.', 500);
  }
};

export const updateJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const allowedFields = ['vehicleName', 'vehicleNumber', 'vehicleColor', 'customerName', 'customerMobile', 'customerEmail', 'expectedDeliveryDate'];
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => field in req.body)
        .map((field) => {
          if (field === 'expectedDeliveryDate') {
            return [field, req.body[field] ? new Date(req.body[field]) : null];
          }
          return [field, typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field]];
        })
    );
    if (updates.vehicleNumber) updates.vehicleNumber = updates.vehicleNumber.toUpperCase();
    const updatedJob = await jobRepository.updateJobCard(jobCardId, updates);
    if (!updatedJob) return sendError(res, 'Job card not found.', 404);
    const populated = await jobRepository.findJobById(jobCardId);
    const formatted = mapJobCardImages({
      ...(populated ? populated.toObject() : updatedJob.toObject()),
      id: updatedJob._id.toString(),
    });
    emitJobUpdated(formatted);
    await cacheService.delByPrefix('cache:jobs');
    return sendSuccess(res, 'Job card updated successfully.', formatted);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update job card.', 500);
  }
};

export const uploadJobImage = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const { image } = req.body;

    if (!jobCardId || !image) {
      return sendError(res, 'Job card ID and image data are required.', 400);
    }

    const { publicId } = await uploadToCloudinary(image, 'momzz/vehicles');
    const updatedJob = await jobRepository.updateJobThumbnail(jobCardId, publicId);
    if (!updatedJob) {
      return sendError(res, 'Job card not found.', 404);
    }

    const tasks = await jobRepository.findTasksByJobCardId(jobCardId);
    const formatted = mapJobCardImages({
      ...updatedJob.toObject(),
      id: updatedJob._id.toString(),
      tasks: tasks.map(mapTaskImages),
    });

    emitJobUpdated(formatted);
    await cacheService.delByPrefix('cache:jobs');
    return sendSuccess(res, 'Vehicle photo updated successfully.', formatted);

  } catch (error: any) {
    return sendError(res, error.message || 'Failed to upload vehicle photo.', 500);
  }
};

export const trackPublicJobs = async (req: Request, res: Response) => {
  try {
    const { vehicleNumber, mobile, email } = req.body;
    if (!vehicleNumber || (!mobile && !email)) {
      return sendError(res, 'Vehicle number and either mobile number or email address are required.', 400);
    }
    const jobs = await jobRepository.findPublicJobs(vehicleNumber, { mobile, email });
    const publicJobs = await Promise.all(jobs.map(async (job) => {
      const tasks = await jobRepository.findTasksByJobCardId(job._id.toString());
      return {
        id: job._id.toString(), vehicleName: job.vehicleName, vehicleNumber: job.vehicleNumber,
        vehicleColor: job.vehicleColor, expectedDeliveryDate: job.expectedDeliveryDate, status: job.status, createdAt: job.createdAt, updatedAt: job.updatedAt,
        tasks: tasks.map((task) => ({ id: task._id.toString(), title: task.title, status: task.status, completedAt: task.completedAt })),
      };
    }));
    return sendSuccess(res, 'Service history retrieved.', publicJobs);
  } catch (error: any) {
    return sendError(res, error.message || 'Unable to track service.', 500);
  }
};

export const getJobCardById = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const job = await jobRepository.findJobById(jobCardId);
    if (!job) return sendError(res, 'Job card not found.', 404);

    const tasks = await jobRepository.findTasksByJobCardId(jobCardId);
    const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
    const targetStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';

    if (job.status !== targetStatus) {
      await jobRepository.updateJobStatus(job._id.toString(), targetStatus);
      job.status = targetStatus;
    }

    const formatted = mapJobCardImages({
      ...job.toObject(),
      id: job._id.toString(),
      tasks: tasks.map((t) => mapTaskImages({
        ...t.toObject(),
        id: t._id.toString(),
      })),
    });

    return sendSuccess(res, 'Job card retrieved successfully.', formatted, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch job card.', 500);
  }
};

export const getJobStats = async (req: Request, res: Response) => {
  try {
    const cachedStats = await cacheService.get<any>('cache:jobs:stats');
    if (cachedStats) {
      return sendSuccess(res, 'Job stats retrieved successfully.', cachedStats, 200);
    }
    const stats = await jobRepository.getJobStats();
    await cacheService.set('cache:jobs:stats', stats);
    return sendSuccess(res, 'Job stats retrieved successfully.', stats, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch job stats.', 500);
  }
};

export const getJobCards = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const timeframe = req.query.timeframe as string | undefined;
    const tab = req.query.tab as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
    const liveOnly = req.query.liveOnly === 'true';

    // Historical / Search / Paginated tabs (e.g. ALL_VEHICLES) load directly from MongoDB via indexes
    if (page || limit || timeframe || tab || search || sortBy) {
      const paginatedResult = await jobRepository.findPaginatedJobs({ page, limit, timeframe, tab, search, sortBy, sortOrder });
      const jobIds = paginatedResult.jobs.map((j) => j._id);
      const taskMap = await jobRepository.findTasksForJobs(jobIds);

      const jobsWithTasks = paginatedResult.jobs.map((job) => {
        const tasks = taskMap[job._id.toString()] || [];
        const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
        const targetStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';

        if (job.status !== targetStatus) {
          jobRepository.updateJobStatus(job._id.toString(), targetStatus).catch(() => {});
          job.status = targetStatus;
        }

        return mapJobCardImages({
          ...job.toObject(),
          id: job._id.toString(),
          tasks: tasks.map((t) => mapTaskImages({
            ...t.toObject(),
            id: t._id.toString(),
          })),
        });
      });

      return sendSuccess(
        res,
        'Job cards retrieved successfully.',
        {
          jobs: jobsWithTasks,
          pagination: {
            total: paginatedResult.total,
            page: paginatedResult.page,
            totalPages: paginatedResult.totalPages,
          },
        },
        200
      );
    }

    // Live active garage vehicles only — cached in memory (0ms, 0 queries, almost 0 RAM overhead)
    const cachedLiveJobs = await cacheService.get<any[]>('cache:jobs:live');
    if (cachedLiveJobs) {
      return sendSuccess(res, 'Live job cards retrieved successfully.', cachedLiveJobs, 200);
    }

    const liveJobs = await jobRepository.findLiveJobs();
    const jobIds = liveJobs.map((j) => j._id);
    const taskMap = await jobRepository.findTasksForJobs(jobIds);

    const liveJobsWithTasks = liveJobs.map((job) => {
      const tasks = taskMap[job._id.toString()] || [];
      const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
      const targetStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';

      if (job.status !== targetStatus) {
        jobRepository.updateJobStatus(job._id.toString(), targetStatus).catch(() => {});
        job.status = targetStatus;
      }

      return mapJobCardImages({
        ...job.toObject(),
        id: job._id.toString(),
        tasks: tasks.map((t) => mapTaskImages({
          ...t.toObject(),
          id: t._id.toString(),
        })),
      });
    });

    await cacheService.set('cache:jobs:live', liveJobsWithTasks);
    return sendSuccess(res, 'Live job cards retrieved successfully.', liveJobsWithTasks, 200);

  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch job cards.', 500);
  }
};


export const toggleTaskPin = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updatedTask = await jobRepository.togglePinTask(taskId);
    if (!updatedTask) return sendError(res, 'Task not found.', 404);

    const formattedTask = mapTaskImages({
      ...updatedTask.toObject(),
      id: updatedTask._id.toString(),
    });

    emitTaskUpdated(updatedTask.jobCardId.toString(), taskId, formattedTask, 'PIN_TOGGLED');
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(
      res,
      `Task ${formattedTask.isPinned ? 'pinned' : 'unpinned'} successfully.`,
      formattedTask,
      200
    );
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to toggle pin.', 500);
  }
};

export const toggleJobPin = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const { mode } = req.body; // 'ALL' | 'ME'
    if (!['ALL', 'ME'].includes(mode)) {
      return sendError(res, 'Invalid pin mode. Must be "ALL" or "ME".', 400);
    }

    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const updatedJob = await jobRepository.togglePinJobCard(jobCardId, userId, mode);
    if (!updatedJob) return sendError(res, 'Job card not found.', 404);

    const tasks = await jobRepository.findTasksByJobCardId(jobCardId);
    const formattedJob = mapJobCardImages({
      ...updatedJob.toObject(),
      id: updatedJob._id.toString(),
      tasks: tasks.map((t) => mapTaskImages({ ...t.toObject(), id: t._id.toString() })),
    });

    emitJobUpdated(formattedJob);
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(
      res,
      `Job card pin updated successfully.`,
      formattedJob,
      200
    );
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to toggle job card pin.', 500);
  }
};

/**
 * Explicit set task status — accepts `action` in body: 'COMPLETE' or 'REOPEN'.
 * NOT a toggle. Idempotent and race-condition safe.
 */
export const setTaskStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { action, partnerIds } = req.body;
    const userId = req.user?.id;

    if (!action || !['COMPLETE', 'REOPEN'].includes(action)) {
      return sendError(res, 'Action must be "COMPLETE" or "REOPEN".', 400);
    }

    const task = await jobRepository.findTaskById(taskId);
    if (!task) return sendError(res, 'Task not found.', 404);
    const job = await jobRepository.findJobById(task.jobCardId.toString());
    if (job?.verifiedAt && req.user?.role !== 'ADMIN') {
      return sendError(res, 'This job card has been verified and is view-only for mechanics.', 403);
    }

    // partnerIds can be an array from the client, or undefined for solo work
    const normalizedPartnerIds: string[] | undefined = Array.isArray(partnerIds)
      ? partnerIds.filter((id: any) => typeof id === 'string' && id.trim())
      : undefined;

    const updatedTask = await jobRepository.setTaskStatus(taskId, action, userId!, normalizedPartnerIds);
    if (!updatedTask) {
      return sendError(res, 'Task not found.', 404);
    }

    const formattedTask = mapTaskImages({
      ...updatedTask.toObject(),
      id: updatedTask._id.toString(),
    });

    // Emit with the explicit action so clients know exactly what happened
    emitTaskUpdated(updatedTask.jobCardId.toString(), taskId, formattedTask, action);
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(
      res,
      `Task ${action === 'COMPLETE' ? 'completed' : 'reopened'} successfully.`,
      formattedTask,
      200
    );
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update task status.', 500);
  }
};

export const verifyJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const job = await jobRepository.findJobById(jobCardId);
    if (!job) return sendError(res, 'Job card not found.', 404);
    const tasks = await jobRepository.findTasksByJobCardId(jobCardId);
    if (!tasks.length || tasks.some((task) => task.status !== 'COMPLETED')) {
      return sendError(res, 'Complete every task before final verification.', 400);
    }
    const verifiedJob = await jobRepository.verifyJobCard(jobCardId, req.user!.id);
    if (!verifiedJob) return sendError(res, 'This job card has already been verified.', 400);
    await cacheService.delByPrefix('cache:jobs');
    return sendSuccess(res, 'Job card verified successfully.', { ...verifiedJob.toObject(), id: verifiedJob._id.toString() });
  } catch (error: any) {
    return sendError(res, error.message || 'Unable to verify job card.', 500);
  }
};

export const addTaskToJob = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 'Task title is required.', 400);
    }

    const job = await jobRepository.findJobById(jobCardId);
    if (!job) {
      return sendError(res, 'Job card not found.', 404);
    }

    const newTask = await jobRepository.addTaskToJob(jobCardId, title);

    const formattedTask = {
      ...newTask.toObject(),
      id: newTask._id.toString(),
    };

    emitTaskAdded(jobCardId, formattedTask);
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(res, 'Task added successfully.', formattedTask, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to add task.', 500);
  }
};

export const addInventoryTaskToJob = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const { itemId, quantityUsed = 1, discountAmount = 0 } = req.body;
    if (!itemId || Number(quantityUsed) < 1 || Number(discountAmount) < 0) return sendError(res, 'A valid item, quantity, and discount are required.', 400);
    const job = await jobRepository.findJobById(jobCardId);
    if (!job) return sendError(res, 'Job card not found.', 404);
    const task = await jobRepository.addInventoryTask(jobCardId, itemId, Number(quantityUsed), Number(discountAmount));
    const formattedTask = { ...task.toObject(), id: task._id.toString() };
    emitTaskAdded(jobCardId, formattedTask);
    await cacheService.delByPrefix('cache:jobs');
    return sendSuccess(res, 'Inventory item added to job.', formattedTask, 201);
  } catch (error: any) { return sendError(res, error.message || 'Could not add inventory item.', 400); }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const deletedTask = await jobRepository.deleteTask(taskId);
    if (!deletedTask) {
      return sendError(res, 'Task not found.', 404);
    }

    // Emit with the correct jobCardId from the deleted task document
    emitTaskDeleted(deletedTask.jobCardId.toString(), taskId);
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(res, 'Task deleted successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete task.', 500);
  }
};


export const deleteJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const deleted = await jobRepository.deleteJobCard(jobCardId, req.user?.id!);
    if (!deleted) {
      return sendError(res, 'Job card not found.', 404);
    }

    emitJobDeleted(jobCardId);
    await cacheService.delByPrefix('cache:jobs');

    return sendSuccess(res, 'Job card moved to deleted records successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete job card.', 500);
  }
};

