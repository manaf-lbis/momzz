import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { sendError } from '../utils/responseHandler';
import { AuthUserPayload } from '../global';
import { userRepository } from '../repository/userRepository';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Access denied. Authorization token missing or malformed.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as AuthUserPayload;
    const userDoc = await userRepository.findById(decoded.id);

    if (!userDoc) {
      return sendError(res, 'User account no longer exists.', 401);
    }

    if (userDoc.status === 'BLOCKED') {
      return sendError(res, 'Your account has been blocked by an administrator.', 403);
    }

    if (!userDoc.isApproved && userDoc.role !== 'ADMIN') {
      return sendError(res, 'Your account is awaiting administrator approval.', 403);
    }

    req.user = {
      ...decoded,
      isApproved: userDoc.isApproved,
      status: userDoc.status,
    };
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired access token.', 401, error);
  }
};
