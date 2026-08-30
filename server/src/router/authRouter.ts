import { Router } from 'express';
import { authController } from '../controller/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { loginRateLimitMiddleware, registerRateLimiter, refreshRateLimiter } from '../middleware/rateLimitMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
  updateUserRoleSchema,
  toggleUserStatusSchema,
} from '../validators/authValidators';

const router = Router();

router.post('/register', registerRateLimiter, validateRequest({ body: registerSchema }), authController.register);
router.post('/login', loginRateLimitMiddleware, validateRequest({ body: loginSchema }), authController.login);
router.post('/refresh', refreshRateLimiter, authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/profile-image', authMiddleware, authController.updateProfileImage);
router.get('/pending', authMiddleware, adminMiddleware, authController.getPendingWorkers);
router.patch('/approve/:userId', authMiddleware, adminMiddleware, authController.approveWorker);
router.get('/leaderboard', authMiddleware, authController.getLeaderboard);
router.post('/change-password', authMiddleware, validateRequest({ body: changePasswordSchema }), authController.changePassword);

// Admin User Management Routes
router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.patch('/users/:userId', authMiddleware, adminMiddleware, authController.updateUserByAdmin);
router.patch('/users/:userId/status', authMiddleware, adminMiddleware, validateRequest({ body: toggleUserStatusSchema }), authController.toggleUserStatus);
router.patch('/users/:userId/role', authMiddleware, adminMiddleware, validateRequest({ body: updateUserRoleSchema }), authController.updateUserRole);
router.post('/users/:userId/reset-password', authMiddleware, adminMiddleware, validateRequest({ body: adminResetPasswordSchema }), authController.adminResetPassword);

export default router;
