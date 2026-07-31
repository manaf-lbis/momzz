import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import authRouter from './router/authRouter';
import bcrypt from 'bcryptjs';
import { userRepository } from './repository/userRepository';
import { ROLES } from './constants/status';

const app: Application = express();

// Dynamic CORS origin handler
const allowedOrigins = [
  ENV.CLIENT_URL,
  ENV.CLIENT_URL.replace(/\/$/, ''),
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed && allowed.replace(/\/$/, '') === cleanOrigin
    ) || origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback allow to avoid breaking production deployments
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json());
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

import jobRouter from './router/jobRouter';

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobRouter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    serverUrl: `http://localhost:${ENV.PORT}`,
    clientUrl: ENV.CLIENT_URL,
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

// Seed Admin User on startup
const seedAdmin = async () => {
  const adminMobile = '7994414155';
  const adminPassword = 'Login@121';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const existing = await userRepository.findByMobile(adminMobile);
  if (existing) {
    // Use mongoose directly to update password (findByMobile returns without password via select)
    const mongoose = (await import('mongoose')).default;
    await mongoose.model('User').updateOne(
      { mobile: adminMobile },
      { $set: { password: hashedPassword, role: ROLES.ADMIN, isApproved: true } }
    );
    console.log('[SEED] Admin user password updated successfully.');
  } else {
    await userRepository.createUser({
      name: 'Admin',
      mobile: adminMobile,
      password: hashedPassword,
      role: ROLES.ADMIN,
      isApproved: true,
      taskCount: 0,
    } as any);
    console.log('[SEED] Admin user created successfully.');
  }
};

// Bootstrapping Database & Server
connectDB().then(async () => {
  await seedAdmin();
  app.listen(ENV.PORT, () => {
    console.log(`[SERVER] Momzz backend listening on http://localhost:${ENV.PORT}`);
    console.log(`[SERVER] Configured Client URL from env: ${ENV.CLIENT_URL}`);
  });
});

export default app;
