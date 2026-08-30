import React, { useState } from 'react';
import { Phone, Lock, User, ArrowRight, ShieldAlert, Wrench, Loader2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoginMutation, useRegisterMutation } from '../api/authApi';
import { useAppDispatch } from '../../../shared/hooks/useAppDispatch';
import { setCredentials } from '../store/authSlice';
import { useAppSelector } from '../../../shared/hooks/useAppSelector';
import { InstallAppBanner } from '../../../shared/components/common/InstallAppBanner';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    role: 'worker',
  });

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [errorMsg, setErrorMsg] = useState('');

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegLoading }] = useRegisterMutation();

  const isSubmitting = isLoginLoading || isRegLoading;

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    if (!isLogin && (!formData.name || formData.name.trim().length < 2)) {
      setErrorMsg('Name must be at least 2 characters long.');
      return false;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(formData.mobile)) {
      setErrorMsg('Mobile number must be exactly 10 digits.');
      return false;
    }
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!passwordRegex.test(formData.password)) {
      setErrorMsg('Password must be at least 8 characters, include a number and a special character.');
      return false;
    }
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validateForm()) return;
    try {
      if (isLogin) {
        const response = await login({ mobile: formData.mobile, password: formData.password }).unwrap();
        if (response.success && response.data) {
          const token = response.data.accessToken || response.data.token || '';
          dispatch(
            setCredentials({
              user: response.data.user,
              token,
              refreshToken: response.data.refreshToken,
            })
          );
          navigate('/');
        }
      } else {
        const response = await register(formData).unwrap();
        if (response.success && response.data) {
          const token = response.data.accessToken || response.data.token || '';
          dispatch(
            setCredentials({
              user: response.data.user,
              token,
              refreshToken: response.data.refreshToken,
            })
          );
          navigate('/');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white flex flex-col justify-between overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200 relative">
      {/* Ambient background light */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.12)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_65%)]" />
        <Meteors number={12} />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <AnimatedThemeToggle variant="icon-only" />
      </div>
      <InstallAppBanner />

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-4">
        {/* App Branding */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-6"
        >
          <img
            src="/logo.png"
            alt="MOMZ'Z AUTOMOTIVE"
            className="w-16 h-16 rounded-2xl object-cover bg-black border border-slate-200 dark:border-white/10 shadow-2xl mx-auto mb-3"
          />
          <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 dark:text-white">
            MOMZ<span className="text-amber-500 dark:text-amber-400">'Z</span> AUTO GARAGE
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">Vehicle &amp; Task Command Center</p>
        </motion.div>

        {/* Main Bento Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-sm rounded-3xl bg-white/80 dark:bg-white/[0.035] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-6 shadow-2xl overflow-hidden"
        >
          <BorderBeam size={180} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />

          {/* Toggle Switch */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              SIGN UP
            </button>
          </div>

          {/* Error Notification */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Animated Name Field (Signup Only) */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Raju Kumar"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium outline-none focus:border-amber-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Field */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="mobile"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:opacity-95 text-slate-950 font-black text-xs py-3 px-4 rounded-xl shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{isLogin ? 'AUTHENTICATING...' : 'REGISTERING...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'LOG IN' : 'CREATE ACCOUNT'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <Link
          to="/track"
          className="block mt-4 text-center text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline"
        >
          Track a vehicle service →
        </Link>
      </div>
    </div>
  );
};

