import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Flame,
  History,
  Package,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import { useAuth } from "../../../shared/hooks/useAuth";
import { Navbar } from "../../../shared/components/navbar/Navbar";
import { useGetJobCardsQuery, useGetJobStatsQuery, JobCardData } from "../../jobs/api/jobApi";
import { useGetPendingWorkersQuery, useGetAllUsersQuery, useGetLeaderboardQuery } from "../../auth/api/authApi";
import { useGetCatalogQuery } from "../../catalog/api/catalogApi";
import { DashboardBentoSkeleton } from "../../../shared/components/common/PageShimmer";
import { NumberTicker } from "../../../shared/components/magicui/NumberTicker";
import { GlobalSearchModal } from "../../../shared/components/common/GlobalSearchModal";
import { isCompletionSoundEnabled, setCompletionSoundEnabled } from "../../../shared/utils/completionSound";
import { AnimatedThemeToggle } from "../../../shared/components/magicui/AnimatedThemeToggle";
import { FluidCanvasBackground } from "../../../shared/components/common/FluidCanvasBackground";

export const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(isCompletionSoundEnabled());

  const { data: jobsRes, isLoading } = useGetJobCardsQuery();
  const { data: statsRes }           = useGetJobStatsQuery();
  const { data: pendingRes }         = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });
  const { data: usersRes }           = useGetAllUsersQuery(undefined,       { skip: !isAdmin });
  const { data: lbRes }              = useGetLeaderboardQuery();
  const { data: catalogRes }         = useGetCatalogQuery();

  const allJobs: JobCardData[] = Array.isArray(jobsRes?.data)
    ? (jobsRes!.data as unknown as JobCardData[])
    : ((jobsRes?.data as any)?.jobs || []);

  const stats          = statsRes?.data;
  const activeCount    = stats?.activeCount ?? allJobs.filter(j => j.status === "IN_PROGRESS").length;
  const totalCount     = stats?.totalCount  ?? allJobs.length;
  const completedCount = totalCount - activeCount;
  const qaCount        = stats?.pendingVerificationCount ?? allJobs.filter(
    j => !j.verifiedAt && j.tasks?.length > 0 && j.tasks.every(t => t.status === "COMPLETED")
  ).length;

  const totalAllTasks = allJobs.reduce((s, j) => s + (j.tasks?.length || 0), 0);
  const totalDone     = stats?.totalCompletedTasks ?? allJobs.reduce((s, j) =>
    s + (j.tasks?.filter(t => t.status === "COMPLETED").length || 0), 0);
  const velocity = totalAllTasks > 0 ? Math.round((totalDone / totalAllTasks) * 100) : 0;

  const pendingWorkers = pendingRes?.data?.length || 0;
  const totalUsers     = usersRes?.data?.length   || 0;
  const catalogCount   = catalogRes?.data?.length || 0;
  const topTech        = lbRes?.data?.[0];
  const topScore       = (topTech as any)?.totalPoints || 0;

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  })();

  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#08090f] text-slate-900 dark:text-white flex flex-col">
        <Navbar glass />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-32">
          <DashboardBentoSkeleton />
        </main>
      </div>
    );
  }

  /* Universal clean modern glass card */
  const modernCard = [
    "relative overflow-hidden",
    "backdrop-blur-2xl backdrop-saturate-150",
    "bg-white/70 dark:bg-[#10121d]/75",
    "border border-white/90 dark:border-white/[0.08]",
    "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]",
    "hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.09)] dark:hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)]",
    "rounded-2xl",
    "transition-all duration-300",
    "cursor-pointer active:scale-[0.985]",
  ].join(" ");

  return (
    <div className="relative min-h-screen bg-[#f8f9fb] dark:bg-[#07080e] text-slate-900 dark:text-white flex flex-col overflow-x-hidden transition-colors duration-300 font-sans">

      {/* ── Fluid Organic Wave Canvas Background ── */}
      <FluidCanvasBackground />

      <Navbar glass />

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-32 flex flex-col gap-4">

        {/* ── 1. HEADER (Profile Greeting + Controls) ── */}
        <header className="flex items-center justify-between gap-3">
          <Link to="/profile" className="flex items-center gap-3 active:opacity-75 transition group">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-black text-base text-amber-600 dark:text-amber-400
                            backdrop-blur-xl bg-white/70 dark:bg-white/[0.08] border border-white/90 dark:border-white/[0.12] shadow-xs">
              {user?.profileImageUrl
                ? <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                : user?.name?.charAt(0)?.toUpperCase()}
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#07080e]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80 font-bold">
                  Good {greeting}
                </p>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">{user?.role}</span>
              </div>
              <p className="text-[15px] font-black text-slate-900 dark:text-white">
                {user?.name?.split(" ")[0]}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-[11px] font-mono text-slate-400 dark:text-slate-500 mr-1">
              {dateStr}
            </span>
            <button
              onClick={() => { const n = !isSoundOn; setIsSoundOn(n); setCompletionSoundEnabled(n); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95
                         backdrop-blur-xl bg-white/70 dark:bg-white/[0.07] border border-white/90 dark:border-white/[0.1]
                         text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
              title={isSoundOn ? "Sound on" : "Sound muted"}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <AnimatedThemeToggle variant="icon-only" />
          </div>
        </header>

        {/* ── 2. SEARCH PILL (Universal Fast Lookup) ── */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer transition active:scale-[0.99]
                     backdrop-blur-2xl bg-white/75 dark:bg-[#10121d]/80
                     border border-white/90 dark:border-white/[0.08]
                     rounded-2xl shadow-xs hover:shadow-md hover:border-amber-400/50 dark:hover:border-amber-500/30"
        >
          <Search className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="text-[13px] font-mono flex-1 truncate text-slate-400 dark:text-slate-500">
            Search vehicles, plates, jobs, customers…
          </span>
          <kbd className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-lg font-mono bg-black/5 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500 border border-black/5 dark:border-white/[0.08]">
            ⌘K
          </kbd>
        </button>

        {/* ── 3. HERO COMMAND CENTER ── */}
        <section
          className="relative overflow-hidden rounded-3xl
                     backdrop-blur-2xl bg-gradient-to-br from-white/85 via-white/70 to-amber-50/40
                     dark:from-[#111320]/90 dark:via-[#0e101b]/90 dark:to-[#171426]/90
                     border border-white/95 dark:border-white/[0.1]
                     shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_44px_-8px_rgba(0,0,0,0.7)]
                     p-6 sm:p-8"
        >
          {/* Subtle top edge glow reflection */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 dark:via-amber-400/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex-1">

              {/* Dynamic Scrolling Marquee Ticker */}
              {(() => {
                const chips = [
                  { text: `LIVE · ${activeCount} Active Bays`, dot: "bg-emerald-400", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                  { text: `⚡ ${velocity}% Velocity`, dot: null, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                  { text: `✓ ${totalDone} Tasks Done`, dot: null, color: "text-sky-700 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
                  ...(qaCount > 0 ? [{ text: `⬡ ${qaCount} QA Ready`, dot: null, color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" }] : []),
                  { text: `⊕ ${completedCount} Completed`, dot: null, color: "text-slate-600 dark:text-slate-400", bg: "bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/10" },
                  { text: `◈ ${totalCount} All Time`, dot: null, color: "text-slate-600 dark:text-slate-400", bg: "bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/10" },
                ];
                const doubled = [...chips, ...chips];
                return (
                  <div className="overflow-hidden w-full mb-4 -mx-1">
                    <div className="marquee-track gap-2">
                      {doubled.map((c, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 select-none ${c.color} ${c.bg}`}
                        >
                          {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-ping shrink-0`} />}
                          {c.text}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Massive Metric Display */}
              <div className="flex items-end gap-4 mb-3">
                <span
                  className="font-black leading-none text-slate-900 dark:text-white tracking-tight"
                  style={{ fontSize: "clamp(54px,14vw,84px)", fontVariantNumeric: "tabular-nums" }}
                >
                  <NumberTicker value={activeCount} />
                </span>
                <div className="pb-2">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-snug">Vehicles</p>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-snug">Active in Garage</p>
                </div>
              </div>

              {/* Progress Velocity Bar */}
              <div className="flex items-center gap-3 mb-1">
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-200/80 dark:bg-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${velocity}%` }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
                <span className="text-sm font-black font-mono shrink-0 text-amber-600 dark:text-amber-400">
                  {velocity}%
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {totalDone} of {totalAllTasks} tasks completed · daily turnover
              </p>
            </div>

            {/* Desktop Overview Badges */}
            <div className="hidden sm:flex flex-col gap-2 shrink-0 w-[130px]">
              {[
                { label: "Completed", val: completedCount, col: "text-emerald-700 dark:text-emerald-400" },
                { label: "Lifetime", val: totalCount, col: "text-amber-600 dark:text-amber-400" },
              ].map(s => (
                <div
                  key={s.label}
                  className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]"
                >
                  <p className={`text-2xl font-black ${s.col}`}>{s.val}</p>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="relative z-10 mt-5">
            <button
              onClick={() => navigate(isAdmin ? "/jobs/create" : "/jobs")}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5
                         cursor-pointer transition active:scale-[0.97]
                         bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white
                         shadow-[0_4px_24px_-2px_rgba(245,158,11,0.5)] border border-amber-400/30"
            >
              {isAdmin ? <Plus className="w-4 h-4 stroke-[2.5]" /> : <Wrench className="w-4 h-4 stroke-[2.5]" />}
              {isAdmin ? "New Vehicle Intake" : "My Assigned Tasks"}
            </button>
          </div>
        </section>

        {/* ── 4. STATS 4-GRID (Clean Modern Micro-Cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active", value: activeCount, icon: <Car className="w-4 h-4" />, iconBg: "bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
            { label: "Done Today", value: totalDone, icon: <CheckCircle2 className="w-4 h-4" />, iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
            { label: "QA Pending", value: qaCount, icon: <ShieldCheck className="w-4 h-4" />, iconBg: "bg-purple-500/15", iconColor: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
            { label: "Velocity", value: velocity, suffix: "%", icon: <TrendingUp className="w-4 h-4" />, iconBg: "bg-sky-500/15", iconColor: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
          ].map(s => (
            <div
              key={s.label}
              className={`${modernCard} p-4 flex flex-col justify-between min-h-[105px]`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.iconBg} ${s.iconColor}`}>
                  {s.icon}
                </div>
                <span className={`w-2 h-2 rounded-full ${s.dot} opacity-70`} />
              </div>
              <div className="pt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  <NumberTicker value={s.value} />{s.suffix}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 5. BENTO OPERATIONS HUB (Modular Japanese Bento Grid) ── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Operations Hub
            </h2>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">Bento Matrix</span>
          </div>

          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            style={{ gridAutoRows: "minmax(145px,auto)" }}
          >

            {/* Tile 1: QA Sign-Off (2 cols) */}
            <div
              onClick={() => navigate("/jobs", { state: { view: "verify" } })}
              className={`col-span-2 md:col-span-2 ${modernCard} p-5 flex flex-col justify-between
                          hover:border-purple-400/50 dark:hover:border-purple-400/40`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">QA Sign-Off</p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Supervisor inspection</p>
                  </div>
                </div>

                {qaCount > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-purple-500 text-white animate-pulse shadow-sm">
                    {qaCount} Ready
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    All Passed
                  </span>
                )}
              </div>

              {/* Interactive preview indicators */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Mechanical
                </span>
                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Cosmetic
                </span>
                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Delivery Sign
                </span>
                <ArrowUpRight className="w-4 h-4 text-purple-500 ml-auto" />
              </div>
            </div>

            {/* Tile 2: Leaderboard (1 col) */}
            <div
              onClick={() => navigate("/leaderboard")}
              className={`col-span-1 md:col-span-1 ${modernCard} p-4 flex flex-col justify-between
                          hover:border-amber-400/50 dark:hover:border-amber-400/40`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  {topScore} QP
                </span>
              </div>
              <div className="pt-2">
                <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">Leaderboard</p>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  🏆 #{1} {topTech?.name?.split(" ")[0] || "Technician"}
                </p>
              </div>
            </div>

            {/* Tile 3: Work Activity Logs (1 col) */}
            <div
              onClick={() => navigate("/work-logs")}
              className={`col-span-1 md:col-span-1 ${modernCard} p-4 flex flex-col justify-between
                          hover:border-rose-400/50 dark:hover:border-rose-400/40`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black bg-rose-500/15 text-rose-700 dark:text-rose-400">
                  {totalDone} Logged
                </span>
              </div>
              <div className="pt-2">
                <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">Work Logs</p>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  Live task activity
                </p>
              </div>
            </div>

            {/* Tile 4: Inventory (2 cols) */}
            <div
              onClick={() => navigate("/inventory")}
              className={`col-span-2 md:col-span-2 ${modernCard} p-5 flex flex-col justify-between
                          hover:border-sky-400/50 dark:hover:border-sky-400/40`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-500/15 text-sky-600 dark:text-sky-400 shadow-xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">Parts Inventory</p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Catalog & stock levels</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-sky-500/15 text-sky-700 dark:text-sky-400">
                  {catalogCount} items
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Spares
                </span>
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Consumables
                </span>
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Supplies
                </span>
                <ArrowUpRight className="w-4 h-4 text-sky-500 ml-auto" />
              </div>
            </div>

            {/* Tile 5: Vehicle Archives (2 cols) */}
            <div
              onClick={() => navigate("/jobs", { state: { view: "all" } })}
              className={`col-span-2 md:col-span-2 ${modernCard} p-5 flex flex-col justify-between
                          hover:border-teal-400/50 dark:hover:border-teal-400/40`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/15 text-teal-600 dark:text-teal-400 shadow-xs">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">Lifetime Archives</p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Service histories & bills</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-teal-500/15 text-teal-700 dark:text-teal-400">
                  {totalCount} vehicles
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Past Invoices
                </span>
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Customer History
                </span>
                <ArrowUpRight className="w-4 h-4 text-teal-500 ml-auto" />
              </div>
            </div>

          </div>
        </section>

        {/* ── 6. ADMIN CONTROL TILES ── */}
        {isAdmin && (
          <section>
            <h2 className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest mb-3 text-slate-400 dark:text-slate-500">
              <Clock className="w-3 h-3 text-amber-500" />
              Admin Controls
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Staff Roster", sub: `${totalUsers} mechanics registered`, icon: <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-500/15", path: "/admin/users", hover: "hover:border-amber-400/50 dark:hover:border-amber-400/30" },
                { label: "Approvals", sub: pendingWorkers > 0 ? `${pendingWorkers} pending requests` : "All cleared", icon: <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />, bg: "bg-rose-500/15", path: "/admin/approvals", hover: "hover:border-rose-400/50 dark:hover:border-rose-400/30" },
              ].map(a => (
                <div
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className={`${modernCard} p-4 flex items-center gap-3.5 ${a.hover}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${a.bg}`}>
                    {a.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">{a.label}</p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">{a.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto shrink-0" />
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};