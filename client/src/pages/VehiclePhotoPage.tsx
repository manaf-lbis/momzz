import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import {
  ArrowLeft,
  Camera,
  Car,
  Check,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  Pin,
  RotateCcw,
  RotateCw,
  Sparkles,
  Upload,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '../components/navbar/Navbar';
import { useGetJobCardsQuery, useUploadJobImageMutation, JobCardData } from '../api/jobApi';

export const VehiclePhotoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string>('');
  const [livePreviewUrl, setLivePreviewUrl] = useState<string>('');
  const [scaleX, setScaleX] = useState<number>(1);
  const [scaleY, setScaleY] = useState<number>(1);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const { data: jobsResponse, isLoading, isError } = useGetJobCardsQuery();
  const [uploadJobImage] = useUploadJobImageMutation();

  const rawData = jobsResponse?.data;
  const jobsList: JobCardData[] = Array.isArray(rawData) ? rawData : rawData?.jobs || [];
  const currentJob = jobsList.find((j) => j.id === id || j._id === id);

  // 2.1:1 ratio matching the vehicle card on the checklist/job list
  const CARD_ASPECT_RATIO = 2.1 / 1;

  // Auto-init with existing thumbnail if present and no new image picked
  useEffect(() => {
    if (currentJob?.thumbnailUrl && !imageSrc) {
      setLivePreviewUrl(currentJob.thumbnailUrl);
    }
  }, [currentJob?.thumbnailUrl, imageSrc]);

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
      setScaleX(1);
      setScaleY(1);
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
        setLivePreviewUrl(canvas.toDataURL('image/jpeg', 0.88));
      }
    } catch {
      // ignore
    }
  };

  const handleFlipHorizontal = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const next = scaleX * -1;
    cropper.scaleX(next);
    setScaleX(next);
    handleCrop();
  };

  const handleFlipVertical = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const next = scaleY * -1;
    cropper.scaleY(next);
    setScaleY(next);
    handleCrop();
  };

  const handleRotate = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.rotate(90);
    handleCrop();
  };

  const handleZoom = (delta: number) => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.zoom(delta);
    handleCrop();
  };

  const handleReset = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.reset();
    setScaleX(1);
    setScaleY(1);
    handleCrop();
  };

  const handleSave = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !currentJob) return;

    setIsUploading(true);
    setError('');

    try {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1600,
        maxHeight: 900,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      const base64 = canvas.toDataURL('image/jpeg', 0.88);
      const jobId = currentJob.id || currentJob._id!;

      await uploadJobImage({ jobCardId: jobId, image: base64 }).unwrap();

      setSuccessMsg('Vehicle photo saved successfully!');
      setTimeout(() => {
        navigate(`/jobs/${jobId}`);
      }, 700);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-mono text-amber-500">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (isError || !currentJob) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white flex flex-col">
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-6 industrial-card rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-sm font-bold uppercase">Job Card Not Found</h2>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-xl hover:bg-amber-300 transition"
          >
            ← Return to Jobs List
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = currentJob.tasks?.length || 0;
  const completedTasks = currentJob.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
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
  }).format(new Date(currentJob.createdAt));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Page Top Header */}
        <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}`)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition shrink-0"
              title="Back to Job Card"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {currentJob.vehicleName}
                </h1>
                {currentJob.vehicleColor && (
                  <span className="text-amber-500 font-bold text-xs">
                    · {currentJob.vehicleColor}
                  </span>
                )}
                <span className="inline-block text-[11px] font-mono font-black text-amber-500 bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  {currentJob.vehicleNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                Vehicle Photo Studio · Real-time Card Crop & Preview
              </p>
            </div>
          </div>

          {/* Top Save button */}
          {imageSrc && (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 text-zinc-950 text-xs font-black uppercase rounded-xl hover:bg-amber-300 shadow-md shadow-amber-400/15 transition active:scale-95 disabled:opacity-50 shrink-0"
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="p-3.5 bg-red-950/70 border border-red-800/80 rounded-2xl text-xs font-mono text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/70 border border-emerald-800/80 rounded-2xl text-xs font-mono text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Studio Content */}
        {!imageSrc ? (
          /* Empty / Capture Selection State */
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-amber-400/80 dark:hover:border-amber-400/80 rounded-3xl p-10 sm:p-14 text-center cursor-pointer bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-4 shadow-sm"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-black text-slate-900 dark:text-white">
                  Capture or Upload Vehicle Photo
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                  Take a photo or pick from device (JPG, PNG, WebP)
                </p>
              </div>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-zinc-950 text-xs font-black uppercase rounded-xl hover:bg-amber-300 shadow-md shadow-amber-400/20 transition active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Select / Capture Image</span>
              </button>
            </div>

            {/* If vehicle already has a photo, show it */}
            {currentJob.thumbnailUrl && (
              <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400">
                  <span className="font-bold text-slate-700 dark:text-zinc-300">Current Photo Active</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-amber-500 hover:underline font-bold"
                  >
                    Replace Photo
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden max-h-48 border border-slate-200 dark:border-zinc-800">
                  <img
                    src={currentJob.thumbnailUrl}
                    alt={currentJob.vehicleName}
                    className="w-full h-48 object-cover object-center"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Cropper + Toolbar + Live Card Preview */
          <div className="space-y-5">
            {/* Cropper Section */}
            <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-500" />
                  Crop & Frame Vehicle Image
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-500 hover:underline font-bold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose Different Image
                </button>
              </div>

              {/* Cropper Stage */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 max-h-[360px] flex items-center justify-center">
                <Cropper
                  ref={cropperRef}
                  src={imageSrc}
                  style={{ height: 340, width: '100%' }}
                  aspectRatio={CARD_ASPECT_RATIO}
                  guides={true}
                  viewMode={1}
                  minCropBoxWidth={140}
                  minCropBoxHeight={70}
                  background={false}
                  responsive={true}
                  autoCropArea={0.95}
                  checkOrientation={false}
                  cropend={handleCrop}
                  ready={handleCrop}
                />
              </div>

              {/* Cropper Studio Controls: Flip Horizontal, Flip Vertical, Rotate, Zoom, Reset */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Flip Horizontal */}
                  <button
                    type="button"
                    onClick={handleFlipHorizontal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition active:scale-95"
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Flip H</span>
                  </button>

                  {/* Flip Vertical */}
                  <button
                    type="button"
                    onClick={handleFlipVertical}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition active:scale-95"
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    <span>Flip V</span>
                  </button>

                  {/* Rotate 90° */}
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition active:scale-95"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate</span>
                  </button>

                  {/* Zoom Controls */}
                  <button
                    type="button"
                    onClick={() => handleZoom(0.1)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 transition active:scale-95"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(-0.1)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 transition active:scale-95"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white text-xs font-mono font-bold transition"
                  title="Reset Transformations"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Live Real-Data Card Preview (Exact same card size and layout as Checklist page!) */}
            <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Live Checklist Card Preview
                </span>
                <span className="text-slate-400 dark:text-zinc-500 text-[11px]">
                  Exact Job Card Appearance
                </span>
              </div>

              {/* Exact Card Preview Matching Job List Page */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[175px] shadow-lg border border-zinc-800 bg-[#0b132b] select-none">
                {/* Background Image with Clean Left-to-Right Medium Gradient Overlay */}
                {livePreviewUrl && (
                  <>
                    <img
                      src={livePreviewUrl}
                      alt={currentJob.vehicleName}
                      className="absolute inset-0 w-full h-full object-cover object-center z-0"
                    />
                    {/* Clean left-to-right medium gradient tone */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b1328] via-[#0b1328]/80 via-42% to-transparent z-0" />
                    {/* Subtle soft vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1328]/60 via-transparent to-black/25 z-0" />
                  </>
                )}

                {/* Content Container (Layered on top of gradient) */}
                <div className="relative z-10 flex flex-col justify-between flex-1 gap-3.5">
                  {/* Top Row: Vehicle Name, Color, Pinned Badges, Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate flex items-center gap-1.5 drop-shadow-xs">
                          <Car className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate">{currentJob.vehicleName}</span>
                          {currentJob.vehicleColor && (
                            <span className="text-amber-400 font-bold text-xs shrink-0">
                              · {currentJob.vehicleColor}
                            </span>
                          )}
                        </h3>

                        {currentJob.isPinnedForAll && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider shadow-sm shadow-amber-400/20 shrink-0">
                            <Pin className="w-2.5 h-2.5 fill-zinc-950" />
                            Pinned for All
                          </span>
                        )}
                      </div>

                      {/* Registration Plate Badge */}
                      <div>
                        <span className="inline-block text-[11px] font-mono font-black text-slate-200 bg-slate-950/85 border border-slate-700/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                          {currentJob.vehicleNumber}
                        </span>
                      </div>
                    </div>

                    {/* Right: Status Pill */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isReady ? (
                        <span className="shrink-0 flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Ready
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Tasks Progress Row */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-300 uppercase tracking-wider font-bold text-[10px]">
                        TASKS
                      </span>
                      <span className="font-black text-amber-400">
                        {completedTasks}/{totalTasks}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                        style={{
                          width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Bottom Row: Garage Duration & Date */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {getGarageDuration(currentJob.createdAt)}
                    </span>
                    <span className="font-bold text-slate-300">{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar (Reduced Save Button Size) */}
            <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => navigate(`/jobs/${currentJob.id || currentJob._id}`)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel & Return
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-zinc-950 text-xs font-black uppercase rounded-xl hover:bg-amber-300 shadow-md shadow-amber-400/15 transition active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Photo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
