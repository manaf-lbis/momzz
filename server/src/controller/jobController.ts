import { Request, Response } from 'express';
import { JobCard } from '../model/JobCard';
import { Task } from '../model/Task';
import { sendSuccess, sendError } from '../utils/responseHandler';

export const createJobWithTasks = async (req: Request, res: Response) => {
  try {
    const { vehicleName, vehicleNumber, tasks } = req.body;

    if (!vehicleName || !vehicleNumber || !Array.isArray(tasks) || tasks.length === 0) {
      return sendError(res, 'Vehicle Name, Vehicle Number, and at least one Task are required.', 400);
    }

    // 1. Create Vehicle Job Card
    const newJob = await JobCard.create({
      vehicleName,
      vehicleNumber,
      createdBy: req.user?.id,
    });

    // 2. Bulk Insert Sub-tasks tied to this Job Card
    const taskDocs = tasks.map((taskTitle: string) => ({
      jobCardId: newJob._id,
      title: taskTitle,
    }));
    await Task.insertMany(taskDocs);

    return sendSuccess(res, 'Job Card Published!', newJob, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create job card.', 500);
  }
};

export const getJobCards = async (req: Request, res: Response) => {
  try {
    const jobs = await JobCard.find().sort({ createdAt: -1 });

    const jobsWithTasks = await Promise.all(
      jobs.map(async (job) => {
        const tasks = await Task.find({ jobCardId: job._id }).populate('completedBy', 'name mobile role');
        
        // Auto update job status if all tasks are completed
        const allCompleted = tasks.length > 0 && tasks.every(t => t.status === 'COMPLETED');
        const targetStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';
        
        if (job.status !== targetStatus) {
          job.status = targetStatus;
          await job.save();
        }

        return {
          ...job.toObject(),
          id: job._id.toString(),
          tasks: tasks.map(t => ({
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

    const task = await Task.findById(taskId);
    if (!task) {
      return sendError(res, 'Task not found.', 404);
    }

    if (task.status === 'COMPLETED') {
      task.status = 'OPEN';
      task.completedBy = undefined;
      task.completedAt = undefined;
    } else {
      task.status = 'COMPLETED';
      task.completedBy = userId as any;
      task.completedAt = new Date();
    }

    await task.save();
    const updatedTask = await Task.findById(taskId).populate('completedBy', 'name mobile role');

    // Check parent job completion
    const siblingTasks = await Task.find({ jobCardId: task.jobCardId });
    const allCompleted = siblingTasks.every((t) => t.status === 'COMPLETED');
    await JobCard.findByIdAndUpdate(task.jobCardId, {
      status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    });

    return sendSuccess(
      res,
      `Task status updated to ${task.status}`,
      {
        ...updatedTask?.toObject(),
        id: updatedTask?._id.toString(),
      },
      200
    );
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update task status.', 500);
  }
};
