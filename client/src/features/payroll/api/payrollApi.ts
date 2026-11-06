import { apiSlice } from '../../auth/api/apiSlice';

export interface InlineTransactionItem {
  id: string;
  type: 'PAYOUT_SETTLEMENT' | 'ADVANCE_TAKEN' | 'INCENTIVE';
  amount: number;
  notes?: string;
  paymentMethod?: string;
  referenceNote?: string;
  carriedForwardBalance?: number;
}

export interface SingleSheetDayEntry {
  date: string; // YYYY-MM-DD
  dayName: string;
  dayType: 'WORKING' | 'SUNDAY' | 'HOLIDAY' | 'FULL_LEAVE' | 'HALF_LEAVE';
  holidayTitle?: string;
  adjustmentId?: string;
  adjustmentNote?: string;
  leaveUpdatedByName?: string;
  leaveLastEditedAt?: string;
  isAllowedLeave?: boolean;
  baseWage: number;
  leaveDeduction: number;
  netDayWage: number;
  shiftStatus?: 'IN_PROGRESS' | 'COMPLETED' | 'SUNDAY' | 'HOLIDAY' | 'LEAVE';
  shiftNote?: string;
  otHours: number;
  otAmount: number;
  otStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  otClaimId?: string;
  otClaimNote?: string;
  otFlaggedReason?: string;
  otUpdatedByName?: string;
  otLastEditedAt?: string;
  netDailyPay: number;
  isSettled: boolean;
  inlineTransactions: InlineTransactionItem[];
  runningCumulativeBalance: number;
}

export interface MonthlyBreakdownItem {
  monthKey: string;
  monthLabel: string;
  totalDays: number;
  workingDays: number;
  sundays: number;
  holidays: number;
  leaveDays: number;
  allowedLeaveDays?: number;
  grossWages: number;
  leaveDeductions: number;
  netBaseWages: number;
  otHours: number;
  otAmount: number;
  advances: number;
  incentives?: number;
  payouts: number;
  netEarnings: number;
  isSettled: boolean;
}

export interface WorkerSingleSheetData {
  worker: {
    id: string;
    name: string;
    mobile: string;
    profileImageUrl?: string;
    dailyWage: number;
    dailyWageEffectiveDate?: string;
    lastSettledDate?: string;
    firstPayrollDate?: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  kpis: {
    totalWorkingDays: number;
    totalSundays: number;
    totalHolidayDays: number;
    totalFullLeaveDays: number;
    totalHalfDays: number;
    totalAllowedLeaves?: number;
    unsettledAllowedLeaves?: number;
    grossWages: number;
    totalLeaveDeductions: number;
    netBaseWages: number;
    totalApprovedOtHours: number;
    totalApprovedOtAmount: number;
    totalEarnings: number;
    totalUnsettledAdvances: number;
    totalUnsettledIncentives?: number;
    netPayable: number;
    advanceOverhang?: number;
    unsettledWorkingDays?: number;
  };
  monthlyBreakdown?: MonthlyBreakdownItem[];
  days: SingleSheetDayEntry[];
  hasWageAssigned?: boolean;
  firstPayrollDate?: string | null;
}

export interface WorkerSummaryItem {
  workerId: string;
  name: string;
  mobile: string;
  profileImageUrl?: string;
  role: string;
  dailyWage: number;
  dailyWageEffectiveDate?: string;
  lastSettledDate?: string;
  firstPayrollDate?: string | null;
  hasWageAssigned?: boolean;
  unsettledGross: number;
  unsettledDeductions: number;
  unsettledOtAmount: number;
  unsettledAdvances: number;
  unsettledIncentives?: number;
  netPayable: number;
  advanceOverhang?: number;
  unsettledWorkingDays?: number;
  pendingOtCount: number;
}

export interface PendingOtClaimItem {
  id: string;
  workerId: string;
  workerName: string;
  workerMobile: string;
  workerProfileImageUrl?: string;
  date: string;
  otHours: number;
  potentialAmount: number;
  note?: string;
  flaggedReason?: string;
  updatedByName?: string;
  lastEditedAt?: string;
  createdAt: string;
}

export interface AdminOverviewData {
  kpis: {
    totalWorkers: number;
    totalUnsettledNet: number;
    totalPendingOtCount: number;
  };
  workers: WorkerSummaryItem[];
  pendingOtClaims: PendingOtClaimItem[];
}

export interface GarageHolidayItem {
  _id: string;
  date: string;
  title: string;
  isPaid: boolean;
}

export const payrollApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminOverview: builder.query<{ success: boolean; data: AdminOverviewData }, void>({
      query: () => '/payroll/admin/overview',
      providesTags: ['Payroll'],
    }),

