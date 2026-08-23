import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  Home,
  PlusCircle,
  Trophy,
  User,
} from 'lucide-react';
import { Dock, DockIcon } from '../magicui/Dock';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

export const QuickAccessDock: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Only display dock when user is authenticated
  if (!user) return null;

  const currentPath = location.pathname;

  return (
    <aside
      aria-label="Quick Access Menu"
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="pointer-events-auto"
      >
        <Dock
          magnification={50}
          distance={100}
          direction="bottom"
          className="px-2 sm:px-3.5 py-1.5 sm:py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-slate-900/20 dark:shadow-black/70 ring-1 ring-black/5 dark:ring-white/10 gap-1.5 sm:gap-2.5 rounded-full"
        >
          {/* 1. Dashboard */}
          <DockIcon
            size={40}
            magnification={50}
            title="Dashboard"
            active={currentPath === '/dashboard'}
            onClick={() => navigate('/dashboard')}
          >
            <div className="relative flex flex-col items-center justify-center">
              <Home className="w-4.5 h-4.5 text-amber-500 dark:text-amber-400" />
              {currentPath === '/dashboard' && (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400"
                />
              )}
            </div>
          </DockIcon>

          {/* 2. My Jobs */}
          <DockIcon
            size={40}
            magnification={50}
            title="My Jobs"
            active={currentPath === '/jobs' || (currentPath.startsWith('/jobs/') && !currentPath.includes('/create'))}
            onClick={() => navigate('/jobs')}
          >
            <div className="relative flex flex-col items-center justify-center">
              <Car className="w-4.5 h-4.5 text-sky-500 dark:text-sky-400" />
              {(currentPath === '/jobs' || (currentPath.startsWith('/jobs/') && !currentPath.includes('/create'))) && (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-sky-500 dark:bg-sky-400"
                />
              )}
            </div>
          </DockIcon>

          {/* 3. Add Job (if Admin) */}
          {isAdmin && (
            <DockIcon
              size={40}
              magnification={50}
              title="Add Job"
              active={currentPath === '/jobs/create'}
              onClick={() => navigate('/jobs/create')}
            >
              <div className="relative flex flex-col items-center justify-center">
                <PlusCircle className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                {currentPath === '/jobs/create' && (
                  <motion.span
                    layoutId="dock-pill"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                  />
                )}
              </div>
            </DockIcon>
          )}

          {/* 4. Leaderboard */}
          <DockIcon
            size={40}
            magnification={50}
            title="Leaderboard"
            active={currentPath === '/leaderboard'}
            onClick={() => navigate('/leaderboard')}
          >
            <div className="relative flex flex-col items-center justify-center">
              <Trophy className="w-4.5 h-4.5 text-yellow-500 dark:text-yellow-400" />
              {currentPath === '/leaderboard' && (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-yellow-500 dark:bg-yellow-400"
                />
              )}
            </div>
          </DockIcon>

          {/* 5. Profile */}
          <DockIcon
            size={40}
            magnification={50}
            title="Profile"
            active={currentPath === '/profile'}
            onClick={() => navigate('/profile')}
          >
            <div className="relative flex flex-col items-center justify-center">
              <User className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" />
              {currentPath === '/profile' && (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400"
                />
              )}
            </div>
          </DockIcon>
        </Dock>
      </motion.div>
    </aside>
  );
};
