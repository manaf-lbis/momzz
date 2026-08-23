import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Car,
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  Calendar,
  Phone,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { formatDeliveryDate, getDeliveryStatusInfo } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

type PublicJob = {
  id: string;
  vehicleName: string;
  vehicleNumber: string;
  vehicleColor?: string;
  expectedDeliveryDate?: string;
  status: string;
  createdAt: string;
  tasks: { id: string; title: string; status: string }[];
};

const serverUrl = (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const serviceDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

const formatRegistration = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^(.{2})(.{0,2})(.{0,2})(.{0,4}).*$/, (_, a, b, c, d) =>
      [a, b, c, d].filter(Boolean).join(' ')
    );

export const TrackServicePage: React.FC = () => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [contact, setContact] = useState('');
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/public/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: vehicleNumber.replace(/\s+/g, ''),
          ...(contact.includes('@') ? { email: contact.trim() } : { mobile: contact.trim() }),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to find matching service records.');
      setJobs(body.data || []);
      if (!body.data?.length) setError('No active or past service records found with those details.');
    } catch (err: any) {
      setJobs([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobs.length) return;
    const socket: Socket = io(serverUrl, { transports: ['websocket', 'polling'] });
    socket.on('task:updated', (event) =>
      setJobs((current) =>
        current.map((job) =>
          job.id !== event.jobCardId
            ? job
            : {
                ...job,
                tasks: job.tasks.map((task) =>
                  task.id === event.taskId ? { ...task, ...event.task } : task
                ),
              }
        )
      )
    );
    return () => {
      socket.disconnect();
    };
  }, [jobs.length]);

  return (
    <main className="min-h-screen bg-zinc-100 dark:bg-[#080d1a] text-zinc-900 dark:text-zinc-100 px-4 py-8 sm:py-12">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Brand Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
            <img
              src="/logo.png"
              alt="MOMZ'Z AUTOMOTIVE"
              className="w-14 h-14 rounded-xl object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Track Your Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Live real-time progress of your vehicle directly from our garage workstation.
          </p>
        </header>

        {/* Search Card */}
        <section className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Vehicle Registration Number
            </label>
            <div className="relative">
              <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(formatRegistration(e.target.value))}
                placeholder="e.g. KL 01 AB 1234"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm font-mono uppercase font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Registered Mobile Number or Email
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <button
            disabled={loading || !vehicleNumber || !contact}
            onClick={search}
            className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition active:scale-[0.98] shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching Garage Records...' : 'Check Live Status'}</span>
          </button>

          {error && (
            <p className="text-xs font-semibold text-rose-500 text-center pt-1">{error}</p>
          )}
        </section>

        {/* Live Service Cards */}
        {jobs.map((job) => {
          const totalTasks = job.tasks?.length || 0;
          const doneTasks = (job.tasks || []).filter((t) => t.status === 'COMPLETED').length;
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          const isReady = job.status === 'COMPLETED' || (totalTasks > 0 && doneTasks === totalTasks);
          const stage = isReady ? 3 : progress > 0 ? 2 : 1;
          const deliveryInfo = job.expectedDeliveryDate
            ? getDeliveryStatusInfo(job.expectedDeliveryDate, isReady)
            : null;

          return (
            <section
              key={job.id}
              className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 overflow-hidden relative"
            >
              {/* Top Row: Vehicle Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block text-[11px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 tracking-wider mb-1">
                    {job.vehicleNumber}
                  </span>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white">
                    {job.vehicleName} {job.vehicleColor && <span className="text-slate-400 font-normal">({job.vehicleColor})</span>}
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Intake Date: {serviceDate(job.createdAt)}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase rounded-full px-3 py-1 flex items-center gap-1.5 ${
                    isReady
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  {isReady ? 'Ready for Delivery' : 'In Service'}
                </span>
              </div>

              {/* 3-Stage Progress Stepper */}
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs font-bold font-mono">
                  <div className={`flex flex-col items-center gap-1.5 ${stage >= 1 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${stage >= 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      1
                    </div>
                    <span>Intake Done</span>
                  </div>
                  <div className={`flex flex-col items-center gap-1.5 ${stage >= 2 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${stage >= 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      2
                    </div>
                    <span>In Service</span>
                  </div>
                  <div className={`flex flex-col items-center gap-1.5 ${stage >= 3 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${stage >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      3
                    </div>
                    <span>Ready</span>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Delivery ETA info */}
              {job.expectedDeliveryDate && deliveryInfo && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Expected Delivery
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatDeliveryDate(job.expectedDeliveryDate)}
                  </span>
                </div>
              )}

              {/* Checklist Progress Items */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Work Checklist</span>
                  <span className="font-mono text-amber-500">{doneTasks}/{totalTasks} Complete</span>
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                  {job.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <span className={`${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                        {task.title}
                      </span>
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500/70 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <a
                  href="tel:+919747382525"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  <span>Call Workshop</span>
                </a>
                <a
                  href={`https://wa.me/919747382525?text=Hello%2C%20I%20am%20checking%20the%20status%20of%20my%20vehicle%20${encodeURIComponent(job.vehicleNumber)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp</span>
                </a>
              </div>

            </section>
          );
        })}
      </div>
    </main>
  );
};
