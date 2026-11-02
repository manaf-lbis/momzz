import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../shared/middleware/admin.middleware';
import { validateRequest } from '../../shared/middleware/validate.middleware';
import {
  batchLeaveSchema,
  otClaimSchema,
  otStatusSchema,
  settlePayrollSchema,
  advanceSchema,
  holidaySchema,
  updateWageSchema,
} from './payroll.validators';

const router = Router();

// Protect all payroll routes with authMiddleware
router.use(authMiddleware);

// --- 1. Leave Endpoints ---
router.post(
  '/leave/batch',
  adminMiddleware,
  validateRequest({ body: batchLeaveSchema }),
  PayrollController.markBatchLeave
);
router.post(
  '/admin/leave/batch',
  adminMiddleware,
  validateRequest({ body: batchLeaveSchema }),
  PayrollController.markBatchLeave
);
router.post(
  '/admin/leave',
  adminMiddleware,
  validateRequest({ body: batchLeaveSchema }),
  PayrollController.markBatchLeave
);

// --- 2. Overtime Engine Endpoints ---
router.post(
  '/ot/claim',
  validateRequest({ body: otClaimSchema }),
  PayrollController.claimOvertime
);
router.post(
  '/ot-claim',
  validateRequest({ body: otClaimSchema }),
  PayrollController.claimOvertime
);
router.patch(
  '/ot/:id/status',
  adminMiddleware,
  validateRequest({ body: otStatusSchema }),
  PayrollController.updateOtStatus
);
router.patch(
  '/admin/ot-claim/:id/review',
  adminMiddleware,
  validateRequest({ body: otStatusSchema }),
  PayrollController.updateOtStatus
);

// --- 3. Single-Sheet Ledger Endpoints ---
router.get('/worker/me/single-sheet', PayrollController.getMySingleSheet);
router.get('/ledger', PayrollController.getMySingleSheet);
router.get('/worker/:workerId/single-sheet', PayrollController.getWorkerSingleSheet);

// --- 4. Settlement & Cash Advances ---
router.post(
  '/settle',
  adminMiddleware,
  validateRequest({ body: settlePayrollSchema }),
  PayrollController.settlePayroll
);
router.post(
  '/admin/settle',
  adminMiddleware,
  validateRequest({ body: settlePayrollSchema }),
  PayrollController.settlePayroll
);

router.post(
  '/advance',
  adminMiddleware,
  validateRequest({ body: advanceSchema }),
  PayrollController.recordAdvance
);
router.post(
  '/admin/advance',
  adminMiddleware,
  validateRequest({ body: advanceSchema }),
  PayrollController.recordAdvance
);

// --- 5. Admin Overview & Management ---
router.get('/admin/overview', adminMiddleware, PayrollController.getAdminOverview);
router.patch(
  '/admin/wage-rate',
  adminMiddleware,
  validateRequest({ body: updateWageSchema }),
  PayrollController.updateWorkerWage
);

// --- 6. Garage Holidays ---
router.get('/holiday', PayrollController.getHolidays);
router.get('/holidays', PayrollController.getHolidays);
router.post(
  '/holiday',
  adminMiddleware,
  validateRequest({ body: holidaySchema }),
  PayrollController.declareHoliday
);
router.post(
  '/admin/holiday',
  adminMiddleware,
  validateRequest({ body: holidaySchema }),
  PayrollController.declareHoliday
);
router.delete('/holiday/:id', adminMiddleware, PayrollController.deleteHoliday);
router.delete('/admin/holiday/:id', adminMiddleware, PayrollController.deleteHoliday);

// --- 7. Deletion & Cleanup ---
router.delete('/adjustment/:id', adminMiddleware, PayrollController.deleteAdjustment);
router.delete('/admin/leave/:id', adminMiddleware, PayrollController.deleteAdjustment);

export default router;
