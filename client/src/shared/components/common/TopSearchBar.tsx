import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Car,
  X,
  ChevronRight,
} from 'lucide-react';
import { useGetJobCardsQuery, JobCardData } from '../../../features/jobs/api/jobApi';

interface TopSearchBarProps {
  placeholder?: string;
  className?: string;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  placeholder = 'Search vehicle model, reg plate (e.g. KL 01), customer...',
  className = '',
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: jobsResponse } = useGetJobCardsQuery({ limit: 150 });
  const allJobs: JobCardData[] = Array.isArray(jobsResponse?.data)
    ? (jobsResponse!.data as unknown as JobCardData[])
    : ((jobsResponse?.data as any)?.jobs || []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanQuery = query.trim().toLowerCase();
  const cleanPlateQuery = cleanQuery.replace(/[\s-]+/g, '');

  const matchingJobs = allJobs.filter((job) => {
    if (!cleanQuery) return false;
    const nameMatch = (job.vehicleName || '').toLowerCase().includes(cleanQuery);
    const plateRaw = (job.vehicleNumber || '').toLowerCase();
    const plateClean = plateRaw.replace(/[\s-]+/g, '');
    const plateMatch = plateRaw.includes(cleanQuery) || plateClean.includes(cleanPlateQuery);
    const custMatch = (job.customerName || '').toLowerCase().includes(cleanQuery);
    const mobileMatch = (job.customerMobile || '').includes(cleanQuery);
    const taskMatch = (job.tasks || []).some((t) => (t.title || '').toLowerCase().includes(cleanQuery));
    return nameMatch || plateMatch || custMatch || mobileMatch || taskMatch;
  });

  const showSuggestions = isFocused && cleanQuery.length > 0;

  return (
    <div ref={containerRef} className={`relative w-full z-40 ${className}`}>
      {/* ── Search Input Box ── */}
      <div
        className={`relative flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-white/95 dark:bg-[#12131F]/90 backdrop-blur-2xl border transition-all duration-300 shadow-sm ${
          isFocused
            ? 'border-amber-500 dark:border-amber-400/80 ring-2 ring-amber-400/20 bg-white dark:bg-[#181a2b] shadow-amber-500/10'
            : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        <Search className={`w-4 h-4 shrink-0 transition-colors ${isFocused ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition active:scale-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Attached Suggestions Dropdown ── */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white/98 dark:bg-[#12131F]/98 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-2xl shadow-black/20 dark:shadow-black/80 overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.06] max-h-[65vh] overflow-y-auto"
          >
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-white/[0.02] text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Matching Vehicles ({matchingJobs.length})</span>
              <span className="text-amber-600 dark:text-amber-400/80 font-bold">Tap to open</span>
            </div>

            {matchingJobs.length === 0 ? (
              <div className="py-8 text-center space-y-1.5 px-4">
                <Car className="w-6 h-6 text-slate-400 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No matching vehicles found
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Try checking plate number or customer name
                </p>
              </div>
            ) : (
              matchingJobs.slice(0, 6).map((job) => {
                const totalTasks = job.tasks?.length || 0;
                const completedTasks = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
                const isReady = totalTasks > 0 && completedTasks === totalTasks;

                return (
                  <button
                    key={job.id || job._id}
                    type="button"
                    onClick={() => {
                      setIsFocused(false);
                      setQuery('');
                      navigate(`/jobs/${job.id || job._id}`);
                    }}
                    className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.05] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isReady
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/20'
                        }`}
                      >
                        <Car className="w-4.5 h-4.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white truncate group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                            {job.vehicleName || 'Vehicle'}
                          </h4>
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-xs">
                            {job.vehicleNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                          {completedTasks}/{totalTasks} tasks completed {job.customerName && `• ${job.customerName}`}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-all shrink-0" />
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
