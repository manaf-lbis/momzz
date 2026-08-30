import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { PageShimmer } from '../../../shared/components/common/PageShimmer';
import {
  useAdminResetPasswordMutation,
  useGetAllUsersQuery,
  useUpdateUserByAdminMutation,
} from '../../auth/api/authApi';
import { User } from '../../auth/store/authSlice';
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
  CheckCircle2,
  XCircle,
  Activity,
  Lock,
  Unlock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { NumberTicker } from '../../../shared/components/magicui/NumberTicker';
import { ConfirmationModal } from '../../../shared/components/common/ConfirmationModal';
import { useAuth } from '../../../shared/hooks/useAuth';

const getUserId = (user: User) => user.id || user._id || '';

const formatLastSeen = (dateString?: string) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Offline';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 2) return 'Active just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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
  const { user: currentAuthUser } = useAuth();
  const currentAuthId = currentAuthUser?.id || (currentAuthUser as any)?._id;

  const { data, isLoading } = useGetAllUsersQuery();
  const [updateUserByAdmin, { isLoading: isUpdatingAdmin }] = useUpdateUserByAdminMutation();
  const [adminResetPassword, { isLoading: isResettingPassword }] = useAdminResetPasswordMutation();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ONLINE' | 'ADMIN' | 'WORKER' | 'BLOCKED'>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', mobile: '' });

  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Role Confirmation Guard Modal
  const [confirmRoleUser, setConfirmRoleUser] = useState<{ user: User; newRole: 'ADMIN' | 'WORKER' } | null>(null);

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

  const executeRoleChange = async () => {
    if (!confirmRoleUser) return;
    const { user, newRole } = confirmRoleUser;

    // Safety guard: cannot change your own role
    if (getUserId(user) === currentAuthId) {
      setErrorMsg('You cannot change your own administrative role.');
      setConfirmRoleUser(null);
      return;
    }

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
    } finally {
      setConfirmRoleUser(null);
    }
  };

  const handleStatusToggle = async (user: User) => {
    // Safety guard: cannot block yourself
    if (getUserId(user) === currentAuthId) {
      setErrorMsg('You cannot block your own account.');
      return;
    }

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200">
      {/* Subtle ambient light */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.04)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[260px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.04)_0%,transparent_70%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 pb-32 space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.history.back()}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Staff Control Matrix
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-300/90">
                  <NumberTicker value={rawUsers.length} /> Staff
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* ── METRIC TILES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Total Staff</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{rawUsers.length}</p>
            </div>
            <Users className="w-5 h-5 text-amber-500" />
          </div>

          <div className="p-3 rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Live Active</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{onlineCount}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="p-3 rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Admins</p>
              <p className="text-lg font-black text-purple-600 dark:text-purple-300">{adminCount}</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>

          <div className="p-3 rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Mechanics</p>
              <p className="text-lg font-black text-amber-600 dark:text-amber-300">{workerCount}</p>
            </div>
            <UserIcon className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, mobile, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition shadow-xs"
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

          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-white/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto shadow-xs">
            {(
              [
                { id: 'ALL', label: `All (${rawUsers.length})` },
                { id: 'ONLINE', label: `Online (${onlineCount})` },
                { id: 'ADMIN', label: `Admins (${adminCount})` },
                { id: 'WORKER', label: `Mechanics (${workerCount})` },
                { id: 'BLOCKED', label: `Blocked (${blockedCount})` },
              ] as const
            ).map((t) => {
              const isActive = roleFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setRoleFilter(t.id)}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CLEAN COMPACT USER CARDS GRID (No Clutter) ── */}
        {isLoading ? (
          <PageShimmer label="Loading staff roster" cards={6} />
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/95 dark:bg-[#12131F]/90 border border-slate-200/80 dark:border-white/[0.08] space-y-1.5">
            <UserIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-slate-300">No staff members found</p>
            <p className="text-xs font-mono text-slate-500">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUsers.map((u: User) => {
              const uId = getUserId(u);
              const isOnline = !!u.isOnline;
              const isBlocked = u.status === 'BLOCKED';
              const isAdmin = u.role === 'ADMIN';

              return (
                <motion.div
                  key={uId}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    setSelectedUser(u);
                    setEditForm({ name: u.name, mobile: u.mobile || '' });
                    setIsEditingUser(false);
                    setErrorMsg('');
                  }}
                  className="group relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/50 p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm dark:shadow-xl dark:shadow-black/50"
                >
                  <BorderBeam size={140} duration={8} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={0.75} />

                  <div className="flex items-center justify-between gap-3">
                    {/* Avatar & Online Dot */}
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

                      {/* Name, Role & Mobile */}
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

                    {/* Manage Arrow Indicator */}
                    <div className="flex items-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-amber-300 transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Compact Bottom Strip */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">
                      {formatLastSeen(u.lastSeen || u.lastLoginAttempt)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-300 font-bold">
                      {u.taskCount || 0} tasks logged
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── DETAILED STAFF CONTROL & SECURITY MODAL (Opened on click) ── */}
      <AnimatePresence>
        {selectedUser && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <BorderBeam size={220} duration={8} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={1} />

              {/* Modal Top Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center font-black text-lg text-white">
                    {selectedUser.profileImageUrl ? (
                      <img src={selectedUser.profileImageUrl} alt={selectedUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">{selectedUser.name}</h2>
                    <p className="text-xs font-mono text-slate-400">{selectedUser.mobile || 'No Mobile Registered'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 uppercase">
                        {selectedUser.role}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          selectedUser.status === 'BLOCKED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {selectedUser.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Edit Profile */}
                <button
                  type="button"
                  onClick={() => setIsEditingUser((prev) => !prev)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEditingUser ? 'Cancel Edit' : 'Edit Info'}</span>
                </button>

                {/* 2. Guarded Role Change */}
                <button
                  type="button"
                  disabled={getUserId(selectedUser) === currentAuthId}
                  onClick={() => {
                    const nextRole = selectedUser.role === 'ADMIN' ? 'WORKER' : 'ADMIN';
                    setConfirmRoleUser({ user: selectedUser, newRole: nextRole });
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40 ${
                    selectedUser.role === 'ADMIN'
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                  title={getUserId(selectedUser) === currentAuthId ? 'Cannot change own role' : 'Change staff role'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Set {selectedUser.role === 'ADMIN' ? 'Worker' : 'Admin'}</span>
                </button>

                {/* 3. Block / Unblock */}
                <button
                  type="button"
                  disabled={getUserId(selectedUser) === currentAuthId}
                  onClick={() => handleStatusToggle(selectedUser)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40 ${
                    selectedUser.status === 'BLOCKED'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-rose-300'
                  }`}
                >
                  {selectedUser.status === 'BLOCKED' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{selectedUser.status === 'BLOCKED' ? 'Unblock' : 'Block'}</span>
                </button>
              </div>

              {/* Edit Details Form (Collapsible) */}
              {isEditingUser && (
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
              )}

              {/* Password Reset Section */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Direct Password Reset</p>
                    <p className="text-[10px] text-slate-400">Set a new password for this staff member</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUserId(getUserId(selectedUser));
                    setNewPassword('');
                    setErrorMsg('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs transition cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* ── LAST 5 LOGINS AUDIT TABLE (Inside Modal Only) ── */}
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" /> Last 5 Logins Record
                  </span>
                  <span className="text-slate-500">{selectedUser.totalLoginAttempts || 0} Total Logins</span>
                </div>

                {(!selectedUser.loginAudit || selectedUser.loginAudit.length === 0) ? (
                  <p className="text-xs font-mono text-slate-500 py-3 text-center">No login attempts logged yet</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {selectedUser.loginAudit.slice(-5).reverse().map((log: any, idx: number) => {
                      const isSuccess = log.status === 'SUCCESS';
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono border ${
                            isSuccess
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                            <span className="font-bold">{log.status}</span>
                          </span>
                          <span className="text-slate-400 text-[11px]">{formatAuditDate(log.timestamp)}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{log.ipAddress || '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ROLE CHANGE CONFIRMATION GUARD MODAL ── */}
      {confirmRoleUser && (
        <ConfirmationModal
          isOpen={!!confirmRoleUser}
          onClose={() => setConfirmRoleUser(null)}
          onConfirm={executeRoleChange}
          title={confirmRoleUser.newRole === 'ADMIN' ? 'Promote to Admin?' : 'Demote to Worker?'}
          message={`Are you sure you want to change ${confirmRoleUser.user.name}'s role to ${confirmRoleUser.newRole}? ${
            confirmRoleUser.newRole === 'ADMIN'
              ? 'This grants full administrative and deletion permissions across the workshop.'
              : 'This restricts administrative capabilities.'
          }`}
          confirmText="Yes, Change Role"
          variant={confirmRoleUser.newRole === 'ADMIN' ? 'warning' : 'danger'}
        />
      )}

      {/* ── PASSWORD RESET MODAL ── */}
      <AnimatePresence>
        {resetModalUserId && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" /> Reset Password
                </h3>
                <button
                  onClick={() => setResetModalUserId(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
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
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new 6+ char password"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition cursor-pointer"
                  >
                    {isResettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirm Reset'}
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
