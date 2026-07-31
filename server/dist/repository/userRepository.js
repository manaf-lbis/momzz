"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const User_1 = __importDefault(require("../model/User"));
class UserRepository {
    async findByMobile(mobile) {
        return await User_1.default.findOne({ mobile });
    }
    async findById(id) {
        return await User_1.default.findById(id).select('-password');
    }
    async createUser(userData) {
        const user = new User_1.default(userData);
        return await user.save();
    }
    async updateApprovalStatus(id, isApproved) {
        return await User_1.default.findByIdAndUpdate(id, { isApproved }, { new: true }).select('-password');
    }
    async findPendingUsers() {
        return await User_1.default.find({ isApproved: false }).select('-password').sort({ createdAt: -1 });
    }
    async getLeaderboard(limit = 10) {
        return await User_1.default.find({ isApproved: true })
            .select('name role taskCount')
            .sort({ taskCount: -1 })
            .limit(limit);
    }
    async incrementTaskCount(userId) {
        return await User_1.default.findByIdAndUpdate(userId, { $inc: { taskCount: 1 } }, { new: true });
    }
}
exports.UserRepository = UserRepository;
exports.userRepository = new UserRepository();
