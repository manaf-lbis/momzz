import { z } from 'zod';

export const batchLeaveSchema = z.object({
  workerIds: z.array(z.string()).min(1, 'At least one worker must be selected'),
  dates: z.union([
    z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')).min(1),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    }),
  ]),
  type: z.enum(['FULL_LEAVE', 'HALF_LEAVE']).default('FULL_LEAVE'),
  note: z.string().optional(),
});

export const otClaimSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  otHours: z.number().int('Overtime hours must be a whole integer').min(1, 'Minimum 1 hour OT').max(24),
  note: z.string().optional(),
});

export const otStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const settlePayrollSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional(),
  amountPaid: z.number().min(0, 'Amount paid cannot be negative').optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).default('CASH'),
  referenceNote: z.string().optional(),
});

export const advanceSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  notes: z.string().optional(),
});

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  title: z.string().min(1, 'Title is required').trim(),
  isPaid: z.boolean().default(true),
});

export const updateWageSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  dailyWage: z.number().min(0, 'Daily wage cannot be negative'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Effective date must be YYYY-MM-DD').optional(),
});

export const incentiveSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  amount: z.number().positive('Incentive amount must be greater than 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  notes: z.string().min(1, 'Remarks/notes are required for incentive').trim(),
});

export const updateLeaveSchema = z.object({
  type: z.enum(['FULL_LEAVE', 'HALF_LEAVE']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  note: z.string().optional(),
});

export const updateOtClaimSchema = z.object({
  otHours: z.number().int().min(1).max(24).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  note: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});
