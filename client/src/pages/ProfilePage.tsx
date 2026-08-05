import React, { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Button } from '../components/common/Button';
import { User, Award, CheckCircle2, ShieldCheck, LogOut, Phone, KeyRound, Lock, Info, Camera, X } from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logout, updateUser } from '../slice/authSlice';
import { useLogoutApiMutation, useGetMeQuery, useGetLeaderboardQuery, useChangePasswordMutation, useUpdateProfileImageMutation } from '../api/authApi';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutApiMutation();
  const { data: meData } = useGetMeQuery();
  const { data: leaderboardData } = useGetLeaderboardQuery();
  const [changePasswordMutation, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [updateProfileImage, { isLoading: isUploadingImage }] = useUpdateProfileImageMutation();
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const currentUser = meData?.data || user;

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [imageError, setImageError] = useState('');

  // Calculate current leaderboard rank
  const leaderboard = leaderboardData?.data || [];
  const rankIndex = leaderboard.findIndex(
    (w: any) => w.id === currentUser?.id || (w as any)._id === currentUser?.id
  );
  const currentRank = rankIndex !== -1 ? `#${rankIndex + 1}` : 'N/A';

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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Choose an image smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageError('');
      setCropZoom(1);
      setCropSource(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedImage = async () => {
    if (!cropSource) return;
    setImageError('');
    const image = new Image();
    image.onload = async () => {
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / cropZoom;
      const sourceX = (image.naturalWidth - cropSize) / 2;
      const sourceY = (image.naturalHeight - cropSize) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, 512, 512);
      try {
        const response = await updateProfileImage({ image: canvas.toDataURL('image/jpeg', 0.88) }).unwrap();
        dispatch(updateUser(response.data));
        setCropSource(null);
      } catch (err: any) {
        setImageError(err?.data?.message || 'Could not upload your profile photo.');
      }
    };
    image.onerror = () => setImageError('Could not read that image.');
    image.src = cropSource;
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-400"></div>

          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-amber-600 dark:text-yellow-400">
              {currentUser?.profileImageUrl ? (
                <img src={currentUser.profileImageUrl} alt={`${currentUser.name}'s profile`} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10" />
              )}
            </div>
            <button
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
              className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-amber-500 text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-lg hover:bg-amber-600"
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={profileImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelection} className="hidden" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
              {currentUser?.name}
            </h1>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {currentUser?.mobile}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-amber-600 dark:text-yellow-400 text-xs font-mono font-bold uppercase">
              <ShieldCheck className="w-3.5 h-3.5" /> {currentUser?.role}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
              currentUser?.status === 'BLOCKED'
                ? 'bg-red-500/10 border border-red-500/30 text-red-500'
                : currentUser?.isApproved
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
            }`}>
              {currentUser?.status === 'BLOCKED' ? 'BLOCKED' : currentUser?.isApproved ? 'ACTIVE' : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Account Details Summary */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <h3 className="text-xs font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <Info className="w-4 h-4 text-amber-500" /> Account Summary
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Member Name</span>
              <span className="font-bold">{currentUser?.name}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Registered Mobile</span>
              <span className="font-bold">{currentUser?.mobile}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Assigned Role</span>
              <span className="font-bold text-amber-600 dark:text-yellow-400">{currentUser?.role}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Account Status</span>
              <span className="font-bold text-emerald-500">
                {currentUser?.status === 'BLOCKED' ? 'BLOCKED' : currentUser?.isApproved ? 'ACTIVE' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Lifetime Stats & Leaderboard Rank */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
            <p className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
              {currentUser?.taskCount ?? 0}
            </p>
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Tasks Completed
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <Award className="w-6 h-6 text-amber-500 dark:text-yellow-400 mx-auto" />
            <p className="text-2xl font-extrabold font-mono text-amber-600 dark:text-yellow-400">
              {currentRank}
            </p>
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Garage Leaderboard Rank
            </p>
          </div>
        </div>

        {/* Change Password & Sign Out Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm"
          >
            <KeyRound className="w-4 h-4 text-amber-500" /> Change My Password
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Sign Out of Garage System
          </Button>
        </div>

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-base uppercase flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <Lock className="w-5 h-5 text-amber-500" />
                Security: Change Password
              </h3>

              {successMsg ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-xs font-mono">
                  {successMsg}
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

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
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="flex-1 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isChangingPassword}
                      className="flex-1 text-xs"
                    >
                      {isChangingPassword ? 'Saving...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {cropSource && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base uppercase">Crop profile photo</h3>
                  <p className="text-xs text-zinc-500 mt-1">The square area will be saved.</p>
                </div>
                <button type="button" onClick={() => setCropSource(null)} className="p-1 text-zinc-500 hover:text-red-500" aria-label="Close crop tool"><X className="w-5 h-5" /></button>
              </div>
              <div className="w-56 h-56 mx-auto overflow-hidden rounded-2xl border-2 border-amber-400 bg-zinc-100 dark:bg-zinc-800">
                <img src={cropSource} alt="Crop preview" className="w-full h-full object-cover" style={{ transform: `scale(${cropZoom})` }} />
              </div>
              <label className="block text-xs font-mono uppercase text-zinc-500">Zoom
                <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} className="w-full mt-2 accent-amber-500" />
              </label>
              {imageError && <p className="text-xs text-red-500">{imageError}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setCropSource(null)} className="flex-1">Cancel</Button>
                <Button type="button" variant="primary" onClick={saveCroppedImage} disabled={isUploadingImage} className="flex-1">{isUploadingImage ? 'Uploading...' : 'Crop & save'}</Button>
              </div>
            </div>
          </div>
        )}

        {imageError && !cropSource && <p className="text-center text-xs text-red-500">{imageError}</p>}
      </main>
    </div>
  );
};
