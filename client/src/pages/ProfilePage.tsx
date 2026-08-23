import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Navbar } from '../components/navbar/Navbar';
import {
  User as UserIcon,
  Car,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Trophy,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Smartphone,
  KeyRound,
  Phone,
  Info,
  LogOut,
  ChevronRight,
  Edit2,
  Camera,
  X,
  CheckCircle2,
  MoreHorizontal,
  Lock,
  Loader2,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  Calendar,
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
import { isCompletionSoundEnabled, setCompletionSoundEnabled } from '../utils/completionSound';
import { ImageCropperModal } from '../components/common/ImageCropperModal';
import { motion, AnimatePresence } from 'framer-motion';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const dispatch = useAppDispatch();
  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutApiMutation();
  const { data: meData } = useGetMeQuery();
  const { data: leaderboardData } = useGetLeaderboardQuery();
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
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070c18] text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-28 sm:pb-32">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-6">
        {/* Page Top Header */}
        <div className="flex items-center justify-between py-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              User Profile & Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your workshop credentials, operational tools and system preferences
            </p>
          </div>
          <button
            onClick={() => profileImageInputRef.current?.click()}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-amber-500 shadow-xs active:scale-95 transition cursor-pointer"
            title="Change photo"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Responsive Grid: 2 Columns on Tablets/Desktops (col-span-4 & col-span-8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN (Profile Summary & Quick Preferences) ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* User Identity Card */}
            <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-5">
              <div className="flex flex-col items-center text-center space-y-3">
                {/* Avatar with Camera Trigger */}
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-amber-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 flex items-center justify-center font-black text-2xl text-amber-700 dark:text-amber-300 shadow-lg ring-2 ring-amber-400/50">
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
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition cursor-pointer"
                    title="Update photo"
                  >
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Name, Role & Mobile */}
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {currentUser?.name || 'Technician'}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 font-mono font-black text-[10px] uppercase tracking-wider border border-amber-400/30">
                      {currentUser?.role || 'WORKER'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-medium">
                      {currentUser?.mobile || 'No Mobile'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-2 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Member since {memberSince}</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions inside Left Card */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Security</span>
                </button>
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-rose-500/20 cursor-pointer"
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

            {/* Section 2: Preferences & Controls */}
            <section className="rounded-3xl bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Preferences & Hardware
              </div>

              {/* Theme Switcher Row */}
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    {theme === 'dark' ? <Moon className="w-4.5 h-4.5 text-amber-400" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      Appearance
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      {theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                    theme === 'dark' ? 'bg-amber-400 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <motion.div
                    layout
                    className="w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-950 shadow-md"
                  />
                </button>
              </div>

              {/* Sound FX Toggle Row */}
              <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    {isSoundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      Audio Feedback
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Completion chimes & haptic sounds
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={handleSoundToggle}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                    isSoundEnabled ? 'bg-amber-400 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <motion.div
                    layout
                    className="w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-950 shadow-md"
                  />
                </button>
              </div>

              {/* Install App / PWA */}
              <button
                onClick={handleInstallClick}
                className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      Install PWA App
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      {isInstalled ? 'App installed on device' : 'Add to home screen for 1-tap launch'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </section>
          </div>

          {/* ── RIGHT COLUMN (Workshop Operations & Tools Bento Grid) ── */}
          <div className="lg:col-span-7 space-y-5">
            {/* Section 1: Workshop & Operations Bento Grid */}
            <section className="rounded-3xl bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Workshop Operations & Modules
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Direct access to garage workflows, logs and administration
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Vehicle Service History */}
                <button
                  onClick={() => navigate('/jobs?view=all', { state: { view: 'all' } })}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 border border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400/40 transition-all text-left flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Vehicle Archives
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Complete lifetime service records & vehicle jobs
                    </p>
                  </div>
                </button>

                {/* 2. Leaderboard & Work Logs */}
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 border border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400/40 transition-all text-left flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Technician Standings
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Completed tasks, mechanic points & leaderboard
                    </p>
                  </div>
                </button>

                {/* Admin Exclusive Modules */}
                {isAdmin && (
                  <>
                    {/* Analytics */}
                    <button
                      onClick={() => navigate('/analytics')}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400/40 transition-all text-left flex items-start gap-3.5 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Workshop Analytics
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Revenue trends, turnaround time & KPI stats
                        </p>
                      </div>
                    </button>

                    {/* Inventory */}
                    <button
                      onClick={() => navigate('/inventory')}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400/40 transition-all text-left flex items-start gap-3.5 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Inventory & Parts
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Manage garage stock, spare parts & pricing
                        </p>
                      </div>
                    </button>

                    {/* Sales / POS */}
                    <button
                      onClick={() => navigate('/sales')}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-500/10 dark:hover:bg-rose-400/10 border border-slate-200/80 dark:border-slate-700/80 hover:border-rose-400/40 transition-all text-left flex items-start gap-3.5 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          Sales & POS Billing
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Customer invoices, payment receipts & bills
                        </p>
                      </div>
                    </button>

                    {/* Team Approvals */}
                    <button
                      onClick={() => navigate('/admin/users')}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-500/10 dark:hover:bg-purple-400/10 border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-400/40 transition-all text-left flex items-start gap-3.5 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Team & Approvals
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug">
                          Worker onboarding, roles & garage access
                        </p>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Support & System Status Banner */}
            <section className="rounded-3xl bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Need Help or Service Support?
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    MOMZ'Z Workshop Hotline • +91 9747382525
                  </p>
                </div>
              </div>
              <a
                href="tel:+919747382525"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shrink-0 hover:bg-emerald-400 transition active:scale-95 shadow-md shadow-emerald-500/20"
              >
                Call Hotline
              </a>
            </section>

          </div>
        </div>
      </main>

      {/* Modern iOS Bottom Sheet Logout Modal (Matching Reference Image) */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xl space-y-5 text-center"
            >
              {/* Drag Pill */}
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Logout
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to log out?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="py-3 px-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="py-3 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-400/25 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Yes, Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" /> Change Password
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500 font-semibold p-2 bg-rose-500/10 rounded-xl">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-500 font-semibold p-2 bg-emerald-500/10 rounded-xl">
                  {successMsg}
                </p>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Enter new password"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Square Avatar Crop Modal */}
      {cropSource && (
        <ImageCropperModal
          isOpen={!!cropSource}
          imageSrc={cropSource}
          aspectRatio={1}
          onClose={() => setCropSource(null)}
          onCropComplete={(croppedBase64) => {
            handleSquareCropComplete(croppedBase64);
            setCropSource(null);
          }}
        />
      )}
    </div>
  );
};
