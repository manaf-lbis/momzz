import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  /** The primary page title */
  title: React.ReactNode;
  /** Dedicated badge (e.g. license plate chip, status badge, step indicator) */
  badge?: React.ReactNode;
  /** Optional count or stat rendered cleanly in parentheses (e.g. (14)) */
  count?: number | string;
  /** Optional secondary subtitle or description */
  description?: React.ReactNode;
  /** Optional leading icon */
  icon?: React.ReactNode;
  /** Target route for back navigation (e.g. "/dashboard") */
  backTo?: string;
  /** Deprecated: destination text is no longer shown with the heading */
  backLabel?: string;
  /** Optional custom back click handler */
  onBack?: () => void;
  /** Whether back navigation is enabled */
  showBack?: boolean;
  /** Actions or buttons placed on the right side of the header */
  actions?: React.ReactNode;
  /** Optional sub-row content displayed below the title on mobile */
  subRow?: React.ReactNode;
  /** Optional children rendered in the actions area */
  children?: React.ReactNode;
  /** Additional custom class names for the header container */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  badge,
  count,
  description,
  icon,
  backTo,
  onBack,
  showBack = false,
  actions,
  subRow,
  children,
  className = '',
}) => {
  const navigate = useNavigate();
  const hasBack = Boolean(backTo || onBack || showBack);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`sticky top-0 sm:top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 -mt-4 pt-3 pb-3 sm:pt-3.5 sm:pb-3.5 mb-3 glass-modern-header transition-all flex flex-col gap-2 ${className}`}
    >
      {/* Primary Header Row */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        {/* Left side: Back Button + Icon + Title & Badge */}
        <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-2.5">
          {hasBack && (
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 -ml-1 sm:p-2 sm:-ml-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition active:scale-95 shrink-0 cursor-pointer"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          )}

          {icon && (
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 shadow-2xs">
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white min-w-0 truncate">
                {title}
              </h1>

              {badge && (
                <div className="shrink-0 hidden sm:flex items-center">
                  {badge}
                </div>
              )}

              {count !== undefined && count !== null && (
                <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 shrink-0 select-none font-mono">
                  ({count})
                </span>
              )}
            </div>

            {description && (
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 sm:line-clamp-1 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Essential Action Buttons */}
        {(actions || children) && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {actions}
            {children}
          </div>
        )}
      </div>

      {/* Mobile Sub-row: Shows badge and/or secondary actions below title on narrow screens */}
      {(subRow || badge) && (
        <div className="sm:hidden flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {badge}
          </div>
          {subRow && (
            <div className="flex items-center gap-1.5 shrink-0">
              {subRow}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
