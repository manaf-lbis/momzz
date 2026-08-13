import { Request, Response } from 'express';
import { jobRepository } from '../repository/jobRepository';
import { sendSuccess, sendError } from '../utils/responseHandler';
import {
  emitJobCreated,
  emitJobDeleted,
  emitTaskAdded,
  emitTaskUpdated,
  emitTaskDeleted,
} from '../config/socket';
import { getCloudinaryUrl } from '../utils/cloudinaryHelper';

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
    const { vehicleName, vehicleNumber, vehicleColor, customerName, customerMobile, customerEmail, tasks } = req.body;

    if (!vehicleName || !vehicleNumber || !Array.isArray(tasks) || tasks.length === 0) {
      return sendError(res, 'Vehicle Name, Vehicle Number, and at least one Task are required.', 400);
    }

    const newJob = await jobRepository.createJobCard({
      vehicleName,
      vehicleNumber,
      vehicleColor: vehicleColor?.trim() || undefined,
      customerName: customerName?.trim() || undefined,
      customerMobile: customerMobile?.trim() || undefined,
      customerEmail: customerEmail?.trim() || undefined,
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

    const fullJob = {
      ...newJob.toObject(),
      id: newJob._id.toString(),
      tasks: createdTasks.map((t) => mapTaskImages({ ...t.toObject(), id: t._id.toString() })),
    };

    emitJobCreated(fullJob);

    return sendSuccess(res, 'Job Card Published!', fullJob, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create job card.', 500);
  }
};

export const updateJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const allowedFields = ['vehicleName', 'vehicleNumber', 'vehicleColor', 'customerName', 'customerMobile', 'customerEmail'];
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => field in req.body)
        .map((field) => [field, typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field]])
    );
    if (updates.vehicleNumber) updates.vehicleNumber = updates.vehicleNumber.toUpperCase();
    const updatedJob = await jobRepository.updateJobCard(jobCardId, updates);
    if (!updatedJob) return sendError(res, 'Job card not found.', 404);
    return sendSuccess(res, 'Job card updated successfully.', { ...updatedJob.toObject(), id: updatedJob._id.toString() });
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update job card.', 500);
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
        vehicleColor: job.vehicleColor, status: job.status, createdAt: job.createdAt, updatedAt: job.updatedAt,
        tasks: tasks.map((task) => ({ id: task._id.toString(), title: task.title, status: task.status, completedAt: task.completedAt })),
      };
    }));
    return sendSuccess(res, 'Service history retrieved.', publicJobs);
  } catch (error: any) {
    return sendError(res, error.message || 'Unable to track service.', 500);
  }
};

export const getJobCards = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const timeframe = req.query.timeframe as string | undefined;

    if (page || limit || timeframe) {
      const paginatedResult = await jobRepository.findPaginatedJobs({ page, limit, timeframe });
      const jobsWithTasks = await Promise.all(
        paginatedResult.jobs.map(async (job) => {
          const tasks = await jobRepository.findTasksByJobCardId(job._id.toString());
          const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
          const targetStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';

          if (job.status !== targetStatus) {
            await jobRepository.updateJobStatus(job._id.toString(), targetStatus);
            job.status = targetStatus;
          }

          return {
            ...job.toObject(),
            id: job._id.toString(),
            tasks: tasks.map((t) => mapTaskImages({
              ...t.toObject(),
              id: t._id.toString(),
            })),
          };
        })
      );

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

    const jobs = await jobRepository.findAllJobs();

    const jobsWithTasks = await Promise.all(
      jobs.map(async (job) => {
        const tasks = await jobRepository.findTasksByJobCardId(job._id.toString());

        const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'COMPLETED');
        const targetStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';

        if (job.status !== targetStatus) {
          await jobRepository.updateJobStatus(job._id.toString(), targetStatus);
          job.status = targetStatus;
        }

        return {
          ...job.toObject(),
          id: job._id.toString(),
          tasks: tasks.map((t) => mapTaskImages({
            ...t.toObject(),
            id: t._id.toString(),
          })),
        };
      })
    );

    return sendSuccess(res, 'Job cards retrieved successfully.', jobsWithTasks, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch job cards.', 500);
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

    return sendSuccess(res, 'Job card moved to deleted records successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete job card.', 500);
  }
};
