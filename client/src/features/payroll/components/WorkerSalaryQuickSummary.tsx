import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Clock,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Gift,
  Zap,
  Banknote,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useGetMySingleSheetQuery } from '../api/payrollApi';
import { useAuth } from '../../../shared/hooks/useAuth';

export interface CachedSalarySummary {
  netPayable: number;
  dailyWage: number;
  totalWorkingDays: number;
  totalApprovedOtHours: number;
  totalApprovedOtAmount: number;
  totalAdvances: number;
  totalIncentives: number;
  advanceOverhang: number;
  hasWageAssigned: boolean;
  shiftStatus?: string;
  lastSettledDate?: string;
  lastUpdated: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const WorkerSalaryQuickSummary: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = (user as any)?._id || (user as any)?.id || '';

  const cacheKey = `momzz_salary_summary_${userId}`;

  // 1. Synchronously hydrate initial state from localStorage cache for 0ms instant display
  const [cachedSummary, setCachedSummary] = useState<CachedSalarySummary | null>(() => {
    if (!userId) return null;
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        return JSON.parse(stored) as CachedSalarySummary;
      }
    } catch {
      // Ignore cache parse error
    }
    return null;
  });

  // 2. Fetch live data with background revalidation
  const { data: mySheetRes, isLoading, isFetching } = useGetMySingleSheetQuery(undefined, {
    skip: !userId || user?.role === 'ADMIN',
  });

  // 3. Update state and localStorage when fresh network data arrives
  useEffect(() => {
    if (mySheetRes?.data) {
      const sheet = mySheetRes.data;
      const worker = sheet.worker;
      const kpis = sheet.kpis;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayEntry = sheet.days?.find((d) => d.date === todayStr);

      const freshSummary: CachedSalarySummary = {
        netPayable: kpis.netPayable || 0,
        dailyWage: worker.dailyWage || user?.dailyWage || 0,
        totalWorkingDays: kpis.unsettledWorkingDays ?? kpis.totalWorkingDays ?? 0,
        totalApprovedOtHours: kpis.totalApprovedOtHours || 0,
        totalApprovedOtAmount: kpis.totalApprovedOtAmount || 0,
        totalAdvances: kpis.totalUnsettledAdvances || 0,
        totalIncentives: kpis.totalUnsettledIncentives || 0,
        advanceOverhang: kpis.advanceOverhang || 0,
        hasWageAssigned: sheet.hasWageAssigned !== false && Boolean(worker.dailyWage && worker.dailyWage > 0),
        shiftStatus: todayEntry?.shiftStatus || 'COMPLETED',
        lastSettledDate: worker.lastSettledDate,
        lastUpdated: Date.now(),
      };

      setCachedSummary(freshSummary);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(freshSummary));
      } catch {
        // LocalStorage quota fallback
      }
    }
  }, [mySheetRes, cacheKey, user?.dailyWage]);

  // Don't render for admins
  if (user?.role === 'ADMIN') {
    return null;
  }

  // Active summary (either live or cached)
  const summary = cachedSummary || {
    netPayable: 0,
    dailyWage: user?.dailyWage || 0,
    totalWorkingDays: 0,
    totalApprovedOtHours: 0,
    totalApprovedOtAmount: 0,
    totalAdvances: 0,
    totalIncentives: 0,
    advanceOverhang: 0,
    hasWageAssigned: Boolean(user?.dailyWage && user.dailyWage > 0),
    shiftStatus: 'IN_PROGRESS',
    lastSettledDate: undefined,
    lastUpdated: Date.now(),
  };

  const isLive = !isFetching && !isLoading && Boolean(mySheetRes?.data);

  return (
    <div
      onClick={() => navigate('/payroll')}
      className="group relative overflow-hidden rounded-2xl glass-modern-card border border-amber-500/25 hover:border-amber-500/40 p-3.5 sm:p-4.5 cursor-pointer transition-all duration-200 active:scale-[0.99] shadow-sm hover:shadow-md space-y-2.5"
    >
      {/* Background ambient subtle glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 rounded-full bg-amber-500/10 blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />

      {/* ── TOP HEADER ROW: Title + Cache Tag + Rate Chip ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xs shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                My Payroll Snapshot
              </h3>
              {isLive ? (
                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                  <Sparkles className="w-2.5 h-2.5" />
                  Instant Cache
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {summary.lastSettledDate ? `Cycle since ${summary.lastSettledDate}` : 'Current billing cycle'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
            {summary.dailyWage > 0 ? `₹${summary.dailyWage}/day` : 'Wage Pending'}
          </span>
        </div>
      </div>

      {/* ── HERO DUES STRIP ── */}
      <div className="flex items-baseline justify-between pt-1 pb-0.5 border-t border-slate-100 dark:border-white/5">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono block">
            Net Unsettled Payable
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(summary.netPayable)}
            </span>
            {summary.advanceOverhang > 0 && (
              <span className="text-[10px] font-mono font-bold text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                Overhang: -{formatCurrency(summary.advanceOverhang)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
          <span>Ledger</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* ── 4 MICRO METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
        <div className="p-1.5 sm:p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 block text-[9px]">Days</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {summary.totalWorkingDays}d
            </span>
          </div>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 block text-[9px]">OT</span>
            <span className="font-bold text-sky-600 dark:text-sky-400">
              {summary.totalApprovedOtHours}h (+₹{summary.totalApprovedOtAmount})
            </span>
          </div>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 block text-[9px]">Incentives</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              +{formatCurrency(summary.totalIncentives)}
            </span>
          </div>
        </div>

        <div className="p-1.5 sm:p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 flex items-center gap-1.5">
          <Banknote className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400 block text-[9px]">Advances</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              -{formatCurrency(summary.totalAdvances)}
            </span>
          </div>
        </div>
      </div>

      {/* ── FOOTER: SHIFT CUTOFF NOTICE ── */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-amber-500" />
          <span>Daily wage accrues automatically at 5:00 PM IST</span>
        </div>
        <span className="text-amber-600 dark:text-amber-400 font-bold hover:underline">
          Tap to view &rarr;
        </span>
      </div>
    </div>
  );
};
