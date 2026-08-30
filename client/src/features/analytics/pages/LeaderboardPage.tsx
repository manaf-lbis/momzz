import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Crown,
  Flame,
  Trophy,
  Star,
  Clock,
  Sparkles,
  X,
  CheckCircle,
  Users,
  Calendar,
  ChevronRight,
  Car,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useGetLeaderboardQuery } from '../../auth/api/authApi';
import { useGetJobCardsQuery, JobCardData, TaskItem } from '../../jobs/api/jobApi';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import confetti from 'canvas-confetti';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { LeaderboardSkeleton } from '../../../shared/components/common/PageShimmer';

type Timeframe = 'day' | 'week' | 'month' | 'year' | 'all';

interface LeaderboardUser {
  id: string;
  name: string;
  mobile?: string;
  role?: string;
  profileImageUrl?: string;
  points: number;
}

interface TaskHistoryItem {
  taskId: string;
  taskTitle: string;
  vehicleName: string;
  vehicleNumber: string;
  completedAt: string;
  points: number; // exact decimal
  isShared: boolean;
  partnerNames: string[];
}

// ─── Confetti pop ───────────────────────────────────────────────────────────
const firePop = () => {
  try {
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.4 },
      colors: ['#fbbf24', '#fef08a', '#f59e0b', '#ffffff', '#34d399', '#60a5fa'],
      ticks: 220,
      gravity: 1.0,
      scalar: 1.0,
      disableForReducedMotion: true,
    });
  } catch (_) {}
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Returns exactly 1-decimal string: "31.2", "5.0", "0.5" */
const fmtPts = (n: number) => {
  const fixed = parseFloat(n.toFixed(1));
  return fixed % 1 === 0 ? fixed.toFixed(1) : fixed.toString();
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar: React.FC<{
  name: string;
  imageUrl?: string;
  size: number;
  rank: number;
  className?: string;
}> = ({ name, imageUrl, size, rank, className = '' }) => {
  const ring =
    rank === 1
      ? 'ring-2 ring-amber-400 shadow-[0_0_20px_4px_rgba(251,191,36,0.4)]'
      : rank === 2
      ? 'ring-2 ring-slate-300/60'
      : rank === 3
      ? 'ring-2 ring-amber-600/70'
      : 'ring-[1px] ring-white/10';

  const fontSize = size >= 76 ? 'text-xl' : size >= 56 ? 'text-base' : size >= 42 ? 'text-sm' : 'text-xs';

  return (
    <div
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={`rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-black text-white ${ring} ${className}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className={fontSize}>{getInitials(name)}</span>
      )}
    </div>
  );
};

// ─── Rank crown/medal for podium ─────────────────────────────────────────────
const PodiumIcon: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1)
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-500/40">
        <Crown className="w-4 h-4 fill-current" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 flex items-center justify-center shadow text-xs font-black">
        2
      </div>
    );
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center shadow text-xs font-black">
      3
    </div>
  );
};

// ─── Task History Modal with Infinite Scroll ─────────────────────────────────
const PAGE_SIZE = 20;

const TaskHistoryPanel: React.FC<{
  user: LeaderboardUser;
  allJobs: JobCardData[];
  startTimestamp: number;
  endTimestamp: number;
  timeframe: Timeframe;
  usersMap: Record<string, LeaderboardUser>;
  onClose: () => void;
}> = ({ user, allJobs, startTimestamp, endTimestamp, timeframe, usersMap, onClose }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Build full task history for this user within timeframe
  const history: TaskHistoryItem[] = useMemo(() => {
    const items: TaskHistoryItem[] = [];
    allJobs.forEach((job) => {
      (job.tasks || []).forEach((t: TaskItem) => {
        if (t.status !== 'COMPLETED' || !t.completedAt) return;

        const ts = new Date(t.completedAt).getTime();

        // For 'all' timeframe, no date filter
        if (timeframe !== 'all' && (ts < startTimestamp || ts > endTimestamp)) return;

        const primaryId = t.completedBy
          ? String((t.completedBy as any).id || (t.completedBy as any)._id || t.completedBy || '')
          : '';
        const primaryName = t.completedBy && typeof t.completedBy === 'object'
          ? (t.completedBy as any).name || 'Mechanic'
          : (usersMap[primaryId]?.name || 'Mechanic');

        const partners = (t.partners || [])
          .map((p: any) => {
            const pid = String(p?.id || p?._id || p || '');
            const pname = typeof p === 'object' && p?.name
              ? p.name
              : (usersMap[pid]?.name || 'Co-worker');
            return { id: pid, name: pname };
          })
          .filter((p) => Boolean(p.id));

        const partnerIds = partners.map((p) => p.id);
        const allWorkerIds = Array.from(new Set([primaryId, ...partnerIds].filter(Boolean)));

        const isInvolved = allWorkerIds.includes(user.id);
        if (!isInvolved) return;

        const isShared = Boolean((t.isShared || partnerIds.length > 0) && partnerIds.length > 0);
        const workerCount = isShared && allWorkerIds.length > 0 ? allWorkerIds.length : 1;
        const pts = 1 / workerCount;

        // When current user is primary, other workers are the partners.
        // When current user is a partner, other workers include primary + other partners.
        const otherWorkers: string[] = [];
        if (primaryId && primaryId !== user.id) {
          otherWorkers.push(primaryName);
        }
        partners.forEach((p) => {
          if (p.id !== user.id && p.id !== primaryId) {
            otherWorkers.push(p.name);
          }
        });

        items.push({
          taskId: String(t.id || t._id || ''),
          taskTitle: t.title || 'Task',
          vehicleName: job.vehicleName || 'Vehicle',
          vehicleNumber: job.vehicleNumber || '',
          completedAt: t.completedAt,
          points: pts,
          isShared,
          partnerNames: otherWorkers,
        });
      });
    });

    // Sort newest first
    return items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [user.id, allJobs, startTimestamp, endTimestamp, timeframe, usersMap]);

  const totalPoints = useMemo(() => history.reduce((sum, i) => sum + i.points, 0), [history]);
  const visible = history.slice(0, visibleCount);
  const hasMore = visibleCount < history.length;

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, visibleCount]);

  const periodLabel =
    timeframe === 'day' ? 'Today' :
    timeframe === 'week' ? 'This Week' :
    timeframe === 'month' ? 'This Month' :
    timeframe === 'year' ? 'This Year' : 'All Time';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Panel — bottom sheet on mobile, centered modal on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative w-full sm:max-w-lg sm:rounded-[28px] rounded-t-[28px] bg-[#0f0f1e] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <BorderBeam size={220} duration={7} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={1} />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <Avatar name={user.name} imageUrl={user.profileImageUrl} size={44} rank={0} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-black text-white truncate">{user.name}</h3>
            <p className="text-[11px] font-mono text-slate-400">{user.role || 'Mechanic'} · {periodLabel}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-black font-mono text-amber-400">{fmtPts(totalPoints)}</div>
            <div className="text-[9px] font-mono text-slate-500 uppercase">Total QP</div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06] shrink-0">
          {[
            { label: 'Tasks Done', value: history.length },
            { label: 'Solo Tasks', value: history.filter((i) => !i.isShared).length },
            { label: 'Shared Tasks', value: history.filter((i) => i.isShared).length },
          ].map(({ label, value }) => (
            <div key={label} className="py-3 text-center">
              <p className="text-[17px] font-black text-white">{value}</p>
              <p className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Scrollable task list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CheckCircle className="w-8 h-8 text-slate-700" />
              <p className="text-sm text-slate-500">No completed tasks this period.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] px-1">
              {visible.map((item, idx) => (
                <motion.div
                  key={item.taskId + idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  className="flex items-start gap-3 px-4 py-3.5"
                >
                  {/* Left: point badge */}
                  <div className={`mt-0.5 px-2 py-1 rounded-lg text-center shrink-0 ${
                    item.isShared
                      ? 'bg-violet-500/15 border border-violet-500/25'
                      : 'bg-amber-400/10 border border-amber-400/20'
                  }`}>
                    <p className={`text-[13px] font-black font-mono leading-none ${
                      item.isShared ? 'text-violet-300' : 'text-amber-400'
                    }`}>
                      {fmtPts(item.points)}
                    </p>
                    <p className={`text-[8px] font-mono uppercase mt-0.5 ${
                      item.isShared ? 'text-violet-400/70' : 'text-amber-500/70'
                    }`}>QP</p>
                  </div>

                  {/* Right: task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-100 truncate">{item.taskTitle}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Car className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-400 truncate">
                        {item.vehicleName}
                        {item.vehicleNumber ? ` · ${item.vehicleNumber}` : ''}
                      </span>
                    </div>
                    {item.isShared && item.partnerNames.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-violet-400 shrink-0" />
                        <span className="text-[10px] text-violet-300 truncate">
                          with {item.partnerNames.slice(0, 2).join(', ')}
                          {item.partnerNames.length > 2 ? ` +${item.partnerNames.length - 2}` : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="text-[10px] font-mono text-slate-500">{fmtDate(item.completedAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="py-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!hasMore && history.length > 0 && (
                <div className="py-5 text-center text-[10px] font-mono text-slate-600">
                  All {history.length} tasks shown
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } = useGetLeaderboardQuery();
  const { data: jobsResponse, isLoading: isJobsLoading } = useGetJobCardsQuery({ limit: 500 });

  const rawLeaderboard = leaderboardResponse?.data || [];
  const usersMap: Record<string, LeaderboardUser> = useMemo(() => {
    const map: Record<string, LeaderboardUser> = {};
    rawLeaderboard.forEach((u: any) => {
      const uid = String(u.id || u._id);
      map[uid] = {
        id: uid,
        name: u.name || 'Technician',
        mobile: u.mobile,
        role: u.role || 'MECHANIC',
        profileImageUrl: u.profileImageUrl,
        points: Number(u.taskCount || 0),
      };
    });
    return map;
  }, [rawLeaderboard]);

  const allJobs: JobCardData[] = useMemo(() => {
    if (!jobsResponse?.data) return [];
    if (Array.isArray(jobsResponse.data)) return jobsResponse.data;
    if ((jobsResponse.data as any).jobs) return (jobsResponse.data as any).jobs;
    return [];
  }, [jobsResponse]);

  // ─── Precise timeframe boundaries ────────────────────────────────────────
  // Day:   00:00:00.000  →  23:59:59.999 (local)
  // Week:  Monday 00:00  →  Saturday 23:59:59.999 (local)
  // Month: 1st 00:00     →  last day 23:59:59.999 (local)
  // Year:  Jan 1 00:00   →  Dec 31 23:59:59.999 (local)
  const { startTimestamp, endTimestamp, timeLabel, timeRemaining } = useMemo(() => {
    const now = new Date();
    const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();

    if (timeframe === 'day') {
      const start = new Date(Y, M, D, 0, 0, 0, 0).getTime();
      const end   = new Date(Y, M, D, 23, 59, 59, 999).getTime();
      const diff  = Math.max(0, end - now.getTime());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      return { startTimestamp: start, endTimestamp: end, timeLabel: "Today's Sprint", timeRemaining: `${h}h ${m}m left` };
    }

    if (timeframe === 'week') {
      // Monday = day 1, Saturday = day 6
      const dow = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
      const daysFromMonday = dow === 0 ? 6 : dow - 1; // days since Monday
      const monday   = new Date(Y, M, D - daysFromMonday, 0, 0, 0, 0);
      const saturday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5, 23, 59, 59, 999);
      const diff = Math.max(0, saturday.getTime() - now.getTime());
      const days = Math.floor(diff / 86_400_000);
      const hrs  = Math.floor((diff % 86_400_000) / 3_600_000);
      return { startTimestamp: monday.getTime(), endTimestamp: saturday.getTime(), timeLabel: 'This Week', timeRemaining: `${days}d ${hrs}h left` };
    }

    if (timeframe === 'month') {
      const start = new Date(Y, M, 1, 0, 0, 0, 0).getTime();
      // Last day of month: day 0 of next month
      const end   = new Date(Y, M + 1, 0, 23, 59, 59, 999).getTime();
      const diff  = Math.max(0, end - now.getTime());
      const days  = Math.floor(diff / 86_400_000);
      return { startTimestamp: start, endTimestamp: end, timeLabel: now.toLocaleString('default', { month: 'long' }), timeRemaining: `${days}d left` };
    }

    if (timeframe === 'year') {
      const start = new Date(Y, 0, 1, 0, 0, 0, 0).getTime();
      const end   = new Date(Y, 11, 31, 23, 59, 59, 999).getTime();
      const diff  = Math.max(0, end - now.getTime());
      const days  = Math.floor(diff / 86_400_000);
      return { startTimestamp: start, endTimestamp: end, timeLabel: `Year ${Y}`, timeRemaining: `${days}d left` };
    }

    // all
    return { startTimestamp: 0, endTimestamp: Infinity, timeLabel: 'All Time', timeRemaining: 'Hall of Fame' };
  }, [timeframe]);

  // ─── Point calculation ───────────────────────────────────────────────────
  // Rules:
  //   • Solo completed task  → 1.0 QP for completedBy
  //   • Shared task (isShared=true or partners exist) → 1.0 / total_workers QP each
  //   • All-time mode uses rawLeaderboard taskCount (server-computed across full database)
  //   • Values stored as exact floats, displayed to 1 decimal
  const rankedUsers: LeaderboardUser[] = useMemo(() => {
    if (timeframe === 'all' && rawLeaderboard.length > 0) {
      return [...rawLeaderboard]
        .map((u: any) => ({
          id: String(u.id || u._id),
          name: u.name || 'Technician',
          mobile: u.mobile,
          role: u.role || 'MECHANIC',
          profileImageUrl: u.profileImageUrl,
          // Server gives float taskCount with full shared points included
          points: Number(u.taskCount || 0),
        }))
        .sort((a, b) => b.points - a.points);
    }

    // Build zero map
    const map: Record<string, { name: string; profileImageUrl?: string; role?: string; mobile?: string; points: number }> = {};
    rawLeaderboard.forEach((u: any) => {
      const uid = String(u.id || u._id);
      map[uid] = { name: u.name, profileImageUrl: u.profileImageUrl, role: u.role, mobile: u.mobile, points: 0 };
    });

    allJobs.forEach((job) => {
      (job.tasks || []).forEach((t: TaskItem) => {
        if (t.status !== 'COMPLETED' || !t.completedAt) return;

        const ts = new Date(t.completedAt).getTime();
        if (ts < startTimestamp || ts > endTimestamp) return;

        const primaryId = t.completedBy
          ? String((t.completedBy as any).id || (t.completedBy as any)._id || t.completedBy || '')
          : '';
        const partnerIds = (t.partners || [])
          .map((p: any) => String(p?.id || p?._id || p || ''))
          .filter(Boolean);

        const isShared = Boolean((t.isShared || partnerIds.length > 0) && partnerIds.length > 0);

        if (isShared) {
          // Unique worker set (primary + partners), no duplicates
          const allIds = Array.from(new Set([primaryId, ...partnerIds].filter(Boolean)));
          if (allIds.length > 0) {
            const ptsEach = 1 / allIds.length; // exact fractional share
            allIds.forEach((wid) => {
              if (wid && map[wid]) {
                map[wid].points += ptsEach;
              }
            });
          }
        } else if (primaryId && map[primaryId]) {
          map[primaryId].points += 1;
        }
      });
    });

    return Object.entries(map)
      .map(([id, d]) => ({
        id,
        name: d.name || 'Technician',
        mobile: d.mobile,
        role: d.role || 'MECHANIC',
        profileImageUrl: d.profileImageUrl,
        // Keep full precision for sorting; round only for display
        points: d.points,
      }))
      .sort((a, b) => b.points - a.points);
  }, [timeframe, rawLeaderboard, allJobs, startTimestamp, endTimestamp]);

  const currentUserId = String(user?.id || (user as any)?._id || '');
  const currentUserIdx = rankedUsers.findIndex(
    (u) => u.id === currentUserId || (user?.mobile && u.mobile === user.mobile)
  );
  const currentUserRank   = currentUserIdx !== -1 ? currentUserIdx + 1 : null;
  const currentUserPoints = currentUserIdx !== -1 ? rankedUsers[currentUserIdx].points : 0;
  const maxPoints         = Math.max(1, rankedUsers[0]?.points || 1);

  useEffect(() => {
    if (!isLeaderboardLoading && rankedUsers.length > 0) {
      const t = setTimeout(firePop, 400);
      return () => clearTimeout(t);
    }
  }, [isLeaderboardLoading]);

  const motivationText = useMemo(() => {
    if (!currentUserRank) return 'Complete tasks to enter the rankings';
    if (currentUserRank === 1) {
      const runnerUp = rankedUsers[1];
      const gap = runnerUp ? currentUserPoints - runnerUp.points : 0;
      return gap > 0 ? `👑 Leading by +${fmtPts(gap)} QP` : '👑 You are leading the workshop!';
    }
    const ahead = rankedUsers[currentUserRank - 2];
    const gap   = ahead ? ahead.points - currentUserPoints : 0;
    if (currentUserRank <= 3) return `🔥 ${fmtPts(gap)} QP to reach #${currentUserRank - 1}`;
    return `⚡ ${fmtPts(gap)} QP to overtake #${currentUserRank - 1}`;
  }, [currentUserRank, currentUserPoints, rankedUsers]);

  const rank1 = rankedUsers[0];
  const rank2 = rankedUsers[1];
  const rank3 = rankedUsers[2];
  const rest  = rankedUsers.slice(3);

  const TABS: { key: Timeframe; label: string }[] = [
    { key: 'day',   label: 'Day'   },
    { key: 'week',  label: 'Week'  },
    { key: 'month', label: 'Month' },
    { key: 'year',  label: 'Year'  },
    { key: 'all',   label: 'All'   },
  ];

  const isLoading = isLeaderboardLoading || isJobsLoading;

  const openUser = (u: LeaderboardUser) => {
    firePop();
    setSelectedUser(u);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/30 transition-colors duration-200">
      {/* ── Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[300px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
        <Meteors number={12} />
      </div>

      <Navbar glass />

      {/* ── Page content ── */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-32">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0 shadow-xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">Leaderboard</h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              {timeLabel}
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0 shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            {timeRemaining}
          </div>
        </div>

        {/* ── TIMEFRAME TABS ── */}
        <div className="flex gap-1 p-1 bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 mb-4 sm:mb-5 shadow-xs">
          {TABS.map(({ key, label }) => {
            const isActive = timeframe === key;
            return (
              <button
                key={key}
                onClick={() => { setTimeframe(key); firePop(); }}
                className={`relative flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-slate-950 font-black' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-xl shadow-md shadow-amber-500/25"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── YOUR STANDING ── */}
        <motion.div
          key={`standing-${timeframe}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl p-4 sm:p-5 mb-5 shadow-sm dark:shadow-xl dark:shadow-black/50"
        >
          <BorderBeam size={180} duration={7} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-md shadow-amber-400/20">
              {currentUserRank ? `#${currentUserRank}` : '—'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {user?.name || 'You'}{' '}
                <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">(you)</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono">{motivationText}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg sm:text-2xl font-black font-mono text-amber-500 dark:text-amber-400 leading-none">
                {fmtPts(currentUserPoints)}
              </div>
              <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 font-bold">QP Points</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <LeaderboardSkeleton />
        ) : rankedUsers.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm font-mono">No data for this period.</div>
        ) : (
          /* ── MAIN CONTENT: side-by-side on large screens ── */
          <div className="lg:grid lg:grid-cols-5 lg:gap-6 space-y-4 lg:space-y-0">

            {/* ── LEFT COL (lg:2/5): PODIUM ── */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="relative overflow-hidden rounded-3xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl dark:shadow-black/50 pt-10 pb-6 px-4 sm:px-6 lg:px-5 h-full"
              >
                <BorderBeam size={280} duration={12} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={1} />

                {/* Label */}
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest whitespace-nowrap">
                    <Trophy className="w-3.5 h-3.5" /> Podium
                  </span>
                </div>

                {/* Gold glow behind #1 */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

                {/* 2 · 1 · 3 */}
                <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
                  {/* #2 Silver */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => rank2 && openUser(rank2)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center group-hover:text-amber-500 transition max-w-[80px] mx-auto">
                      {rank2?.name || '—'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {rank2 ? fmtPts(rank2.points) + ' QP' : '—'}
                    </p>
                    <div className="relative">
                      <Avatar name={rank2?.name || ''} imageUrl={rank2?.profileImageUrl} size={58} rank={2} className="group-hover:scale-105 transition-transform" />
                      <div className="absolute -bottom-1.5 -right-1.5"><PodiumIcon rank={2} /></div>
                    </div>
                    {/* Silver bar */}
                    <div className="w-full h-14 sm:h-16 lg:h-20 rounded-t-2xl bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/50 border border-slate-300 dark:border-slate-600/40 border-b-0 flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">2nd</span>
                    </div>
                  </motion.button>

                  {/* #1 Gold */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => rank1 && openUser(rank1)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group z-10"
                  >
                    <p className="text-[13px] sm:text-sm font-black text-slate-900 dark:text-white truncate w-full text-center group-hover:text-amber-500 dark:group-hover:text-amber-300 transition max-w-[90px] mx-auto">
                      {rank1?.name || '—'}
                    </p>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-mono font-black text-amber-500 dark:text-amber-400">
                        {rank1 ? fmtPts(rank1.points) + ' QP' : '—'}
                      </span>
                    </div>
                    <div className="relative">
                      {/* Crown */}
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 z-10"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-400/50 ring-2 ring-amber-300/60">
                          <Crown className="w-5 h-5 fill-current" />
                        </div>
                      </motion.div>
                      <Avatar name={rank1?.name || ''} imageUrl={rank1?.profileImageUrl} size={78} rank={1} className="group-hover:scale-105 transition-transform" />
                      <div className="absolute -bottom-1.5 -right-1.5"><PodiumIcon rank={1} /></div>
                    </div>
                    {/* Gold bar */}
                    <div className="w-full h-24 sm:h-28 lg:h-32 rounded-t-2xl bg-gradient-to-t from-amber-400/25 to-amber-400/10 border border-amber-400/40 border-b-0 flex items-center justify-center">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">1st</span>
                    </div>
                  </motion.button>

                  {/* #3 Bronze */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => rank3 && openUser(rank3)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center group-hover:text-amber-500 transition max-w-[80px] mx-auto">
                      {rank3?.name || '—'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {rank3 ? fmtPts(rank3.points) + ' QP' : '—'}
                    </p>
                    <div className="relative">
                      <Avatar name={rank3?.name || ''} imageUrl={rank3?.profileImageUrl} size={50} rank={3} className="group-hover:scale-105 transition-transform" />
                      <div className="absolute -bottom-1.5 -right-1.5"><PodiumIcon rank={3} /></div>
                    </div>
                    {/* Bronze bar */}
                    <div className="w-full h-9 sm:h-11 lg:h-14 rounded-t-2xl bg-gradient-to-t from-amber-800/25 to-amber-700/10 border border-amber-600/40 border-b-0 flex items-center justify-center">
                      <span className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider">3rd</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* ── RIGHT COL (lg:3/5): RANKINGS LIST ── */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl shadow-sm dark:shadow-xl dark:shadow-black/50 h-full p-4 sm:p-5 space-y-2"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    Full Standings
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">{rankedUsers.length} mechanics</span>
                </div>

                {/* Top 3 compact rows on the right side (lg only) */}
                <div className="hidden lg:block border-b border-white/[0.06]">
                  {[rank1, rank2, rank3].map((u, i) => {
                    if (!u) return null;
                    const rank = i + 1;
                    const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);
                    const pct  = Math.max(4, (u.points / maxPoints) * 100);
                    return (
                      <button
                        key={u.id}
                        onClick={() => openUser(u)}
                        className={`w-full flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0 text-left transition cursor-pointer ${
                          isMe ? 'bg-amber-400/8' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <PodiumIcon rank={rank} />
                        <Avatar name={u.name} imageUrl={u.profileImageUrl} size={34} rank={rank} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isMe ? 'text-amber-300' : 'text-slate-100'}`}>
                            {u.name} {isMe && <span className="text-[10px] font-mono text-amber-400/70">(you)</span>}
                          </p>
                          <div className="mt-1 h-[2px] w-full rounded-full bg-white/5 overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black font-mono ${isMe ? 'text-amber-300' : 'text-white'}`}>{fmtPts(u.points)}</span>
                          <p className="text-[9px] font-mono text-slate-500 uppercase">QP</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>

                {/* Rest (#4+) */}
                <div className="divide-y divide-white/[0.04]">
                  {rest.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500 font-mono">
                      No additional mechanics this period.
                    </div>
                  ) : (
                    rest.map((u, idx) => {
                      const rank = idx + 4;
                      const isMe = u.id === currentUserId || (user?.mobile && u.mobile === user.mobile);
                      const pct  = Math.max(4, (u.points / maxPoints) * 100);
                      const isTopTen = rank <= 10;
                      return (
                        <motion.button
                          key={`${u.id}-${timeframe}`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(idx * 0.025, 0.4) }}
                          onClick={() => openUser(u)}
                          className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition cursor-pointer ${
                            isMe ? 'bg-amber-400/8' : 'hover:bg-white/[0.04] active:bg-white/[0.06]'
                          }`}
                        >
                          {/* Rank */}
                          <div className="w-8 text-center shrink-0">
                            <span className={`text-xs font-black font-mono ${
                              isTopTen ? 'text-amber-400/70' : 'text-slate-600'
                            }`}>
                              #{rank}
                            </span>
                          </div>

                          {/* Avatar */}
                          <Avatar
                            name={u.name}
                            imageUrl={u.profileImageUrl}
                            size={isTopTen ? 40 : 36}
                            rank={rank}
                          />

                          {/* Name + bar */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-[13px] sm:text-sm font-bold truncate ${isMe ? 'text-amber-300' : 'text-slate-100'}`}>
                                {u.name}
                              </p>
                              {isMe && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 h-[2px] w-full rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.1 + idx * 0.02, duration: 0.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                  isMe ? 'bg-amber-400' :
                                  isTopTen ? 'bg-gradient-to-r from-blue-400 to-violet-400' :
                                  'bg-white/15'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Points */}
                          <div className="shrink-0 text-right">
                            <span className={`text-sm font-black font-mono ${isMe ? 'text-amber-300' : 'text-slate-200'}`}>
                              {fmtPts(u.points)}
                            </span>
                            <p className="text-[9px] font-mono text-slate-500 uppercase">QP</p>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>

      {/* ── TASK HISTORY PANEL ── */}
      <AnimatePresence>
        {selectedUser && (
          <TaskHistoryPanel
            user={selectedUser}
            allJobs={allJobs}
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            timeframe={timeframe}
            usersMap={usersMap}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
