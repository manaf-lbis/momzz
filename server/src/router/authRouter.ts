import { Router } from 'express';
import { authController } from '../controller/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.get('/pending', authMiddleware, adminMiddleware, authController.getPendingWorkers);
router.patch('/approve/:userId', authMiddleware, adminMiddleware, authController.approveWorker);

export default router;
