import React from 'react';
import { Crown, Medal, Award, Star, Zap } from 'lucide-react';

interface LeaderboardTierBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const LeaderboardTierBadge: React.FC<LeaderboardTierBadgeProps> = ({
  rank,
  size = 'md',
  showLabel = false,
}) => {
  if (rank === 1) {
    return (
      <div
        className={`inline-flex items-center gap-1 font-mono font-black uppercase tracking-wider ${
          size === 'lg'
            ? 'px-3 py-1 rounded-xl text-xs bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
            : size === 'md'
            ? 'px-2 py-0.5 rounded-lg text-[10px] bg-amber-400/20 border border-amber-400/50 text-amber-300'
            : 'px-1.5 py-0.5 rounded-md text-[9px] bg-amber-400/20 text-amber-300'
        }`}
      >
        <Crown className={size === 'lg' ? 'w-3.5 h-3.5 fill-current' : 'w-3 h-3 fill-current text-amber-400'} />
        <span>#1 {showLabel && 'Grandmaster'}</span>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div
        className={`inline-flex items-center gap-1 font-mono font-black uppercase tracking-wider ${
          size === 'lg'
            ? 'px-3 py-1 rounded-xl text-xs bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-slate-950 shadow-md'
            : size === 'md'
            ? 'px-2 py-0.5 rounded-lg text-[10px] bg-slate-300/20 border border-slate-300/40 text-slate-200'
            : 'px-1.5 py-0.5 rounded-md text-[9px] bg-slate-300/20 text-slate-200'
        }`}
      >
        <Medal className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3 text-slate-300'} />
        <span>#2 {showLabel && 'Platinum'}</span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div
        className={`inline-flex items-center gap-1 font-mono font-black uppercase tracking-wider ${
          size === 'lg'
            ? 'px-3 py-1 rounded-xl text-xs bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-100 shadow-md'
            : size === 'md'
            ? 'px-2 py-0.5 rounded-lg text-[10px] bg-amber-600/20 border border-amber-600/40 text-amber-400'
            : 'px-1.5 py-0.5 rounded-md text-[9px] bg-amber-600/20 text-amber-400'
        }`}
      >
        <Award className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3 text-amber-500'} />
        <span>#3 {showLabel && 'Bronze'}</span>
      </div>
    );
  }

  if (rank <= 10) {
    return (
      <div
        className={`inline-flex items-center gap-1 font-mono font-black uppercase tracking-wider ${
          size === 'lg'
            ? 'px-2.5 py-1 rounded-xl text-xs bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'
            : size === 'md'
            ? 'px-2 py-0.5 rounded-lg text-[10px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
            : 'px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-400'
        }`}
      >
        <Star className={size === 'lg' ? 'w-3.5 h-3.5 fill-cyan-400' : 'w-2.5 h-2.5 fill-cyan-400'} />
        <span>#{rank} {showLabel && 'Diamond'}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 font-mono font-bold text-slate-400 ${
        size === 'lg'
          ? 'px-2.5 py-1 rounded-xl text-xs bg-slate-800 border border-slate-700'
          : size === 'md'
          ? 'px-2 py-0.5 rounded-lg text-[10px] bg-slate-800/80 border border-slate-700/60'
          : 'px-1.5 py-0.5 rounded text-[9px] bg-slate-800/60'
      }`}
    >
      <Zap className="w-2.5 h-2.5 text-slate-500" />
      <span>#{rank}</span>
    </div>
  );
};
