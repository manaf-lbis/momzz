import { Request, Response } from 'express';
import { JobCard } from '../model/JobCard';
import { Task } from '../model/Task';
import User from '../model/User';
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

export const addTaskToJob = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 'Task title is required.', 400);
    }

    const job = await JobCard.findById(jobCardId);
    if (!job) {
      return sendError(res, 'Job card not found.', 404);
    }

    const newTask = await Task.create({
      jobCardId,
      title: title.trim(),
    });

    await JobCard.findByIdAndUpdate(jobCardId, { status: 'IN_PROGRESS' });

    return sendSuccess(res, 'Task added successfully.', {
      ...newTask.toObject(),
      id: newTask._id.toString(),
    }, 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to add task.', 500);
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return sendError(res, 'Task not found.', 404);
    }

    if (task.completedBy) {
      await User.findByIdAndUpdate(task.completedBy, { $inc: { taskCount: -1 } });
    }

    const jobCardId = task.jobCardId;
    await Task.findByIdAndDelete(taskId);

    // Recheck job status
    const remainingTasks = await Task.find({ jobCardId });
    if (remainingTasks.length > 0) {
      const allCompleted = remainingTasks.every((t) => t.status === 'COMPLETED');
      await JobCard.findByIdAndUpdate(jobCardId, {
        status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      });
    }

    return sendSuccess(res, 'Task deleted successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete task.', 500);
  }
};

export const deleteJobCard = async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.params;
    const job = await JobCard.findById(jobCardId);
    if (!job) {
      return sendError(res, 'Job card not found.', 404);
    }

    // Decrement task counts for tasks in this job
    const tasks = await Task.find({ jobCardId });
    for (const t of tasks) {
      if (t.completedBy) {
        await User.findByIdAndUpdate(t.completedBy, { $inc: { taskCount: -1 } });
      }
    }

    await Task.deleteMany({ jobCardId });
    await JobCard.findByIdAndDelete(jobCardId);

    return sendSuccess(res, 'Job card and all sub-tasks deleted successfully.', null, 200);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete job card.', 500);
  }
};
