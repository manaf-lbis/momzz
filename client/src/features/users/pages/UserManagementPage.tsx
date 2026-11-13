import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageHeader } from '../../../shared/components/common/PageHeader';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import { ModernInfiniteLoader } from '../../../shared/components/common/ModernInfiniteLoader';
import { useGetPaginatedUsersQuery } from '../../auth/api/authApi';
import { User } from '../../auth/store/authSlice';
import {
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

const getUserId = (user: User) => user.id || user._id || '';

const formatLastSeen = (dateString?: string) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Offline';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 2) return 'Active now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

type RoleFilter = 'ALL' | 'ONLINE' | 'ADMIN' | 'WORKER' | 'BLOCKED';

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    adminCount: 0,
    workerCount: 0,
    blockedUsers: 0,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filterKey = `${roleFilter}::${debouncedSearch}`;
  const lastFilterRef = useRef(filterKey);
  useEffect(() => {
    if (lastFilterRef.current !== filterKey) {
      lastFilterRef.current = filterKey;
      setPage(1);
      setUsersList([]);
      setHasMore(false);
    }
  }, [filterKey]);

  const roleParam = roleFilter === 'ADMIN' || roleFilter === 'WORKER' ? roleFilter : undefined;
  const statusParam = roleFilter === 'ONLINE' || roleFilter === 'BLOCKED' ? roleFilter : undefined;

  const { currentData, isLoading, isFetching } = useGetPaginatedUsersQuery({
    page,
    limit: 20,
    q: debouncedSearch || undefined,
    role: roleParam,
    status: statusParam,
  });

  useEffect(() => {
    const resp = currentData?.data;
    if (resp?.stats) {
      const s = resp.stats;
      setStats({
        totalUsers: s.totalUsers || 0,
        onlineUsers: s.onlineUsers || 0,
        adminCount: s.adminCount || 0,
        workerCount:
          s.workerCount !== undefined
            ? s.workerCount
            : Math.max(0, (s.totalUsers || 0) - (s.adminCount || 0)),
        blockedUsers: s.blockedUsers || 0,
      });
    }
    if (!resp?.pagination || resp.pagination.page !== page) return;
    const incoming = resp.users || [];
    setHasMore(Boolean(resp.pagination.hasMore));
    setUsersList((prev) => {
      if (page === 1) return incoming;
      const seen = new Set(prev.map((u) => getUserId(u)));
      return [...prev, ...incoming.filter((u) => !seen.has(getUserId(u)))];
    });
  }, [currentData, page]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || isFetching) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isFetching, usersList.length]);

  return (
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 transition-colors duration-200">
      <div className="glass-ambient-glow" aria-hidden="true" />

      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-36 sm:pb-40 md:pb-16 space-y-4">
        <PageHeader
          backTo="/dashboard"
          title="Staff"
          count={stats.totalUsers}
        />

        {/* Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <div className="p-2.5 sm:p-3 rounded-2xl glass-modern-card flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Total Staff</p>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
            </div>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl glass-modern-card flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Live Active</p>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.onlineUsers}</p>
            </div>
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl glass-modern-card flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Admins</p>
              <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-300">{stats.adminCount}</p>
            </div>
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl glass-modern-card flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Mechanics</p>
              <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-300">{stats.workerCount}</p>
            </div>
            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl glass-modern-input text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1 p-1 bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-hide shadow-2xs">
            {(
              [
                { id: 'ALL', label: `All (${stats.totalUsers})` },
                { id: 'ONLINE', label: `Online (${stats.onlineUsers})` },
                { id: 'ADMIN', label: `Admins (${stats.adminCount})` },
                { id: 'WORKER', label: `Mechanics (${stats.workerCount})` },
                { id: 'BLOCKED', label: `Blocked (${stats.blockedUsers})` },
              ] as const
            ).map((t) => {
              const isActive = roleFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setRoleFilter(t.id)}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Cards Grid */}
        {isLoading && page === 1 ? (
          <PageShimmer label="Loading staff" cards={6} />
        ) : !isFetching && usersList.length === 0 ? (
          <div className="py-16 text-center rounded-3xl glass-modern-card space-y-1.5">
            <UserIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No staff found</p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">No matches</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {usersList.map((u: User) => {
                const uId = getUserId(u);
                const isOnline = !!u.isOnline;
                const isBlocked = u.status === 'BLOCKED';
                const isAdmin = u.role === 'ADMIN';

                return (
                  <motion.div
                    key={uId}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/users/${uId}`)}
                    className="group relative overflow-hidden rounded-2xl glass-modern-card hover:border-amber-400/50 p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-sm text-white shadow-xs">
                            {u.profileImageUrl ? (
                              <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{u.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#080810] ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">
                            {u.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                isAdmin
                                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                  : 'bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30'
                              }`}
                            >
                              {u.role}
                            </span>
                            {isBlocked && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 uppercase">
                                Blocked
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                              {u.mobile || 'No Mobile'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-amber-300 transition-colors shrink-0">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">
                        {formatLastSeen(u.lastSeen || u.lastLoginAttempt)}
                      </span>
                      <span className="text-amber-600 dark:text-amber-300 font-bold flex items-center gap-1">
                        <span>Profile</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <ModernInfiniteLoader
              sentinelRef={sentinelRef}
              hasMore={hasMore}
              isLoading={isFetching && page > 1}
              totalCount={usersList.length}
              entityName="staff"
            />
          </>
        )}
      </main>
    </div>
  );
};
