import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  Clock,
  Package,
  TrendingUp,
  ShieldCheck,
  Users,
  Search,
  Plus,
  Cpu,
  FileText,
  ChevronRight,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../../features/auth/context/ThemeContext';
import { useLeftPanel } from '../../context/LeftPanelContext';
import { useGetPendingWorkersQuery } from '../../../features/auth/api/authApi';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { LEGAL_METADATA } from '../legal/legalContent';

interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: React.ReactNode;
  badgeCount?: number;
}

export const LeftPanel: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { isCollapsed, toggleCollapsed } = useLeftPanel();

  const location = useLocation();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Fetch pending workers count for admin badge
  const { data: pendingWorkersData } = useGetPendingWorkersQuery(undefined, {
    skip: !isAdmin,
  });
  const pendingApprovalsCount = pendingWorkersData?.data?.length ?? 0;

  if (!isAuthenticated || !user) return null;
  if (user.needsTermsAcceptance || user.acceptedTermsVersion !== LEGAL_METADATA.version) {
    return null;
  }

  const currentPath = location.pathname;

  // Hide on public tracker / camera capture pages
  if (
    currentPath === '/track' ||
    currentPath.endsWith('/photo') ||
    currentPath.endsWith('/capture')
  ) {
    return null;
  }

  const isRouteActive = (path: string, exact: boolean = false): boolean => {
    if (exact) {
      return currentPath === path;
    }
    if (path === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard';
    }
    if (path === '/jobs') {
      return (
        currentPath === '/jobs' ||
        (currentPath.startsWith('/jobs/') &&
          !currentPath.includes('/create') &&
          !currentPath.includes('/edit'))
      );
    }
    if (path === '/inventory') {
      return (
        currentPath === '/inventory' ||
        (currentPath.startsWith('/inventory/') && currentPath !== '/inventory/new')
      );
    }
    if (path === '/admin/users') {
      return (
        currentPath.startsWith('/admin/users') ||
        currentPath.startsWith('/users') ||
        currentPath.startsWith('/staff')
      );
    }
    if (path === '/admin/approvals') {
      return currentPath === '/admin/approvals' || currentPath === '/approvals';
    }
    if (path === '/tokens') {
      return currentPath === '/tokens' || currentPath.startsWith('/profile/tokens');
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Main garage items
  const mainNavItems: NavItemConfig[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      exact: false,
    },
    {
      label: 'Vehicles & Jobs',
      path: '/jobs',
      icon: Car,
      exact: false,
    },
    {
      label: 'Work Logs',
      path: '/work-logs',
      icon: Clock,
      exact: true,
    },
    {
      label: 'Spare Parts',
      path: '/inventory',
      icon: Package,
      exact: false,
    },
    {
      label: 'Sales & Billing',
      path: '/sales',
      icon: TrendingUp,
      exact: true,
    },
  ];

  // Admin management items
  const adminNavItems: NavItemConfig[] = [
    {
      label: 'Approvals',
      path: '/admin/approvals',
      icon: ShieldCheck,
      exact: false,
      badgeCount: pendingApprovalsCount,
      badge:
        pendingApprovalsCount > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white shadow-xs animate-pulse">
            {pendingApprovalsCount}
          </span>
        ) : null,
    },
    {
      label: 'Staff & Team',
      path: '/admin/users',
      icon: Users,
      exact: false,
    },
    {
      label: 'Add Inventory',
      path: '/inventory/new',
      icon: PackagePlus,
      exact: true,
    },
  ];

  // Integrations / System
  const systemNavItems: NavItemConfig[] = [
    {
      label: 'AI & MCP Tokens',
      path: '/tokens',
      icon: Cpu,
      exact: false,
      badge: (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold border border-amber-500/20">
          GEMINI
        </span>
      ),
    },
    {
      label: 'Terms & Policies',
      path: '/terms',
      icon: FileText,
      exact: true,
    },
  ];

  const initialLetter = user.name?.charAt(0)?.toUpperCase() || 'U';

  const renderNavGroup = (title: string, items: NavItemConfig[]) => (
    <div className="space-y-1">
      {/* Group header or divider based on collapse state */}
      {!isCollapsed ? (
        <div
          className={`px-3 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors duration-300 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {title}
        </div>
      ) : (
        <div className="my-2 mx-2 border-t border-slate-200/60 dark:border-white/[0.08]" />
      )}

      <div className="space-y-1">
        {items.map((item) => {
          const active = isRouteActive(item.path, item.exact);
          const Icon = item.icon;

          if (isCollapsed) {
            // Icon-only Rail button with floating hover tooltip
            return (
              <div key={item.path} className="relative group flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                    active
                      ? isDark
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-amber-500/20 text-amber-950 border border-amber-500/40 shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 border border-transparent'
                  }`}
                  aria-label={item.label}
                >
                  {/* Left active glowing indicator bar */}
                  {active && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                      aria-hidden="true"
                    />
                  )}

                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      active
                        ? 'text-amber-500 stroke-[2.3]'
                        : isDark
                        ? 'text-slate-400 group-hover:text-slate-200'
                        : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />

                  {/* Pulsing notification badge dot */}
                  {(item.badgeCount ?? 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#080911] animate-pulse" />
                  )}
                </button>

                {/* Floating tooltip */}
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 flex items-center gap-2 border border-slate-800 dark:border-slate-200"
                >
                  <span>{item.label}</span>
                  {(item.badgeCount ?? 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-rose-500 text-white font-black">
                      {item.badgeCount}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Full Expanded row
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 group cursor-pointer ${
                active
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-200 font-bold border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.12)]'
                    : 'bg-amber-500/15 text-amber-950 font-bold border border-amber-500/40 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 border border-transparent font-medium'
              }`}
            >
              {/* Left active glowing indicator bar */}
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                  aria-hidden="true"
                />
              )}

              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    active
                      ? 'text-amber-500 stroke-[2.3]'
                      : isDark
                      ? 'text-slate-400 group-hover:text-slate-200'
                      : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge ? (
                <div className="shrink-0">{item.badge}</div>
              ) : (
                active && (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* 
        Persistent Left Panel for Large Devices (lg and up)
        Hidden on small devices ("no need that for the small device")
        Supports Collapsed (Icon-only Rail, 80px) and Expanded (Full Drawer, 256-288px)
      */}
      <aside
        aria-label="Garage Left Navigation Panel"
        className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-40 flex-col select-none transition-all duration-300 ease-in-out font-sans shadow-md backdrop-blur-2xl ${
          isCollapsed ? 'w-20' : 'w-64 xl:w-72'
        } ${
          isDark
            ? 'bg-[#080911]/92 border-r border-white/10 text-white'
            : 'bg-white/92 border-r border-slate-200/90 text-slate-900 shadow-slate-200/50'
        }`}
      >
        {/* ── 1. BRAND HEADER & COLLAPSE / EXPAND TOGGLE ── */}
        <div
          className={`p-3 xl:p-4 pb-3 border-b flex flex-col gap-2.5 transition-colors duration-300 ${
            isDark ? 'border-white/[0.08]' : 'border-slate-200/80'
          }`}
        >
          {isCollapsed ? (
            /* Collapsed Header: Centered Logo + Quick Expand Button */
            <div className="flex flex-col items-center gap-2">
              <Link to="/" className="group relative" title="MOMZ'Z AUTO WORKSPACE">
                <img
                  src="/logo.png"
                  alt="MOMZ'Z Logo"
                  className={`w-10 h-10 rounded-xl object-cover bg-black border shadow-sm group-hover:scale-105 group-hover:border-amber-400/60 transition-all shrink-0 ${
                    isDark ? 'border-white/15' : 'border-slate-200'
                  }`}
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${
                    isDark ? 'border-[#080911]' : 'border-white'
                  }`}
                />
              </Link>

              {/* Expand Toggle Button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-white/10 text-slate-400 hover:text-amber-400 hover:bg-white/5'
                    : 'border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-slate-100'
                }`}
                title="Expand Sidebar (Ctrl+B)"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded Header: Brand Title + Collapse Button + Live Status */
            <>
              <div className="flex items-center justify-between gap-2">
                <Link to="/" className="flex items-center gap-3 group min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src="/logo.png"
                      alt="MOMZ'Z Logo"
                      className={`w-9 h-9 rounded-xl object-cover bg-black border shadow-sm group-hover:scale-105 group-hover:border-amber-400/60 transition-all ${
                        isDark ? 'border-white/15' : 'border-slate-200'
                      }`}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${
                        isDark ? 'border-[#080911]' : 'border-white'
                      }`}
                      title="Workshop connected"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-display font-black text-sm tracking-wider uppercase flex items-center gap-1 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      MOMZ<span className="text-amber-500 font-black">'Z</span> AUTO
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold tracking-wider truncate ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      GARAGE WORKSPACE
                    </span>
                  </div>
                </Link>

                {/* Collapse Toggle Button */}
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    isDark
                      ? 'border-white/10 text-slate-400 hover:text-amber-400 hover:bg-white/5'
                      : 'border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-slate-100'
                  }`}
                  title="Collapse Sidebar to Icons (Ctrl+B)"
                  aria-label="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Live Garage Status Pill */}
              <div
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors duration-300 ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.06] text-slate-300'
                    : 'bg-slate-100/90 border-slate-200/80 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  GARAGE LIVE
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  {isAdmin ? 'ADMIN' : 'MECHANIC'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── 2. QUICK SEARCH ── */}
        <div className={isCollapsed ? 'px-2 pt-2.5 pb-1 flex justify-center' : 'px-3 xl:px-4 pt-3 pb-1'}>
          {isCollapsed ? (
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.04] border-white/10 text-amber-400 hover:bg-white/[0.08] hover:border-amber-400/50'
                    : 'bg-slate-100/90 border-slate-200/80 text-amber-600 hover:bg-slate-200/80 hover:border-amber-500/60'
                }`}
                aria-label="Quick Search"
              >
                <Search className="w-4 h-4 text-amber-500" />
              </button>
              <div
                role="tooltip"
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 flex items-center gap-2 border border-slate-800 dark:border-slate-200"
              >
                <span>Quick Search</span>
                <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-800 dark:bg-slate-200 text-slate-300 dark:text-slate-800">
                  ⌘K
                </kbd>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all shadow-2xs group cursor-pointer ${
                isDark
                  ? 'bg-white/[0.04] border-white/10 text-slate-400 hover:border-amber-400/50 hover:text-slate-200'
                  : 'bg-slate-100/90 border-slate-200/80 text-slate-500 hover:border-amber-500/60 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Quick Search...</span>
              </div>
              <kbd
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isDark
                    ? 'bg-white/10 text-slate-400 border-white/10'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* ── 3. QUICK ACTION FOR ADMIN (CREATE JOB) ── */}
        {isAdmin && (
          <div className={isCollapsed ? 'px-2 pt-1 flex justify-center' : 'px-3 xl:px-4 pt-1'}>
            {isCollapsed ? (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => navigate('/jobs/create')}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-xs transition cursor-pointer"
                  aria-label="Create Job Card"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
                <div
                  role="tooltip"
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 border border-slate-800 dark:border-slate-200"
                >
                  Create Job Card
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/jobs/create')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-xs hover:shadow-amber-500/25 active:scale-[0.98] transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Job Card</span>
              </button>
            )}
          </div>
        )}

        {/* ── 4. SCROLLABLE NAVIGATION LINKS ── */}
        <nav
          className={`flex-1 py-2 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-thin ${
            isCollapsed ? 'px-2' : 'px-3 xl:px-4'
          }`}
        >
          {renderNavGroup('Garage Hub', mainNavItems)}

          {isAdmin && renderNavGroup('Operations', adminNavItems)}

          {renderNavGroup('System', systemNavItems)}
        </nav>

        {/* ── 5. USER PROFILE FOOTER ── */}
        <div
          className={`p-2.5 xl:p-3 border-t transition-colors duration-300 ${
            isDark
              ? 'border-white/[0.08] bg-[#0c0d18]/40'
              : 'border-slate-200/80 bg-slate-50/90'
          }`}
        >
          {isCollapsed ? (
            <div className="relative group flex justify-center">
              <Link
                to="/profile"
                className="w-10 h-10 flex items-center justify-center rounded-xl transition cursor-pointer hover:ring-2 hover:ring-amber-500/50"
                aria-label="Profile & Preferences"
              >
                {user.profileImageUrl ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/40 shadow-2xs">
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-2xs">
                    {initialLetter}
                  </div>
                )}
              </Link>
              <div
                role="tooltip"
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 border border-slate-800 dark:border-slate-200 flex flex-col"
              >
                <span>{user.name || 'User'}</span>
                <span className="text-[10px] text-amber-500 font-mono font-normal">
                  {user.role}
                </span>
              </div>
            </div>
          ) : (
            <Link
              to="/profile"
              className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer group ${
                isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-200/60'
              }`}
              title="View Profile & Preferences"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {user.profileImageUrl ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/40 shadow-2xs shrink-0">
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                    {initialLetter}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-bold truncate group-hover:text-amber-500 transition-colors ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {user.name || 'User'}
                  </span>
                  <span
                    className={`text-[10px] font-mono truncate ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )}
        </div>
      </aside>

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};
