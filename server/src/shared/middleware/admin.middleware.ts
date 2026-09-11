import { Request, Response, NextFunction } from 'express';
import { ROLES } from '../constants/status';
import { sendError } from '../utils/response.handler';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return sendError(res, 'Unauthenticated user context.', 401);
  }

  if (req.user.role !== ROLES.ADMIN) {
    return sendError(res, 'Access denied. Administrative privileges required.', 403);
  }

  next();
};
