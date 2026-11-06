import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Gift,
  Zap,
  Palmtree,
  Banknote,
  CreditCard,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';
import { MonthlyBreakdownItem, SingleSheetDayEntry } from '../api/payrollApi';

interface PayrollAnalyticsGraphProps {
  monthlyData: MonthlyBreakdownItem[];
  days?: SingleSheetDayEntry[];
  workerDailyWage?: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export const PayrollAnalyticsGraph: React.FC<PayrollAnalyticsGraphProps> = ({
  monthlyData,
  days = [],
  workerDailyWage = 800,
}) => {
  const [viewMode, setViewMode] = useState<'DAILY_FLOW' | 'BARS' | 'TREND'>('DAILY_FLOW');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INCENTIVE' | 'OVERTIME' | 'HOLIDAY' | 'ADVANCE' | 'SETTLEMENT'>('ALL');
  const [hoveredDailyIndex, setHoveredDailyIndex] = useState<number | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // Daily chronology (oldest to newest for left-to-right progression, take last 21 days for clear visualization)
  const activeDays = useMemo(() => {
    if (!days || days.length === 0) return [];
    return [...days].reverse().slice(-21);
  }, [days]);

  // Extract all distinct financial events (incentives, OT, holidays, advances, payouts)
  const salaryEvents = useMemo(() => {
    const list: Array<{
      date: string;
      type: 'INCENTIVE' | 'OVERTIME' | 'HOLIDAY' | 'ADVANCE' | 'SETTLEMENT' | 'LEAVE_PENALTY';
      title: string;
      amount: number;
      isCredit: boolean;
      remarks?: string;
    }> = [];

    for (const d of days) {
      // 1. Incentives
      for (const tx of d.inlineTransactions || []) {
        if (tx.type === 'INCENTIVE') {
          list.push({
            date: d.date,
            type: 'INCENTIVE',
            title: `Performance Incentive`,
            amount: tx.amount,
            isCredit: true,
            remarks: tx.notes || 'Incentive awarded by supervisor',
          });
        } else if (tx.type === 'ADVANCE_TAKEN') {
          list.push({
            date: d.date,
            type: 'ADVANCE',
            title: `Cash Advance Drawn`,
            amount: tx.amount,
            isCredit: false,
            remarks: tx.notes || 'Advance payment',
          });
        } else if (tx.type === 'PAYOUT_SETTLEMENT') {
          list.push({
            date: d.date,
            type: 'SETTLEMENT',
            title: `Payroll Settlement Disbursed`,
            amount: tx.amount,
            isCredit: false,
            remarks: `${tx.paymentMethod || 'CASH'}${tx.referenceNote ? ` • ${tx.referenceNote}` : ''}`,
          });
        }
      }

      // 2. Overtime
      if (d.otHours > 0 && d.otStatus === 'APPROVED') {
        list.push({
          date: d.date,
          type: 'OVERTIME',
          title: `${d.otHours}h Overtime Accrued`,
          amount: d.otAmount,
          isCredit: true,
          remarks: d.otClaimNote || 'Approved overtime pay',
        });
      }

      // 3. Paid Garage Holiday
      if (d.dayType === 'HOLIDAY') {
        list.push({
          date: d.date,
          type: 'HOLIDAY',
          title: `Paid Garage Holiday: ${d.holidayTitle || 'Declared Holiday'}`,
          amount: d.baseWage,
          isCredit: true,
          remarks: 'Full paid credit under garage policy',
        });
      }
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [days]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    let totalIncentives = 0;
    let totalOt = 0;
    let totalAdvances = 0;
    let totalPaidHolidays = 0;
    let totalWages = 0;

    for (const d of days) {
      if (d.dayType === 'WORKING' && d.shiftStatus !== 'IN_PROGRESS') totalWages += d.baseWage;
      if (d.dayType === 'HOLIDAY') totalPaidHolidays += d.baseWage;
      if (d.otStatus === 'APPROVED') totalOt += d.otAmount;
      for (const tx of d.inlineTransactions || []) {
        if (tx.type === 'INCENTIVE') totalIncentives += tx.amount;
        if (tx.type === 'ADVANCE_TAKEN') totalAdvances += tx.amount;
      }
    }

    return { totalIncentives, totalOt, totalAdvances, totalPaidHolidays, totalWages };
  }, [days]);

  // Filtered event feed
  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'ALL') return salaryEvents;
    return salaryEvents.filter((ev) => ev.type === categoryFilter);
  }, [salaryEvents, categoryFilter]);

  // Scaling math for SVG viewport (640 wide x 220 high)
  const width = 640;
  const height = 220;
  const paddingX = 40;
  const paddingY = 32;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  // Monthly sorting
  const sortedMonths = useMemo(() => {
    return [...monthlyData].sort((a, b) => a.monthKey.localeCompare(b.monthKey)).slice(-6);
  }, [monthlyData]);

  // Maximum value calculation for Daily mode
  const maxDailyVal = useMemo(() => {
    if (activeDays.length === 0) return workerDailyWage * 2;
    const vals = activeDays.map((d) => {
      const incentiveSum = (d.inlineTransactions || [])
        .filter((t) => t.type === 'INCENTIVE')
        .reduce((s, t) => s + t.amount, 0);
      const gross = (d.netDayWage || d.baseWage || 0) + (d.otStatus === 'APPROVED' ? d.otAmount : 0) + incentiveSum;
      return Math.max(gross, d.runningCumulativeBalance || 0);
    });
    return Math.max(...vals, workerDailyWage * 1.5, 1200);
  }, [activeDays, workerDailyWage]);

  // Maximum value for Monthly mode
  const maxMonthVal = useMemo(() => {
    if (sortedMonths.length === 0) return workerDailyWage * 20;
    return Math.max(
      ...sortedMonths.map((m) =>
        Math.max(
          m.grossWages || 0,
          m.netEarnings || 0,
          m.payouts || 0,
          (m.netBaseWages || 0) + (m.otAmount || 0) + (m.incentives || 0)
        )
      ),
      workerDailyWage * 15
    );
  }, [sortedMonths, workerDailyWage]);

  const getDailyY = (val: number) => {
    const clamped = Math.max(0, val);
    return height - paddingY - (clamped / maxDailyVal) * graphHeight;
  };

  const getMonthY = (val: number) => {
    const clamped = Math.max(0, val);
    return height - paddingY - (clamped / maxMonthVal) * graphHeight;
  };

  const dailyStepX = activeDays.length > 1 ? graphWidth / (activeDays.length - 1) : graphWidth;
  const monthStepX = sortedMonths.length > 1 ? graphWidth / (sortedMonths.length - 1) : graphWidth;

  // Trend curve for monthly
  const trendPoints = sortedMonths
    .map((m, idx) => {
      const x = paddingX + idx * monthStepX;
      const y = getMonthY(m.netEarnings || 0);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${paddingX},${height - paddingY} ${trendPoints} ${
    paddingX + (sortedMonths.length - 1) * monthStepX
  },${height - paddingY}`;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl glass-modern-card border border-amber-500/25 space-y-3 shadow-xs transition-all">
      {/* ── HEADER TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Salary & Financial Event Stream</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                Live Engine
              </span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Interactive tracking of Daily Wages, Incentives, Overtime, Paid Holidays & Advances
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('DAILY_FLOW')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
              viewMode === 'DAILY_FLOW'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Daily Flow</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('BARS')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
              viewMode === 'BARS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Monthly Bars</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TREND')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
              viewMode === 'TREND'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Trajectory</span>
          </button>
        </div>
      </div>

      {/* ── METRIC TELEMETRY STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] sm:text-xs font-mono p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Base Wage Credit</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(summary.totalWages)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Incentives Awarded</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">
            +{formatCurrency(summary.totalIncentives)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Overtime Accrued</span>
          <span className="font-bold text-sky-600 dark:text-sky-400">
            +{formatCurrency(summary.totalOt)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Paid Holidays</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            +{formatCurrency(summary.totalPaidHolidays)}
          </span>
        </div>
      </div>

      {/* ── SVG CANVAS AREA ── */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible font-mono"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="barWage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="barIncentive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="barOt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="barHoliday" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="barAdvance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
            <linearGradient id="barSettled" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Grid horizontal guidelines */}
          {[0, 0.33, 0.66, 1].map((pct) => {
            const currentMax = viewMode === 'DAILY_FLOW' ? maxDailyVal : maxMonthVal;
            const val = currentMax * (1 - pct);
            const y = paddingY + pct * graphHeight;
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px] fill-slate-400"
                >
                  ₹{Math.round(val / 1000)}k
                </text>
              </g>
            );
          })}

          {/* ── MODE 1: DAILY FLOW (Wages + Incentives + OT + Holidays) ── */}
          {viewMode === 'DAILY_FLOW' && (
            <>
              {activeDays.map((d, idx) => {
                const groupWidth = graphWidth / activeDays.length;
                const groupX = paddingX + idx * groupWidth;
                const centerX = groupX + groupWidth / 2;
                const barW = Math.min(12, Math.max(4, groupWidth * 0.6));
                const baseY = height - paddingY;
                const isHovered = hoveredDailyIndex === idx;

                // Incentives on this day
                const dayIncentives = (d.inlineTransactions || [])
                  .filter((t) => t.type === 'INCENTIVE')
                  .reduce((s, t) => s + t.amount, 0);

                // Overtime pay
                const dayOt = d.otStatus === 'APPROVED' ? d.otAmount : 0;

                // Holiday pay
                const isHoliday = d.dayType === 'HOLIDAY';

                // Base wage
                const isWorking = d.dayType === 'WORKING' && d.shiftStatus !== 'IN_PROGRESS';
                const dayWage = isHoliday || isWorking ? d.baseWage : 0;

                // Heights
                const wageH = Math.max(dayWage > 0 ? 3 : 0, (dayWage / maxDailyVal) * graphHeight);
                const otH = Math.max(dayOt > 0 ? 3 : 0, (dayOt / maxDailyVal) * graphHeight);
                const incH = Math.max(dayIncentives > 0 ? 3 : 0, (dayIncentives / maxDailyVal) * graphHeight);

                return (
                  <g
                    key={d.date}
                    onMouseEnter={() => setHoveredDailyIndex(idx)}
                    onMouseLeave={() => setHoveredDailyIndex(null)}
                    className="cursor-pointer transition-opacity duration-150"
                  >
                    {isHovered && (
                      <rect
                        x={groupX + 1}
                        y={paddingY}
                        width={groupWidth - 2}
                        height={graphHeight}
                        fill="currentColor"
                        className="text-amber-500/10"
                        rx="4"
                      />
                    )}

                    {/* Stack segment 1: Base Wage or Holiday */}
                    {wageH > 0 && (
                      <rect
                        x={centerX - barW / 2}
                        y={baseY - wageH}
                        width={barW}
                        height={wageH}
                        fill={isHoliday ? 'url(#barHoliday)' : 'url(#barWage)'}
                        rx="2"
                      />
                    )}

                    {/* Stack segment 2: Overtime */}
                    {otH > 0 && (
                      <rect
                        x={centerX - barW / 2}
                        y={baseY - wageH - otH}
                        width={barW}
                        height={otH}
                        fill="url(#barOt)"
                        rx="2"
                      />
                    )}

                    {/* Stack segment 3: Incentive */}
                    {incH > 0 && (
                      <rect
                        x={centerX - barW / 2}
                        y={baseY - wageH - otH - incH}
                        width={barW}
                        height={incH}
                        fill="url(#barIncentive)"
                        rx="2"
                      />
                    )}

                    {/* Special marker icon if non-standard event */}
                    {dayIncentives > 0 && (
                      <circle
                        cx={centerX}
                        cy={Math.max(paddingY + 6, baseY - wageH - otH - incH - 5)}
                        r="3.5"
                        fill="#9333ea"
                      />
                    )}

                    {/* Date label on X-axis (every 2nd or 3rd to avoid clutter) */}
                    {(idx % (activeDays.length > 14 ? 3 : 2) === 0 || isHovered) && (
                      <text
                        x={centerX}
                        y={height - paddingY + 14}
                        textAnchor="middle"
                        className={`text-[8px] font-bold ${
                          isHovered ? 'fill-amber-600 font-black' : 'fill-slate-400'
                        }`}
                      >
                        {d.date.slice(8)}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ── MODE 2: MONTHLY BARS ── */}
          {viewMode === 'BARS' && (
            <>
              {sortedMonths.map((m, idx) => {
                const groupWidth = graphWidth / sortedMonths.length;
                const groupX = paddingX + idx * groupWidth;
                const barSlotWidth = Math.min(14, groupWidth / 4.5);
                const isHovered = hoveredMonthIndex === idx;

                const wageH = Math.max(3, ((m.netBaseWages || 0) / maxMonthVal) * graphHeight);
                const otH = Math.max(m.otAmount > 0 ? 3 : 0, ((m.otAmount || 0) / maxMonthVal) * graphHeight);
                const advH = Math.max(m.advances > 0 ? 3 : 0, ((m.advances || 0) / maxMonthVal) * graphHeight);
                const payoutH = Math.max(m.payouts > 0 ? 3 : 0, ((m.payouts || 0) / maxMonthVal) * graphHeight);

                const baseY = height - paddingY;
                const centerX = groupX + groupWidth / 2;

                return (
                  <g
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredMonthIndex(idx)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                    className="cursor-pointer transition-opacity duration-150"
                  >
                    {isHovered && (
                      <rect
                        x={groupX + 4}
                        y={paddingY}
                        width={groupWidth - 8}
                        height={graphHeight}
                        fill="currentColor"
                        className="text-amber-500/10 rounded-lg"
                        rx="6"
                      />
                    )}

                    <rect
                      x={centerX - barSlotWidth * 2}
                      y={baseY - wageH}
                      width={barSlotWidth}
                      height={wageH}
                      fill="url(#barWage)"
                      rx="3"
                    />

                    <rect
                      x={centerX - barSlotWidth * 0.9}
                      y={baseY - otH}
                      width={barSlotWidth}
                      height={otH}
                      fill="url(#barOt)"
                      rx="3"
                    />

                    <rect
                      x={centerX + barSlotWidth * 0.2}
                      y={baseY - advH}
                      width={barSlotWidth}
                      height={advH}
                      fill="url(#barAdvance)"
                      rx="3"
                    />

                    <rect
                      x={centerX + barSlotWidth * 1.3}
                      y={baseY - payoutH}
                      width={barSlotWidth}
                      height={payoutH}
                      fill="url(#barSettled)"
                      rx="3"
                    />

                    <text
                      x={centerX}
                      y={height - paddingY + 16}
                      textAnchor="middle"
                      className={`text-[9px] font-bold ${
                        isHovered ? 'fill-amber-600 font-black' : 'fill-slate-500'
                      }`}
                    >
                      {m.monthLabel.split(' ')[0].slice(0, 3)}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* ── MODE 3: TREND TRAJECTORY ── */}
          {viewMode === 'TREND' && (
            <>
              <polygon points={areaPoints} fill="url(#trendGradient)" />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={trendPoints}
              />
              {sortedMonths.map((m, idx) => {
                const x = paddingX + idx * monthStepX;
                const y = getMonthY(m.netEarnings || 0);
                const isHovered = hoveredMonthIndex === idx;

                return (
                  <g
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredMonthIndex(idx)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    <text
                      x={x}
                      y={height - paddingY + 16}
                      textAnchor="middle"
                      className={`text-[9px] font-bold ${
                        isHovered ? 'fill-amber-600 font-black' : 'fill-slate-500'
                      }`}
                    >
                      {m.monthLabel.split(' ')[0].slice(0, 3)}
                    </text>
                  </g>
                );
              })}
            </>
          )}
        </svg>

        {/* Floating Tooltip for Daily Flow */}
        {viewMode === 'DAILY_FLOW' && hoveredDailyIndex !== null && activeDays[hoveredDailyIndex] && (
          <div className="absolute top-2 right-2 pointer-events-none p-2 rounded-xl bg-slate-900/95 dark:bg-zinc-800/95 text-white border border-slate-700 shadow-xl text-[10px] space-y-1 z-20 backdrop-blur-md animate-fadeIn">
            <div className="font-bold border-b border-white/10 pb-1 flex items-center justify-between gap-3">
              <span>{activeDays[hoveredDailyIndex].date} ({activeDays[hoveredDailyIndex].dayName})</span>
              <span className="text-amber-400 font-mono">
                {activeDays[hoveredDailyIndex].dayType}
              </span>
            </div>
            <div className="space-y-0.5 font-mono text-[9px]">
              <div className="flex justify-between gap-3 text-emerald-400">
                <span>Base Wage:</span>
                <span className="font-bold">+{formatCurrency(activeDays[hoveredDailyIndex].baseWage)}</span>
              </div>
              {activeDays[hoveredDailyIndex].otHours > 0 && (
                <div className="flex justify-between gap-3 text-sky-400">
                  <span>OT ({activeDays[hoveredDailyIndex].otHours}h):</span>
                  <span className="font-bold">+{formatCurrency(activeDays[hoveredDailyIndex].otAmount)}</span>
                </div>
              )}
              {(activeDays[hoveredDailyIndex].inlineTransactions || [])
                .filter((t) => t.type === 'INCENTIVE')
                .map((t) => (
                  <div key={t.id} className="flex justify-between gap-3 text-purple-400">
                    <span>Incentive ({t.notes || 'Award'}):</span>
                    <span className="font-bold">+{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              {activeDays[hoveredDailyIndex].dayType === 'HOLIDAY' && (
                <div className="flex justify-between gap-3 text-indigo-400">
                  <span>Paid Holiday:</span>
                  <span className="font-bold">{activeDays[hoveredDailyIndex].holidayTitle || 'Declared'}</span>
                </div>
              )}
              {activeDays[hoveredDailyIndex].leaveDeduction > 0 && (
                <div className="flex justify-between gap-3 text-rose-400">
                  <span>Leave Penalty:</span>
                  <span className="font-bold">-{formatCurrency(activeDays[hoveredDailyIndex].leaveDeduction)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Tooltip for Monthly */}
        {viewMode !== 'DAILY_FLOW' && hoveredMonthIndex !== null && sortedMonths[hoveredMonthIndex] && (
          <div className="absolute top-2 right-2 pointer-events-none p-2 rounded-xl bg-slate-900/95 dark:bg-zinc-800/95 text-white border border-slate-700 shadow-xl text-[10px] space-y-1 z-20 backdrop-blur-md animate-fadeIn">
            <div className="font-bold border-b border-white/10 pb-1 flex items-center justify-between gap-3">
              <span>{sortedMonths[hoveredMonthIndex].monthLabel}</span>
              <span className="text-amber-400 font-mono">
                {sortedMonths[hoveredMonthIndex].workingDays} Work Days
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[9px]">
              <span className="text-emerald-400">Net Wages:</span>
              <span className="text-right font-bold">
                {formatCurrency(sortedMonths[hoveredMonthIndex].netBaseWages)}
              </span>
              <span className="text-sky-400">Overtime:</span>
              <span className="text-right font-bold">
                +{formatCurrency(sortedMonths[hoveredMonthIndex].otAmount)}
              </span>
              <span className="text-rose-400">Advances:</span>
              <span className="text-right font-bold">
                -{formatCurrency(sortedMonths[hoveredMonthIndex].advances)}
              </span>
              <span className="text-amber-400">Settled:</span>
              <span className="text-right font-bold">
                {formatCurrency(sortedMonths[hoveredMonthIndex].payouts)}
              </span>
              <span className="text-slate-300 font-semibold pt-0.5 border-t border-white/10">Net Earned:</span>
              <span className="text-right font-black text-emerald-400 pt-0.5 border-t border-white/10">
                {formatCurrency(sortedMonths[hoveredMonthIndex].netEarnings)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── LEGEND FOOTER ── */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/50 dark:border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Base Wage</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span>Incentives</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
          <span>Overtime</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
          <span>Paid Holidays</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span>Advances / Deductions</span>
        </div>
      </div>

      {/* ── FINANCIAL EVENTS FEED (Incentives, OT, Holidays, Advances) ── */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Recorded Salary Events & Adjustments</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('INCENTIVE')}
            className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              categoryFilter === 'INCENTIVE'
                ? 'bg-purple-600 text-white'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
            }`}
          >
            <Gift className="w-2.5 h-2.5" />
            Incentives
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('OVERTIME')}
            className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              categoryFilter === 'OVERTIME'
                ? 'bg-sky-600 text-white'
                : 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            Overtime
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('HOLIDAY')}
            className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              categoryFilter === 'HOLIDAY'
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
            }`}
          >
            <Palmtree className="w-2.5 h-2.5" />
            Holidays
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('ADVANCE')}
            className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              categoryFilter === 'ADVANCE'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <Banknote className="w-2.5 h-2.5" />
            Advances
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('SETTLEMENT')}
            className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              categoryFilter === 'SETTLEMENT'
                ? 'bg-amber-600 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <CreditCard className="w-2.5 h-2.5" />
            Settlements
          </button>
        </div>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-2 text-center">
            No events logged in this category.
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredEvents.slice(0, 15).map((ev, i) => (
              <div
                key={`${ev.date}-${ev.type}-${i}`}
                className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white ${
                      ev.type === 'INCENTIVE'
                        ? 'bg-purple-500'
                        : ev.type === 'OVERTIME'
                        ? 'bg-sky-500'
                        : ev.type === 'HOLIDAY'
                        ? 'bg-indigo-500'
                        : ev.type === 'ADVANCE'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  >
                    {ev.type === 'INCENTIVE' && <Gift className="w-3.5 h-3.5" />}
                    {ev.type === 'OVERTIME' && <Zap className="w-3.5 h-3.5" />}
                    {ev.type === 'HOLIDAY' && <Palmtree className="w-3.5 h-3.5" />}
                    {ev.type === 'ADVANCE' && <Banknote className="w-3.5 h-3.5" />}
                    {ev.type === 'SETTLEMENT' && <CreditCard className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {ev.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ev.date} {ev.remarks ? `• ${ev.remarks}` : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono text-xs font-black shrink-0 ${
                    ev.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {ev.isCredit ? '+' : '-'}{formatCurrency(ev.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
