import { apiSlice } from '../../auth/api/apiSlice';

export interface LedgerDayEntry {
  date: string; // YYYY-MM-DD
  dayName: string;
  dayType: 'WORKING' | 'SUNDAY' | 'HOLIDAY' | 'PAID_LEAVE' | 'LEAVE' | 'HALF_DAY';
  holidayTitle?: string;
  leaveId?: string;
  leaveReason?: string;
  baseWage: number;
  leaveDeduction: number;
  netDayWage: number;
  otHours: number;
  otAmount: number;
  otStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  advancesAmount?: number;
  settlementPaid?: number;
  totalDayEarnings: number;
  isSettled: boolean;
}

export interface CashAdvanceItem {
  _id: string;
  workerId: string;
  amount: number;
  date: string;
  reason?: string;
  isSettled: boolean;
  createdAt: string;
}

export interface PayrollSettlementItem {
  _id: string;
  workerId: {
    _id: string;
    name: string;
    mobile: string;
    dailyWage: number;
  } | string;
  workerName?: string;
  workerMobile?: string;
  baseDailyWageRate?: number;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  totalFullLeaveDays?: number;
  totalHalfDays?: number;
  totalPaidLeaveDays?: number;
  totalHolidayDays: number;
  totalSundayDays?: number;
  totalPaidDays?: number;
  totalCalendarDays?: number;
  totalLeaveDays: number;
  grossWages: number;
  totalLeaveDeduction: number;
  netBaseWage?: number;
  totalOtHours: number;
  otHourlyRate?: number;
  totalOtAmount: number;
  totalCashAdvances: number;
  previousBalanceCarriedForward?: number;
  netPayable: number;
  amountPaid: number;
  carriedForwardBalance?: number;
  payoutType?: 'FULL' | 'PARTIAL';
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  referenceNote?: string;
  settledByName?: string;
  settledAt: string;
  itemizedDays?: Array<{
    date: string;
    dayName: string;
    dayType: string;
    baseWage: number;
    leaveDeduction: number;
    netDayWage: number;
    otHours: number;
    otAmount: number;
    advancesDeducted?: number;
    totalDayEarnings: number;
    holidayTitle?: string;
    leaveReason?: string;
  }>;
}

export interface WorkerLedgerResult {
  worker: {
    _id: string;
    name: string;
    mobile: string;
    dailyWage: number;
    dailyWageEffectiveDate?: string;
    profileImageUrl?: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    workingDays: number;
    leaveDays: number;
    halfDays: number;
    paidLeaveDays: number;
    holidayDays: number;
    sundayDays: number;
    totalGrossWages: number;
    totalLeaveDeduction: number;
    totalOtHours: number;
    totalOtAmount: number;
    totalAdvances: number;
    carriedForwardBalance: number;
    netUnsettledEarnings: number;
    hasUsedMonthlyPaidLeave: boolean;
  };
  ledger: LedgerDayEntry[];
  unsettledAdvances: CashAdvanceItem[];
  recentSettlements: PayrollSettlementItem[];
}

export interface AdminWorkerSummary {
  workerId: string;
  name: string;
  mobile: string;
  dailyWage: number;
  unsettledDaysCount: number;
  unsettledBalance: number;
  pendingOtHours: number;
  lastSettlementDate?: string;
}

export interface AdminOverviewResult {
  workers: AdminWorkerSummary[];
  pendingOtClaimsCount: number;
  totalUnsettledWages: number;
}

export interface OtClaimItem {
  _id: string;
  workerId: {
    _id: string;
    name: string;
    mobile: string;
    dailyWage: number;
  };
  date: string;
  hours: number;
  ratePerHour: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string;
  rejectionReason?: string;
  isSettled: boolean;
  createdAt: string;
}

export interface HolidayItem {
  _id: string;
  date: string;
  title: string;
  createdAt: string;
}

export interface CommonCalendarResult {
  holidays: HolidayItem[];
  leaves: Array<{
    _id: string;
    workerId: string;
    workerName: string;
    date: string;
    leaveType: 'FULL' | 'HALF';
    isMonthlyPaidLeave: boolean;
    reason?: string;
  }>;
  workers: Array<{ _id: string; name: string; mobile: string; dailyWage: number }>;
}

