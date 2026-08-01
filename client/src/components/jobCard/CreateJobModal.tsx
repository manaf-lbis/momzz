import React, { useState, useMemo } from 'react';
import { useCreateJobMutation, useGetJobCardsQuery } from '../../api/jobApi';
import { X, Plus, Trash2, Car, Wrench, CheckCircle2, Hash } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose }) => {
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [createJob, { isLoading }] = useCreateJobMutation();
  const { data: jobsResponse } = useGetJobCardsQuery();

  // Extract all unique task titles from existing jobs for auto-completion
  const existingTaskSuggestions = useMemo(() => {
    const set = new Set<string>();
    const data = jobsResponse?.data;
    const jobs = Array.isArray(data) ? data : data?.jobs || [];
    for (const job of jobs) {
      if (job.tasks) {
        for (const t of job.tasks) {
          if (t.title) set.add(t.title.trim());
        }
      }
    }
    return Array.from(set).sort();
  }, [jobsResponse]);

  // Show ALL past task suggestions when input is empty, or filter when typing
  const filteredSuggestions = useMemo(() => {
    const query = taskInput.toLowerCase().trim();
    return existingTaskSuggestions
      .filter((s) => {
        if (tasks.includes(s)) return false;
        if (!query) return true;
        return s.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [taskInput, existingTaskSuggestions, tasks]);

  if (!isOpen) return null;

  const handleAddTask = (titleToAdd?: string) => {
    const item = (titleToAdd || taskInput).trim();
    if (!item) return;
    if (!tasks.includes(item)) {
      setTasks((prev) => [...prev, item]);
    }
    setTaskInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setVehicleName('');
    setVehicleNumber('');
    setTasks([]);
    setTaskInput('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehicleName.trim()) {
      setErrorMsg('Please enter a vehicle model.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter a vehicle registration number.');
      return;
    }
    if (tasks.length === 0) {
      setErrorMsg('Please add at least one sub-task.');
      return;
    }

    try {
      await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        tasks,
      }).unwrap();

      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to create job card.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                Register New Vehicle Job
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                CREATE JOB CARD & ASSIGN SUB-TASKS
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" /> Vehicle Model *
              </label>
              <input
                type="text"
                placeholder="e.g. Maruti Swift Dzire"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl industrial-input text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400" /> Registration No *
              </label>
              <input
                type="text"
                placeholder="e.g. KL-02-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl industrial-input text-xs font-mono uppercase"
                required
              />
            </div>
          </div>

          {/* Sub-tasks with autocomplete from past tasks only */}
          <div className="space-y-2 relative">
            <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400">
              Sub-tasks Checklist ({tasks.length}) *
            </label>

            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={
                    existingTaskSuggestions.length > 0
                      ? 'Type or tap to pick from past tasks…'
                      : 'Type a task name and press Add…'
                  }
                  value={taskInput}
                  onChange={(e) => {
                    setTaskInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl industrial-input text-xs"
                />

                {/* Auto-Suggestion Dropdown — from past jobs only */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
                    {!taskInput.trim() && (
                      <div className="px-3.5 py-1.5 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-mono text-zinc-400 uppercase">Past tasks — tap to add</p>
                      </div>
                    )}
                    {filteredSuggestions.map((suggestion) => (
                      <div
                        key={suggestion}
                        onMouseDown={() => handleAddTask(suggestion)}
                        className="px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-400/10 dark:hover:bg-yellow-400/10 hover:text-amber-600 dark:hover:text-yellow-400 cursor-pointer font-mono flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 last:border-none"
                      >
                        <span>{suggestion}</span>
                        <span className="text-[10px] text-zinc-400">+ Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleAddTask()}
                className="px-3.5 py-2 bg-zinc-800 dark:bg-zinc-800 text-zinc-100 rounded-xl hover:bg-zinc-700 transition-colors text-xs font-mono flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Added Sub-tasks List */}
            {tasks.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 pr-0.5">
                {tasks.map((taskTitle, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs"
                  >
                    <span className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 dark:text-yellow-400 flex-shrink-0" />
                      {taskTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(index)}
                      className="text-zinc-400 hover:text-red-500 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tasks.length === 0 && (
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 italic">
                No sub-tasks added yet. Add at least one task.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold uppercase text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-60"
            >
              <Wrench className="w-4 h-4" />
              {isLoading ? 'Creating...' : 'Publish Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
