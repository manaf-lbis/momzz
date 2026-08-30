import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(__dirname, '../../logs');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');

const ensureLogDir = () => {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (err: any) {
    console.warn(`[LOGGER WARNING] Could not create logs directory: ${err.message}`);
  }
};

ensureLogDir();

/**
 * High-performance, asynchronous request pattern logger for performance & caching analytics.
 */

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    try {
      const diff = process.hrtime(startTime);
      const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

      const forwardedFor = req.headers['x-forwarded-for'];
      const clientIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0])?.trim() || req.ip || 'Unknown';
      const user = (req as any).user;
      const userIdentifier = user ? `${user.id || user._id}(${user.role || 'WORKER'})` : 'ANONYMOUS';

      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: parseFloat(durationMs),
        ip: clientIp,
        user: userIdentifier,
        userAgent: req.headers['user-agent'] || 'Unknown',
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // Check log size and rotate if > 10MB to protect disk space
      try {
        if (fs.existsSync(ACCESS_LOG_FILE)) {
          const stats = fs.statSync(ACCESS_LOG_FILE);
          if (stats.size > 10 * 1024 * 1024) {
            const backupFile = path.join(LOG_DIR, 'access.log.1');
            fs.renameSync(ACCESS_LOG_FILE, backupFile);
          }
        }
      } catch {
        // Ignore rotation error
      }

      fs.appendFile(ACCESS_LOG_FILE, logLine, (err) => {
        if (err) {
          console.warn(`[LOGGER WARNING] Failed to append access log: ${err.message}`);
        }
      });
    } catch (err: any) {
      // Never crash on logging errors
    }
  });

  next();
};
