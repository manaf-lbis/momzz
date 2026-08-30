import React, { useRef, useState, useEffect } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import {
  Check,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
  Camera,
  Car,
  Clock,
  Pin,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { JobCardData, useUploadJobImageMutation } from '../../../features/jobs/api/jobApi';

interface VehiclePhotoModalProps {
  isOpen: boolean;
  job: JobCardData;
  initialImageSrc?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VehiclePhotoModal: React.FC<VehiclePhotoModalProps> = ({
  isOpen,
  job,
  initialImageSrc,
  onClose,
  onSuccess,
}) => {
  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string>(initialImageSrc || '');
  const [livePreviewUrl, setLivePreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const [uploadJobImage] = useUploadJobImageMutation();

  // Aspect ratio for the card (approx 2.1:1 matching card aspect)
  const CARD_ASPECT_RATIO = 2.1 / 1;

  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
    }
  }, [initialImageSrc]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    try {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1600,
        maxHeight: 900,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      if (canvas) {
        setLivePreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setIsUploading(true);
    setError('');

    try {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1600,
        maxHeight: 900,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      const jobId = job.id || job._id!;

      await uploadJobImage({ jobCardId: jobId, image: base64 }).unwrap();

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const totalTasks = job.tasks?.length || 0;
  const completedTasks = job.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
  const isReady = totalTasks > 0 && completedTasks === totalTasks;

  const getGarageDuration = (createdDateStr: string) => {
    const start = new Date(createdDateStr).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes < 60) return `${Math.max(1, totalMinutes)}m in garage`;
    const hours = Math.floor(totalMinutes / 60);
    if (hours < 24) return `${hours}h ${totalMinutes % 60}m in garage`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ${hours % 24}h in garage`;
    return `${Math.floor(days / 7)}w ${days % 7}d in garage`;
  };

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(job.createdAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div className="flex flex-col w-full max-w-xl overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800/90 shadow-2xl text-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white uppercase">
                {job.vehicleName} · Vehicle Photo
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                {job.vehicleNumber} {job.vehicleColor ? `• ${job.vehicleColor}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          {!imageSrc ? (
            /* Upload Empty State */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-amber-400/70 rounded-2xl p-8 text-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/70 transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-200">Capture or Upload Vehicle Photo</p>
                <p className="text-xs text-zinc-400 font-mono">JPG, PNG, WebP up to 10MB</p>
              </div>
              <button
                type="button"
                className="mt-1 px-4 py-2 bg-amber-400 text-zinc-950 text-xs font-black uppercase rounded-xl hover:bg-amber-300 shadow-md shadow-amber-400/15 transition active:scale-95"
              >
                Choose Photo
              </button>
            </div>
          ) : (
            <>
              {/* Cropper Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="font-bold text-zinc-300">1. Adjust Crop Area</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Change Image
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 max-h-[260px] flex items-center justify-center">
                  <Cropper
                    ref={cropperRef}
                    src={imageSrc}
                    style={{ height: 240, width: '100%' }}
                    aspectRatio={CARD_ASPECT_RATIO}
                    guides={true}
                    viewMode={1}
                    minCropBoxWidth={120}
                    minCropBoxHeight={60}
                    background={false}
                    responsive={true}
                    autoCropArea={0.95}
                    checkOrientation={false}
                    cropend={handleCrop}
                    ready={handleCrop}
                  />
                </div>

                {/* Cropper Toolbar */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      cropperRef.current?.cropper.zoom(0.1);
                      handleCrop();
                    }}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition active:scale-95"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cropperRef.current?.cropper.zoom(-0.1);
                      handleCrop();
                    }}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition active:scale-95"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cropperRef.current?.cropper.rotate(90);
                      handleCrop();
                    }}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition active:scale-95"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Real Data Card Preview (Exact same card size and styling as Job List!) */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Live Card Preview
                  </span>
                  <span className="text-[11px] text-zinc-500">Exact Checklist Card Fit</span>
                </div>

                {/* The Live Vehicle Card Preview with Real Job Data & Gradient Overlay */}
                <div className="relative overflow-hidden rounded-2xl border border-zinc-700/80 shadow-xl bg-zinc-900 p-4 min-h-[150px] flex flex-col justify-between select-none">
                  {/* Background Image with Gradient Overlay */}
                  {livePreviewUrl && (
                    <>
                      <img
                        src={livePreviewUrl}
                        alt="Vehicle Preview"
                        className="absolute inset-0 w-full h-full object-cover object-center z-0"
                      />
                      {/* Left Dark Gradient Overlay for 100% Readability */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0d1527]/95 via-[#0d1527]/80 to-[#0d1527]/25 z-0" />
                      {/* Vertical vignette gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1527]/90 via-transparent to-black/30 z-0" />
                    </>
                  )}

                  {/* Foreground Content */}
                  <div className="relative z-10 space-y-3">
                    {/* Top Row: Vehicle Name, Color, Pinned Badge, Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white uppercase tracking-tight truncate flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{job.vehicleName}</span>
                            {job.vehicleColor && (
                              <span className="text-amber-400 font-bold text-xs">
                                · {job.vehicleColor}
                              </span>
                            )}
                          </h3>

                          {job.isPinnedForAll && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider shadow-2xs">
                              <Pin className="w-2.5 h-2.5 fill-zinc-950" />
                              PINNED
                            </span>
                          )}
                        </div>

                        <div className="mt-1">
                          <span className="text-[11px] font-mono font-black text-zinc-300 bg-black/60 border border-white/10 px-2 py-0.5 rounded-md inline-block">
                            {job.vehicleNumber}
                          </span>
                        </div>
                      </div>

                      {/* Right: Status Pill */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isReady ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[10px] font-black uppercase backdrop-blur-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase backdrop-blur-xs">
                            <Clock className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Count */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono font-black text-slate-300">
                        <span className="tracking-wider uppercase">TASKS</span>
                        <span className="text-amber-400 font-bold">
                          {completedTasks}/{totalTasks}
                        </span>
                      </div>
                      <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                          style={{
                            width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer Row: Duration in garage & Date */}
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {getGarageDuration(job.createdAt)}
                      </span>
                      <span className="font-bold text-zinc-300">{formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions (Reduced Save Photo button size as requested) */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-3.5 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          >
            Cancel
          </button>

          {imageSrc && (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-zinc-950 text-xs font-black uppercase rounded-xl hover:bg-amber-300 shadow-md shadow-amber-400/15 transition active:scale-95 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Save Photo</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
