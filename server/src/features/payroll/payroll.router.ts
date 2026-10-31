import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { adminMiddleware } from '../../shared/middleware/admin.middleware';
import { validateRequest } from '../../shared/middleware/validate.middleware';
import {
  otClaimSchema,
  reviewOtClaimSchema,
  markLeaveSchema,
  toggleLeaveSchema,
  recordAdvanceSchema,
  updateAdvanceSchema,
  declareHolidaySchema,
  updateWageSchema,
  settlePayrollSchema,
} from './payroll.validators';

const router = Router();

// Protect all payroll routes with authMiddleware
router.use(authMiddleware);

// --- Worker & Shared Endpoints ---
router.get('/ledger', PayrollController.getLedger);
router.post('/ot-claim', validateRequest({ body: otClaimSchema }), PayrollController.claimOvertime);
router.delete('/ot-claim/:id', PayrollController.cancelOtClaim);
router.get('/my-ot-claims', PayrollController.getWorkerOtClaims);
router.get('/holidays', PayrollController.getHolidays);
router.get('/settlements', PayrollController.getSettlements);
router.get('/settlements/:workerId', PayrollController.getSettlements);

// --- Admin Only Endpoints ---
router.get('/admin/overview', adminMiddleware, PayrollController.getAdminOverview);
router.get('/admin/common-calendar', adminMiddleware, PayrollController.getCommonCalendar);
router.get('/admin/ot-claims', adminMiddleware, PayrollController.getAdminOtClaims);
router.patch(
  '/admin/ot-claim/:id/review',
  adminMiddleware,
  validateRequest({ body: reviewOtClaimSchema }),
  PayrollController.reviewOtClaim
);

router.post(
  '/admin/leave',
  adminMiddleware,
  validateRequest({ body: markLeaveSchema }),
  PayrollController.markLeave
);
router.post(
  '/admin/leave/toggle',
  adminMiddleware,
  validateRequest({ body: toggleLeaveSchema }),
  PayrollController.toggleLeave
);
router.delete('/admin/leave/:id', adminMiddleware, PayrollController.deleteLeave);

router.post(
  '/admin/advance',
  adminMiddleware,
  validateRequest({ body: recordAdvanceSchema }),
  PayrollController.recordAdvance
);
router.patch(
  '/admin/advance/:id',
  adminMiddleware,
  validateRequest({ body: updateAdvanceSchema }),
  PayrollController.updateAdvance
);
router.delete('/admin/advance/:id', adminMiddleware, PayrollController.deleteAdvance);

router.post(
  '/admin/holiday',
  adminMiddleware,
  validateRequest({ body: declareHolidaySchema }),
  PayrollController.declareHoliday
);
router.delete('/admin/holiday/:id', adminMiddleware, PayrollController.deleteHoliday);

router.patch(
  '/admin/wage-rate',
  adminMiddleware,
  validateRequest({ body: updateWageSchema }),
  PayrollController.updateWorkerWage
);

router.post(
  '/admin/settle',
  adminMiddleware,
  validateRequest({ body: settlePayrollSchema }),
  PayrollController.settlePayroll
);


router.get(
  '/admin/money-flow',
  adminMiddleware,
  PayrollController.getMoneyFlow
);

export default router;
