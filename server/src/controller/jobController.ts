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

export const createJobWithTasks = async (req: Request, res: Response) => {
  try {
    const { vehicleName, vehicleNumber, color, tasks } = req.body;

    if (!vehicleName || !vehicleNumber || !Array.isArray(tasks) || tasks.length === 0) {
      return sendError(res, 'Vehicle Name, Vehicle Number, and at least one Task are required.', 400);
    }

    const newJob = await jobRepository.createJobCard({
      vehicleName,
      vehicleNumber,
      color: color?.trim() || undefined,
      createdBy: req.user?.id!,
    });

    const taskDocs = tasks.map((taskTitle: string) => ({
      jobCardId: newJob._id,
      title: taskTitle,
    }));
    const createdTasks = await jobRepository.createSubTasks(taskDocs);

    const fullJob = {
      ...newJob.toObject(),
      id: newJob._id.toString(),
      tasks: createdTasks.map((t) => ({ ...t.toObject(), id: t._id.toString() })),
    };

    emitJobCreated(fullJob);

    return sendSuccess(res, 'Job Card Published!', fullJob, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create job card.', 500);
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
            tasks: tasks.map((t) => ({
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
          tasks: tasks.map((t) => ({
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
    const { action } = req.body;
    const userId = req.user?.id;

    if (!action || !['COMPLETE', 'REOPEN'].includes(action)) {
      return sendError(res, 'Action must be "COMPLETE" or "REOPEN".', 400);
    }

    const updatedTask = await jobRepository.setTaskStatus(taskId, action, userId!);
    if (!updatedTask) {
      return sendError(res, 'Task not found.', 404);
    }

    const formattedTask = {
      ...updatedTask.toObject(),
      id: updatedTask._id.toString(),
    };

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
    const deleted = await jobRepository.deleteJobCard(jobCardId);
    if (!deleted) {
      return sendError(res, 'Job card not found.', 404);
    }

    emitJobDeleted(jobCardId);

    return sendSuccess(res, 'Job card and all sub-tasks deleted successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete job card.', 500);
  }
};
