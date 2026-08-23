// Re-export Redis distributed rate limiters for backward compatibility
export {
  loginRateLimitMiddleware,
  recordFailedLogin,
  clearFailedLoginAttempts,
} from './rateLimitMiddleware';
