import React, { useEffect, useRef, useState } from 'react';
import { Award, X } from 'lucide-react';
import { useGetLeaderboardQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

const SESSION_KEY = 'lb_welcome_shown';

export const LeaderboardWelcomeModal: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { data: leaderboardData } = useGetLeaderboardQuery(undefined, { skip: !isAuthenticated });
  const leaderboard = leaderboardData?.data || [];

  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasOpened = useRef(false);

  // Show once per session when authenticated and leaderboard data is available
  useEffect(() => {
    if (!isAuthenticated || !leaderboard.length || hasOpened.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    hasOpened.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    setIsOpen(true);
    setCountdown(3);
  }, [isAuthenticated, leaderboard.length]);

  // Auto-close countdown
  useEffect(() => {
    if (!isOpen) return;
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsOpen(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsOpen(false);
  };

  if (!isOpen || !leaderboard.length) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-[fadeInUp_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.3s ease' }}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-5">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-slate-950">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">Leaderboard</h2>
                <p className="text-xs text-slate-950/70 font-medium">Top performers this period</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-slate-950 hover:bg-black/20 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
          {leaderboard.slice(0, 8).map((worker: any, idx: number) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            return (
              <div
                key={worker.id || worker._id}
                className={`flex items-center gap-3 px-5 py-3 ${idx === 0 ? 'bg-yellow-50 dark:bg-yellow-400/5' : ''}`}
              >
                <span className={`w-7 text-center font-black ${idx < 3 ? 'text-xl' : 'text-sm text-slate-400 dark:text-slate-500'}`}>
                  {medal ?? `#${idx + 1}`}
                </span>

                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {worker.profileImageUrl ? (
                    <img src={worker.profileImageUrl} alt={worker.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs font-black">
                      {worker.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{worker.name}</p>
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                  idx === 0
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {(() => { const n = Number(worker.taskCount ?? 0); return (Number.isInteger(n) ? n : n.toFixed(2)) + ' pts'; })()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer countdown */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Auto-closing in {countdown}s · or click outside
          </p>
          <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-1000"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
