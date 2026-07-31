import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../api/authApi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setCredentials } from '../slice/authSlice';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { ROLES, UserRole } from '../constants/roles';
import { Wrench, User, Phone, Lock, AlertCircle, Shield, Briefcase } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.WORKER);
  const [errorMsg, setErrorMsg] = useState('');

  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !mobile || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    try {
      const response = await register({ name, mobile, password, role }).unwrap();
      if (response.success && response.data) {
        const token = response.data.token || response.data.accessToken;
        dispatch(
          setCredentials({
            user: response.data.user,
            token,
          })
        );
        navigate('/');
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Registration failed. Mobile number may already exist.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background hazard stripes accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-hazard-stripes"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-yellow-400 flex items-center justify-center text-zinc-950 shadow-yellow-glow">
            <Wrench className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-zinc-100 uppercase font-sans">
          JOIN <span className="text-yellow-400">MOMZZ</span>
        </h2>
        <p className="mt-1 text-center text-xs font-mono text-zinc-400 uppercase tracking-widest">
          NEW USER REGISTRATION & ROLE PROPOSITION
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
              label="Full Name"
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />

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
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            {/* Role Selection Tabs */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                System Role Assignment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole(ROLES.WORKER)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-mono font-bold uppercase transition-all ${
                    role === ROLES.WORKER
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-yellow-glow'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Briefcase className="w-4 h-4" /> Worker
                </button>
                <button
                  type="button"
                  onClick={() => setRole(ROLES.ADMIN)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-mono font-bold uppercase transition-all ${
                    role === ROLES.ADMIN
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-yellow-glow'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Shield className="w-4 h-4" /> Admin
                </button>
              </div>
              <p className="text-[11px] font-mono text-zinc-500 mt-1">
                {role === ROLES.WORKER
                  ? '* Workers require approval from an existing Admin before accessing job cards.'
                  : '* Admins gain immediate full administrative access.'}
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                Register Account
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400 font-mono">
            Already registered?{' '}
            <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
