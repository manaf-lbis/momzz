import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/responseHandler';

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

interface LoginAttemptBucket {
  failedAttempts: number;
  firstFailureAt: number;
  lockedUntil?: number;
}

const attempts = new Map<string, LoginAttemptBucket>();

const getAttemptKey = (req: Request) => {
  const mobile = String(req.body?.mobile || '').trim();
  return `${req.ip}:${mobile}`;
};

const pruneExpiredAttempt = (key: string, now: number) => {
  const attempt = attempts.get(key);
  if (!attempt) return;

  if ((!attempt.lockedUntil || attempt.lockedUntil <= now) && now - attempt.firstFailureAt > WINDOW_MS) {
    attempts.delete(key);
  }
};

export const loginRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = getAttemptKey(req);
  pruneExpiredAttempt(key, now);

  const attempt = attempts.get(key);
  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    return sendError(res, 'Too many failed login attempts. Please try again in 15 minutes.', 429);
  }

  next();
};

export const recordFailedLogin = (req: Request) => {
  const now = Date.now();
  const key = getAttemptKey(req);
  pruneExpiredAttempt(key, now);

  const current = attempts.get(key);
  const attempt: LoginAttemptBucket = current
    ? { ...current, failedAttempts: current.failedAttempts + 1 }
    : { failedAttempts: 1, firstFailureAt: now };

  if (attempt.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_MS;
  }

  attempts.set(key, attempt);
};

export const clearFailedLoginAttempts = (req: Request) => {
  attempts.delete(getAttemptKey(req));
};
