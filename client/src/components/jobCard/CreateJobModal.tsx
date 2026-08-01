import React, { useState, useMemo } from 'react';
import { useCreateJobMutation, useGetJobCardsQuery } from '../../api/jobApi';
import { X, Plus, Trash2, Car, Wrench, CheckCircle2, Sparkles, Hash } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_PRESETS = [
  'Engine Oil & Filter Change',
  'Brake Pad Replacement',
  'Tire Rotation & Balancing',
  'Battery Diagnostic & Service',
  'AC Filter Cleaning & Refill',
  'Wheel Alignment',
  'Spark Plug Replacement',
  'General Vehicle Inspection',
];

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose }) => {
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [tasks, setTasks] = useState<string[]>(['Engine Oil & Filter Change', 'Brake Pad Replacement']);
  const [taskInput, setTaskInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [createJob, { isLoading }] = useCreateJobMutation();
  const { data: jobsResponse } = useGetJobCardsQuery();

  // Extract all unique task titles from existing jobs for auto-completion
  const existingTaskSuggestions = useMemo(() => {
    const set = new Set<string>(COMMON_PRESETS);
    if (jobsResponse?.data) {
      for (const job of jobsResponse.data) {
        if (job.tasks) {
          for (const t of job.tasks) {
            if (t.title) set.add(t.title.trim());
          }
        }
      }
    }
    return Array.from(set);
  }, [jobsResponse]);

  // Filter suggestions matching input
  const filteredSuggestions = useMemo(() => {
    if (!taskInput.trim()) return [];
    const query = taskInput.toLowerCase().trim();
    return existingTaskSuggestions
      .filter((s) => s.toLowerCase().includes(query) && !tasks.includes(s))
      .slice(0, 5);
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

  const handlePresetClick = (presetTitle: string) => {
    if (!tasks.includes(presetTitle)) {
      setTasks((prev) => [...prev, presetTitle]);
    }
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
        vehicleNumber: vehicleNumber.trim(),
        tasks,
      }).unwrap();

      setVehicleName('');
      setVehicleNumber('');
      setTasks(['Engine Oil & Filter Change', 'Brake Pad Replacement']);
      onClose();
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
            onClick={onClose}
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
          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Vehicle Name */}
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

            {/* Vehicle Number */}
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

          {/* Quick Preset Service Chips */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 dark:text-yellow-400" /> Quick Add Common Presets
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {COMMON_PRESETS.map((preset) => {
                const isSelected = tasks.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all active:scale-95 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-400/20 dark:bg-yellow-400/20 text-amber-700 dark:text-yellow-400 border border-amber-400/40 dark:border-yellow-400/40'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-tasks Section with Auto-Completion */}
          <div className="space-y-2 relative">
            <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400">
              Sub-tasks Checklist ({tasks.length}) *
            </label>

            {/* Input with Auto-Suggestion Dropdown */}
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Type task or choose suggestion..."
                  value={taskInput}
                  onChange={(e) => {
                    setTaskInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl industrial-input text-xs"
                />

                {/* Auto-Suggestion Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <div
                        key={suggestion}
                        onClick={() => handleAddTask(suggestion)}
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
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold uppercase text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1.5"
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