export const payrollApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkerLedger: builder.query<
      { success: boolean; data: WorkerLedgerResult },
      { workerId?: string; startDate?: string; endDate?: string } | void
    >({
      query: (params) => ({
        url: '/payroll/ledger',
        params: params || {},
      }),
      providesTags: ['Payroll'],
    }),

    getAdminOverview: builder.query<{ success: boolean; data: AdminOverviewResult }, void>({
      query: () => '/payroll/admin/overview',
      providesTags: ['Payroll', 'OtClaim'],
    }),

    getCommonCalendar: builder.query<
      { success: boolean; data: CommonCalendarResult },
      { year?: number; month?: number } | void
    >({
      query: (params) => ({
        url: '/payroll/admin/common-calendar',
        params: params || {},
      }),
      providesTags: ['Payroll'],
    }),

    getAdminOtClaims: builder.query<
      { success: boolean; data: OtClaimItem[] },
      { status?: string; workerId?: string } | void
    >({
      query: (params) => ({
        url: '/payroll/admin/ot-claims',
        params: params || {},
      }),
      providesTags: ['OtClaim'],
    }),

    getWorkerOtClaims: builder.query<{ success: boolean; data: OtClaimItem[] }, void>({
      query: () => '/payroll/my-ot-claims',
      providesTags: ['OtClaim'],
    }),

    claimOvertime: builder.mutation<
      { success: boolean; data: OtClaimItem },
      { date: string; hours: number; note?: string }
    >({
      query: (body) => ({
        url: '/payroll/ot-claim',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['OtClaim', 'Payroll'],
    }),

    cancelOtClaim: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/payroll/ot-claim/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['OtClaim', 'Payroll'],
    }),

    reviewOtClaim: builder.mutation<
      { success: boolean; data: OtClaimItem },
      { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/payroll/admin/ot-claim/${id}/review`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OtClaim', 'Payroll'],
    }),

    markLeave: builder.mutation<
      { success: boolean; data: any },
      { workerId: string; date: string; endDate?: string; leaveType: 'FULL' | 'HALF'; reason?: string }
    >({
      query: (body) => ({
        url: '/payroll/admin/leave',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    toggleLeave: builder.mutation<
      { success: boolean; data: any },
      { workerId: string; date: string; leaveType: 'FULL' | 'HALF' | 'CLEAR'; reason?: string }
    >({
      query: (body) => ({
        url: '/payroll/admin/leave/toggle',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteLeave: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/payroll/admin/leave/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),

    recordCashAdvance: builder.mutation<
      { success: boolean; data: CashAdvanceItem },
      { workerId: string; amount: number; date: string; reason?: string }
    >({
      query: (body) => ({
        url: '/payroll/admin/advance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    updateCashAdvance: builder.mutation<
      { success: boolean; data: CashAdvanceItem },
      { id: string; amount: number; date: string; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/payroll/admin/advance/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteCashAdvance: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/payroll/admin/advance/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll'],
    }),

    getHolidays: builder.query<{ success: boolean; data: HolidayItem[] }, void>({
      query: () => '/payroll/holidays',
      providesTags: ['Payroll'],
    }),

    declareHoliday: builder.mutation<
      { success: boolean; data: HolidayItem },
      { date: string; title: string }
    >({
      query: (body) => ({
        url: '/payroll/admin/holiday',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll'],
    }),

    deleteHoliday: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/payroll/admin/holiday/${id}`,
        method: 'DELETE',
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
      invalidatesTags: ['Payroll', 'AllUsers'],
    }),

    settlePayroll: builder.mutation<
      { success: boolean; data: PayrollSettlementItem },
      {
        workerId: string;
        endDate: string;
        paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
        referenceNote?: string;
        amountPaid?: number;
      }
    >({
      query: (body) => ({
        url: '/payroll/admin/settle',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payroll', 'OtClaim', 'Settlement'],
    }),

    getSettlements: builder.query<{ success: boolean; data: PayrollSettlementItem[] }, string | void>({
      query: (workerId) => ({
        url: workerId ? `/payroll/settlements/${workerId}` : '/payroll/settlements',
      }),
      providesTags: ['Settlement'],
    }),
  }),
});

export const {
  useGetWorkerLedgerQuery,
  useGetAdminOverviewQuery,
  useGetCommonCalendarQuery,
  useGetAdminOtClaimsQuery,
  useGetWorkerOtClaimsQuery,
  useClaimOvertimeMutation,
  useCancelOtClaimMutation,
  useReviewOtClaimMutation,
  useMarkLeaveMutation,
  useToggleLeaveMutation,
  useDeleteLeaveMutation,
  useRecordCashAdvanceMutation,
  useUpdateCashAdvanceMutation,
  useDeleteCashAdvanceMutation,
  useGetHolidaysQuery,
  useDeclareHolidayMutation,
  useDeleteHolidayMutation,
  useUpdateWorkerWageMutation,
  useSettlePayrollMutation,
  useGetSettlementsQuery,
} = payrollApi;
