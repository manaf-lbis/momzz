import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Button } from '../components/common/Button';
import { User, Award, CheckCircle2, ShieldCheck, LogOut, Phone } from 'lucide-react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logout } from '../slice/authSlice';
import { useLogoutApiMutation, useGetMeQuery, useGetLeaderboardQuery } from '../api/authApi';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutApiMutation();
  const { data: meData } = useGetMeQuery();
  const { data: leaderboardData } = useGetLeaderboardQuery();

  const currentUser = meData?.data || user;

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 space-y-6">
        {/* Profile Card Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-400"></div>

          <div className="w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-400 shadow-yellow-glow">
            <User className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 uppercase">
              {currentUser?.name}
            </h1>
            <p className="text-xs font-mono text-zinc-400 mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {currentUser?.mobile}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono font-bold uppercase">
            <ShieldCheck className="w-3.5 h-3.5" /> {currentUser?.role}
          </div>
        </div>

        {/* Lifetime Stats & Leaderboard Rank */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-2xl font-extrabold font-mono text-zinc-100">
              {currentUser?.taskCount ?? 0}
            </p>
            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Total Tasks Completed
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center space-y-1 shadow-lg">
            <Award className="w-6 h-6 text-yellow-400 mx-auto" />
            <p className="text-2xl font-extrabold font-mono text-yellow-400">
              {currentRank}
            </p>
            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Garage Leaderboard Rank
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out of Garage System
          </Button>
        </div>
      </main>
    </div>
  );
};
