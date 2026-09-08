import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  /** The primary page title */
  title: React.ReactNode;
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
  /** Optional children rendered in the actions area */
  children?: React.ReactNode;
  /** Additional custom class names for the header container */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  count,
  description,
  icon,
  backTo,
  onBack,
  showBack = false,
  actions,
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

  const titleContent = (
    <span className="flex items-center gap-2 min-w-0">
      <span className="truncate">{title}</span>
      {count !== undefined && count !== null && (
        <span className="text-sm sm:text-base font-semibold text-slate-400 dark:text-slate-500 shrink-0 select-none">
          ({count})
        </span>
      )}
    </span>
  );

  return (
    <header
      className={`sticky top-0 sm:top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 -mt-4 pt-3 pb-3 mb-3 backdrop-blur-2xl bg-white/85 dark:bg-[#070812]/85 border-b border-slate-200/70 dark:border-white/10 transition-all flex flex-row items-center justify-between gap-2 sm:gap-4 shadow-2xs ${className}`}
    >
      {/* Left side: Back Button + Title + optional subtitle */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="min-w-0 flex items-center">
          {hasBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="group inline-flex items-center gap-2 sm:gap-2.5 text-left transition-colors cursor-pointer select-none active:scale-[0.98] text-slate-900 dark:text-white min-w-0 max-w-full"
              aria-label="Go back"
            >
              <ArrowLeft
                className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:-translate-x-1 stroke-[2.5] text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0"
              />

              {icon && (
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 shadow-2xs">
                  {icon}
                </div>
              )}

              <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight min-w-0 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {titleContent}
              </h1>
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-full">
              {icon && (
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 shadow-2xs">
                  {icon}
                </div>
              )}
              <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white min-w-0 truncate">
                {titleContent}
              </h1>
            </div>
          )}
        </div>

        {description && (
          <p
            className={`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5 ${
              hasBack ? 'pl-6 sm:pl-7.5' : ''
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {/* Right side: Essential Action Buttons (ALWAYS ON SAME LINE) */}
      {(actions || children) && (
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}
          {children}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
