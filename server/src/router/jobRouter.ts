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
  toggleTaskPin,
  toggleJobPin,
} from '../controller/jobController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
router.post('/create', adminMiddleware, createJobWithTasks);
router.patch('/tasks/:taskId/status', setTaskStatus);
router.patch('/tasks/:taskId/pin', toggleTaskPin);
router.patch('/:jobCardId/pin', toggleJobPin);
router.patch('/:jobCardId/verify', verifyJobCard);
router.patch('/:jobCardId', adminMiddleware, updateJobCard);
router.post('/:jobCardId/tasks', adminMiddleware, addTaskToJob);
router.post('/:jobCardId/inventory-tasks', adminMiddleware, addInventoryTaskToJob);
router.delete('/tasks/:taskId', adminMiddleware, deleteTask);
router.delete('/:jobCardId', adminMiddleware, deleteJobCard);

export default router;
