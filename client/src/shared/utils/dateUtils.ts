/**
 * Date and Expected Delivery utility helpers
 */

/**
 * Converts a Date or ISO string into YYYY-MM-DDTHH:mm format for HTML datetime-local input
 */
export const toDateTimeLocal = (date?: Date | string | null): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Generates preset Date values in datetime-local format
 */
export const getDeliveryPreset = (
  preset: '2h' | '4h' | 'today_evening' | 'tomorrow_morning' | 'tomorrow_evening' | '2days'
): string => {
  const now = new Date();

  switch (preset) {
    case '2h': {
      const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
      return toDateTimeLocal(d);
    }
    case '4h': {
      const d = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
      return toDateTimeLocal(d);
    }
    case 'today_evening': {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      if (d.getTime() <= now.getTime()) {
        d.setHours(now.getHours() + 2, 0, 0, 0);
      }
      return toDateTimeLocal(d);
    }
    case 'tomorrow_morning': {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return toDateTimeLocal(d);
    }
    case 'tomorrow_evening': {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      return toDateTimeLocal(d);
    }
    case '2days': {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(17, 0, 0, 0);
      return toDateTimeLocal(d);
    }
    default:
      return toDateTimeLocal(now);
  }
};

/**
 * Format expected delivery date into human friendly string
 */
export const formatDeliveryDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
};

export interface DeliveryStatusInfo {
  status: 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED' | 'READY' | 'NONE';
  label: string;
  shortLabel: string;
  badgeClass: string;
  textClass: string;
  isOverdue: boolean;
  isUrgent: boolean;
}

/**
 * Calculates delivery status badge, countdown, and color classes
 */
export const getDeliveryStatusInfo = (
  dateVal?: string | Date | null,
  isCompleted: boolean = false
): DeliveryStatusInfo => {
  if (!dateVal) {
    return {
      status: 'NONE',
      label: 'No Delivery Set',
      shortLabel: 'No Date',
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      textClass: 'text-zinc-400',
      isOverdue: false,
      isUrgent: false,
    };
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    return {
      status: 'NONE',
      label: 'Invalid Date',
      shortLabel: 'Invalid',
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      textClass: 'text-zinc-400',
      isOverdue: false,
      isUrgent: false,
    };
  }

  if (isCompleted) {
    return {
      status: 'READY',
      label: `Ready (Delivery: ${formatDeliveryDate(d)})`,
      shortLabel: 'Delivered / Ready',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-500/10',
      textClass: 'text-emerald-400',
      isOverdue: false,
      isUrgent: false,
    };
  }

  const now = Date.now();
  const diffMs = d.getTime() - now;

  if (diffMs < 0) {
    // Overdue
    const overdueMinutes = Math.floor(Math.abs(diffMs) / 60000);
    const overdueHours = Math.floor(overdueMinutes / 60);
    const overdueDays = Math.floor(overdueHours / 24);

    let overdueStr = '';
    if (overdueDays > 0) overdueStr = `${overdueDays}d overdue`;
    else if (overdueHours > 0) overdueStr = `${overdueHours}h overdue`;
    else overdueStr = `${Math.max(1, overdueMinutes)}m overdue`;

    return {
      status: 'OVERDUE',
      label: `Delayed • ${overdueStr} (${formatDeliveryDate(d)})`,
      shortLabel: overdueStr,
      badgeClass: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse shadow-sm shadow-rose-500/20',
      textClass: 'text-rose-400',
      isOverdue: true,
      isUrgent: true,
    };
  }

  const minutesLeft = Math.floor(diffMs / 60000);
  const hoursLeft = Math.floor(minutesLeft / 60);

  if (minutesLeft <= 180) {
    // Due soon (within 3 hours)
    let leftStr = '';
    if (hoursLeft > 0) leftStr = `${hoursLeft}h ${minutesLeft % 60}m left`;
    else leftStr = `${minutesLeft}m left`;

    return {
      status: 'DUE_SOON',
      label: `Due Soon • ${leftStr} (${formatDeliveryDate(d)})`,
      shortLabel: leftStr,
      badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-sm shadow-amber-500/20',
      textClass: 'text-amber-400',
      isOverdue: false,
      isUrgent: true,
    };
  }

  // Normal scheduled
  return {
    status: 'SCHEDULED',
    label: `Delivery: ${formatDeliveryDate(d)}`,
    shortLabel: formatDeliveryDate(d),
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs',
    textClass: 'text-sky-400',
    isOverdue: false,
    isUrgent: false,
  };
};
