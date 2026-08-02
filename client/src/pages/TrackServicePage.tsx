import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Car, Search, CheckCircle2, Clock, Wrench } from 'lucide-react';

type PublicJob = { id: string; vehicleName: string; vehicleNumber: string; vehicleColor?: string; status: string; createdAt: string; updatedAt: string; tasks: { id: string; title: string; status: string; completedAt?: string }[] };
const serverUrl = (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const relativeTime = (value: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
};

export const TrackServicePage: React.FC = () => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [contact, setContact] = useState('');
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setError(''); setLoading(true);
    try {
      const isEmail = contact.includes('@');
      const response = await fetch(`${serverUrl}/api/public/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicleNumber, ...(isEmail ? { email: contact } : { mobile: contact }) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to find a matching service record.');
      setJobs(body.data || []);
      if (!body.data?.length) setError('No service records match those details.');
    } catch (err: any) { setJobs([]); setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!jobs.length) return;
    const socket: Socket = io(serverUrl, { transports: ['websocket', 'polling'] });
    socket.on('task:updated', (event) => setJobs((current) => current.map((job) => job.id !== event.jobCardId ? job : { ...job, tasks: job.tasks.map((task) => task.id === event.taskId ? { ...task, ...event.task } : task) })));
    return () => { socket.disconnect(); };
  }, [jobs.length]);

  return <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4 py-10">
    <div className="max-w-xl mx-auto space-y-6">
      <header className="text-center space-y-2"><Car className="w-10 h-10 text-amber-500 mx-auto" /><h1 className="text-2xl font-black">Track your service</h1><p className="text-sm text-zinc-500">Enter your vehicle number and the mobile number or email used at the garage.</p></header>
      <section className="industrial-card rounded-2xl p-5 space-y-3"><input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="Vehicle number" className="w-full industrial-input rounded-xl p-3 text-sm uppercase" /><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile number or email" className="w-full industrial-input rounded-xl p-3 text-sm" /><button disabled={loading || !vehicleNumber || !contact} onClick={search} className="w-full rounded-xl bg-amber-400 py-3 text-zinc-950 font-bold flex justify-center gap-2 disabled:opacity-50"><Search className="w-4 h-4" />{loading ? 'Searching...' : 'Track service'}</button>{error && <p className="text-sm text-red-500">{error}</p>}</section>
      {jobs.map((job) => { const done = job.tasks.filter((task) => task.status === 'COMPLETED').length; const progress = job.tasks.length ? Math.round((done / job.tasks.length) * 100) : 0; return <section key={job.id} className="industrial-card rounded-2xl p-5 space-y-4"><div><h2 className="font-bold">{job.vehicleName}{job.vehicleColor ? ` • ${job.vehicleColor}` : ''}</h2><p className="text-xs font-mono text-zinc-500">{job.vehicleNumber} · Received {relativeTime(job.createdAt)} ago</p></div><div className="flex justify-between text-xs font-bold"><span>{progress === 100 ? 'Ready for pick up' : progress ? 'In progress' : 'Received'}</span><span>{done}/{job.tasks.length} complete</span></div><div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div><ol className="space-y-2">{job.tasks.map((task) => <li key={task.id} className="text-sm flex gap-2 items-center">{task.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}{task.title}</li>)}</ol><p className="text-xs text-zinc-500 flex gap-1 items-center"><Wrench className="w-3 h-3" /> Updates appear automatically.</p></section>; })}
    </div>
  </main>;
};
