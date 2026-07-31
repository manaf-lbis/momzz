"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = exports.AuthRepository = void 0;
const User_1 = __importDefault(require("../model/User"));
const RefreshToken_1 = require("../model/RefreshToken");
class AuthRepository {
    async findByMobile(mobile) {
        return await User_1.default.findOne({ mobile });
    }
    async findById(id) {
        return await User_1.default.findById(id).select('-password');
    }
    async createUser(userData) {
        return await User_1.default.create(userData);
    }
    async saveRefreshToken(userId, token, expiresAt) {
        return await RefreshToken_1.RefreshToken.create({ userId, token, expiresAt });
    }
    async findRefreshToken(token) {
        return await RefreshToken_1.RefreshToken.findOne({ token });
    }
    async deleteRefreshToken(token) {
        return await RefreshToken_1.RefreshToken.deleteOne({ token });
    }
    async revokeAllUserTokens(userId) {
        return await RefreshToken_1.RefreshToken.deleteMany({ userId });
    }
}
exports.AuthRepository = AuthRepository;
exports.authRepository = new AuthRepository();
