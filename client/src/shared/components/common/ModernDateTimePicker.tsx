import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { toDateTimeLocal, formatDeliveryDate } from '../../utils/dateUtils';
import { cn } from '../../lib/utils';

interface ModernDateTimePickerProps {
  value: string; // YYYY-MM-DDTHH:mm or ISO string
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const ModernDateTimePicker: React.FC<ModernDateTimePickerProps> = ({
  value,
  onChange,
  label = 'Expected Delivery Date & Time',
  placeholder = 'Select delivery date & time',
  className,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current date or default to now
  const parsedDate = value ? new Date(value) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  // Calendar navigation state
  const [viewDate, setViewDate] = useState(() => (isValidDate ? new Date(parsedDate) : new Date()));

  // Selected date/time components
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => (isValidDate ? new Date(parsedDate) : null));
  const [selectedHour12, setSelectedHour12] = useState<number>(() => {
    if (!isValidDate) return 5;
    const h = parsedDate.getHours();
    return h % 12 === 0 ? 12 : h % 12;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (!isValidDate) return 0;
    return parsedDate.getMinutes();
  });
  const [isPM, setIsPM] = useState<boolean>(() => {
    if (!isValidDate) return true; // Default 5 PM
    return parsedDate.getHours() >= 12;
  });

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDay(d);
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        const h = d.getHours();
        setSelectedHour12(h % 12 === 0 ? 12 : h % 12);
        setSelectedMinute(d.getMinutes());
        setIsPM(h >= 12);
      }
    } else {
      setSelectedDay(null);
    }
  }, [value]);

  // Calendar Grid Calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + 1 + i);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const remainingCells = (7 - ((prevMonthDays.length + currentMonthDays.length) % 7)) % 7;
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => i + 1);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleSelectDay = (day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDay(newDate);
    applyDateTime(newDate, selectedHour12, selectedMinute, isPM);
  };

  const applyDateTime = (day: Date, h12: number, min: number, pm: boolean) => {
    let hours = h12 % 12;
    if (pm) hours += 12;
    const finalDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, min, 0, 0);
    onChange(toDateTimeLocal(finalDate));
  };

  const updateTime = (h12: number, min: number, pm: boolean) => {
    setSelectedHour12(h12);
    setSelectedMinute(min);
    setIsPM(pm);
    const day = selectedDay || new Date();
    if (!selectedDay) setSelectedDay(day);
    applyDateTime(day, h12, min, pm);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const isSelected = (day: number) => {
    if (!selectedDay) return false;
    return (
      selectedDay.getFullYear() === year &&
      selectedDay.getMonth() === month &&
      selectedDay.getDate() === day
    );
  };

  const isPast = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(year, month, day, 0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Header Label */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{label}</span>
          {!required && <span className="font-normal text-slate-400">(optional)</span>}
        </label>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSelectedDay(null);
            }}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition flex items-center gap-0.5"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Trigger Button: Clean 1-Row Standard Height Input */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left group cursor-pointer shadow-xs',
          value
            ? 'bg-amber-500/10 border-amber-400/60 dark:bg-amber-400/10 dark:border-amber-400/40 text-slate-900 dark:text-white'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-500 dark:text-slate-400'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'p-1.5 rounded-lg transition-colors shrink-0',
              value
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-amber-400 group-hover:text-slate-950'
            )}
          >
            <CalendarIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            {value ? (
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono truncate">
                {formatDeliveryDate(value)}
              </p>
            ) : (
              <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 truncate">
                {placeholder}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
            {value ? 'Edit' : 'Select'}
          </span>
        </div>
      </button>

      {/* ── Center-Screen Viewport Modal Dialog (Always Centered in Current Viewport) ── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm z-0"
            />

            {/* Modal Dialog Card (Centered in Active Viewport) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-[340px] sm:max-w-[350px] p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-950/40 dark:shadow-black/80 space-y-3.5"
            >
              {/* Header: Month & Year Navigator + Close X */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {monthNames[month]} {year}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setViewDate(today);
                      handleSelectDay(today.getDate());
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-400 hover:text-slate-950 transition"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-[10px] font-mono font-bold text-slate-400 uppercase py-0.5">
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Prev month days */}
                {prevMonthDays.map((d) => (
                  <span key={`prev-${d}`} className="h-8 flex items-center justify-center text-xs text-slate-300 dark:text-slate-600 select-none">
                    {d}
                  </span>
                ))}

                {/* Current month days */}
                {currentMonthDays.map((day) => {
                  const past = isPast(day);
                  const selected = isSelected(day);
                  const today = isToday(day);

                  return (
                    <button
                      key={`curr-${day}`}
                      type="button"
                      disabled={past}
                      onClick={() => handleSelectDay(day)}
                      className={cn(
                        'h-8 w-8 mx-auto rounded-xl text-xs font-bold transition flex items-center justify-center relative cursor-pointer',
                        past
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-30'
                          : selected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs scale-105'
                          : today
                          ? 'border border-amber-400/80 text-amber-600 dark:text-amber-400 font-black bg-amber-50/50 dark:bg-amber-400/10'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <span>{day}</span>
                      {today && !selected && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}

                {/* Next month days */}
                {nextMonthDays.map((d) => (
                  <span key={`next-${d}`} className="h-8 flex items-center justify-center text-xs text-slate-300 dark:text-slate-600 select-none">
                    {d}
                  </span>
                ))}
              </div>

              {/* ── Time Picker Section ── */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Time</span>
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    {String(selectedHour12).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')} {isPM ? 'PM' : 'AM'}
                  </span>
                </div>

                {/* Hour, Minute, and AM/PM Selector */}
                <div className="flex items-center gap-1.5">
                  {/* Hour dropdown */}
                  <div className="flex-1">
                    <select
                      value={selectedHour12}
                      onChange={(e) => updateTime(Number(e.target.value), selectedMinute, isPM)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')} Hr
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Minute dropdown */}
                  <div className="flex-1">
                    <select
                      value={selectedMinute}
                      onChange={(e) => updateTime(selectedHour12, Number(e.target.value), isPM)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')} Min
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AM/PM Switcher */}
                  <div className="w-20">
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => updateTime(selectedHour12, selectedMinute, false)}
                        className={cn(
                          'flex-1 py-1 rounded-md text-[10px] font-mono font-black transition',
                          !isPM ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        )}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTime(selectedHour12, selectedMinute, true)}
                        className={cn(
                          'flex-1 py-1 rounded-md text-[10px] font-mono font-black transition',
                          isPM ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        )}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-500 transition"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition shadow-md active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Confirm Date</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
