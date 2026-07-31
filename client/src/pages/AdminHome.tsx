import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, useCreateJobMutation } from '../api/jobApi';
import { VehicleCard } from '../components/jobCard/VehicleCard';
import { Shield, Plus, Wrench, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '../components/common/Button';

export const AdminHome: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useGetJobCardsQuery();
  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();

  const [showModal, setShowModal] = useState(false);
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const jobs = data?.data || [];

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    setTasks([...tasks, taskInput.trim()]);
    setTaskInput('');
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehicleName.trim() || !vehicleNumber.trim()) {
      setErrorMsg('Vehicle Name and Number are required.');
      return;
    }

    if (tasks.length === 0) {
      setErrorMsg('Please add at least one task for this job card.');
      return;
    }

    try {
      await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        tasks,
      }).unwrap();

      setVehicleName('');
      setVehicleNumber('');
      setTasks([]);
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to create job card.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100 uppercase">
                GARAGE JOB CONTROL
              </h1>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Admin: <span className="text-yellow-400 font-bold uppercase">{user?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowModal(true)}
              className="text-xs px-4 py-2 flex items-center gap-1.5 shadow-yellow-glow"
            >
              <Plus className="w-4 h-4" /> Create Job Card
            </Button>
          </div>
        </div>

        {/* Job Cards View */}
        {isLoading ? (
          <div className="industrial-card p-8 text-center text-zinc-400 font-mono text-xs sm:text-sm">
            Loading active garage job cards...
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            Failed to retrieve job cards. Please check your connection.
          </div>
        ) : jobs.length === 0 ? (
          <div className="industrial-card p-8 text-center space-y-3 rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-yellow-400 mx-auto opacity-75" />
            <h3 className="text-base font-bold uppercase tracking-wider text-zinc-200">
              NO ACTIVE VEHICLE JOBS
            </h3>
            <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto">
              Click 'Create Job Card' above to publish a new vehicle repair job to the garage technicians.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <VehicleCard key={job.id || job._id} job={job} />
            ))}
          </div>
        )}
      </main>

      {/* Create Job Card Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-extrabold uppercase text-zinc-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-yellow-400" /> New Vehicle Job Card
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-100 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">VEHICLE NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Maruti Swift"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-yellow-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">VEHICLE REGISTRATION NUMBER</label>
                <input
                  type="text"
                  placeholder="e.g. KL-02-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:border-yellow-400 outline-none uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-zinc-400">ADD REPAIR SUB-TASKS</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Tyre Changing"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-yellow-400 outline-none"
                  />
                  <Button type="button" variant="outline" onClick={handleAddTask} className="px-3 py-2 text-xs">
                    Add
                  </Button>
                </div>

                {tasks.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2">
                    {tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono"
                      >
                        <span>{task}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreating}
                  className="flex-1 text-xs shadow-yellow-glow"
                >
                  Publish Job Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

