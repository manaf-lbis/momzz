import { Router } from 'express';
import {
  createJobWithTasks,
  getJobCards,
  getJobCardById,
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
} from '../controller/jobController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { setTaskStatusSchema, toggleJobPinSchema } from '../validators/jobValidators';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
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
