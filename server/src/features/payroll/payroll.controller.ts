import { Request, Response, NextFunction } from 'express';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from './payroll.repository';
import { AppError } from '../../shared/utils/appError';

export class PayrollController {
  /**
   * POST /api/payroll/leave/batch
   * Admin batch leaves marking across single/multiple workers and dates
   */
  static async markBatchLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayrollService.markBatchLeave(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payroll/ot/claim
   * Worker submits whole-integer overtime claim
   */
  static async claimOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = (req as any).user?._id?.toString();
      if (!workerId) throw new AppError('Unauthorized', 401);

      const result = await PayrollService.claimOvertime({
        workerId,
        date: req.body.date,
        otHours: req.body.otHours,
        note: req.body.note,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/payroll/ot/:id/status
   * Admin approves or rejects OT claim
   */
  static async updateOtStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?._id?.toString() || 'Admin';
      const result = await PayrollService.reviewOtClaim({
        claimId: req.params.id,
        status: req.body.status,
        reviewedBy: adminId,
        note: req.body.note,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payroll/worker/:workerId/single-sheet
   * Stream / compute dynamic single sheet ledger
   */
  static async getWorkerSingleSheet(req: Request, res: Response, next: NextFunction) {
    try {
      const { workerId } = req.params;
      const { startDate, endDate, includeSettledHistory } = req.query;

      // Ensure worker can only view their own sheet unless admin
      const currentUser = (req as any).user;
      if (currentUser?.role !== 'ADMIN' && currentUser?._id?.toString() !== workerId) {
        throw new AppError('Access denied', 403);
      }

      const result = await PayrollService.getWorkerSingleSheet({
        workerId,
        startDate: startDate as string,
        endDate: endDate as string,
        includeSettledHistory: includeSettledHistory === 'true',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payroll/worker/me/single-sheet
   * Worker views their own single-sheet ledger
   */
  static async getMySingleSheet(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = (req as any).user?._id?.toString();
      if (!workerId) throw new AppError('Unauthorized', 401);

      const { startDate, endDate, includeSettledHistory } = req.query;

      const result = await PayrollService.getWorkerSingleSheet({
        workerId,
        startDate: startDate as string,
        endDate: endDate as string,
        includeSettledHistory: includeSettledHistory === 'true',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payroll/settle
   * Admin settles worker dues
   */
  static async settlePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const adminName = (req as any).user?.name || 'Admin';
      const result = await PayrollService.settlePayroll({
        workerId: req.body.workerId,
        endDate: req.body.endDate,
        amountPaid: req.body.amountPaid,
        paymentMethod: req.body.paymentMethod,
        referenceNote: req.body.referenceNote,
        settledByName: adminName,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payroll/advance
   * Admin records cash advance taken
   */
  static async recordAdvance(req: Request, res: Response, next: NextFunction) {
    try {
      const adminName = (req as any).user?.name || 'Admin';
      const result = await PayrollService.recordCashAdvance({
        workerId: req.body.workerId,
        amount: req.body.amount,
        date: req.body.date,
        notes: req.body.notes,
        recordedByName: adminName,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payroll/admin/overview
   * Admin roster overview with KPIs and pending OT count
   */
  static async getAdminOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayrollService.getAdminOverview();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payroll/holiday
   */
  static async getHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const holidays = await PayrollRepository.findHolidays(startDate as string, endDate as string);
      res.status(200).json({
        success: true,
        data: holidays,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payroll/holiday
   */
  static async declareHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?._id?.toString();
      const holiday = await PayrollRepository.createHoliday(
        req.body.date,
        req.body.title,
        req.body.isPaid !== undefined ? req.body.isPaid : true,
        adminId
      );
      res.status(201).json({
        success: true,
        data: holiday,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/payroll/holiday/:id
   */
  static async deleteHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const success = await PayrollRepository.deleteHoliday(req.params.id);
      res.status(200).json({
        success,
        message: success ? 'Holiday removed' : 'Holiday not found',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/payroll/admin/wage-rate
   */
  static async updateWorkerWage(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await PayrollRepository.updateWorkerWage(req.body.workerId, req.body.dailyWage);
      if (!updated) throw new AppError('Worker not found', 404);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/payroll/ot/claim/:id
   * Worker or Admin can cancel a pending OT claim
   */
  static async cancelOtClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = (req as any).user?._id?.toString();
      const userRole = (req as any).user?.role;
      const claim = await PayrollRepository.findWageAdjustmentById(req.params.id);
      if (!claim) throw new AppError('Overtime claim not found', 404);

      const claimWorkerId = (claim.workerId as any)?._id?.toString() || claim.workerId?.toString();
      if (claimWorkerId !== workerId && userRole !== 'ADMIN') {
        throw new AppError('Access denied', 403);
      }

      if (claim.status !== 'PENDING' && userRole !== 'ADMIN') {
        throw new AppError('Cannot cancel a claim that has already been reviewed', 400);
      }

      await PayrollRepository.deleteWageAdjustment(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Overtime claim cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/payroll/adjustment/:id
   */
  static async deleteAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const success = await PayrollRepository.deleteWageAdjustment(req.params.id);
      res.status(200).json({
        success,
        message: success ? 'Adjustment deleted' : 'Adjustment not found',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payroll/incentive
   */
  static async recordIncentive(req: Request, res: Response, next: NextFunction) {
    try {
      const adminName = (req as any).user?.name || 'Admin';
      const result = await PayrollService.recordIncentive({
        workerId: req.body.workerId,
        amount: req.body.amount,
        date: req.body.date,
        notes: req.body.notes,
        recordedByName: adminName,
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.incentive,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/payroll/leave/:id
   */
  static async updateLeaveAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayrollService.updateLeaveAdjustment({
        adjustmentId: req.params.id,
        type: req.body.type,
        date: req.body.date,
        note: req.body.note,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.adjustment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/payroll/ot/claim/:id
   */
  static async updateOtClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user?.role;
      const userId = (req as any).user?._id?.toString();

      const result = await PayrollService.updateOtClaim({
        claimId: req.params.id,
        otHours: req.body.otHours,
        date: req.body.date,
        note: req.body.note,
        status: req.body.status,
        reviewedBy: userRole === 'ADMIN' ? userId : undefined,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.claim,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/payroll/transaction/:id
   */
  static async deleteWageTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PayrollService.deleteWageTransaction(req.params.id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
