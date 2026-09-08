import React from 'react';
import { BackButton } from './BackButton';

export interface PageHeaderProps {
  /** The primary page title */
  title: React.ReactNode;
  /** Optional count or stat rendered cleanly in parentheses (e.g. (14)) without pill badges */
  count?: number | string;
  /** Optional secondary subtitle or description */
  description?: React.ReactNode;
  /** Optional leading icon */
  icon?: React.ReactNode;
  /** Target route for the back button (e.g. "/dashboard") */
  backTo?: string;
  /** Label for the back button. Defaults to undefined (which BackButton defaults to "Back") */
  backLabel?: string;
  /** Optional custom back click handler */
  onBack?: () => void;
  /** Whether to show a back button even if backTo is not specified (calls navigate(-1)) */
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
  backLabel,
  onBack,
  showBack = false,
  actions,
  children,
  className = '',
}) => {
  const hasBack = Boolean(backTo || onBack || showBack);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 ${className}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {hasBack && (
          <BackButton
            to={backTo}
            label={backLabel}
            onClick={onBack}
            className="shrink-0"
          />
        )}

        {icon && (
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 shadow-2xs">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate">
            <span className="truncate">{title}</span>
            {count !== undefined && count !== null && (
              <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 shrink-0 select-none">
                ({count})
              </span>
            )}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate sm:whitespace-normal mt-0.5">
              {description}
            </p>
          )}
        </div>
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
