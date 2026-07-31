import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logout } from '../slice/authSlice';
import { useLogoutApiMutation } from '../api/authApi';
import { Button } from '../components/common/Button';

export const UnapprovedWorkerHome: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutApiMutation();

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch (e) {
      // Ignore API logout errors
    } finally {
      dispatch(logout());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-yellow-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-400"></div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-400">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono font-bold tracking-wider uppercase">
              <ShieldAlert className="w-3.5 h-3.5" /> ACCOUNT PENDING APPROVAL
            </div>
            
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100 uppercase">
              WELCOME, <span className="text-yellow-400">{user?.name}</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed pt-2">
              Your technician account registration has been submitted successfully. An administrator must approve your account before you can access job cards and tasks.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Mobile Number:</span>
              <span className="text-zinc-200 font-bold">{user?.mobile}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Requested Role:</span>
              <span className="text-yellow-400 uppercase font-bold">{user?.role}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Approval Status:</span>
              <span className="text-amber-400 font-bold uppercase">Pending Admin Review</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
