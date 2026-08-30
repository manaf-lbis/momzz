import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import authRouter from './features/authentication/auth.router';
import { requestLogger } from './shared/middleware/request-logger.middleware';

const app: Application = express();

// Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
        connectSrc: ["'self'", 'https://res.cloudinary.com', 'ws:', 'wss:', ...(ENV.CORS_ORIGINS || [])],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  })
);

// Attach Request Analytics Logger
app.use(requestLogger);

// Required when the API is deployed behind a proxy (for example, Render or Vercel).
// This lets Express correctly detect HTTPS from the X-Forwarded-Proto header.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Dynamic CORS origin handler
const allowedOrigins = ENV.CORS_ORIGINS;

export const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/$/, '');
  
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some((allowed) => {
    if (!allowed) return false;
    const cleanAllowed = allowed.replace(/\/$/, '');
    if (cleanAllowed === cleanOrigin) return true;

    // Support wildcard matching e.g. https://*.vercel.app or *.vercel.app
    if (cleanAllowed.includes('*')) {
      const pattern = cleanAllowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(cleanOrigin);
    }

    return false;
  });
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (isStateChanging && origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
  }
  next();
});
app.use(express.json({ limit: '3mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(cookieParser());


// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'Momzz Garage Vehicle & Task Command API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      dummy: '/api/dummy',
      auth: '/api/auth',
    },
  });
});

// Handle Chrome devtools well-known probes gracefully
app.get('/.well-known/*', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

import jobRouter from './features/jobs/job.router';
import inventoryRouter from './features/inventory/inventory.router';
import publicRouter from './features/users/public.router';
import catalogRouter from './features/catalog/catalog.router';
import { globalApiRateLimiter } from './shared/middleware/rate-limit.middleware';

// Global API Rate Limiter
app.use('/api', globalApiRateLimiter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/public', publicRouter);
app.use('/api/catalog', catalogRouter);

// Centralized Error-Handling Middleware (Mask internal errors in production)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[UNHANDLED ERROR]', err);
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd && statusCode === 500 ? 'An unexpected server error occurred.' : err.message || 'Server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});


// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    serverUrl: `http://localhost:${ENV.PORT}`,
    clientUrl: ENV.CLIENT_URL,
    clientUrls: ENV.CLIENT_URLS,
    corsOrigins: ENV.CORS_ORIGINS,
    timestamp: new Date().toISOString(),
  });
});

// Dummy API endpoint for live frontend testing
app.get('/api/dummy', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Dummy API connection successful!',
    data: {
      serverTime: new Date().toISOString(),
      environment: 'development',
      system: 'Momzz Vehicle & Task Command System',
      dummyStatus: 'CONNECTED',
    },
  });
});

import http from 'http';
import { initSocket } from './config/socket';
import { testRedisConnection } from './config/redis';

// Bootstrapping Database & Server
const server = http.createServer(app);
initSocket(server);

connectDB().then(async () => {
  await testRedisConnection();
  server.listen(ENV.PORT, () => {
    console.log(`[SERVER] Momzz backend listening on http://localhost:${ENV.PORT}`);
    console.log(`[SERVER] Configured Client URLs: ${ENV.CLIENT_URLS.join(', ') || ENV.CLIENT_URL || 'None'}`);
    console.log(`[SERVER] Allowed CORS Origins: ${ENV.CORS_ORIGINS.join(', ') || 'All'}`);
  });
});

export default app;
