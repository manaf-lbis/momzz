import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../api/authApi';
import { useAppDispatch } from '../../../shared/hooks/useAppDispatch';
import { setCredentials } from '../store/authSlice';
import { Input } from '../../../shared/components/common/Input';
import { Button } from '../../../shared/components/common/Button';
import { Wrench, Phone, Lock, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-hazard-stripes"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-yellow-400 flex items-center justify-center text-zinc-950 shadow-yellow-glow">
            <Wrench className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-zinc-100 uppercase font-sans">
          MOMZ'Z
        </h2>
        <p className="mt-1 text-center text-xs font-mono text-zinc-400 uppercase tracking-widest">
          AUTHENTICATE SYSTEM ACCESS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="industrial-card py-8 px-6 shadow-2xl rounded-xl sm:px-10">
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center gap-2 text-red-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
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
              icon={<Phone className="w-4 h-4" />}
              required
            />

            <Input
              label="Account Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                Access System
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400 font-mono">
            New technician or admin?{' '}
            <Link to="/auth" className="text-yellow-400 hover:text-yellow-300 font-semibold underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
