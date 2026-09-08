import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Car,
  CheckCircle2,
  ChevronLeft,
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
  Pin,
  Globe,
  User,
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
import { BorderBeam } from "../../../shared/components/magicui/BorderBeam";

export const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const currentUserId = user?.id || (user as any)?._id;
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(isCompletionSoundEnabled());
  const [heroSlide, setHeroSlide] = useState(0);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [isPinnedHovered, setIsPinnedHovered] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isCarouselHovered) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 4);
    }, 5500);
    return () => clearInterval(interval);
  }, [isCarouselHovered]);

  const isMatchingUserId = (p: any, targetId: any): boolean => {
    if (!p || !targetId) return false;
    const pStr = typeof p === 'string'
      ? p
      : p?._id
      ? p._id.toString()
      : p?.id
      ? p.id.toString()
      : p.toString();
    const targetStr = typeof targetId === 'string'
      ? targetId
      : targetId?._id
      ? targetId._id.toString()
      : targetId?.id
      ? targetId.id.toString()
      : targetId.toString();
    return pStr.trim().toLowerCase() === targetStr.trim().toLowerCase();
  };

  const { data: jobsRes, isLoading } = useGetJobCardsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: statsRes }           = useGetJobStatsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: pendingRes }         = useGetPendingWorkersQuery(undefined, { skip: !isAdmin });
  const { data: usersRes }           = useGetAllUsersQuery(undefined,       { skip: !isAdmin });
  const { data: lbRes }              = useGetLeaderboardQuery();
  const { data: catalogRes }         = useGetCatalogQuery();

  const allJobs: JobCardData[] = Array.isArray(jobsRes?.data)
    ? (jobsRes!.data as unknown as JobCardData[])
    : ((jobsRes?.data as any)?.jobs || []);

  const pinnedJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const isPinnedForAll = Boolean(job.isPinnedForAll);
      const isPinnedForMe =
        Array.isArray(job.pinnedBy) &&
        job.pinnedBy.some((p: any) => isMatchingUserId(p, currentUserId));
      const isPinned = Boolean((job as any).isPinned);
      return isPinnedForAll || isPinnedForMe || isPinned;
    });
  }, [allJobs, currentUserId]);

  const handleNextPinned = useCallback(() => {
    if (pinnedJobs.length <= 1) return;
    setSwipeDirection('left');
    setPinnedIndex((prev) => (prev + 1) % pinnedJobs.length);
  }, [pinnedJobs.length]);

  const handlePrevPinned = useCallback(() => {
    if (pinnedJobs.length <= 1) return;
    setSwipeDirection('right');
    setPinnedIndex((prev) => (prev === 0 ? pinnedJobs.length - 1 : prev - 1));
  }, [pinnedJobs.length]);

  useEffect(() => {
    if (pinnedJobs.length <= 1 || isPinnedHovered) return;
    const interval = setInterval(() => {
      handleNextPinned();
    }, 4500);
    return () => clearInterval(interval);
  }, [pinnedJobs.length, isPinnedHovered, handleNextPinned]);

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
        <main className="app-container flex-1 py-6 pb-32">
          <DashboardBentoSkeleton />
        </main>
      </div>
    );
  }

  /* Universal clean frosted glass card matching No vehicles found empty card */
  const modernCard = "glass-modern-card rounded-2xl overflow-hidden cursor-pointer active:scale-[0.985]";

  return (
    <div className="relative min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col overflow-x-clip transition-colors duration-300 font-sans">

      {/* ── Fluid Organic Wave Canvas Background ── */}
      <FluidCanvasBackground />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 pt-5 pb-32 md:pb-16 flex flex-col gap-4">

        {/* ── 1. HEADER (Profile Greeting + Controls) ── */}
        <header className="sticky top-0 sm:top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-5 pt-3 pb-3 mb-1 backdrop-blur-2xl bg-white/85 dark:bg-[#070812]/85 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs transition-all">
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
                     glass-modern-card rounded-2xl shadow-xs hover:shadow-md hover:border-amber-400/50 dark:hover:border-amber-500/30"
        >
          <Search className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="text-[13px] font-mono flex-1 truncate text-slate-400 dark:text-slate-500">
            Search vehicles, plates, jobs, customers…
          </span>
          <kbd className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-lg font-mono bg-black/5 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500 border border-black/5 dark:border-white/[0.08]">
            ⌘K
          </kbd>
        </button>

        {/* ── 3. PINNED PRIORITY VEHICLE (Top Spotlight with Swipe Gestures) ── */}
        <section
          onMouseEnter={() => setIsPinnedHovered(true)}
          onMouseLeave={() => setIsPinnedHovered(false)}
        >
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
                Priority Vehicle
              </h2>
              {pinnedJobs.length > 1 && (
                <div className="flex items-center gap-1.5 ml-1">
                  {/* Slide Indicators */}
                  <div className="flex items-center gap-1 mr-1">
                    {pinnedJobs.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSwipeDirection(idx > pinnedIndex ? 'left' : 'right');
                          setPinnedIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          pinnedIndex === idx
                            ? "w-5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                            : "w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40"
                        }`}
                        aria-label={`Go to pinned vehicle ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPinned();
                    }}
                    className="w-5 h-5 rounded-md flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition cursor-pointer active:scale-90"
                    title="Previous Pinned Vehicle"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPinned();
                    }}
                    className="w-5 h-5 rounded-md flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition cursor-pointer active:scale-90"
                    title="Next Pinned Vehicle"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>

                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline ml-1">
                    Swipe left/right
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/jobs')}
              className="text-[11px] font-mono text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {pinnedJobs.length > 0 ? (
            (() => {
              const curPinned = pinnedJobs[pinnedIndex % pinnedJobs.length];
              const tasks = curPinned?.tasks || [];
              const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
              const totalJobTasks = tasks.length;
              const jobProgress = totalJobTasks > 0 ? Math.round((completedTasks / totalJobTasks) * 100) : 0;
              const jobId = curPinned.id || curPinned._id;

              const isPinnedForAll = Boolean(curPinned.isPinnedForAll);
              const pinnedArray = Array.isArray(curPinned.pinnedBy) ? curPinned.pinnedBy : [];
              const isPinnedForMe = pinnedArray.some((p: any) => isMatchingUserId(p, currentUserId));

              const pinnerNames: string[] = [];
              if (isPinnedForMe) {
                pinnerNames.push('You');
              }
              pinnedArray.forEach((p: any) => {
                if (!isMatchingUserId(p, currentUserId)) {
                  if (typeof p === 'object' && p?.name) {
                    pinnerNames.push(p.name.split(' ')[0]);
                  }
                }
              });

              let pinnerDisplay = '';
              if (pinnerNames.length > 0) {
                pinnerDisplay = pinnerNames.join(', ');
              } else if (isPinnedForAll) {
                pinnerDisplay = 'Garage Priority';
              } else {
                pinnerDisplay = 'Staff';
              }

              return (
                <div style={{ perspective: 1200 }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`pinned-${jobId}`}
                      drag={pinnedJobs.length > 1 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragStart={() => {
                        isDraggingRef.current = true;
                      }}
                      onDragEnd={(_, info) => {
                        const swipeThreshold = 40;
                        const velocityThreshold = 250;
                        if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                          handleNextPinned();
                        } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                          handlePrevPinned();
                        }
                        setTimeout(() => {
                          isDraggingRef.current = false;
                        }, 100);
                      }}
                      initial={{
                        opacity: 0,
                        x: swipeDirection === 'left' ? 40 : -40,
                        rotateY: swipeDirection === 'left' ? 15 : -15,
                        scale: 0.97,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        rotateY: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        x: swipeDirection === 'left' ? -40 : 40,
                        rotateY: swipeDirection === 'left' ? -15 : 15,
                        scale: 0.97,
                      }}
                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                      style={{ transformStyle: 'preserve-3d', touchAction: 'pan-y' }}
                      onClick={() => {
                        if (!isDraggingRef.current) {
                          navigate(`/jobs/${jobId}`);
                        }
                      }}
                      className={`${modernCard} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-amber-400/50 dark:hover:border-amber-400/40 cursor-grab active:cursor-grabbing select-none`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {curPinned.thumbnailUrl ? (
                          <img
                            src={curPinned.thumbnailUrl}
                            alt=""
                            className="w-10 h-10 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-white/10 pointer-events-none"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs shrink-0 pointer-events-none">
                            <Car className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight truncate">
                              {curPinned.vehicleName}
                            </p>
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-700 dark:text-amber-300">
                              {curPinned.vehicleNumber}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                              {isPinnedForAll ? (
                                <Globe className="w-2.5 h-2.5 text-amber-500" />
                              ) : (
                                <Pin className="w-2.5 h-2.5 text-amber-500 fill-current" />
                              )}
                              <span>{isPinnedForAll ? 'Garage Pin' : 'Personal Pin'}</span>
                            </span>
                          </div>

                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">
                            {pinnerDisplay === 'Garage Priority' ? 'Garage Priority' : `Pinned by ${pinnerDisplay}`} • {curPinned.customerName ? `Client: ${curPinned.customerName}` : 'In Service Bay'}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar & Arrow */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-white/[0.06]">
                        <div className="space-y-1 sm:text-right">
                          <div className="flex items-center sm:justify-end gap-1.5 text-[11px] font-mono">
                            <span className="font-bold text-amber-600 dark:text-amber-400">{jobProgress}%</span>
                            <span className="text-slate-400">({completedTasks}/{totalJobTasks} tasks)</span>
                          </div>
                          <div className="w-28 sm:w-32 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${jobProgress}%` }}
                            />
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              );
            })()
          ) : (
            <div
              onClick={() => navigate('/jobs')}
              className={`${modernCard} p-4 text-center py-5 space-y-1 hover:border-amber-400/50 dark:hover:border-amber-400/40`}
            >
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Pinned Priority Vehicles</p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Pin critical vehicle jobs to monitor them here.
              </p>
            </div>
          )}
        </section>

        {/* ── 4. HERO COMMAND CENTER (Interactive Carousel - Luxury Frosted Head Card / Stats Card) ── */}
        <section
          onMouseEnter={() => setIsCarouselHovered(true)}
          onMouseLeave={() => setIsCarouselHovered(false)}
          className="glass-head-card relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_44px_-8px_rgba(0,0,0,0.7)]"
        >
          {/* Subtle top edge glow reflection */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 dark:via-amber-400/50 to-transparent pointer-events-none" />

          {/* Active border beam */}
          <BorderBeam size={280} duration={8} colorFrom="#f59e0b" colorTo="#fbbf24" borderWidth={1.2} />

          {/* Carousel Header Controls & Slide Indicators */}
          <div className="relative z-10 flex items-center justify-between gap-3 mb-3.5">
            {/* Slide Pagination Dots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    heroSlide === idx
                      ? "w-7 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                      : "w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHeroSlide((prev) => (prev === 0 ? 3 : prev - 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition active:scale-90 cursor-pointer"
                title="Previous Slide"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setHeroSlide((prev) => (prev + 1) % 4)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition active:scale-90 cursor-pointer"
                title="Next Slide"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Carousel Slide Content */}
          <div className="relative z-10 min-h-[145px] flex items-center">
            <AnimatePresence mode="wait">
              {/* Slide 0: Live Garage Flow */}
              {heroSlide === 0 && (
                <motion.div
                  key="slide-0-flow"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Garage Flow
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                        ⚡ {velocity}% Velocity
                      </span>
                    </div>

                    <div className="flex items-end gap-3.5 mb-2.5">
                      <span
                        className="font-black leading-none text-slate-900 dark:text-white tracking-tight"
                        style={{ fontSize: "clamp(44px,10vw,68px)", fontVariantNumeric: "tabular-nums" }}
                      >
                        <NumberTicker value={activeCount} />
                      </span>
                      <div className="pb-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Active Vehicles</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">currently in service bays</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-1 max-w-md">
                      <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-200/80 dark:bg-white/[0.08]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${velocity}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs font-black font-mono shrink-0 text-amber-600 dark:text-amber-400">
                        {velocity}%
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {totalDone} of {totalAllTasks} tasks completed · daily turnover
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col gap-2 shrink-0 w-[130px]">
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{completedCount}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completed</p>
                    </div>
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalCount}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lifetime</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 1: Quality Control & QA */}
              {heroSlide === 1 && (
                <motion.div
                  key="slide-1-qa"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Quality Control & QA
                      </span>
                      {qaCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                          {qaCount} Awaiting Sign-Off
                        </span>
                      )}
                    </div>

                    <div className="flex items-end gap-3.5 mb-2.5">
                      <span
                        className="font-black leading-none text-purple-600 dark:text-purple-400 tracking-tight"
                        style={{ fontSize: "clamp(44px,10vw,68px)", fontVariantNumeric: "tabular-nums" }}
                      >
                        <NumberTicker value={qaCount} />
                      </span>
                      <div className="pb-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">QA Ready Vehicles</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">all tasks complete, ready for manager verify</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                      Ensure 100% inspection accuracy before customer delivery. Instant technician time log stamps and quality audits.
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col gap-2 shrink-0 w-[130px]">
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{qaCount}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">QA Pending</p>
                    </div>
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{totalDone}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Done Today</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 2: Garage Leaderboard */}
              {heroSlide === 2 && (
                <motion.div
                  key="slide-2-lb"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        Garage Leaderboard
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        {totalUsers} Staff Members
                      </span>
                    </div>

                    <div className="flex items-end gap-3.5 mb-2.5">
                      <span
                        className="font-black leading-none text-amber-500 dark:text-amber-400 tracking-tight"
                        style={{ fontSize: "clamp(44px,10vw,68px)", fontVariantNumeric: "tabular-nums" }}
                      >
                        <NumberTicker value={topScore} />
                      </span>
                      <div className="pb-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {topTech ? (topTech as any).name : 'Top Technician'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">leading technician points this month</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                      Recognizing top garage mechanics with live task points, real-time speed bonuses, and technician rankings.
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col gap-2 shrink-0 w-[130px]">
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-amber-500 dark:text-amber-400">{topScore}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Top Points</p>
                    </div>
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{totalUsers}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Staff</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 3: Inventory & Master Catalog */}
              {heroSlide === 3 && (
                <motion.div
                  key="slide-3-inv"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400">
                        <Package className="w-3.5 h-3.5" />
                        Inventory & Services
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        Fast Job Card Sync
                      </span>
                    </div>

                    <div className="flex items-end gap-3.5 mb-2.5">
                      <span
                        className="font-black leading-none text-sky-600 dark:text-sky-400 tracking-tight"
                        style={{ fontSize: "clamp(44px,10vw,68px)", fontVariantNumeric: "tabular-nums" }}
                      >
                        <NumberTicker value={catalogCount} />
                      </span>
                      <div className="pb-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Catalog Items</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">products, parts & labor service items</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                      Instant price calculation, stock depletion warning, and seamless custom checklist addition on any job card.
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col gap-2 shrink-0 w-[130px]">
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{catalogCount}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">In Catalog</p>
                    </div>
                    <div className="px-4 py-3 rounded-2xl text-center backdrop-blur-sm bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/[0.08]">
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{totalCount}</p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jobs Served</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>



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

            {/* Tile 1: Active Vehicles Listing Quick Access (2 cols) */}
            <div
              onClick={() => navigate("/jobs")}
              className={`col-span-2 md:col-span-2 ${modernCard} p-5 flex flex-col justify-between
                          hover:border-amber-400/50 dark:hover:border-amber-400/40`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">Active Vehicles</p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Service bays & queue</p>
                  </div>
                </div>

                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeCount} In Bay
                </span>
              </div>

              {/* Interactive quick filter chips */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                  All Bays
                </span>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                  In Progress
                </span>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                  Work Cards
                </span>
                <ArrowUpRight className="w-4 h-4 text-amber-500 ml-auto" />
              </div>
            </div>

            {/* Tile 2: QA Sign-Off (2 cols) */}
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