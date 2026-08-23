import React, { useState } from 'react';
import { useCreateJobMutation } from '../../api/jobApi';
import { TaskAutoComplete } from '../common/TaskAutoComplete';
import { X, Trash2, Car, Wrench, CheckCircle2, Hash, ArrowLeft, ShieldCheck, Check, Clock } from 'lucide-react';
import { getDeliveryPreset } from '../../utils/dateUtils';
import { ModernDateTimePicker } from '../common/ModernDateTimePicker';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'FILL' | 'VERIFY'>('FILL');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [createJob, { isLoading }] = useCreateJobMutation();

  if (!isOpen) return null;

  const handleAddTask = (titleToAdd: string) => {
    const item = titleToAdd.trim();
    if (!item) return;
    if (!tasks.includes(item)) {
      setTasks((prev) => [...prev, item]);
    }
    setTaskInput('');
  };

  const handleRemoveTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setStep('FILL');
    setVehicleName('');
    setVehicleNumber('');
    setExpectedDeliveryDate('');
    setCustomerMobile('');
    setCustomerEmail('');
    setTasks([]);
    setTaskInput('');
    setErrorMsg('');
    onClose();
  };

  const handleProceedToVerify = () => {
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
    setStep('VERIFY');
  };

  const handlePublishJobCard = async () => {
    setErrorMsg('');
    try {
      await createJob({
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        customerMobile: customerMobile.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : undefined,
        tasks,
      }).unwrap();

      handleClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to publish job card.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 rounded-xl">
              {step === 'FILL' ? <Car className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                {step === 'FILL' ? 'Register New Vehicle Job' : 'Verify Job Card & Sub-tasks'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                {step === 'FILL' ? 'STEP 1: VEHICLE & SUB-TASK CHECKLIST' : 'STEP 2: REVIEW & FINAL PUBLISH'}
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

        {/* STEP 1: FILL DETAILS & SUB-TASKS */}
        {step === 'FILL' && (
          <div className="space-y-4">
            {/* Vehicle Inputs */}
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
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Customer Mobile No. (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl industrial-input text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Customer Email ID (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl industrial-input text-xs font-medium"
                />
              </div>
            </div>

            {/* Modern Expected Delivery Date & Time Calendar */}
            <ModernDateTimePicker
              value={expectedDeliveryDate}
              onChange={setExpectedDeliveryDate}
              label="Expected Delivery Date & Time"
              placeholder="Click to pick delivery date & time"
            />

            {/* Sub-tasks Section with Instant Click Auto-Complete */}
            <div className="space-y-2 relative">
              <label className="block text-[11px] font-mono font-semibold uppercase text-zinc-600 dark:text-zinc-400">
                Sub-tasks Checklist ({tasks.length}) *
              </label>

              {/* Task Auto-Complete Component */}
              <TaskAutoComplete
                value={taskInput}
                onChange={setTaskInput}
                onAddTask={handleAddTask}
                placeholder="Search inventory or type sub-task..."
              />

              {/* Added Sub-tasks Checklist List */}
              {tasks.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1 pr-0.5">
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
                  No sub-tasks added yet. Search inventory above to add sub-tasks.
                </p>
              )}
            </div>

            {/* Step 1 Footer Action */}
            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold uppercase text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToVerify}
                className="px-4 py-2 bg-amber-400 dark:bg-yellow-400 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl hover:bg-amber-300 dark:hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify & Review Checklist
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFY & REVIEW SUMMARY BEFORE PUBLISHING */}
        {step === 'VERIFY' && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
              {/* Summary Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2.5">
                <div>
                  <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase">
                    {vehicleName}
                  </h4>
                  <p className="text-xs font-mono text-amber-600 dark:text-yellow-400 font-bold uppercase mt-0.5">
                    REG: {vehicleNumber.toUpperCase()}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-400/10 dark:bg-yellow-400/10 text-amber-600 dark:text-yellow-400 border border-amber-400/30 rounded-lg text-[10px] font-mono font-bold uppercase">
                  VERIFIED ({tasks.length} SUB-TASKS)
                </span>
              </div>

              {/* Checklist Review Items */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400">
                  Sub-task Checklist Summary:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {tasks.map((taskTitle, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                        {taskTitle}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 Footer Actions */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setStep('FILL')}
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Edit Details
              </button>
              <button
                type="button"
                onClick={handlePublishJobCard}
                disabled={isLoading}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-extrabold text-xs uppercase rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md disabled:opacity-60 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                {isLoading ? 'Publishing...' : 'Confirm & Publish Job Card'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
