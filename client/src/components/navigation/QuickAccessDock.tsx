import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  Home,
  PlusCircle,
  Trophy,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

export const QuickAccessDock: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  if (!user) return null;

  const currentPath = location.pathname;

  const navItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      isActive: currentPath === '/dashboard',
    },
    {
      id: 'jobs',
      title: 'My Jobs',
      icon: Car,
      path: '/jobs',
      isActive: currentPath === '/jobs' || (currentPath.startsWith('/jobs/') && !currentPath.includes('/create')),
    },
    {
      id: 'search',
      title: 'Global Search',
      icon: Search,
      action: () => setIsSearchModalOpen(true),
      isActive: isSearchModalOpen,
    },
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
    <>
      <aside
        aria-label="Quick Access Menu"
        className="fixed bottom-0 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]"
      >
        <motion.nav
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="pointer-events-auto flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/15 dark:shadow-black/70 ring-1 ring-black/5 dark:ring-white/10"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                aria-label={item.title}
                title={item.title}
                className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full transition-all duration-200 active:scale-90 cursor-pointer ${
                  item.isActive ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {/* Active Tab Background Capsule */}
                {item.isActive && (
                  <motion.div
                    layoutId="active-dock-pill"
                    className="absolute inset-0 rounded-full bg-amber-400 dark:bg-amber-400/90 shadow-md shadow-amber-400/30"
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                  />
                )}

                {/* Icon / Avatar View */}
                <div className="relative z-10 flex items-center justify-center">
                  {item.isProfile ? (
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex items-center justify-center font-black text-xs transition-transform ${
                        item.isActive
                          ? 'border-2 border-slate-950 text-slate-950 bg-amber-300'
                          : 'border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
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
                          : 'stroke-[1.8]'
                      }`}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </motion.nav>
      </aside>

      {/* Global Search Modal Triggered on Mobile Dock */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};
