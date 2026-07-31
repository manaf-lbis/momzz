import { Request, Response } from 'express';
import { authService } from '../service/authService';
import { userRepository } from '../repository/userRepository';
import { sendSuccess, sendError } from '../utils/responseHandler';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
};

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, mobile, password, role } = req.body;
      if (!name || !mobile || !password) {
        return sendError(res, 'Name, mobile number, and password are required.', 400);
      }

      const result = await authService.register({ name, mobile, password, role });

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      return sendSuccess(
        res,
        'User registered successfully.',
        {
          accessToken: result.accessToken,
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

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      return sendSuccess(
        res,
        'Login successful.',
        {
          accessToken: result.accessToken,
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
      return sendError(res, error.message || 'Authentication failed.', 401);
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return sendError(res, 'Refresh token cookie missing.', 401);
      }

      const result = await authService.rotateRefreshToken(refreshToken);

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      return sendSuccess(
        res,
        'Token refreshed successfully.',
        {
          accessToken: result.accessToken,
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
      res.clearCookie('refreshToken');
      return sendError(res, error.message || 'Token rotation failed.', 401);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.clearCookie('refreshToken');
      return sendSuccess(res, 'Logout successful.', null, 200);
    } catch (error: any) {
      res.clearCookie('refreshToken');
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
}

export const authController = new AuthController();
