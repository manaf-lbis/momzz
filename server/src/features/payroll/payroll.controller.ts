import { Request, Response } from 'express';
import { PayrollService } from './payroll.service';
import { sendError, sendSuccess } from '../../shared/utils/response.handler';
import { ROLES } from '../../shared/constants/status';

const payrollService = new PayrollService();

export class PayrollController {
  // Ledger (single sheet & calendar)
  static async getLedger(req: Request, res: Response) {
    try {
      const isUserAdmin = req.user?.role === ROLES.ADMIN;
      let targetWorkerId = req.user?.id;

      if (isUserAdmin && req.query.workerId) {
        targetWorkerId = req.query.workerId as string;
      }

      if (!targetWorkerId) {
        return sendError(res, 'Worker ID is required', 400);
      }

      const { startDate, endDate } = req.query;
      const ledger = await payrollService.getWorkerLedger(
        targetWorkerId,
        startDate as string | undefined,
        endDate as string | undefined
      );

      return sendSuccess(res, 'Worker payroll ledger retrieved successfully.', ledger);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve payroll ledger.', 500);
    }
  }

  // Worker claims Overtime
  static async claimOvertime(req: Request, res: Response) {
    try {
      const workerId = req.user?.id;
      if (!workerId) {
        return sendError(res, 'Unauthorized context', 401);
      }

      const { date, hours, note } = req.body;
      const claim = await payrollService.claimOvertime(workerId, date, hours, note);
      return sendSuccess(res, 'Overtime claim submitted successfully for approval.', claim, 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit overtime claim.', 400);
    }
  }

  // Worker cancels their own PENDING Overtime claim
  static async cancelOtClaim(req: Request, res: Response) {
    try {
      const workerId = req.user?.id;
      const { id } = req.params;
      if (!workerId) return sendError(res, 'Unauthorized', 401);

      await payrollService.cancelOtClaim(id, workerId);
      return sendSuccess(res, 'Overtime claim cancelled successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to cancel overtime claim.', 400);
    }
  }

  // Worker views their own OT claims
  static async getWorkerOtClaims(req: Request, res: Response) {
    try {
      const workerId = req.user?.id;
      if (!workerId) return sendError(res, 'Unauthorized', 401);

      const claims = await payrollService['repo'].findOtClaims({ workerId });
      return sendSuccess(res, 'Worker overtime claims retrieved.', claims);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve overtime claims.', 500);
    }
  }

  // Admin Overview
  static async getAdminOverview(_req: Request, res: Response) {
    try {
      const overview = await payrollService.getAdminOverview();
      return sendSuccess(res, 'Payroll admin overview retrieved.', overview);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve payroll overview.', 500);
    }
  }

  // Admin OT Claims list
  static async getAdminOtClaims(req: Request, res: Response) {
    try {
      const { status, workerId } = req.query;
      const claims = await payrollService['repo'].findOtClaims({
        status: status as any,
        workerId: workerId as string | undefined,
      });
      return sendSuccess(res, 'Overtime claims retrieved.', claims);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve overtime claims.', 500);
    }
  }

  // Admin reviews OT Claim (Approve or Reject with custom reason)
  static async reviewOtClaim(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const claim = await payrollService.reviewOtClaim(id, status, adminId, rejectionReason);
      return sendSuccess(res, `Overtime claim ${status.toLowerCase()} successfully.`, claim);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to review overtime claim.', 400);
    }
  }

  // Admin marks leave (supports single date or date range)
  static async markLeave(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const { workerId, workerIds, date, endDate, leaveType, reason } = req.body;
      const targetIds: string[] =
        workerIds && Array.isArray(workerIds) && workerIds.length > 0
          ? workerIds
          : workerId
          ? [workerId]
          : [];

      if (targetIds.length === 0) {
        return sendError(res, 'At least one worker must be selected', 400);
      }

      const result = await payrollService.markLeavesBatch(targetIds, date, leaveType, reason, adminId, endDate);
      return sendSuccess(
        res,
        `Leave recorded successfully for ${result.affectedWorkers} worker(s) across ${result.totalDaysMarked} day(s).`,
        result,
        201
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to record leave.', 400);
    }
  }

