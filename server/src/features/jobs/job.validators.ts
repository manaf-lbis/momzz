import { z } from 'zod';

export const publicTrackSchema = z.object({
  vehicleNumber: z.string().trim().min(2, 'Vehicle registration number is required').max(20),
  mobile: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address format').optional().or(z.literal('')),
}).refine((data) => !!data.mobile || !!data.email, {
  message: 'Either customer mobile or customer email is required to track job status',
});

export const setTaskStatusSchema = z.object({
  action: z.enum(['COMPLETE', 'REOPEN'] as const),
  partnerIds: z.array(z.string()).optional(),
});

export const toggleJobPinSchema = z.object({
  mode: z.enum(['ALL', 'ME'] as const),
});
