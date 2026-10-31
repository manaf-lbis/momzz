import { z } from 'zod';

export const otClaimSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  hours: z.number().int('Overtime hours must be whole numbers').min(1, 'At least 1 hour required'),
  note: z.string().trim().optional(),
});

export const reviewOtClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'] as const),
  rejectionReason: z.string().trim().optional(),
});

export const markLeaveSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  date: z.string().min(1, 'Date is required'),
  endDate: z.string().optional(),
  leaveType: z.enum(['FULL', 'HALF'] as const).default('FULL'),
  reason: z.string().trim().optional(),
});

export const toggleLeaveSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  date: z.string().min(1, 'Date is required'),
  leaveType: z.enum(['FULL', 'HALF', 'CLEAR'] as const),
  reason: z.string().trim().optional(),
});

export const recordAdvanceSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  amount: z.number().positive('Advance amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  reason: z.string().trim().optional(),
});

export const updateAdvanceSchema = z.object({
  amount: z.number().positive('Advance amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  reason: z.string().trim().optional(),
});

export const declareHolidaySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  title: z.string().trim().min(2, 'Holiday title must be at least 2 characters'),
});

export const updateWageSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  dailyWage: z.number().min(0, 'Daily wage cannot be negative'),
  effectiveDate: z.string().optional(),
});

export const settlePayrollSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  endDate: z.string().min(1, 'Settlement cut-off date is required'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER'] as const).default('CASH'),
  referenceNote: z.string().trim().optional(),
  amountPaid: z.number().min(0, 'Payout amount cannot be negative').optional(),
});
