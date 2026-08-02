import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Hash,
  Palette,
  X,
  Wrench,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/navbar/Navbar';
import { TaskAutoComplete } from '../components/common/TaskAutoComplete';
import { useCreateJobMutation } from '../api/jobApi';

const COLOR_PRESETS = [
  'White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green',
  'Yellow', 'Orange', 'Pearl White', 'Midnight Black', 'Champagne Gold',
];

export const CreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [createJob, { isLoading }] = useCreateJobMutation();

  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [color, setColor] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddTask = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (tasks.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      // Already added — just clear input
      setTaskInput('');
      return;
    }
    setTasks((prev) => [...prev, trimmed]);
    setTaskInput('');
  };

  const handleRemoveTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehicleName.trim()) {
      setErrorMsg('Vehicle name / model is required.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Registration number is required.');
      return;
    }
    if (tasks.length === 0) {
      setErrorMsg('Add at least one sub-task to create a job card.');
      return;
    }

    try {
      await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        color: color.trim() || undefined,
        tasks,
      }).unwrap();

      navigate('/jobs');
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to create job card. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Page Header */}
          <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-yellow-400 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500 dark:text-yellow-400" />
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight">
                  Register New Vehicle Job
                </h1>
              </div>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                Create a new garage job card with tasks
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Vehicle Details Card */}
            <div className="industrial-card rounded-3xl p-5 space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Car className="w-4 h-4 text-yellow-400" />
                Vehicle Details
              </h2>

              {/* Vehicle Name */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Vehicle Name / Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="e.g. Maruti Swift Dzire, Honda City"
                  className="w-full rounded-xl py-2.5 px-4 text-xs industrial-input font-medium"
                  required
                />
              </div>

              {/* Registration Number */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  <Hash className="w-3.5 h-3.5 inline mr-1" />
                  Registration Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KL-02-AB-1234"
                  className="w-full rounded-xl py-2.5 px-4 text-xs industrial-input font-mono uppercase"
                  required
                />
              </div>

              {/* Car Color */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  <Palette className="w-3.5 h-3.5 inline mr-1" />
                  Car Color (Optional)
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Pearl White, Midnight Black"
                  className="w-full rounded-xl py-2.5 px-4 text-xs industrial-input font-medium mb-2"
                />
                {/* Quick Color Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                        color === c
                          ? 'bg-yellow-400 text-zinc-950 border-yellow-400 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-400 dark:hover:border-yellow-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sub-Tasks Card */}
            <div className="industrial-card rounded-3xl p-5 space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                Service Checklist ({tasks.length} task{tasks.length !== 1 ? 's' : ''})
              </h2>

              {/* Autocomplete input */}
              <TaskAutoComplete
                value={taskInput}
                onChange={setTaskInput}
                onAddTask={handleAddTask}
                placeholder="Type a task e.g. Engine Oil Change..."
              />

              {/* Added Tasks List */}
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((t, idx) => (
                    <motion.div
                      key={`${t}-${idx}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-amber-400/20 dark:bg-yellow-400/10 border border-amber-400/30 dark:border-yellow-400/20 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-black font-mono text-amber-600 dark:text-yellow-400">
                            {idx + 1}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {t}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        title="Remove task"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  No tasks added yet. Search and add tasks above.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={isLoading}
                className="flex-[2] py-3 px-4 rounded-xl bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-extrabold text-xs uppercase shadow-md hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 stroke-[2.5]" />
                    Publish Job Card
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
};
