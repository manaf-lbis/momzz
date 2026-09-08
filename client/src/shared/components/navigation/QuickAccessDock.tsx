import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Car,
  Clock,
  Package,
  Trophy,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Dock, DockIcon, DockSeparator } from '../magicui/Dock';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

export const QuickAccessDock: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!user) return null;

  const currentPath = location.pathname;

  // Hide on public tracker / camera capture pages
  if (
    currentPath === '/track' ||
    currentPath.endsWith('/photo') ||
    currentPath.endsWith('/capture')
  ) {
    return null;
  }

  const isHomeActive = currentPath === '/dashboard' || currentPath === '/';
  const isVehiclesActive =
    currentPath === '/jobs' ||
    (currentPath.startsWith('/jobs/') && !currentPath.includes('/create'));
  const isLogsActive = currentPath === '/work-logs';
  const isInventoryActive = currentPath.startsWith('/inventory') || currentPath.startsWith('/sales');
  const isLeaderboardActive = currentPath === '/leaderboard' || currentPath === '/analytics';
  const isProfileActive = currentPath === '/profile';

  const initialLetter = user.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <>
      <aside
        aria-label="Floating Navigation Dock"
        className="fixed bottom-3 sm:bottom-5 inset-x-0 z-50 flex justify-center pointer-events-none px-3 select-none"
      >
        <Dock
          direction="bottom"
          className="pointer-events-auto shadow-[0_16px_40px_-6px_rgba(0,0,0,0.22)] dark:shadow-[0_20px_50px_-8px_rgba(0,0,0,0.85)] border-white/90 dark:border-white/10"
        >
          {/* 1. Home / Dashboard */}
          <DockIcon
            title="Dashboard"
            active={isHomeActive}
            onClick={() => navigate('/dashboard')}
          >
            <Home
              className={`w-5 h-5 transition-transform ${
                isHomeActive
                  ? 'text-slate-950 dark:text-slate-950 stroke-[2.4]'
                  : 'text-slate-600 dark:text-slate-300 group-hover:scale-110'
              }`}
            />
          </DockIcon>

          {/* 2. Vehicles / Jobs */}
          <DockIcon
            title="Vehicles"
            active={isVehiclesActive}
            onClick={() => navigate('/jobs')}
          >
            <Car
              className={`w-5 h-5 transition-transform ${
                isVehiclesActive
                  ? 'text-slate-950 dark:text-slate-950 stroke-[2.4]'
                  : 'text-slate-600 dark:text-slate-300 group-hover:scale-110'
              }`}
            />
          </DockIcon>

          {/* 3. Work Logs */}
          <DockIcon
            title="Work Logs"
            active={isLogsActive}
            onClick={() => navigate('/work-logs')}
          >
            <Clock
              className={`w-5 h-5 transition-transform ${
                isLogsActive
                  ? 'text-slate-950 dark:text-slate-950 stroke-[2.4]'
                  : 'text-slate-600 dark:text-slate-300 group-hover:scale-110'
              }`}
            />
          </DockIcon>

          {/* 4. Inventory */}
          <DockIcon
            title="Inventory"
            active={isInventoryActive}
            onClick={() => navigate('/inventory')}
          >
            <Package
              className={`w-5 h-5 transition-transform ${
                isInventoryActive
                  ? 'text-slate-950 dark:text-slate-950 stroke-[2.4]'
                  : 'text-slate-600 dark:text-slate-300 group-hover:scale-110'
              }`}
            />
          </DockIcon>

          {/* 5. Leaderboard */}
          <DockIcon
            title="Leaderboard"
            active={isLeaderboardActive}
            onClick={() => navigate('/leaderboard')}
          >
            <Trophy
              className={`w-5 h-5 transition-transform ${
                isLeaderboardActive
                  ? 'text-slate-950 dark:text-slate-950 stroke-[2.4]'
                  : 'text-slate-600 dark:text-slate-300 group-hover:scale-110'
              }`}
            />
          </DockIcon>

          {/* Divider */}
          <DockSeparator />

          {/* 6. Quick Search */}
          <DockIcon
            title="Quick Search (⌘K)"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform group-hover:scale-110" />
          </DockIcon>

          {/* 7. Profile */}
          <DockIcon
            title={user.name ? `${user.name} (Profile)` : 'Profile'}
            active={isProfileActive}
            onClick={() => navigate('/profile')}
          >
            {user.profileImageUrl ? (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-amber-400/40 shadow-2xs">
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-2xs">
                {initialLetter}
              </div>
            )}
          </DockIcon>
        </Dock>
      </aside>

      {/* Global Search Dialog triggered from Dock */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

