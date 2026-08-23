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
      className="fixed bottom-3 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-3"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="pointer-events-auto"
      >
        <Dock
          magnification={52}
          distance={110}
          direction="bottom"
          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-slate-900/15 dark:shadow-black/60 ring-1 ring-black/5 dark:ring-white/10 gap-1.5 sm:gap-2.5"
        >
          {/* 1. Dashboard */}
          <DockIcon
            size={38}
            magnification={52}
            title="Dashboard"
            active={currentPath === '/dashboard'}
            onClick={() => navigate('/dashboard')}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
          </DockIcon>

          {/* 2. My Jobs */}
          <DockIcon
            size={38}
            magnification={52}
            title="My Jobs"
            active={currentPath === '/jobs' || currentPath.startsWith('/jobs/')}
            onClick={() => navigate('/jobs')}
          >
            <Car className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 dark:text-sky-400" />
          </DockIcon>

          {/* 3. Add Job (if Admin) */}
          {isAdmin && (
            <DockIcon
              size={38}
              magnification={52}
              title="Add Job"
              active={currentPath === '/jobs/create'}
              onClick={() => navigate('/jobs/create')}
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
            </DockIcon>
          )}

          {/* 4. Leaderboard */}
          <DockIcon
            size={38}
            magnification={52}
            title="Leaderboard"
            active={currentPath === '/leaderboard'}
            onClick={() => navigate('/leaderboard')}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 dark:text-yellow-400" />
          </DockIcon>

          {/* 5. Profile */}
          <DockIcon
            size={38}
            magnification={52}
            title="Profile"
            active={currentPath === '/profile'}
            onClick={() => navigate('/profile')}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
          </DockIcon>
        </Dock>
      </motion.div>
    </aside>
  );
};
