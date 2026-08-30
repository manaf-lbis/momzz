import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { sendError } from '../utils/response.handler';
import { AuthUserPayload } from '../../global';
import { userRepository } from '../../features/users/user.repository';
import { cacheService } from '../../features/cache/cache.service';

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
    // 0. Fast local check: verify if token is blacklisted (0 remote commands)
    const isBlacklisted = await cacheService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return sendError(res, 'Access token has been revoked. Please log in again.', 401);
    }

    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as AuthUserPayload;
    const sessionKey = `user:session:${decoded.id}`;

    // 1. Try Cache first (L1 Memory / L2 Redis)
    let userDoc = await cacheService.get<CachedUserSession>(sessionKey);

    // 2. Cold miss -> fetch from MongoDB & cache with long retention (invalidated only on user changes)
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
      await cacheService.set(sessionKey, userDoc, 86400); // 24 hours
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

    // 3. In-memory throttled heartbeat (updates DB at most once every 5 minutes, 0 Redis commands burned)
    if (cacheService.shouldExecuteThrottled(`user:heartbeat:${userDoc.id}`, 300)) {
      userRepository.setUserOnlineStatus(userDoc.id, true).catch(() => {});
    }

    next();


  } catch (error) {
    return sendError(res, 'Invalid or expired access token.', 401, error);
  }
};
