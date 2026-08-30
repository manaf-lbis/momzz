import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  mobile: z.string().trim().regex(/^[0-9]{10,15}$/, 'Please enter a valid 10-15 digit mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const loginSchema = z.object({
  mobile: z.string().trim().min(1, 'Mobile number is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'WORKER'] as const),
});

export const toggleUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED'] as const),
});