    getWorkerSingleSheet: builder.query<
      { success: boolean; data: WorkerSingleSheetData },
      { workerId: string; startDate?: string; endDate?: string; includeSettledHistory?: boolean }
    >({
      query: ({ workerId, ...params }) => ({
        url: `/payroll/worker/${workerId}/single-sheet`,
        params,
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Payroll', id: arg.workerId }],
    }),

    getMySingleSheet: builder.query<
      { success: boolean; data: WorkerSingleSheetData },
      { startDate?: string; endDate?: string; includeSettledHistory?: boolean } | void
    >({
      query: (params) => ({
        url: '/payroll/worker/me/single-sheet',
        params: params || {},
      }),
      providesTags: ['Payroll'],
    }),

    markBatchLeave: builder.mutation<
      { success: boolean; data: any },
      {
        workerIds: string[];
        dates: string[] | string | { startDate: string; endDate: string };
        type?: 'FULL_LEAVE' | 'HALF_LEAVE';
        note?: string;
      }
    >({
      query: (body) => ({
        url: '/payroll/leave/batch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    claimOvertime: builder.mutation<
      { success: boolean; data: any },
      { date: string; otHours: number; note?: string }
    >({
      query: (body) => ({
        url: '/payroll/ot/claim',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    updateOtStatus: builder.mutation<
      { success: boolean; data: any },
      { id: string; status: 'APPROVED' | 'REJECTED'; note?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/payroll/ot/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    settlePayroll: builder.mutation<
      { success: boolean; data: any },
      {
        workerId: string;
        endDate?: string;
        amountPaid?: number;
        paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
        referenceNote?: string;
      }
    >({
      query: (body) => ({
        url: '/payroll/settle',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    recordAdvance: builder.mutation<
      { success: boolean; data: any },
      {
        workerId: string;
        amount: number;
        date?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: '/payroll/advance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    updateWorkerWage: builder.mutation<
      { success: boolean; data: any },
      { workerId: string; dailyWage: number; effectiveDate?: string }
    >({
      query: (body) => ({
        url: '/payroll/admin/wage-rate',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Payroll',
        { type: 'Payroll', id: arg.workerId },
        'AllUsers',
      ],
    }),

    getHolidays: builder.query<{ success: boolean; data: GarageHolidayItem[] }, void>({
      query: () => '/payroll/holiday',
      providesTags: ['Payroll'],
    }),

    declareHoliday: builder.mutation<
      { success: boolean; data: GarageHolidayItem },
      { date: string; title: string; isPaid?: boolean }
    >({
      query: (body) => ({
        url: '/payroll/holiday',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    recordIncentive: builder.mutation<
      { success: boolean; data: any },
      {
        workerId: string;
        amount: number;
        date?: string;
        notes: string;
      }
    >({
      query: (body) => ({
        url: '/payroll/incentive',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    updateLeave: builder.mutation<
      { success: boolean; data: any },
      {
        id: string;
        type?: 'FULL_LEAVE' | 'HALF_LEAVE';
        date?: string;
        note?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/payroll/leave/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteLeave: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/payroll/leave/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),

    updateOtClaim: builder.mutation<
      { success: boolean; data: any },
      {
        id: string;
        otHours?: number;
        date?: string;
        note?: string;
        status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/payroll/ot/claim/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteOtClaim: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/payroll/ot/claim/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteTransaction: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/payroll/transaction/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteHoliday: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/payroll/holiday/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),
  }),
});

export const {
  useGetAdminOverviewQuery,
  useGetWorkerSingleSheetQuery,
  useGetMySingleSheetQuery,
  useMarkBatchLeaveMutation,
  useClaimOvertimeMutation,
  useUpdateOtStatusMutation,
  useSettlePayrollMutation,
  useRecordAdvanceMutation,
  useRecordIncentiveMutation,
  useUpdateLeaveMutation,
  useDeleteLeaveMutation,
  useUpdateOtClaimMutation,
  useDeleteOtClaimMutation,
  useDeleteTransactionMutation,
  useUpdateWorkerWageMutation,
  useGetHolidaysQuery,
  useDeclareHolidayMutation,
  useDeleteHolidayMutation,
} = payrollApi;