  // Admin 1-click toggle leave on Calendar (FULL, HALF, or CLEAR)
  static async toggleLeave(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const { workerId, date, leaveType, reason } = req.body;
      const result = await payrollService.toggleLeave(workerId, date, leaveType, adminId, reason);
      return sendSuccess(res, `Leave ${result.action.toLowerCase()} successfully.`, result);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to toggle leave.', 400);
    }
  }

  // Admin removes leave
  static async deleteLeave(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await payrollService.removeLeave(id);
      return sendSuccess(res, 'Leave record deleted successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete leave.', 400);
    }
  }

  // Admin records Cash Advance
  static async recordAdvance(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const { workerId, amount, date, reason } = req.body;
      const advance = await payrollService.recordCashAdvance(workerId, amount, date, reason, adminId);
      return sendSuccess(res, 'Cash advance recorded successfully.', advance, 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to record cash advance.', 400);
    }
  }

  // Admin updates Cash Advance
  static async updateAdvance(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { amount, date, reason } = req.body;

      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const advance = await payrollService.updateCashAdvance(id, amount, date, reason);
      return sendSuccess(res, 'Cash advance updated successfully.', advance);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update cash advance.', 400);
    }
  }

  // Admin deletes Cash Advance
  static async deleteAdvance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await payrollService.removeCashAdvance(id);
      return sendSuccess(res, 'Cash advance deleted successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete cash advance.', 400);
    }
  }

  // Admin declares Holiday
  static async declareHoliday(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const { date, title } = req.body;
      const holiday = await payrollService.declareHoliday(date, title, adminId);
      return sendSuccess(res, 'Holiday declared successfully.', holiday, 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to declare holiday.', 400);
    }
  }

  // Admin deletes Holiday
  static async deleteHoliday(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await payrollService.removeHoliday(id);
      return sendSuccess(res, 'Holiday removed successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to remove holiday.', 400);
    }
  }

  // List holidays
  static async getHolidays(_req: Request, res: Response) {
    try {
      const holidays = await payrollService.getHolidays();
      return sendSuccess(res, 'Holidays retrieved.', holidays);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to load holidays.', 500);
    }
  }

  // Admin Common Calendar
  static async getCommonCalendar(req: Request, res: Response) {
    try {
      const now = new Date();
      const year = req.query.year ? Number(req.query.year) : now.getFullYear();
      const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;

      const calendar = await payrollService.getCommonCalendar(year, month);
      return sendSuccess(res, 'Common company calendar retrieved.', calendar);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve common calendar.', 500);
    }
  }

  // Update worker wage
  static async updateWorkerWage(req: Request, res: Response) {
    try {
      const { workerId, dailyWage, effectiveDate } = req.body;
      const updated = await payrollService.updateWorkerWage(workerId, dailyWage, effectiveDate);
      return sendSuccess(res, 'Worker daily wage rate updated successfully with effective date.', updated);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update daily wage.', 400);
    }
  }

  // Settle payroll (supports custom partial payout)
  static async settlePayroll(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) return sendError(res, 'Unauthorized', 401);

      const { workerId, endDate, paymentMethod, referenceNote, amountPaid } = req.body;
      const settlement = await payrollService.settleWorkerPayroll(
        workerId,
        endDate,
        paymentMethod,
        referenceNote,
        adminId,
        amountPaid
      );
      return sendSuccess(res, 'Payroll settled and payment recorded successfully.', settlement, 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to settle payroll.', 400);
    }
  }

  // Get settlements
  static async getSettlements(req: Request, res: Response) {
    try {
      const isUserAdmin = req.user?.role === ROLES.ADMIN;
      let workerId: string | undefined = req.params.workerId;

      if (!isUserAdmin) {
        workerId = req.user?.id;
      }

      const settlements = await payrollService['repo'].findSettlements(workerId);
      return sendSuccess(res, 'Settlement records retrieved.', settlements);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve settlements.', 500);
    }
  }

  // Admin unified Money Flow & Cashflow (Giving & Taking money)
  static async getMoneyFlow(req: Request, res: Response) {
    try {
      const { workerId, type, startDate, endDate } = req.query as {
        workerId?: string;
        type?: 'ALL' | 'ADVANCE' | 'SETTLEMENT' | 'OT';
        startDate?: string;
        endDate?: string;
      };
      const result = await payrollService.getMoneyFlowLedger({ workerId, type, startDate, endDate });
      return sendSuccess(res, 'Money flow transactions fetched successfully.', result);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch money flow ledger.', 400);
    }
  }

}
