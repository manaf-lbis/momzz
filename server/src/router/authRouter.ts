import { Router } from 'express';
import { authController } from '../controller/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { loginRateLimitMiddleware } from '../middleware/loginRateLimitMiddleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', loginRateLimitMiddleware, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/profile-image', authMiddleware, authController.updateProfileImage);
router.get('/pending', authMiddleware, adminMiddleware, authController.getPendingWorkers);
router.patch('/approve/:userId', authMiddleware, adminMiddleware, authController.approveWorker);
router.get('/leaderboard', authMiddleware, authController.getLeaderboard);
router.post('/change-password', authMiddleware, authController.changePassword);

// Admin User Management Routes
router.get('/users', authMiddleware, authController.getAllUsers);
router.patch('/users/:userId', authMiddleware, adminMiddleware, authController.updateUserByAdmin);
router.patch('/users/:userId/status', authMiddleware, adminMiddleware, authController.toggleUserStatus);
router.patch('/users/:userId/role', authMiddleware, adminMiddleware, authController.updateUserRole);
router.post('/users/:userId/reset-password', authMiddleware, adminMiddleware, authController.adminResetPassword);

export default router;
