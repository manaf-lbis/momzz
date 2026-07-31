import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { Badge } from '../components/common/Badge';

export const AdminHome: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase mb-4">
          ADMIN DASHBOARD
        </h1>
        <p className="text-sm text-zinc-400 mb-2">
          Logged in as: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span> ({user?.role})
        </p>
        <Badge variant="yellow" className="text-xs font-mono">ADMIN VIEW</Badge>
        {/* Add admin-specific widgets here */}
      </main>
    </div>
  );
};
