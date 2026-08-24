import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import {
  Car,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Trophy,
  Volume2,
  VolumeX,
  Smartphone,
  KeyRound,
  LogOut,
  ChevronRight,
  Camera,
  X,
  Lock,
  Loader2,
  Phone,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logout, updateUser } from '../slice/authSlice';
import {
  useLogoutApiMutation,
  useGetMeQuery,
  useChangePasswordMutation,
  useUpdateProfileImageMutation,
} from '../api/authApi';
import { isCompletionSoundEnabled, setCompletionSoundEnabled } from '../utils/completionSound';
import { ImageCropperModal } from '../components/common/ImageCropperModal';
import { motion, AnimatePresence } from 'framer-motion';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { Meteors } from '../components/magicui/Meteors';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const dispatch = useAppDispatch();
  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutApiMutation();
  const { data: meData } = useGetMeQuery();
  const [changePasswordMutation, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [updateProfileImage] = useUpdateProfileImageMutation();
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const currentUser = meData?.data || user;

  // State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(isCompletionSoundEnabled());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Momzz OS is already installed or your browser does not support quick PWA installation.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleSoundToggle = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    setCompletionSoundEnabled(next);
  };

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch (e) {
    } finally {
      dispatch(logout());
      navigate('/login');
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
      }, 1500);
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

  const initialLetter = currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : 'U';

  const memberSince = currentUser?.createdAt
    ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
        new Date(currentUser.createdAt)
      )
    : 'Recent';

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col overflow-x-hidden selection:bg-amber-400/20">
      {/* Ambient background aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.05)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[260px] bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.04)_0%,transparent_70%)]" />
        <Meteors number={10} />
      </div>

      <Navbar glass />

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-5 pb-32 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Profile & Preferences
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Account settings, security and workshop access
            </p>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ── LEFT COLUMN: Identity & Quick Toggles ── */}
          <div className="lg:col-span-5 space-y-4">
            {/* Identity Card */}
            <section className="relative overflow-hidden rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] p-5 shadow-xl space-y-4">
              <BorderBeam size={180} duration={8} colorFrom="#fbbf24" colorTo="#8b5cf6" borderWidth={0.75} />

              <div className="flex flex-col items-center text-center space-y-3">
                {/* Avatar with Camera Trigger */}
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-amber-400/40 flex items-center justify-center font-black text-2xl text-white shadow-xl">
                    {currentUser?.profileImageUrl ? (
                      <img
                        src={currentUser.profileImageUrl}
                        alt={currentUser.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span>{initialLetter}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => profileImageInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                    title="Update photo"
                  >
                    <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Name, Role & Mobile */}
                <div>
                  <h2 className="text-lg font-black text-white">
                    {currentUser?.name || 'Technician'}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 font-mono font-black text-[10px] uppercase tracking-wider border border-amber-400/30">
                      {currentUser?.role || 'WORKER'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {currentUser?.mobile || 'No Mobile'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-2 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>Member since {memberSince}</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/10 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Security</span>
                </button>
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-rose-500/30 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelection}
              />
            </section>

            {/* Hardware & Sound Preferences */}
            <section className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] shadow-xl overflow-hidden divide-y divide-white/[0.06]">
              {/* Sound FX Toggle */}
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
                    {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Audio Feedback</p>
                    <p className="text-[10px] text-slate-400">Completion chimes & sounds</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSoundToggle}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
                    isSoundEnabled ? 'bg-amber-400 justify-end' : 'bg-white/10 justify-start'
                  }`}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-slate-950 shadow-md" />
                </button>
              </div>

              {/* Install PWA App */}
              <button
                onClick={handleInstallClick}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Install PWA App</p>
                    <p className="text-[10px] text-slate-400">
                      {isInstalled ? 'Installed on device' : 'Add to home screen for 1-tap launch'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            </section>
          </div>

          {/* ── RIGHT COLUMN: Modules & Hotline ── */}
          <div className="lg:col-span-7 space-y-4">
            <section className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] shadow-xl p-4 sm:p-5 space-y-3.5">
              <div className="pb-2 border-b border-white/[0.06]">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">
                  Workshop Operations & Modules
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Quick navigation across garage tools
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Vehicle Archives */}
                <button
                  onClick={() => navigate('/jobs?view=all', { state: { view: 'all' } })}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] hover:border-amber-400/40 transition text-left flex items-start gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Vehicle Archives
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Lifetime service records
                    </p>
                  </div>
                </button>

                {/* 2. Leaderboard */}
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] hover:border-amber-400/40 transition text-left flex items-start gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Leaderboard
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Technician rankings & QP points
                    </p>
                  </div>
                </button>

                {/* Admin Modules */}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => navigate('/analytics')}
                      className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] hover:border-purple-400/40 transition text-left flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BarChart3 className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          Analytics
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          Revenue trends & turnaround
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/inventory')}
                      className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] hover:border-emerald-400/40 transition text-left flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Package className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          Inventory Stock
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          Spare parts & catalog stock
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/sales')}
                      className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] hover:border-rose-400/40 transition text-left flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ShoppingCart className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                          POS Billing
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          Invoices & payment receipts
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/admin/users')}
                      className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/[0.06] hover:border-purple-400/40 transition text-left flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          Staff Matrix
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          Worker logins & control center
                        </p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Support Hotline Banner */}
            <section className="rounded-3xl bg-white/[0.035] backdrop-blur-2xl border border-white/[0.08] p-4 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Workshop Support Hotline</h4>
                  <p className="text-[10px] text-slate-400">+91 9747382525</p>
                </div>
              </div>
              <a
                href="tel:+919747382525"
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition active:scale-95"
              >
                Call
              </a>
            </section>
          </div>
        </div>
      </main>

      {/* Logout Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl p-6 text-center space-y-4"
            >
              <div>
                <h3 className="text-base font-black text-white">Sign Out</h3>
                <p className="text-xs text-slate-400 mt-1">Are you sure you want to log out of MOMZ'Z OS?</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 text-slate-300 font-bold text-xs hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 sm:pb-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#0f0f1e] border border-white/12 shadow-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" /> Change Password
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    {isChangingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
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

      {/* Image Cropper Modal */}
      {cropSource && (
        <ImageCropperModal
          isOpen={!!cropSource}
          imageSrc={cropSource}
          onCropComplete={(base64) => {
            handleSquareCropComplete(base64);
            setCropSource(null);
          }}
          onClose={() => setCropSource(null)}
        />
      )}
    </div>
  );
};
