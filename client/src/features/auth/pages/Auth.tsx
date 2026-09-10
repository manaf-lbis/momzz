import React, { useState } from 'react';
import { Phone, Lock, User, ArrowRight, ShieldAlert, Wrench, Loader2, Sparkles } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoginMutation, useRegisterMutation } from '../api/authApi';
import { useAppDispatch } from '../../../shared/hooks/useAppDispatch';
import { setCredentials } from '../store/authSlice';
import { useAppSelector } from '../../../shared/hooks/useAppSelector';

import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { TermsAndConditionsModal } from '../../../shared/components/legal/TermsAndConditionsModal';

export const AuthPage = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
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
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegLoading }] = useRegisterMutation();

  const isSubmitting = isLoginLoading || isRegLoading;

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    if (location.pathname === '/register') {
      setIsLogin(false);
    } else if (location.pathname === '/login') {
      setIsLogin(true);
    }
  }, [location.pathname]);

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
    if (!isLogin && !agreeTerms) {
      setErrorMsg('Please agree to the Terms & Conditions to continue.');
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
    <div className="min-h-screen glass-canvas text-slate-900 dark:text-white flex flex-col justify-between overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200 relative">
      {/* Ambient background light */}
      <div className="glass-ambient-glow" aria-hidden="true" />

      <div className="absolute top-4 right-4 z-50">
        <AnimatedThemeToggle variant="icon-only" />
      </div>

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
          className="relative w-full max-w-sm sm:rounded-3xl sm:glass-modern-card sm:p-6 sm:shadow-2xl sm:overflow-hidden p-1 bg-transparent border-0 shadow-none"
        >
          <div className="hidden sm:block pointer-events-none">
            <BorderBeam size={180} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />
          </div>

          {/* Toggle Switch */}
          <div className="grid grid-cols-2 p-1 bg-white/80 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 mb-5 shadow-2xs">
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
              Sign In
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
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-mono flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-modern-input text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  name="mobile"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-modern-input text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-modern-input text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="flex items-center gap-2 pt-1 text-left">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
                />
                <label htmlFor="agreeTerms" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                  I agree to{' '}
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(true)}
                    className="text-amber-500 font-bold underline hover:text-amber-400 cursor-pointer inline"
                  >
                    Terms &amp; Conditions
                  </button>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 rounded-xl glass-gold-btn text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{isLogin ? 'AUTHENTICATING...' : 'REGISTERING...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <Link
          to="/track"
          className="block mt-4 text-center text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline"
        >
          Track a vehicle service →
        </Link>
      </div>

      {/* Terms & Conditions / Image Storage Policy Modal */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setAgreeTerms(true)}
        showAcceptButton={true}
      />
    </div>
  );
};

