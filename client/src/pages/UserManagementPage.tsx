import React, { useState } from 'react';
import { Navbar } from '../components/navbar/Navbar';
import {
  useGetAllUsersQuery,
  useToggleUserStatusMutation,
  useAdminResetPasswordMutation,
} from '../api/authApi';
import {
  Users,
  Ban,
  CheckCircle,
  KeyRound,
  Phone,
  Search,
  Circle,
  Clock3,
  LogIn,
  Activity,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/formatters';

export const UserManagementPage: React.FC = () => {
  const { data, isLoading } = useGetAllUsersQuery();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const [adminResetPassword] = useAdminResetPasswordMutation();

  const users = data?.data || [];
  const [search, setSearch] = useState('');
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatActivityTime = (value?: string) => {
    if (!value) return 'No attempts recorded';
    return formatDate(value);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile.includes(search) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleBlock = async (userId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    try {
      await toggleUserStatus({ userId, status: newStatus }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId || !newPassword) return;

    try {
      setErrorMsg('');
      const res = await adminResetPassword({
        userId: resetModalUserId,
        newPassword,
      }).unwrap();
      setResetSuccess(res.message || 'Password reset successfully!');
      setNewPassword('');
      setTimeout(() => {
        setResetSuccess('');
        setResetModalUserId(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-500" />
              Garage User Control Center
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Manage worker permissions, active status, and passwords.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, mobile, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 font-mono text-xs">
            Loading team members...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 font-mono text-xs">
            No team members found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredUsers.map((u) => {
              const isBlocked = u.status === 'BLOCKED';
              return (
                <div
                  key={u.id || u._id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isBlocked
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm uppercase flex items-center gap-2">
                        {u.name}
                        {u.role === 'ADMIN' && (
                          <span className="px-1.5 py-0.5 bg-yellow-400/10 text-yellow-400 text-[10px] font-mono rounded border border-yellow-400/30">
                            ADMIN
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {u.mobile}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase ${
                        isBlocked
                          ? 'bg-red-500/20 text-red-500'
                          : u.isApproved
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-amber-500/20 text-amber-500'
                      }`}
                    >
                      {isBlocked ? 'BLOCKED' : u.isApproved ? 'ACTIVE' : 'PENDING'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/70 p-2.5">
                      <p className="flex items-center gap-1 text-zinc-500">
                        <Circle
                          className={`h-3 w-3 fill-current ${
                            u.isOnline ? 'text-emerald-500' : 'text-zinc-400'
                          }`}
                        />
                        Presence
                      </p>
                      <p
                        className={`mt-1 font-bold uppercase ${
                          u.isOnline ? 'text-emerald-500' : 'text-zinc-500'
                        }`}
                      >
                        {u.isOnline ? 'Online now' : 'Offline'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/70 p-2.5">
                      <p className="flex items-center gap-1 text-zinc-500">
                        <Activity className="h-3 w-3" /> Login attempts
                      </p>
                      <p className="mt-1 font-bold text-zinc-800 dark:text-zinc-100">
                        {u.totalLoginAttempts ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-950/40">
                    <p className="flex items-center gap-1.5 text-zinc-500">
                      <LogIn className="h-3.5 w-3.5 text-amber-500" />
                      Last login attempt
                    </p>
                    <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                      {formatActivityTime(u.lastLoginAttempt)}
                    </p>
                    {!u.isOnline && u.lastSeen && (
                      <p className="mt-1 flex items-center gap-1 text-zinc-500">
                        <Clock3 className="h-3 w-3" /> Last seen {formatDate(u.lastSeen)}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setResetModalUserId(u.id || u._id || '')}
                      className="px-2.5 py-1 text-xs font-mono rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Reset Password
                    </button>

                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleToggleBlock(u.id || u._id || '', u.status)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors ${
                          isBlocked
                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        }`}
                      >
                        {isBlocked ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" /> Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" /> Block User
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Password Reset */}
        {resetModalUserId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-base uppercase flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Reset User Password
              </h3>

              {resetSuccess ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-xs font-mono">
                  {resetSuccess}
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetModalUserId(null)}
                      className="flex-1 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1 text-xs">
                      Update Password
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
