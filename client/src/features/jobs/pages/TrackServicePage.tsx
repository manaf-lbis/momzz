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
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { formatDeliveryDate, getDeliveryStatusInfo } from '../../../shared/utils/dateUtils';
import { getBaseServerUrl } from '../../../shared/utils/serverUrl';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedThemeToggle } from '../../../shared/components/magicui/AnimatedThemeToggle';
import { BorderBeam } from '../../../shared/components/magicui/BorderBeam';
import { Meteors } from '../../../shared/components/magicui/Meteors';
import { Link } from 'react-router-dom';

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

const serverUrl = getBaseServerUrl();
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
    <main className="min-h-screen bg-slate-50 dark:bg-[#080810] text-slate-900 dark:text-white px-3 sm:px-4 py-6 sm:py-10 flex flex-col overflow-x-hidden selection:bg-amber-400/20 transition-colors duration-200 relative">
      {/* Ambient background aura */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.12)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_65%)]" />
        <Meteors number={12} />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <AnimatedThemeToggle variant="icon-only" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto w-full space-y-5">
        {/* Brand Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-white/5 shadow-xl border border-slate-200 dark:border-white/10">
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
            Track Vehicle Service
          </h1>
          <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Live real-time workstation status from MOMZ'Z Garage.
          </p>
        </header>

        {/* Search Bento Card */}
        <section className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-white/[0.035] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-3.5">
          <BorderBeam size={180} duration={8} colorFrom="#fbbf24" colorTo="#f59e0b" borderWidth={1} />

          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Vehicle Registration Number
            </label>
            <div className="relative">
              <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(formatRegistration(e.target.value))}
                placeholder="e.g. KL 01 AB 1234"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-mono uppercase font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Registered Mobile Number or Email
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            disabled={loading || !vehicleNumber || !contact}
            onClick={search}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{loading ? 'Searching Garage Records...' : 'Check Live Status'}</span>
          </button>

          {error && (
            <p className="text-xs font-semibold text-rose-500 text-center pt-1">{error}</p>
          )}
        </section>

        {/* Live Service Bento Cards */}
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
            <motion.section
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-white/[0.035] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 overflow-hidden relative"
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${stage >= 1 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 dark:bg-white/10'}`}>
                      1
                    </div>
                    <span>Intake Done</span>
                  </div>
                  <div className={`flex flex-col items-center gap-1.5 ${stage >= 2 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${stage >= 2 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 dark:bg-white/10'}`}>
                      2
                    </div>
                    <span>In Service</span>
                  </div>
                  <div className={`flex flex-col items-center gap-1.5 ${stage >= 3 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${stage >= 3 ? 'bg-emerald-500 text-white font-black' : 'bg-slate-200 dark:bg-white/10'}`}>
                      3
                    </div>
                    <span>Ready</span>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Delivery ETA info */}
              {job.expectedDeliveryDate && deliveryInfo && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-mono">
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
                <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
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
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
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
            </motion.section>
          );
        })}

        <div className="text-center pt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400 transition"
          >
            <span>Staff / Admin Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  );
};

