"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
const status_1 = require("../constants/status");
const responseHandler_1 = require("../utils/responseHandler");
const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return (0, responseHandler_1.sendError)(res, 'Unauthenticated user context.', 401);
    }
    if (req.user.role !== status_1.ROLES.ADMIN) {
        return (0, responseHandler_1.sendError)(res, 'Access denied. Administrative privileges required.', 403);
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
