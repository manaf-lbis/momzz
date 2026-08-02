import React, { useState } from 'react';
import { Phone, Lock, User, ArrowRight, ShieldAlert, Wrench, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoginMutation, useRegisterMutation } from '../api/authApi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setCredentials } from '../slice/authSlice';
import { useAppSelector } from '../hooks/useAppSelector';
import { InstallAppBanner } from '../components/common/InstallAppBanner';

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
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between transition-colors">
      <InstallAppBanner />

      <div className="flex-1 flex flex-col justify-center items-center p-4">
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
            className="w-16 h-16 rounded-2xl object-cover bg-black border border-zinc-800 shadow-xl mx-auto mb-3"
          />
          <h1 className="text-2xl font-extrabold tracking-wider uppercase text-zinc-900 dark:text-zinc-100">
            MOMZ<span className="text-amber-600 dark:text-yellow-400">'Z</span> AUTO GARAGE
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Vehicle &amp; Task Command Center</p>
        </motion.div>

        {/* Main Form Card with Framer Motion */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm industrial-card rounded-3xl p-6 shadow-xl relative overflow-hidden"
        >
          {/* Toggle Switch */}
          <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                isLogin
                  ? 'bg-amber-400 dark:bg-yellow-400 text-zinc-950 shadow-md'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
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
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                !isLogin
                  ? 'bg-amber-400 dark:bg-yellow-400 text-zinc-950 shadow-md'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
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
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Animated Name Field (Signup Only) */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Raju Kumar"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs industrial-input font-medium"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Field */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="mobile"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs industrial-input font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-xl py-2.5 pl-10 pr-4 text-xs industrial-input font-mono"
                />
              </div>
            </div>

            {/* Submit Button with Motion Tap Animation & Loading Spinner */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-amber-400 dark:bg-yellow-400 hover:bg-amber-300 dark:hover:bg-yellow-300 text-zinc-950 font-mono font-bold text-xs py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
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

        <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-6 text-center">
          Secured with Token Rotation • 30-Day Living Session
        </p>
        <Link to="/track" className="block mt-3 text-center text-xs font-mono text-amber-600 dark:text-yellow-400 hover:underline">Track a vehicle service</Link>
      </div>
    </div>
  );
};
