import React, { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Button } from '../components/common/Button';
import {
  User as UserIcon,
  Award,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  Phone,
  KeyRound,
  Lock,
  Camera,
  X,
  UserCheck,
  Building2,
} from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logout, updateUser } from '../slice/authSlice';
import {
  useLogoutApiMutation,
  useGetMeQuery,
  useGetLeaderboardQuery,
  useChangePasswordMutation,
  useUpdateProfileImageMutation,
} from '../api/authApi';
import { ImageCropperModal } from '../components/common/ImageCropperModal';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutApiMutation();
  const { data: meData } = useGetMeQuery();
  const { data: leaderboardData } = useGetLeaderboardQuery();
  const [changePasswordMutation, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [updateProfileImage] = useUpdateProfileImageMutation();
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const currentUser = meData?.data || user;

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cropSource, setCropSource] = useState<string | null>(null);

  // Leaderboard rank helpers
  const leaderboard = leaderboardData?.data || [];
  const rankIndex = leaderboard.findIndex(
    (w: any) => w.id === currentUser?.id || (w as any)._id === currentUser?.id
  );
  const rankNumber = rankIndex !== -1 ? rankIndex + 1 : null;
  const medalEmoji = rankNumber === 1 ? '🥇' : rankNumber === 2 ? '🥈' : rankNumber === 3 ? '🥉' : null;
  const currentRank = rankNumber ? `${medalEmoji ? medalEmoji + ' ' : ''}#${rankNumber}` : 'N/A';

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch (e) {
    } finally {
      dispatch(logout());
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await changePasswordMutation({ currentPassword, newPassword }).unwrap();
      setSuccessMsg(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setSuccessMsg('');
        setIsPasswordModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to change password.');
    }
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSquareCropComplete = async (croppedBase64: string) => {
    try {
      const response = await updateProfileImage({ image: croppedBase64 }).unwrap();
      dispatch(updateUser(response.data));
    } catch (err: any) {
      alert(err?.data?.message || 'Could not upload profile photo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0F172A] dark:text-white transition-colors duration-200">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-4">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500" />

          {/* Avatar Container */}
          <div className="relative w-24 h-24 mx-auto mt-2">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 flex items-center justify-center text-amber-500 shadow-lg">
              {currentUser?.profileImageUrl ? (
                <img
                  src={currentUser.profileImageUrl}
                  alt={`${currentUser.name}'s profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 stroke-[1.5]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
              className="absolute right-0 bottom-0 w-8 h-8 rounded-full bg-amber-500 text-slate-950 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md transition hover:scale-105 active:scale-95"
              title="Change profile photo (1:1 Square)"
              aria-label="Change profile photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={profileImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelection}
              className="hidden"
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {currentUser?.name || 'User Profile'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentUser?.mobile || 'No mobile linked'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> {currentUser?.role || 'WORKER'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentUser?.status === 'BLOCKED'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                  : currentUser?.isApproved
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              {currentUser?.status === 'BLOCKED'
                ? 'BLOCKED'
                : currentUser?.isApproved
                ? 'ACTIVE MEMBER'
                : 'APPROVAL PENDING'}
            </span>
          </div>
        </div>

        {/* Lifetime Performance Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-1 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white pt-1">
              {currentUser?.taskCount ?? 0}
            </p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tasks Completed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-1 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/15">
              <Award className="w-5 h-5" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 pt-1">
              {currentRank}
            </p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Leaderboard Rank
            </p>
          </div>
        </div>

        {/* Leaderboard Table */}
        {leaderboard.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Leaderboard — Top Workers
            </h2>
            <div className="space-y-1">
              {leaderboard.slice(0, 10).map((worker: any, idx: number) => {
                const isMe = worker.id === currentUser?.id || worker._id === currentUser?.id;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                return (
                  <div
                    key={worker.id || worker._id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      isMe
                        ? 'bg-amber-50 border border-amber-200/80 dark:bg-amber-400/10 dark:border-amber-400/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Rank Number */}
                    <span
                      className={`w-6 text-center text-sm font-black ${
                        idx < 3 ? 'text-lg' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {medal ?? `#${idx + 1}`}
                    </span>

                    {/* Avatar */}
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {worker.profileImageUrl ? (
                        <img src={worker.profileImageUrl} alt={worker.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-bold truncate ${
                          isMe
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {worker.name}{isMe ? ' (You)' : ''}
                      </p>
                    </div>

                    {/* Task Count */}
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                        idx === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-400'
                          : isMe
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {worker.taskCount ?? 0} tasks
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Account Details Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-amber-500" /> Account Summary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Full Name
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Registered Mobile
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{currentUser?.mobile}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                System Role
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{currentUser?.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Account Status
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {currentUser?.status === 'BLOCKED'
                  ? 'BLOCKED'
                  : currentUser?.isApproved
                  ? 'ACTIVE'
                  : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <KeyRound className="w-4 h-4 text-amber-500" /> Change My Password
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Sign Out of Garage System
          </Button>
        </div>

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Change Password
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {successMsg ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold">
                  {successMsg}
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="flex-1 text-xs font-bold py-2.5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isChangingPassword}
                      className="flex-1 text-xs font-bold py-2.5 bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      {isChangingPassword ? 'Saving...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Square Profile Photo Cropper Modal (1:1 Ratio) */}
        {cropSource && (
          <ImageCropperModal
            isOpen={!!cropSource}
            imageSrc={cropSource}
            aspectRatio={1}
            title="Crop Profile Photo (1:1 Square)"
            onClose={() => setCropSource(null)}
            onCropComplete={handleSquareCropComplete}
          />
        )}
      </main>
    </div>
  );
};
