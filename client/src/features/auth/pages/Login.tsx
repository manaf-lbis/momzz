import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../api/authApi';
import { useAppDispatch } from '../../../shared/hooks/useAppDispatch';
import { setCredentials } from '../store/authSlice';
import { Input } from '../../../shared/components/common/Input';
import { Button } from '../../../shared/components/common/Button';
import { Phone, Lock, AlertCircle } from 'lucide-react';
import { FluidCanvasBackground } from '../../../shared/components/common/FluidCanvasBackground';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';

export const Login: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!mobile || !password) {
      setErrorMsg('Please provide both mobile number and password.');
      return;
    }

    try {
      const response = await login({ mobile, password }).unwrap();
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
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans">
      {/* ── Background Canvas ── */}
      <FluidCanvasBackground />

      {/* ── Top Floating Controls ── */}
      <div className="absolute top-4 right-4 z-20">
        <AnimatedThemeToggle variant="icon-only" />
      </div>

      {/* ── Brand Header ── */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="MOMZ'Z Logo"
            className="w-14 h-14 rounded-2xl object-cover bg-black border border-slate-200 dark:border-white/15 shadow-md transform hover:scale-105 transition-all"
          />
        </div>
        <h2 className="mt-4 text-center text-3xl font-black tracking-wider uppercase font-display text-slate-900 dark:text-white">
          MOMZ<span className="text-amber-500 dark:text-amber-400 font-black">'Z</span> AUTO
        </h2>
        <p className="mt-1 text-center text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          GARAGE WORKSPACE SIGN IN
        </p>
      </div>

      {/* ── Login Card ── */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-modern-card relative overflow-hidden py-8 px-6 sm:px-10 rounded-3xl shadow-xl hover:border-amber-400/40 transition-all">
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Mobile Phone Number"
              type="text"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              icon={<Phone className="w-4 h-4 text-amber-500" />}
              required
            />

            <Input
              label="Account Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4 text-amber-500" />}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="font-bold py-3 text-sm">
                Sign In to Workspace
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
            New technician or staff?{' '}
            <Link to="/auth" className="text-amber-600 dark:text-amber-400 hover:underline font-bold">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
