"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const authService_1 = require("../service/authService");
const responseHandler_1 = require("../utils/responseHandler");
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
};
class AuthController {
    async register(req, res) {
        try {
            const { name, mobile, password, role } = req.body;
            if (!name || !mobile || !password) {
                return (0, responseHandler_1.sendError)(res, 'Name, mobile number, and password are required.', 400);
            }
            const result = await authService_1.authService.register({ name, mobile, password, role });
            res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
            return (0, responseHandler_1.sendSuccess)(res, 'User registered successfully.', {
                accessToken: result.accessToken,
                user: {
                    id: result.user._id,
                    name: result.user.name,
                    mobile: result.user.mobile,
                    role: result.user.role,
                    isApproved: result.user.isApproved,
                    taskCount: result.user.taskCount,
                },
            }, 201);
        }
        catch (error) {
            return (0, responseHandler_1.sendError)(res, error.message || 'Registration failed.', 400);
        }
    }
    async login(req, res) {
        try {
            const { mobile, password } = req.body;
            if (!mobile || !password) {
                return (0, responseHandler_1.sendError)(res, 'Mobile number and password are required.', 400);
            }
            const result = await authService_1.authService.login(mobile, password);
            res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
            return (0, responseHandler_1.sendSuccess)(res, 'Login successful.', {
                accessToken: result.accessToken,
                user: {
                    id: result.user._id,
                    name: result.user.name,
                    mobile: result.user.mobile,
                    role: result.user.role,
                    isApproved: result.user.isApproved,
                    taskCount: result.user.taskCount,
                },
            }, 200);
        }
        catch (error) {
            return (0, responseHandler_1.sendError)(res, error.message || 'Authentication failed.', 401);
        }
    }
    async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return (0, responseHandler_1.sendError)(res, 'Refresh token cookie missing.', 401);
            }
            const result = await authService_1.authService.rotateRefreshToken(refreshToken);
            res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
            return (0, responseHandler_1.sendSuccess)(res, 'Token refreshed successfully.', {
                accessToken: result.accessToken,
                user: {
                    id: result.user._id,
                    name: result.user.name,
                    mobile: result.user.mobile,
                    role: result.user.role,
                    isApproved: result.user.isApproved,
                    taskCount: result.user.taskCount,
                },
            }, 200);
        }
        catch (error) {
            res.clearCookie('refreshToken');
            return (0, responseHandler_1.sendError)(res, error.message || 'Token rotation failed.', 401);
        }
    }
    async logout(req, res) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (refreshToken) {
                await authService_1.authService.logout(refreshToken);
            }
            res.clearCookie('refreshToken');
            return (0, responseHandler_1.sendSuccess)(res, 'Logout successful.', null, 200);
        }
        catch (error) {
            res.clearCookie('refreshToken');
            return (0, responseHandler_1.sendSuccess)(res, 'Logout completed.', null, 200);
        }
    }
    async getMe(req, res) {
        try {
            if (!req.user) {
                return (0, responseHandler_1.sendError)(res, 'Unauthenticated user.', 401);
            }
            const user = await authService_1.authService.getMe(req.user.id);
            return (0, responseHandler_1.sendSuccess)(res, 'Profile retrieved successfully.', user, 200);
        }
        catch (error) {
            return (0, responseHandler_1.sendError)(res, error.message || 'Failed to fetch user profile.', 400);
        }
    }
    async getPendingWorkers(req, res) {
        try {
            const pendingUsers = await authService_1.authService.getPendingWorkers();
            return (0, responseHandler_1.sendSuccess)(res, 'Pending worker approvals retrieved.', pendingUsers, 200);
        }
        catch (error) {
            return (0, responseHandler_1.sendError)(res, error.message || 'Failed to fetch pending workers.', 400);
        }
    }
    async approveWorker(req, res) {
        try {
            const { userId } = req.params;
            const { isApproved } = req.body;
            if (typeof isApproved !== 'boolean') {
                return (0, responseHandler_1.sendError)(res, 'isApproved boolean flag is required.', 400);
            }
            const updatedUser = await authService_1.authService.approveWorker(userId, isApproved);
            return (0, responseHandler_1.sendSuccess)(res, `Worker approval status set to ${isApproved}.`, updatedUser, 200);
        }
        catch (error) {
            return (0, responseHandler_1.sendError)(res, error.message || 'Failed to update approval status.', 400);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
