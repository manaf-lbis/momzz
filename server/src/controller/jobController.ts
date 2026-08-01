import { Request, Response } from 'express';
import { jobRepository } from '../repository/jobRepository';
import { sendSuccess, sendError } from '../utils/responseHandler';

export const createJobWithTasks = async (req: Request, res: Response) => {
  try {
    const { vehicleName, vehicleNumber, tasks } = req.body;

    if (!vehicleName || !vehicleNumber || !Array.isArray(tasks) || tasks.length === 0) {
      return sendError(res, 'Vehicle Name, Vehicle Number, and at least one Task are required.', 400);
    }

    const newJob = await jobRepository.createJobCard({
      vehicleName,
      vehicleNumber,
      createdBy: req.user?.id!,
    });

    const taskDocs = tasks.map((taskTitle: string) => ({
      jobCardId: newJob._id,
      title: taskTitle,
    }));
    await jobRepository.createSubTasks(taskDocs);

    return sendSuccess(res, 'Job Card Published!', newJob, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create job card.', 500);
  }
};

export const getJobCards = async (req: Request, res: Response) => {
  try {
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

export const toggleTaskComplete = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.id;

    const updatedTask = await jobRepository.toggleTaskStatus(taskId, userId!);
    if (!updatedTask) {
      return sendError(res, 'Task not found.', 404);
    }

    return sendSuccess(
      res,
      `Task status updated to ${updatedTask.status}`,
      {
        ...updatedTask.toObject(),
        id: updatedTask._id.toString(),
      },
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

    return sendSuccess(
      res,
      'Task added successfully.',
      {
        ...newTask.toObject(),
        id: newTask._id.toString(),
      },
      201
    );
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to add task.', 500);
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const deleted = await jobRepository.deleteTask(taskId);
    if (!deleted) {
      return sendError(res, 'Task not found.', 404);
    }

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

    return sendSuccess(res, 'Job card and all sub-tasks deleted successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete job card.', 500);
  }
};
