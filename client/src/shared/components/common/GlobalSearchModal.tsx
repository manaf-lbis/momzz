import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Car,
  CheckCircle2,
  Clock,
  Wrench,
  User,
  X,
  Sparkles,
  ChevronRight,
  Command,
} from 'lucide-react';
import { useGetJobCardsQuery, JobCardData } from '../../../features/jobs/api/jobApi';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: jobsResponse } = useGetJobCardsQuery({ limit: 200 }, { skip: !isOpen });
  const allJobs: JobCardData[] = Array.isArray(jobsResponse?.data)
    ? (jobsResponse!.data as unknown as JobCardData[])
    : ((jobsResponse?.data as any)?.jobs || []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanQuery = query.trim().toLowerCase();
  const cleanPlateQuery = cleanQuery.replace(/[\s-]+/g, '');

  const filteredJobs = allJobs.filter((job) => {
    if (!cleanQuery) return true;
    const nameMatch = (job.vehicleName || '').toLowerCase().includes(cleanQuery);
    const plateRaw = (job.vehicleNumber || '').toLowerCase();
    const plateClean = plateRaw.replace(/[\s-]+/g, '');
    const plateMatch = plateRaw.includes(cleanQuery) || plateClean.includes(cleanPlateQuery);
    const custMatch = (job.customerName || '').toLowerCase().includes(cleanQuery);
    const mobileMatch = (job.customerMobile || '').includes(cleanQuery);
    const taskMatch = (job.tasks || []).some((t) => (t.title || '').toLowerCase().includes(cleanQuery));
    return nameMatch || plateMatch || custMatch || mobileMatch || taskMatch;
  });

  const matchingVehicles = filteredJobs.slice(0, 6);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Search Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search vehicle model, reg plate (e.g. KL 01), customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-mono font-bold">
              ESC
            </kbd>
          )}
        </div>

        {/* Results / Suggestions Dropdown */}
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 space-y-1">
          {matchingVehicles.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Car className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                No matching vehicles or records
              </p>
              <p className="text-[11px] text-slate-400">Try searching vehicle name, number, or customer name</p>
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {query ? 'Search Results' : 'Recent Active Garage Vehicles'}
              </div>

              {matchingVehicles.map((job) => {
                const totalTasks = job.tasks?.length || 0;
                const completedTasks = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
                const isReady = totalTasks > 0 && completedTasks === totalTasks;

                return (
                  <button
                    key={job.id || job._id}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/jobs/${job.id || job._id}`);
                    }}
                    className="w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isReady
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <Car className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">
                            {job.vehicleName || 'Vehicle'}
                          </h4>
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                            {job.vehicleNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {completedTasks}/{totalTasks} tasks done {job.customerName && `• ${job.customerName}`}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Search Momzz Database</span>
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
              ESC
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
