import { Router } from 'express';
import {
  createJobWithTasks,
  getJobCards,
  setTaskStatus,
  addTaskToJob,
  deleteTask,
  deleteJobCard,
  updateJobCard,
} from '../controller/jobController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
router.post('/create', adminMiddleware, createJobWithTasks);
router.patch('/:jobCardId', adminMiddleware, updateJobCard);
router.patch('/tasks/:taskId/status', setTaskStatus);
router.post('/:jobCardId/tasks', adminMiddleware, addTaskToJob);
router.delete('/tasks/:taskId', adminMiddleware, deleteTask);
router.delete('/:jobCardId', adminMiddleware, deleteJobCard);

export default router;
