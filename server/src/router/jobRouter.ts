import { Router } from 'express';
import { createJobWithTasks, getJobCards, toggleTaskComplete } from '../controller/jobController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getJobCards);
router.post('/create', adminMiddleware, createJobWithTasks);
router.patch('/tasks/:taskId/toggle', toggleTaskComplete);

export default router;
