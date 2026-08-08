import { Router } from 'express';
import {
  createJobWithTasks,
  getJobCards,
  setTaskStatus,
  addTaskToJob,
  addInventoryTaskToJob,
  deleteTask,
  deleteJobCard,
  updateJobCard,
  verifyJobCard,
} from '../controller/jobController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
router.post('/create', adminMiddleware, createJobWithTasks);
router.patch('/:jobCardId', adminMiddleware, updateJobCard);
router.patch('/:jobCardId/verify', verifyJobCard);
router.patch('/tasks/:taskId/status', setTaskStatus);
router.post('/:jobCardId/tasks', adminMiddleware, addTaskToJob);
router.post('/:jobCardId/inventory-tasks', adminMiddleware, addInventoryTaskToJob);
router.delete('/tasks/:taskId', adminMiddleware, deleteTask);
router.delete('/:jobCardId', adminMiddleware, deleteJobCard);

export default router;
