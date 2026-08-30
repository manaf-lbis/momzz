import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../../features/cache/cache.service';
import { sendError } from '../utils/response.handler';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60; // 15 minutes
const LOGIN_LOCKOUT_SECONDS = 15 * 60; // 15 minutes

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    if (raw) return raw.trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

const getLoginAttemptKey = (req: Request): string => {
  const mobile = String(req.body?.mobile || '').trim();
  const ip = getClientIp(req);
  return `${ip}:${mobile}`;
};

/**
 * Distributed Login Rate Limiter backed by Upstash Redis.
 */
export const loginRateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = getLoginAttemptKey(req);
    const lockoutKey = `ratelimit:login:lock:${key}`;

    const isLocked = await cacheService.get<boolean>(lockoutKey);
    if (isLocked) {
      const ttl = await cacheService.ttl(lockoutKey);
      const retryAfter = ttl > 0 ? ttl : LOGIN_LOCKOUT_SECONDS;
      res.setHeader('Retry-After', retryAfter.toString());
      return sendError(res, `Too many failed login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`, 429);
    }

    next();
  } catch (error) {
    // If Redis encounters an error, don't completely block legitimate logins
    next();
  }
};

/**
 * Record a failed login attempt in Redis.
 */
export const recordFailedLogin = async (req: Request): Promise<void> => {
  try {
    const key = getLoginAttemptKey(req);
    const attemptKey = `ratelimit:login:attempts:${key}`;
    const lockoutKey = `ratelimit:login:lock:${key}`;

    const attempts = await cacheService.incrWithTTL(attemptKey, LOGIN_WINDOW_SECONDS);

    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await cacheService.set(lockoutKey, true, LOGIN_LOCKOUT_SECONDS);
    }
  } catch (error: any) {
    console.warn(`[RATE LIMIT WARNING] Failed to record login attempt: ${error.message}`);
  }
};

/**
 * Clear failed login attempts on successful login.
 */
export const clearFailedLoginAttempts = async (req: Request): Promise<void> => {
  try {
    const key = getLoginAttemptKey(req);
    const attemptKey = `ratelimit:login:attempts:${key}`;
    const lockoutKey = `ratelimit:login:lock:${key}`;
    await cacheService.del([attemptKey, lockoutKey]);
  } catch (error: any) {
    console.warn(`[RATE LIMIT WARNING] Failed to clear login attempts: ${error.message}`);
  }
};

/**
 * General/Public Endpoint Rate Limiter (e.g., 30 requests per minute per IP).
 */
export const createRateLimiter = (options: { limit: number; windowSeconds: number; name: string }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIp(req);
      const key = `ratelimit:${options.name}:${ip}`;

      const count = await cacheService.incrWithTTL(key, options.windowSeconds);

      if (count > options.limit) {
        const ttl = await cacheService.ttl(key);
        const retryAfter = ttl > 0 ? ttl : options.windowSeconds;
        res.setHeader('Retry-After', retryAfter.toString());
        return sendError(res, `Rate limit exceeded. Please try again in ${retryAfter} seconds.`, 429);
      }

      next();
    } catch (error) {
      // Fail open on Redis error so public service remains available
      next();
    }
  };
};

/** Pre-configured rate limiter for public tracking endpoints */
export const publicTrackRateLimiter = createRateLimiter({
  name: 'public_track',
  limit: 30, // 30 queries per minute
  windowSeconds: 60,
});

/** Pre-configured rate limiter for user registration to prevent bot abuse */
export const registerRateLimiter = createRateLimiter({
  name: 'register',
  limit: 5, // 5 registration attempts per 15 minutes per IP
  windowSeconds: 15 * 60,
});

/** Pre-configured rate limiter for refresh token rotation */
export const refreshRateLimiter = createRateLimiter({
  name: 'refresh_token',
  limit: 30, // 30 refresh requests per minute per IP
  windowSeconds: 60,
});

/** Global API rate limiter to mitigate denial-of-service */
export const globalApiRateLimiter = createRateLimiter({
  name: 'global_api',
  limit: 200, // 200 requests per minute per IP
  windowSeconds: 60,
});

