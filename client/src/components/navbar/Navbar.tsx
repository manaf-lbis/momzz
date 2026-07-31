import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logout } from '../../slice/authSlice';
import { Badge } from '../common/Badge';
import { Wrench, ShieldCheck, LogOut, UserCheck, Clock } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, isApproved, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!isAuthenticated || !user) return null;

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center text-zinc-950 font-black text-xl shadow-yellow-glow transform group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-wider uppercase text-zinc-100 flex items-center gap-1.5">
                MOMZZ <span className="text-yellow-400 text-xs px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/30">GARAGE</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 block -mt-1 tracking-widest">
                VEHICLE & TASK COMMAND CENTER
              </span>
            </div>
          </Link>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            {/* Role & Approval Badge */}
            <div className="hidden sm:flex items-center gap-2">
              {isAdmin ? (
                <Badge variant="yellow" className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ADMIN
                </Badge>
              ) : (
                <Badge variant="zinc">WORKER</Badge>
              )}

              {isApproved ? (
                <Badge variant="green" className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> VERIFIED
                </Badge>
              ) : (
                <Badge variant="red" className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> PENDING APPROVAL
                </Badge>
              )}
            </div>

            {/* Admin Approvals Link */}
            {isAdmin && (
              <Link
                to="/admin/approvals"
                className="text-xs font-mono text-yellow-400 hover:text-yellow-300 font-semibold underline underline-offset-4 tracking-wider uppercase"
              >
                Manage Approvals
              </Link>
            )}

            {/* User Details */}
            <div className="text-right hidden md:block border-l border-zinc-800 pl-4">
              <p className="text-sm font-bold text-zinc-200">{user.name}</p>
              <p className="text-xs font-mono text-zinc-400">{user.mobile}</p>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
