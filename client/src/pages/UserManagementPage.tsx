import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '../components/navbar/Navbar';
import { PageShimmer } from '../components/common/PageShimmer';
import {
  useAdminResetPasswordMutation,
  useGetAllUsersQuery,
  useUpdateUserByAdminMutation,
} from '../api/authApi';
import { User } from '../slice/authSlice';
import {
  Circle,
  Clock3,
  Edit2,
  KeyRound,
  Phone,
  Save,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/formatters';

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

  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hrs ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
};

export const UserManagementPage: React.FC = () => {
  const { data, isLoading } = useGetAllUsersQuery();
  const [updateUserByAdmin, { isLoading: isUpdatingAdmin }] = useUpdateUserByAdminMutation();
  const [adminResetPassword] = useAdminResetPasswordMutation();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', mobile: '' });

  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const users = (data?.data || [])
    .filter(
      (user) =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.mobile.includes(search) ||
        user.role.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline) || a.name.localeCompare(b.name));

  const handleSelectUser = (user: User) => {
    setErrorMsg('');
    setSelectedUser(user);
    setIsEditingUser(false);
    setEditForm({ name: user.name, mobile: user.mobile });
  };

  const handleSaveAdminUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editForm.name.trim() || !editForm.mobile.trim()) return;

    try {
      setErrorMsg('');
      const userId = getUserId(selectedUser);
      const res = await updateUserByAdmin({
        userId,
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
      }).unwrap();

      setSelectedUser({
        ...selectedUser,
        name: res.data.name,
        mobile: res.data.mobile,
      });
      setIsEditingUser(false);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to update user details.');
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetModalUserId || !newPassword) return;
    try {
      setErrorMsg('');
      const response = await adminResetPassword({ userId: resetModalUserId, newPassword }).unwrap();
      setResetSuccess(response.message || 'Password reset successfully.');
      setNewPassword('');
      setTimeout(() => {
        setResetSuccess('');
        setResetModalUserId(null);
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-white flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-9">
        {/* Mobile-Optimized Hero Header */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-300 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                  Team Directory
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  User Control Center
                </h1>
              </div>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
              {users.length} registered team member{users.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team by name, mobile, role..."
              className="w-full rounded-2xl bg-white border border-slate-200 py-3 pl-11 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400 transition shadow-xs"
            />
          </div>
        </section>

        {isLoading ? (
          <PageShimmer label="Loading team members" cards={4} />
        ) : users.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center text-xs sm:text-sm text-slate-400 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            No team members match your search criteria.
          </div>
        ) : (
          /* Mobile-First Responsive User List */
          <section className="space-y-3 sm:space-y-0 sm:overflow-hidden sm:rounded-3xl sm:bg-white sm:border sm:border-slate-200 sm:dark:border-slate-800 sm:dark:bg-slate-900 sm:shadow-xs">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[minmax(240px,1.5fr)_120px_1fr_180px_28px] gap-4 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>User</span>
              <span>Role</span>
              <span>Presence</span>
              <span>Last Activity</span>
              <span />
            </div>

            {/* User Cards List */}
            <div className="space-y-2.5 sm:space-y-0 sm:divide-y sm:divide-slate-100 sm:dark:divide-slate-800/60">
              {users.map((user) => {
                const online = !!user.isOnline;
                return (
                  <div
                    key={getUserId(user)}
                    onClick={() => handleSelectUser(user)}
                    className="cursor-pointer rounded-2xl bg-white p-4 sm:p-0 sm:rounded-none border border-slate-200/80 sm:border-none dark:bg-slate-900 dark:border-slate-800 shadow-xs sm:shadow-none hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center justify-between gap-3 sm:hidden">
                      {/* Mobile Card Top: Avatar + Name + Chevron */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                            {user.profileImageUrl ? (
                              <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <span
                            className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {user.name}
                            </p>
                            <span className="shrink-0 rounded-md bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
                              {user.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {user.mobile}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {/* Mobile Card Bottom Info */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:hidden">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        <Circle
                          className={`w-2 h-2 fill-current ${
                            online ? 'text-emerald-500' : 'text-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        {online ? 'ONLINE NOW' : 'OFFLINE'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {online ? 'Active now' : formatLastSeen(user.lastSeen)}
                      </span>
                    </div>

                    {/* Desktop Grid Layout (sm and up) */}
                    <div className="hidden sm:grid sm:grid-cols-[minmax(240px,1.5fr)_120px_1fr_180px_28px] gap-x-4 items-center px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                            {user.profileImageUrl ? (
                              <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <span
                            className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {user.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                            <Phone className="inline w-3 h-3 mr-1" />
                            {user.mobile}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="inline-flex rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-300">
                          {user.role}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                            online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          <Circle
                            className={`w-2 h-2 fill-current ${
                              online ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                          {online ? 'ONLINE NOW' : 'OFFLINE'}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {online ? 'Active now' : formatLastSeen(user.lastSeen)}
                      </p>

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Drawer: Selected User Details & Admin Profile Editing */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.button
              aria-label="Close user details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl pb-20"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  User Profile Details
                </span>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-xs"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 sm:px-5 py-6 space-y-4">
                {/* Profile Overview Card */}
                <section className="rounded-3xl bg-white dark:bg-slate-800/60 p-5 text-center shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-500 shadow-md">
                      {selectedUser.profileImageUrl ? (
                        <img src={selectedUser.profileImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedUser.name.charAt(0)
                      )}
                    </div>
                    <span
                      className={`absolute right-0 bottom-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${
                        selectedUser.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </div>

                  {isEditingUser ? (
                    <form onSubmit={handleSaveAdminUserEdit} className="space-y-3 text-left">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          User Name
                        </label>
                        <input
                          required
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Mobile Phone
                        </label>
                        <input
                          required
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditingUser(false)}
                          className="flex-1 py-2 text-xs font-bold"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isUpdatingAdmin}
                          className="flex-1 py-2 text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          <Save className="w-3.5 h-3.5 inline mr-1" />
                          {isUpdatingAdmin ? 'Saving...' : 'Save Details'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {selectedUser.name}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <Phone className="inline w-3 h-3 mr-1" />
                        {selectedUser.mobile}
                      </p>

                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingUser(true)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Info
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* Role & Access (Read-Only Display) */}
                <section className="rounded-3xl bg-white dark:bg-slate-800/60 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Role &amp; System Access
                    </h3>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Assigned Role</span>
                    <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 font-extrabold text-xs">
                      {selectedUser.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Account Approval</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                      {selectedUser.isApproved ? 'APPROVED' : 'PENDING'}
                    </span>
                  </div>
                </section>

                {/* Password Reset Action */}
                <section className="rounded-3xl bg-white dark:bg-slate-800/60 p-5 shadow-xs border border-slate-200/80 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Security Controls
                  </h3>
                  <button
                    onClick={() => setResetModalUserId(getUserId(selectedUser))}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    Reset User Password
                  </button>
                </section>

                {errorMsg && (
                  <p className="text-center text-xs font-bold text-red-500">{errorMsg}</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      {resetModalUserId && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <h3 className="font-black text-base uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Reset User Password
            </h3>

            {resetSuccess ? (
              <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {resetSuccess}
              </p>
            ) : (
              <>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (minimum 6 characters)"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-400"
                />

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResetModalUserId(null)}
                    className="flex-1 py-2.5 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 py-2.5 text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300"
                  >
                    Update
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
