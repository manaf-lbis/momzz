"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const status_1 = require("../constants/status");
const authRepository_1 = require("../repository/authRepository");
const userRepository_1 = require("../repository/userRepository");
class AuthService {
    authRepo = new authRepository_1.AuthRepository();
    generateTokens(user) {
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id, name: user.name, mobile: user.mobile, role: user.role, isApproved: user.isApproved }, env_1.ENV.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id, mobile: user.mobile }, env_1.ENV.JWT_REFRESH_SECRET, { expiresIn: '15d' });
        return { accessToken, refreshToken };
    }
    async register(data) {
        const existing = await this.authRepo.findByMobile(data.mobile);
        if (existing) {
            throw new Error('Mobile number already registered');
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(data.password, salt);
        const role = data.role && Object.values(status_1.ROLES).includes(data.role) ? data.role : status_1.ROLES.WORKER;
        const isApproved = role === status_1.ROLES.ADMIN;
        const user = await this.authRepo.createUser({
            name: data.name,
            mobile: data.mobile,
            password: hashedPassword,
            role,
            isApproved,
            taskCount: 0,
        });
        const tokens = this.generateTokens(user);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 15);
        await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);
        return { user, ...tokens };
    }
    async login(mobile, pass) {
        const user = await this.authRepo.findByMobile(mobile);
        if (!user) {
            throw new Error('Invalid mobile number or password');
        }
        const isMatch = await bcryptjs_1.default.compare(pass, user.password);
        if (!isMatch) {
            throw new Error('Invalid mobile number or password');
        }
        if (!user.isApproved && user.role !== status_1.ROLES.ADMIN) {
            throw new Error('ACCOUNT_PENDING: Waiting for Admin Approval');
        }
        const tokens = this.generateTokens(user);
        // Save Refresh Token for Rotation
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 15);
        await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);
        return { user, ...tokens };
    }
    async rotateRefreshToken(oldRefreshToken) {
        const existingToken = await this.authRepo.findRefreshToken(oldRefreshToken);
        // Automatic Reuse Detection: Token hijacked!
        if (!existingToken) {
            try {
                const decoded = jsonwebtoken_1.default.verify(oldRefreshToken, env_1.ENV.JWT_REFRESH_SECRET);
                await this.authRepo.revokeAllUserTokens(decoded.id);
            }
            catch (err) { }
            throw new Error('Security Alert: Compromised Refresh Token. Please Login Again.');
        }
        // Delete used token (Rotation)
        await this.authRepo.deleteRefreshToken(oldRefreshToken);
        const decoded = jsonwebtoken_1.default.verify(oldRefreshToken, env_1.ENV.JWT_REFRESH_SECRET);
        const user = await this.authRepo.findByMobile(decoded.mobile);
        if (!user) {
            throw new Error('User associated with token not found.');
        }
        const tokens = this.generateTokens(user);
        // Save new Refresh Token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 15);
        await this.authRepo.saveRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt);
        return { user, ...tokens };
    }
    async logout(refreshToken) {
        if (refreshToken) {
            await this.authRepo.deleteRefreshToken(refreshToken);
        }
    }
    async getMe(userId) {
        const user = await this.authRepo.findById(userId);
        if (!user)
            throw new Error('User not found');
        return user;
    }
    async approveWorker(userId, isApproved) {
        const user = await userRepository_1.userRepository.updateApprovalStatus(userId, isApproved);
        if (!user)
            throw new Error('Worker user not found.');
        return user;
    }
    async getPendingWorkers() {
        return await userRepository_1.userRepository.findPendingUsers();
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
