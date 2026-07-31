"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const responseHandler_1 = require("../utils/responseHandler");
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, responseHandler_1.sendError)(res, 'Access denied. Authorization token missing or malformed.', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return (0, responseHandler_1.sendError)(res, 'Invalid or expired access token.', 401, error);
    }
};
exports.authMiddleware = authMiddleware;
