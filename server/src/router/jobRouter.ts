import { Router } from 'express';
import {
  createJobWithTasks,
  getJobCards,
  toggleTaskComplete,
  addTaskToJob,
  deleteTask,
  deleteJobCard,
} from '../controller/jobController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
router.post('/create', adminMiddleware, createJobWithTasks);
router.patch('/tasks/:taskId/toggle', toggleTaskComplete);
router.post('/:jobCardId/tasks', adminMiddleware, addTaskToJob);
router.delete('/tasks/:taskId', adminMiddleware, deleteTask);
router.delete('/:jobCardId', adminMiddleware, deleteJobCard);

export default router;
