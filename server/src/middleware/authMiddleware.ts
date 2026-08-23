import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { sendError } from '../utils/responseHandler';
import { AuthUserPayload } from '../global';
import { userRepository } from '../repository/userRepository';
import { cacheService } from '../service/cacheService';

export interface CachedUserSession {
  id: string;
  name: string;
  mobile: string;
  role: string;
  isApproved: boolean;
  status: 'ACTIVE' | 'BLOCKED';
  taskCount?: number;
  profileImageUrl?: string;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Access denied. Authorization token missing or malformed.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    // 0. Check if token was revoked via logout
    const isBlacklisted = await cacheService.get<boolean>(`jwt:blacklist:${token}`);
    if (isBlacklisted) {
      return sendError(res, 'Access token has been revoked. Please log in again.', 401);
    }

    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as AuthUserPayload;
    const sessionKey = `user:session:${decoded.id}`;


    // 1. Try Redis cache first
    let userDoc = await cacheService.get<CachedUserSession>(sessionKey);

    // 2. Cache miss -> fetch from MongoDB & cache in Redis for 15 mins (900 seconds)
    if (!userDoc) {
      const dbUser = await userRepository.findById(decoded.id);
      if (!dbUser) {
        return sendError(res, 'User account no longer exists.', 401);
      }
      userDoc = {
        id: dbUser._id ? dbUser._id.toString() : (dbUser as any).id,
        name: dbUser.name,
        mobile: dbUser.mobile,
        role: dbUser.role,
        isApproved: dbUser.isApproved,
        status: dbUser.status,
        taskCount: dbUser.taskCount,
        profileImageUrl: dbUser.profileImageUrl,
      };
      await cacheService.set(sessionKey, userDoc, 900);
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
      role: userDoc.role as any,
    };

    // 3. Heartbeat: use Redis key with 120s TTL to prevent hammering MongoDB on every single request
    const heartbeatKey = `user:heartbeat:${userDoc.id}`;
    const shouldUpdateDbHeartbeat = await cacheService.setNX(heartbeatKey, '1', 120);
    if (shouldUpdateDbHeartbeat) {
      userRepository.setUserOnlineStatus(userDoc.id, true).catch(() => {});
    }

    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired access token.', 401, error);
  }
};
