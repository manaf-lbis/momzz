import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '../components/navbar/Navbar';
import { PageShimmer } from '../components/common/PageShimmer';
import {
  useAdminResetPasswordMutation,
  useGetAllUsersQuery,
  useUpdateUserByAdminMutation,
} from '../api/authApi';
import { User } from '../slice/authSlice';
import { advancedSearch } from '../utils/searchAlgorithm';
import {
  ChevronLeft,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
  Edit2,
  KeyRound,
  Phone,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Lock,
  Unlock,
  ShieldAlert,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';
import { NumberTicker } from '../components/magicui/NumberTicker';

const getUserId = (user: User) => user.id || user._id || '';

const formatLastSeen = (dateString?: string) => {
  if (!dateString) return 'No activity recorded';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'No activity recorded';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const exactTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(date);

  if (diffMins < 2) return 'Active just now';
  if (diffMins < 60) return `${diffMins}m ago · ${exactTime}`;
  if (diffHours < 24) return `${diffHours}h ago · ${exactTime}`;
  if (diffDays === 1) return `Yesterday · ${exactTime}`;
  if (diffDays < 7) return `${diffDays}d ago · ${exactTime}`;
  return exactTime;
};

const formatAuditDate = (dateString?: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return (
    date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ', ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
};

export const UserManagementPage: React.FC = () => {
  const { data, isLoading } = useGetAllUsersQuery();
  const [updateUserByAdmin, { isLoading: isUpdatingAdmin }] = useUpdateUserByAdminMutation();
  const [adminResetPassword] = useAdminResetPasswordMutation();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ONLINE' | 'ADMIN' | 'WORKER' | 'BLOCKED'>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', mobile: '' });

  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const rawUsers = data?.data || [];

  const onlineCount = rawUsers.filter((u: User) => u.isOnline).length;
  const adminCount = rawUsers.filter((u: User) => u.role === 'ADMIN').length;
  const workerCount = rawUsers.filter((u: User) => u.role === 'WORKER').length;
  const blockedCount = rawUsers.filter((u: User) => u.status === 'BLOCKED').length;

  const filteredUsers = useMemo(() => {
    let list = rawUsers;

    if (roleFilter === 'ONLINE') {
      list = list.filter((u: User) => u.isOnline);
    } else if (roleFilter === 'ADMIN') {
      list = list.filter((u: User) => u.role === 'ADMIN');
    } else if (roleFilter === 'WORKER') {
      list = list.filter((u: User) => u.role === 'WORKER');
    } else if (roleFilter === 'BLOCKED') {
      list = list.filter((u: User) => u.status === 'BLOCKED');
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (u: User) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.mobile || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    );
  }, [rawUsers, search, roleFilter]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg('');
    try {
      await updateUserByAdmin({
        userId: getUserId(selectedUser),
        name: editForm.name,
        mobile: editForm.mobile,
      }).unwrap();
      setIsEditingUser(false);
      setSelectedUser((prev) => (prev ? { ...prev, name: editForm.name, mobile: editForm.mobile } : null));
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to update user details.');
    }
  };

  const handleRoleToggle = async (user: User) => {
    const newRole = user.role === 'ADMIN' ? 'WORKER' : 'ADMIN';
    try {
      await updateUserByAdmin({
        userId: getUserId(user),
        role: newRole,
      }).unwrap();
      if (selectedUser && getUserId(selectedUser) === getUserId(user)) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null));
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to update user role.');
    }
  };

  const handleStatusToggle = async (user: User) => {
    const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    try {
      await updateUserByAdmin({
        userId: getUserId(user),
        status: newStatus,
      }).unwrap();
      if (selectedUser && getUserId(selectedUser) === getUserId(user)) {
        setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to toggle status.');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId || !newPassword.trim()) return;
    setErrorMsg('');
    try {
      await adminResetPassword({
        userId: resetModalUserId,
        newPassword: newPassword.trim(),
      }).unwrap();
      setResetSuccess('Password reset successfully!');
      setTimeout(() => {
        setResetSuccess('');
        setResetModalUserId(null);
        setNewPassword('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to reset password.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080810] text-white flex flex-col">
        <Navbar glass />
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-28">
          <PageShimmer label="Loading User Control Center" cards={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col overflow-x-hidden selection:bg-amber-400/30">
      {/* Ambient background aura & meteors */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.11)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[300px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <Meteors number={12} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 pb-28 space-y-4">
        {/* ── TOP HEADER BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                User Control Center
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300">
                  <NumberTicker value={rawUsers.length} /> Staff
                </span>
              </h1>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Staff directory, security audits & permissions
              </p>
            </div>
          </div>

          {/* Quick stats pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Online:</span>
              <span className="text-emerald-400 font-bold">{onlineCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Admins:</span>
              <span className="text-purple-400 font-bold">{adminCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Workers:</span>
              <span className="text-amber-400 font-bold">{workerCount}</span>
            </div>
          </div>
        </div>

        {/* ── SEARCH & FILTER BAR ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, mobile, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/20 text-xs sm:text-sm font-bold text-white placeholder-slate-500 outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.03] backdrop-blur-xl border border-white/10 p-1 rounded-2xl overflow-x-auto">
            {(['ALL', 'ONLINE', 'ADMIN', 'WORKER', 'BLOCKED'] as const).map((tab) => {
              const isActive = roleFilter === tab;
              const label =
                tab === 'ALL'
                  ? `All (${rawUsers.length})`
                  : tab === 'ONLINE'
                  ? `Online (${onlineCount})`
                  : tab === 'ADMIN'
                  ? `Admins (${adminCount})`
                  : tab === 'WORKER'
                  ? `Mechanics (${workerCount})`
                  : `Blocked (${blockedCount})`;

              return (
                <button
                  key={tab}
                  onClick={() => setRoleFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── USER CARDS GRID ── */}
        {filteredUsers.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <UserIcon className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No staff members found</p>
            <p className="text-xs font-mono text-slate-500">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredUsers.map((u: User) => {
              const isOnline = !!u.isOnline;
              const isBlocked = u.status === 'BLOCKED';
              const isAdmin = u.role === 'ADMIN';
              const lastAudit = (u.loginAudit || []).slice(-5).reverse();

              return (
                <motion.div
                  key={getUserId(u)}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="group relative overflow-hidden rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] hover:border-amber-400/50 shadow-xl shadow-black/40 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300"
                >
                  <BorderBeam size={180} duration={9} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={0.75} />

                  <div>
                    {/* Top: Avatar, Role, Online Dot & Quick Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center font-black text-sm text-white">
                            {u.profileImageUrl ? (
                              <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{u.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          {/* Live Online Badge */}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#080810] ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                            }`}
                            title={isOnline ? 'Active Now' : 'Offline'}
                          />
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[180px]">
                            {u.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                isAdmin
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                              }`}
                            >
                              {u.role}
                            </span>
                            {isBlocked && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                                Blocked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Last Seen / Active Pill */}
                      <span className="text-[10px] font-mono text-slate-400 text-right">
                        {formatLastSeen(u.lastSeen || u.lastLoginAttempt)}
                      </span>
                    </div>

                    {/* Contact & Tasks count */}
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">Mobile</p>
                        <p className="font-mono text-slate-300 font-bold text-xs mt-0.5 truncate">
                          {u.mobile || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">QP Tasks</p>
                        <p className="font-mono text-amber-400 font-black text-xs mt-0.5">
                          {u.taskCount || 0} tasks
                        </p>
                      </div>
                    </div>

                    {/* ── LAST 5 LOGINS STATUS PREVIEW ── */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                        <span className="text-slate-400 uppercase font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3 text-amber-400" /> Last 5 Logins
                        </span>
                        <span className="text-slate-500">{u.totalLoginAttempts || 0} total</span>
                      </div>

                      {lastAudit.length === 0 ? (
                        <p className="text-[10px] font-mono text-slate-500 py-1">No login audit recorded</p>
                      ) : (
                        <div className="space-y-1">
                          {lastAudit.map((log: any, idx: number) => {
                            const isSuccess = log.status === 'SUCCESS';
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-mono ${
                                  isSuccess
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  {isSuccess ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                  )}
                                  <span className="font-black">{log.status}</span>
                                </span>
                                <span className="text-slate-400">{formatAuditDate(log.timestamp)}</span>
                                <span className="text-[9px] text-slate-500 truncate max-w-[80px]">
                                  {log.ipAddress || '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setEditForm({ name: u.name, mobile: u.mobile });
                        setIsEditingUser(false);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all active:scale-95 text-center cursor-pointer"
                    >
                      Inspect & Edit
                    </button>

                    <button
                      onClick={() => {
                        setResetModalUserId(getUserId(u));
                        setNewPassword('');
                        setErrorMsg('');
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-amber-400/15 border border-white/10 text-slate-300 hover:text-amber-300 transition-all active:scale-90 cursor-pointer"
                      title="Reset Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStatusToggle(u)}
                      className={`p-2 rounded-xl border transition-all active:scale-90 cursor-pointer ${
                        isBlocked
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                      }`}
                      title={isBlocked ? 'Unblock User' : 'Block User'}
                    >
                      {isBlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── USER DETAIL & CONTROL MODAL ── */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <BorderBeam size={240} duration={8} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={1} />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center font-black text-lg text-white">
                    {selectedUser.profileImageUrl ? (
                      <img src={selectedUser.profileImageUrl} alt={selectedUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">{selectedUser.name}</h2>
                    <p className="text-xs font-mono text-slate-400">{selectedUser.mobile}</p>
                    <span className="inline-block mt-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 uppercase">
                      {selectedUser.role} · {selectedUser.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              {/* Edit Details Form */}
              {isEditingUser ? (
                <form onSubmit={handleEditSubmit} className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Edit Staff Info</p>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Mobile Number</label>
                    <input
                      type="tel"
                      value={editForm.mobile}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                      required
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isUpdatingAdmin}
                      className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition cursor-pointer"
                    >
                      {isUpdatingAdmin ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingUser(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold text-xs hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingUser(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  <button
                    onClick={() => handleRoleToggle(selectedUser)}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-bold text-purple-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Role: {selectedUser.role === 'ADMIN' ? 'Set Worker' : 'Set Admin'}
                  </button>
                </div>
              )}

              {/* ── SECURITY & LAST 5 LOGINS AUDIT TABLE ── */}
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Login History & Audit
                  </span>
                  <span className="text-slate-400">
                    Failed attempts: <strong className="text-rose-400">{selectedUser.failedLoginAttempts || 0}</strong>
                  </span>
                </div>

                <div className="divide-y divide-white/[0.06] pt-1">
                  {(selectedUser.loginAudit || []).slice(-5).reverse().length === 0 ? (
                    <p className="text-xs font-mono text-slate-500 py-3 text-center">No login events on file.</p>
                  ) : (
                    (selectedUser.loginAudit || []).slice(-5).reverse().map((audit: any, idx: number) => {
                      const isSuccess = audit.status === 'SUCCESS';
                      return (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                              isSuccess
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {audit.status}
                          </span>
                          <span className="text-slate-300">{formatAuditDate(audit.timestamp)}</span>
                          <span className="text-slate-500 text-[10px] flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {audit.ipAddress || '—'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN PASSWORD RESET MODAL ── */}
      <AnimatePresence>
        {resetModalUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setResetModalUserId(null)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl p-5 sm:p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" /> Reset Password
                </h3>
                <button onClick={() => setResetModalUserId(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  {resetSuccess}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter 6+ characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModalUserId(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
