import { Router } from 'express';
import {
  createJobWithTasks,
  getJobCards,
  getJobCardById,
  getJobStats,
  setTaskStatus,
  addTaskToJob,
  addInventoryTaskToJob,
  deleteTask,
  deleteJobCard,
  updateJobCard,
  verifyJobCard,
  uploadJobImage,
  toggleTaskPin,
  toggleJobPin,
} from './job.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../shared/middleware/admin.middleware';
import { validateRequest } from '../../shared/middleware/validate.middleware';
import { setTaskStatusSchema, toggleJobPinSchema } from './job.validators';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
router.get('/stats', getJobStats);
router.get('/:jobCardId', getJobCardById);

router.post('/create', adminMiddleware, createJobWithTasks);
router.patch('/tasks/:taskId/status', validateRequest({ body: setTaskStatusSchema }), setTaskStatus);
router.patch('/tasks/:taskId/pin', toggleTaskPin);
router.patch('/:jobCardId/pin', validateRequest({ body: toggleJobPinSchema }), toggleJobPin);
router.patch('/:jobCardId/verify', adminMiddleware, verifyJobCard);

router.patch('/:jobCardId/image', uploadJobImage);
router.patch('/:jobCardId', adminMiddleware, updateJobCard);
router.post('/:jobCardId/tasks', adminMiddleware, addTaskToJob);
router.post('/:jobCardId/inventory-tasks', adminMiddleware, addInventoryTaskToJob);
router.delete('/tasks/:taskId', adminMiddleware, deleteTask);
router.delete('/:jobCardId', adminMiddleware, deleteJobCard);

export default router;
