import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Badge } from '../components/common/Badge';
import { useGetDummyQuery } from '../api/authApi';
import { Wrench, Shield, CheckCircle2, Clock, Activity, Trophy, Car, Server, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, isAdmin, isApproved } = useAuth();
  const { data: dummyData, isLoading: isDummyLoading, isError: isDummyError, refetch: refetchDummy } = useGetDummyQuery();

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert for Pending Worker Approval */}
        {!isApproved && !isAdmin && (
          <div className="p-4 bg-yellow-400/10 border border-yellow-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-yellow-glow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-400/20 text-yellow-400 rounded-lg">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-mono font-bold text-yellow-400 uppercase text-sm">
                  ACCOUNT PENDING ADMIN APPROVAL
                </h4>
                <p className="text-xs text-zinc-300">
                  Your worker profile is under review by garage administrators. Job card assignment features will unlock once approved.
                </p>
              </div>
            </div>
            <Badge variant="yellow">PENDING REVIEW</Badge>
          </div>
        )}

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">
                GARAGE OPERATIONAL DASHBOARD
              </h1>
              <Badge variant="yellow" className="text-xs font-mono">SYS-ONLINE</Badge>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              LOGGED IN AS: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span> ({user?.role})
            </p>
          </div>

          {isAdmin && (
            <Link
              to="/admin/approvals"
              className="inline-flex items-center gap-2 bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-yellow-glow hover:bg-yellow-300 transition-all"
            >
              <Shield className="w-4 h-4" /> Admin Approvals Panel
            </Link>
          )}
        </div>

        {/* Live Dummy API Req/Res Test Panel */}
        <div className="industrial-card p-6 rounded-xl border border-yellow-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-yellow-400" />
              <h3 className="font-mono font-bold text-sm uppercase text-zinc-100">
                LIVE API CONNECTION WIDGET (USING VITE_SERVER_URL FROM .ENV)
              </h3>
            </div>
            <button
              onClick={() => refetchDummy()}
              className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-yellow-400 hover:bg-zinc-700 transition-colors text-xs font-mono flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ping API
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Request Details */}
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-2">
              <p className="text-zinc-400 font-bold uppercase flex items-center justify-between">
                <span>OUTGOING DUMMY REQ</span>
                <span className="text-yellow-400">GET</span>
              </p>
              <div className="text-zinc-300 space-y-1">
                <p><span className="text-zinc-500">Target Endpoint:</span> <span className="text-yellow-400">{serverUrl}/api/dummy</span></p>
                <p><span className="text-zinc-500">Config Source:</span> client/.env (VITE_SERVER_URL)</p>
                <p><span className="text-zinc-500">Headers:</span> Bearer {localStorage.getItem('token')?.slice(0, 15)}...</p>
              </div>
            </div>

            {/* Response Details */}
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-2">
              <p className="text-zinc-400 font-bold uppercase flex items-center justify-between">
                <span>INCOMING DUMMY RES</span>
                {isDummyLoading ? (
                  <span className="text-yellow-400 animate-pulse">CONNECTING...</span>
                ) : isDummyError ? (
                  <span className="text-red-400">FAILED</span>
                ) : (
                  <span className="text-emerald-400">200 OK</span>
                )}
              </p>
              {isDummyLoading ? (
                <p className="text-zinc-500">Fetching server response...</p>
              ) : isDummyError ? (
                <p className="text-red-400">Backend server is starting up or unreachable at {serverUrl}.</p>
              ) : (
                <pre className="text-emerald-400 bg-zinc-900/80 p-2.5 rounded text-[11px] overflow-x-auto border border-emerald-500/20">
                  {JSON.stringify(dummyData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="industrial-card p-6 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">TECHNICIAN STATUS</p>
                <p className="text-xl font-extrabold mt-2 text-zinc-100 flex items-center gap-2">
                  {isApproved || isAdmin ? 'VERIFIED ACTIVE' : 'PENDING APPROVAL'}
                </p>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 text-yellow-400 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="industrial-card p-6 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">COMPLETED TASKS</p>
                <p className="text-2xl font-extrabold mt-1 text-yellow-400 font-mono">
                  {user?.taskCount || 0}
                </p>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 text-yellow-400 rounded-lg">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="industrial-card p-6 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">SERVER ENDPOINT</p>
                <p className="text-sm font-extrabold mt-2 text-yellow-400 font-mono">
                  {serverUrl}
                </p>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 text-yellow-400 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Section Placeholder for Job Cards */}
        <div className="industrial-card p-8 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <Car className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-bold uppercase tracking-wide text-zinc-100">
                ACTIVE VEHICLE JOB CARDS
              </h3>
            </div>
            <Badge variant="zinc">BASIC AUTH & DUMMY API READY</Badge>
          </div>

          <div className="p-6 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-lg text-center space-y-2">
            <Wrench className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-300 font-semibold uppercase">
              AUTHENTICATION & REPOSITORY CORE READY
            </p>
            <p className="text-xs text-zinc-500 font-mono max-w-lg mx-auto">
              The basic authentication flow, Redux RTK Query store, JWT authorization headers, and Mongo User repository layer are live. Job Card CRUD modules will connect next.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
