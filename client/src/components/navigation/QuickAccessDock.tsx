import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  Home,
  PlusCircle,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

export const QuickAccessDock: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const currentPath = location.pathname;

  const navItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      isActive: currentPath === '/dashboard' || currentPath === '/',
    },
    {
      id: 'jobs',
      title: 'My Jobs',
      icon: Car,
      path: '/jobs',
      isActive: currentPath === '/jobs' || (currentPath.startsWith('/jobs/') && !currentPath.includes('/create')),
    },
    ...(isAdmin
      ? [
          {
            id: 'create',
            title: 'Add Job',
            icon: PlusCircle,
            path: '/jobs/create',
            isActive: currentPath === '/jobs/create',
          },
        ]
      : []),
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      icon: Trophy,
      path: '/leaderboard',
      isActive: currentPath === '/leaderboard',
    },
    {
      id: 'profile',
      title: 'Profile',
      path: '/profile',
      isActive: currentPath === '/profile',
      isProfile: true,
    },
  ];

  const initialLetter = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <aside
      aria-label="Quick Access Menu"
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))]"
    >
      <motion.nav
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%), rgba(12, 14, 28, 0.55)',
          backdropFilter: 'blur(32px) saturate(220%)',
          WebkitBackdropFilter: 'blur(32px) saturate(220%)',
          boxShadow: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4), 0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px -5px rgba(251, 191, 36, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        }}
        className="pointer-events-auto relative flex items-center gap-1.5 sm:gap-2.5 p-1.5 sm:p-2 rounded-full"
      >
        {/* Ambient golden aura behind the glass dock */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-amber-500/15 blur-lg pointer-events-none -z-10" />

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.title}
              title={item.title}
              className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all duration-200 active:scale-90 cursor-pointer ${
                item.isActive
                  ? 'text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {/* Active Tab Background Capsule with Specular Top Highlight */}
              {item.isActive && (
                <motion.div
                  layoutId="active-dock-pill"
                  style={{
                    background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)',
                    boxShadow: '0 4px 20px rgba(251, 191, 36, 0.55), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)',
                  }}
                  className="absolute inset-0 rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}

              {/* Icon / Avatar View */}
              <div className="relative z-10 flex items-center justify-center">
                {item.isProfile ? (
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex items-center justify-center font-black text-xs transition-transform ${
                      item.isActive
                        ? 'border-2 border-slate-950 text-slate-950 bg-amber-300'
                        : 'border border-white/30 bg-white/10 text-white shadow-xs'
                    }`}
                  >
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.name || 'User Profile'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{initialLetter}</span>
                    )}
                  </div>
                ) : Icon ? (
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      item.isActive
                        ? 'stroke-[2.5] text-slate-950 scale-105'
                        : 'stroke-[1.9] text-slate-300'
                    }`}
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </motion.nav>
    </aside>
  );
};
