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
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 ${className}`}
    >
      <div className="min-w-0">
        {hasBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center gap-2.5 sm:gap-3 text-left transition-colors cursor-pointer select-none active:scale-[0.99] text-slate-900 dark:text-white"
            aria-label="Go back"
          >
            <ArrowLeft
              className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:-translate-x-1.5 stroke-[2.5] text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0"
            />

            {icon && (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 shadow-2xs">
                {icon}
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 min-w-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {titleContent}
            </h1>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {icon && (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 shadow-2xs">
                {icon}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
              {titleContent}
            </h1>
          </div>
        )}

        {description && (
          <p
            className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate sm:whitespace-normal mt-1 ${
              hasBack ? 'pl-7.5 sm:pl-9' : ''
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {(actions || children) && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
