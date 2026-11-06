import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { MonthlyBreakdownItem } from '../api/payrollApi';

interface PayrollAnalyticsGraphProps {
  monthlyData: MonthlyBreakdownItem[];
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
  workerDailyWage,
}) => {
  const [viewMode, setViewMode] = useState<'BARS' | 'TREND'>('BARS');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort chronological for left-to-right graph progression (oldest to newest)
  const sortedMonths = useMemo(() => {
    return [...monthlyData].sort((a, b) => a.monthKey.localeCompare(b.monthKey)).slice(-6); // last 6 months
  }, [monthlyData]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    if (sortedMonths.length === 0) return { avgEarnings: 0, totalOt: 0, totalAdvances: 0 };
    const totalEarnings = sortedMonths.reduce((sum, m) => sum + (m.netEarnings || 0), 0);
    const totalOt = sortedMonths.reduce((sum, m) => sum + (m.otAmount || 0), 0);
    const totalAdvances = sortedMonths.reduce((sum, m) => sum + (m.advances || 0), 0);
    return {
      avgEarnings: Math.round(totalEarnings / sortedMonths.length),
      totalOt,
      totalAdvances,
    };
  }, [sortedMonths]);

  if (sortedMonths.length === 0) {
    return null;
  }

  // Scaling math for SVG viewport (640 wide x 220 high)
  const width = 640;
  const height = 220;
  const paddingX = 45;
  const paddingY = 35;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  const maxVal = Math.max(
    ...sortedMonths.map((m) =>
      Math.max(
        m.grossWages || 0,
        m.netEarnings || 0,
        m.payouts || 0,
        (m.netBaseWages || 0) + (m.otAmount || 0)
      )
    ),
    (workerDailyWage || 800) * 15 // sensible fallback floor
  );

  const getY = (val: number) => {
    const clamped = Math.max(0, val);
    return height - paddingY - (clamped / maxVal) * graphHeight;
  };

  const stepX = sortedMonths.length > 1 ? graphWidth / (sortedMonths.length - 1) : graphWidth;

  // Trend line points
  const trendPoints = sortedMonths
    .map((m, idx) => {
      const x = paddingX + idx * stepX;
      const y = getY(m.netEarnings || 0);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${paddingX},${height - paddingY} ${trendPoints} ${
    paddingX + (sortedMonths.length - 1) * stepX
  },${height - paddingY}`;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl glass-modern-card border border-amber-500/25 space-y-3 shadow-xs transition-all">
      {/* Graph Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Salary & Earnings Performance</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                Live Analytics
              </span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Monthly breakdown: Net Wages, Overtime, Advances & Payouts
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 text-[11px]">
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
            <span>Bars</span>
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
            <span>Trend Curve</span>
          </button>
        </div>
      </div>

      {/* Metric telemetry strip */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs font-mono p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03]">
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Avg Monthly Net</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(summary.avgEarnings)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Overtime Earned</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(summary.totalOt)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-sans">Advances Drawn</span>
          <span className="font-bold text-rose-600 dark:text-rose-400">
            -{formatCurrency(summary.totalAdvances)}
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
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
            <linearGradient id="barOt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#38bdf8" />
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
            const val = maxVal * (1 - pct);
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

          {/* Render Mode: TREND CURVE */}
          {viewMode === 'TREND' && (
            <>
              {/* Shaded Area */}
              <polygon points={areaPoints} fill="url(#trendGradient)" />

              {/* Glowing Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={trendPoints}
              />

              {/* Data points */}
              {sortedMonths.map((m, idx) => {
                const x = paddingX + idx * stepX;
                const y = getY(m.netEarnings || 0);
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
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

          {/* Render Mode: BARS */}
          {viewMode === 'BARS' && (
            <>
              {sortedMonths.map((m, idx) => {
                const groupWidth = graphWidth / sortedMonths.length;
                const groupX = paddingX + idx * groupWidth;
                const barSlotWidth = Math.min(14, groupWidth / 4.5);
                const isHovered = hoveredIndex === idx;

                const wageH = Math.max(3, ((m.netBaseWages || 0) / maxVal) * graphHeight);
                const otH = Math.max(m.otAmount > 0 ? 3 : 0, ((m.otAmount || 0) / maxVal) * graphHeight);
                const advH = Math.max(m.advances > 0 ? 3 : 0, ((m.advances || 0) / maxVal) * graphHeight);
                const payoutH = Math.max(m.payouts > 0 ? 3 : 0, ((m.payouts || 0) / maxVal) * graphHeight);

                const baseY = height - paddingY;
                const centerX = groupX + groupWidth / 2;

                return (
                  <g
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer transition-opacity duration-150"
                  >
                    {/* Hover highlight column */}
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

                    {/* Bar 1: Base Wage (Green) */}
                    <rect
                      x={centerX - barSlotWidth * 2}
                      y={baseY - wageH}
                      width={barSlotWidth}
                      height={wageH}
                      fill="url(#barWage)"
                      rx="3"
                    />

                    {/* Bar 2: Overtime (Sky) */}
                    <rect
                      x={centerX - barSlotWidth * 0.9}
                      y={baseY - otH}
                      width={barSlotWidth}
                      height={otH}
                      fill="url(#barOt)"
                      rx="3"
                    />

                    {/* Bar 3: Advances (Red) */}
                    <rect
                      x={centerX + barSlotWidth * 0.2}
                      y={baseY - advH}
                      width={barSlotWidth}
                      height={advH}
                      fill="url(#barAdvance)"
                      rx="3"
                    />

                    {/* Bar 4: Payout Settled (Amber) */}
                    <rect
                      x={centerX + barSlotWidth * 1.3}
                      y={baseY - payoutH}
                      width={barSlotWidth}
                      height={payoutH}
                      fill="url(#barSettled)"
                      rx="3"
                    />

                    {/* Month Label */}
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
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredIndex !== null && sortedMonths[hoveredIndex] && (
          <div className="absolute top-2 right-2 pointer-events-none p-2 rounded-xl bg-slate-900/95 dark:bg-zinc-800/95 text-white border border-slate-700 shadow-xl text-[10px] space-y-1 z-20 backdrop-blur-md animate-fadeIn">
            <div className="font-bold border-b border-white/10 pb-1 flex items-center justify-between gap-3">
              <span>{sortedMonths[hoveredIndex].monthLabel}</span>
              <span className="text-amber-400 font-mono">
                {sortedMonths[hoveredIndex].workingDays} Work Days
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[9px]">
              <span className="text-emerald-400">Net Wages:</span>
              <span className="text-right font-bold">
                {formatCurrency(sortedMonths[hoveredIndex].netBaseWages)}
              </span>

              <span className="text-sky-400">Overtime:</span>
              <span className="text-right font-bold">
                +{formatCurrency(sortedMonths[hoveredIndex].otAmount)}
              </span>

              <span className="text-rose-400">Advances:</span>
              <span className="text-right font-bold">
                -{formatCurrency(sortedMonths[hoveredIndex].advances)}
              </span>

              <span className="text-amber-400">Settled:</span>
              <span className="text-right font-bold">
                {formatCurrency(sortedMonths[hoveredIndex].payouts)}
              </span>

              <span className="text-slate-300 font-semibold pt-0.5 border-t border-white/10">Net Earned:</span>
              <span className="text-right font-black text-emerald-400 pt-0.5 border-t border-white/10">
                {formatCurrency(sortedMonths[hoveredIndex].netEarnings)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/50 dark:border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Base Wages</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
          <span>Overtime Pay</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span>Advances Drawn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span>Payouts Settled</span>
        </div>
      </div>
    </div>
  );
};
