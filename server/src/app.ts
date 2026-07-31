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

// Security & Content-Security-Policy headers for local development and DevTools compatibility
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', ENV.CLIENT_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' http://localhost:* ws://localhost:*; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);
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

// API Routes
app.use('/api/auth', authRouter);

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
