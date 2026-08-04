import { Request, Response } from 'express';
import { authService } from '../service/authService';
import { userRepository } from '../repository/userRepository';
import { sendSuccess, sendError } from '../utils/responseHandler';
import { clearFailedLoginAttempts, recordFailedLogin } from '../middleware/loginRateLimitMiddleware';

const getRefreshCookieOptions = (req: Request) => {
  const forwardedProtocol = req.headers['x-forwarded-proto'];
  const isHttps =
    req.secure ||
    forwardedProtocol === 'https' ||
    (Array.isArray(forwardedProtocol) && forwardedProtocol.includes('https')) ||
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    // Cross-site requests (separate frontend and API domains) require None + Secure.
    // Local HTTP development continues to use Lax so cookies work without HTTPS.
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
};


export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, mobile, password } = req.body;
      if (!name || !mobile || !password) {
        return sendError(res, 'Name, mobile number, and password are required.', 400);
      }

      const result = await authService.register({ name, mobile, password });

      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(req));

      return sendSuccess(
        res,
        'User registered successfully.',
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            id: result.user._id,
            name: result.user.name,
            mobile: result.user.mobile,
            role: result.user.role,
            isApproved: result.user.isApproved,
            taskCount: result.user.taskCount,
          },
        },
        201
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Registration failed.', 400);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { mobile, password } = req.body;
      if (!mobile || !password) {
        return sendError(res, 'Mobile number and password are required.', 400);
      }

      const result = await authService.login(mobile, password);

      clearFailedLoginAttempts(req);

      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(req));

      return sendSuccess(
        res,
        'Login successful.',
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            id: result.user._id,
            name: result.user.name,
            mobile: result.user.mobile,
            role: result.user.role,
            isApproved: result.user.isApproved,
            taskCount: result.user.taskCount,
          },
        },
        200
      );
    } catch (error: any) {
      recordFailedLogin(req);
      return sendError(res, error.message || 'Authentication failed.', 401);
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        return sendError(res, 'Refresh token cookie missing.', 401);
      }

      const result = await authService.rotateRefreshToken(refreshToken);

      res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(req));

      return sendSuccess(
        res,
        'Token refreshed successfully.',
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            id: result.user._id,
            name: result.user.name,
            mobile: result.user.mobile,
            role: result.user.role,
            isApproved: result.user.isApproved,
            taskCount: result.user.taskCount,
          },
        },
        200
      );
    } catch (error: any) {
      res.clearCookie('refreshToken', getRefreshCookieOptions(req));
      return sendError(res, error.message || 'Token rotation failed.', 401);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.clearCookie('refreshToken', getRefreshCookieOptions(req));
      return sendSuccess(res, 'Logout successful.', null, 200);
    } catch (error: any) {
      res.clearCookie('refreshToken', getRefreshCookieOptions(req));
      return sendSuccess(res, 'Logout completed.', null, 200);
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated user.', 401);
      }
      const user = await authService.getMe(req.user.id);
      return sendSuccess(res, 'Profile retrieved successfully.', user, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch user profile.', 400);
    }
  }

  async getPendingWorkers(req: Request, res: Response) {
    try {
      const pendingUsers = await authService.getPendingWorkers();
      return sendSuccess(res, 'Pending worker approvals retrieved.', pendingUsers, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch pending workers.', 400);
    }
  }

  async approveWorker(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { isApproved } = req.body;

      if (typeof isApproved !== 'boolean') {
        return sendError(res, 'isApproved boolean flag is required.', 400);
      }

      const updatedUser = await authService.approveWorker(userId, isApproved);
      return sendSuccess(res, `Worker approval status set to ${isApproved}.`, updatedUser, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update approval status.', 400);
    }
  }

  async getLeaderboard(req: Request, res: Response) {
    try {
      const leaderboard = await userRepository.getLeaderboard(10);
      return sendSuccess(res, 'Leaderboard fetched.', leaderboard, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leaderboard.', 400);
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await authService.getAllUsers();
      return sendSuccess(res, 'All users retrieved successfully.', users, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch users.', 400);
    }
  }

  async toggleUserStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      if (!status || !['ACTIVE', 'BLOCKED'].includes(status)) {
        return sendError(res, 'Status must be ACTIVE or BLOCKED.', 400);
      }

      const updatedUser = await authService.toggleUserStatus(userId, status);
      return sendSuccess(res, `User status updated to ${status}.`, updatedUser, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update user status.', 400);
    }
  }

  async adminResetPassword(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      if (!newPassword) {
        return sendError(res, 'New password is required.', 400);
      }

      const result = await authService.adminResetPassword(userId, newPassword);
      return sendSuccess(res, result.message, null, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to reset password.', 400);
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated user.', 401);
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return sendError(res, 'Current password and new password are required.', 400);
      }

      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, result.message, null, 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to change password.', 400);
    }
  }
}

export const authController = new AuthController();
