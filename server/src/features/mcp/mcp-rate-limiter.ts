import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class McpRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private hits: Map<string, RateLimitRecord>;

  constructor(windowMs = 60_000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Clean up stale entries every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (record.resetAt <= now) {
          this.hits.delete(key);
        }
      }
    }, 120_000).unref();
  }

  /**
   * Express middleware that throttles MCP requests per authenticated user.
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;
      // Key by userId if authenticated, otherwise fallback to remote IP
      const key = user?.userId || req.ip || req.socket.remoteAddress || 'unknown_client';
      const now = Date.now();

      let record = this.hits.get(key);

      if (!record || record.resetAt <= now) {
        record = {
          count: 1,
          resetAt: now + this.windowMs,
        };
        this.hits.set(key, record);
      } else {
        record.count += 1;
      }

      const limit = user?.role === 'ADMIN' ? this.maxRequests * 2 : this.maxRequests;
      const remaining = Math.max(0, limit - record.count);
      const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);

      if (record.count > limit) {
        res.setHeader('Retry-After', resetSeconds);
        res.status(429).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Too Many Requests: MCP rate limit of ${limit} calls/min exceeded. Retry in ${resetSeconds}s.`,
          },
        });
        return;
      }

      next();
    };
  }
}

export const mcpRateLimiter = new McpRateLimiter();
