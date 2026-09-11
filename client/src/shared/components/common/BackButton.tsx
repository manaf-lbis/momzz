import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface BackButtonProps {
  /** Target route to navigate to. If omitted and no onClick, defaults to navigate(-1). */
  to?: string;
  /** Text to display alongside the arrow. Defaults to "Back". Pass empty string to show only arrow. */
  label?: string;
  /** Optional custom click handler. If provided, overrides default navigation. */
  onClick?: () => void;
  /** Extra CSS classes */
  className?: string;
  /** Arrow icon size in pixels (default: 18) */
  iconSize?: number;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = 'Back',
  onClick,
  className = '',
  iconSize = 18,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold transition-colors duration-200 cursor-pointer select-none active:scale-95 shrink-0 ${className}`}
      aria-label={label ? `Back to ${label}` : 'Go back'}
    >
      <ArrowLeft
        size={iconSize}
        className="transition-transform duration-200 group-hover:-translate-x-1 stroke-[2.2]"
      />
      {label && (
        <span className="text-xs sm:text-sm font-bold tracking-tight">
          {label}
        </span>
      )}
    </button>
  );
};

export default BackButton;
