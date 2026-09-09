import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  Car,
  Check,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  Loader2,
  Sparkles,
  AlertTriangle,
  Star,
  Trash2,
  Maximize2,
  RefreshCw,
  Eye,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';

const INSPECTION_ANGLES = [
  { label: 'Front', icon: '🚘', note: 'Front View & Grille' },
  { label: 'Rear', icon: '🚗', note: 'Rear View & Boot' },
  { label: 'Left Side', icon: '👈', note: 'Left Profile & Doors' },
  { label: 'Right Side', icon: '👉', note: 'Right Profile & Doors' },
  { label: 'Odometer', icon: '⏱', note: 'Odometer & Fuel Level' },
  { label: 'Engine', icon: '🔧', note: 'Under Bonnet Engine Bay' },
  { label: 'Interior', icon: '💺', note: 'Interior Cabin & Seats' },
  { label: 'Damage', icon: '⚠️', note: 'Scratch / Dent Closeup' },
];
import {
  useGetJobCardByIdQuery,
  useUploadJobImageMutation,
  useSetJobThumbnailMutation,
  useDeleteJobPhotoMutation,
  JobCardData,
} from '../../jobs/api/jobApi';
import { ImageViewerModal, ViewerImage } from '../../../shared/components/common/ImageViewerModal';

export const VehiclePhotoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Camera & Studio state
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);

  // Live ticking time for viewfinder HUD
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  // Lightbox Modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Success / Error / Info notifications
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [sessionCaptures, setSessionCaptures] = useState<number>(0);

  const { data: jobResponse, isLoading, isError } = useGetJobCardByIdQuery(id!, { skip: !id });
  const currentJob: JobCardData | undefined = jobResponse?.data;

  const [uploadJobImage, { isLoading: isUploading }] = useUploadJobImageMutation();
  const [setJobThumbnail, { isLoading: isSettingThumb }] = useSetJobThumbnailMutation();
  const [deleteJobPhoto, { isLoading: isDeletingPhoto }] = useDeleteJobPhotoMutation();

  // Ticking time update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Camera stream initialization & cleanup
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera is not supported in this browser. Use system camera fallback.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraReady(true);
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Use system camera fallback.');
      } else {
        setCameraError('Could not start live camera feed. Use system camera fallback.');
      }
    }
  }, [cameraFacing, stopCameraStream]);

  useEffect(() => {
    startCameraStream();
    return () => stopCameraStream();
  }, [startCameraStream, stopCameraStream]);

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // ── BURN-IN CANVAS FUNCTION (Legal / Operational Timestamp Proof) ──
  const burnTimestampOntoCanvas = (
    sourceImage: CanvasImageSource,
    srcWidth: number,
    srcHeight: number,
    noteText: string
  ): string => {
    const canvas = document.createElement('canvas');
    const targetWidth = Math.min(srcWidth, 1920);
    const targetHeight = Math.round((targetWidth / srcWidth) * srcHeight);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Draw the high-res camera frame
    ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    // 2. Calculate bottom inspection banner dimensions (sleek non-intrusive ribbon ~7-8% height)
    const ribbonHeight = Math.max(54, Math.round(targetHeight * 0.075));
    const ribbonY = targetHeight - ribbonHeight;

    // 3. Draw frosted semi-transparent dark gradient bar
    const gradient = ctx.createLinearGradient(0, ribbonY, 0, targetHeight);
    gradient.addColorStop(0, 'rgba(8, 9, 15, 0.72)');
    gradient.addColorStop(1, 'rgba(8, 9, 15, 0.94)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, ribbonY, targetWidth, ribbonHeight);

    // Thin amber highlight rule along top of ribbon
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, ribbonY, targetWidth, 2);

    // Text formatting configurations
    const fontSize = Math.max(12, Math.round(ribbonHeight * 0.28));
    const smallFontSize = Math.max(10, Math.round(ribbonHeight * 0.22));
    const paddingX = Math.round(targetWidth * 0.025);

    // Text shadows for absolute readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // 4. Left side: Garage Brand Badge + Vehicle Plate & Model
    ctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = '#fbbf24'; // Amber-400
    const badgeText = '⚡ MOMZZ INSPECTION PROOF';
    ctx.fillText(badgeText, paddingX, ribbonY + ribbonHeight * 0.42);

    ctx.font = `700 ${smallFontSize}px ui-monospace, monospace`;
    ctx.fillStyle = '#ffffff';
    const vehicleText = `${currentJob?.vehicleNumber || ''} • ${currentJob?.vehicleName || 'Vehicle'}`;
    ctx.fillText(vehicleText, paddingX, ribbonY + ribbonHeight * 0.8);

    // 5. Right side: Precise Timestamp & Location
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
    const fullTimestampStr = `${dateStr}  ${timeStr} IST`;

    ctx.font = `900 ${fontSize}px ui-monospace, monospace`;
    ctx.fillStyle = '#ffffff';
    const timeWidth = ctx.measureText(fullTimestampStr).width;
    const rightX = targetWidth - paddingX - timeWidth;
    ctx.fillText(fullTimestampStr, rightX, ribbonY + ribbonHeight * 0.42);

    // Remarks text (if present)
    if (noteText.trim()) {
      ctx.font = `700 ${smallFontSize}px ui-monospace, monospace`;
      ctx.fillStyle = '#fbbf24';
      const remarkDisplay = `REMARK: ${noteText.trim().toUpperCase()}`;
      const remarkWidth = ctx.measureText(remarkDisplay).width;
      ctx.fillText(remarkDisplay, targetWidth - paddingX - remarkWidth, ribbonY + ribbonHeight * 0.8);
    } else {
      ctx.font = `600 ${smallFontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      const verifiedTag = 'VERIFIED TAMPER-PROOF CAPTURE';
      const tagWidth = ctx.measureText(verifiedTag).width;
      ctx.fillText(verifiedTag, targetWidth - paddingX - tagWidth, ribbonY + ribbonHeight * 0.8);
    }

    return canvas.toDataURL('image/jpeg', 0.88);
  };

  // ── TRIGGER LIVE SNAPSHOT (CONTINUOUS CAPTURE) ──
  const handleSnapAndUpload = async () => {
    if (!videoRef.current || !currentJob) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const currentRemark = remarks.trim();

      const stampedBase64 = burnTimestampOntoCanvas(video, width, height, currentRemark);
      if (!stampedBase64) {
        throw new Error('Failed to capture frame from video.');
      }

      setSessionCaptures((prev) => prev + 1);

      const jobId = currentJob.id || currentJob._id!;
      uploadJobImage({
        jobCardId: jobId,
        image: stampedBase64,
        remarks: currentRemark,
      })
        .unwrap()
        .then(() => {
          setStatusMsg({
            type: 'success',
            text: 'Photo captured & stamped! Check photo below to set as thumbnail.',
          });
          setTimeout(() => setStatusMsg(null), 3000);
        })
        .catch((err: any) => {
          setStatusMsg({
            type: 'error',
            text: err?.data?.message || 'Failed to upload snapshot.',
          });
          setTimeout(() => setStatusMsg(null), 4000);
        });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to capture frame.',
      });
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // ── FALLBACK PHONE CAMERA CAPTURE ──
  const handleNativeCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentJob) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          setIsCapturing(true);
          const stampedBase64 = burnTimestampOntoCanvas(img, img.width, img.height, remarks);
          const jobId = currentJob.id || currentJob._id!;
          await uploadJobImage({
            jobCardId: jobId,
            image: stampedBase64,
            remarks: remarks.trim(),
          }).unwrap();

          setSessionCaptures((prev) => prev + 1);
          setStatusMsg({
            type: 'success',
            text: 'Photo captured & stamped! Check photo below to set as thumbnail.',
          });
          setRemarks('');
          setTimeout(() => setStatusMsg(null), 3500);
        } catch (err: any) {
          setStatusMsg({
            type: 'error',
            text: err?.data?.message || 'Failed to process camera photo.',
          });
        } finally {
          setIsCapturing(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Thumbnail Toggle on existing photo
  const handleSetThumbnail = async (identifier: string) => {
    if (!currentJob) return;
    const jobId = currentJob.id || currentJob._id!;
    try {
      await setJobThumbnail({ jobCardId: jobId, photoIdentifier: identifier }).unwrap();
      setStatusMsg({ type: 'success', text: 'Vehicle thumbnail updated.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to set thumbnail.' });
    }
  };

  // Handle Delete photo
  const handleDeletePhoto = async (identifier: string) => {
    if (!currentJob) return;
    const jobId = currentJob.id || currentJob._id!;
    try {
      await deleteJobPhoto({ jobCardId: jobId, photoIdentifier: identifier }).unwrap();
      setStatusMsg({ type: 'success', text: 'Photo removed.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete photo.' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080e] text-slate-900 dark:text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-mono text-amber-500 font-bold">Loading Live Studio...</p>
        </div>
      </div>
    );
  }

  if (isError || !currentJob) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080e] text-slate-900 dark:text-white flex flex-col">
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-6 rounded-3xl glass-modern-card text-center space-y-3">
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

  // Aggregate photos for this vehicle
  const photosList = Array.isArray(currentJob.photos) && currentJob.photos.length > 0
    ? currentJob.photos
    : currentJob.thumbnailUrl
    ? [{ url: currentJob.thumbnailUrl, remarks: 'Primary Vehicle Photo', isThumbnail: true, capturedAt: currentJob.createdAt }]
    : [];

  const viewerImages: ViewerImage[] = photosList.map((p: any) => ({
    url: p.url,
    title: currentJob.vehicleName,
    subtitle: currentJob.vehicleNumber,
    timestamp: p.capturedAt || currentJob.createdAt,
    remarks: p.remarks,
    isThumbnail: Boolean(p.isThumbnail || p.url === currentJob.thumbnailUrl),
  }));

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col selection:bg-amber-400/20 font-sans">
      <Navbar glass />

      <main className="app-container relative z-10 flex-1 py-4 pb-32 space-y-4 max-w-3xl mx-auto w-full">
        {/* Top Header */}
        <header className="sticky top-0 sm:top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 pt-3 pb-3 mb-2 glass-modern-header flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton to={`/jobs/${currentJob.id || currentJob._id}`} label="Vehicle" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {currentJob.vehicleName}
                </h1>
                <span className="text-[11px] font-mono font-black text-slate-900 dark:text-amber-300 bg-amber-400/20 dark:bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  {currentJob.vehicleNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Live Camera Studio · In-Image Timestamp Proof
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="p-2 rounded-xl glass-ghost-btn text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200/80 dark:border-white/10 active:scale-90 transition cursor-pointer"
              title="Flip Camera (Front/Rear)"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Notifications */}
        {statusMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-mono flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : statusMsg.type === 'info'
                ? 'bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : statusMsg.type === 'info' ? (
              <Loader2 className="w-4 h-4 text-sky-500 animate-spin shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* ── 1. LIVE CAMERA VIEWFINDER STUDIO ── */}
        <section className="relative rounded-3xl overflow-hidden glass-modern-card border border-slate-200/80 dark:border-white/10 shadow-2xl bg-black">
          {/* Flash animation */}
          {flashEffect && (
            <div className="absolute inset-0 z-40 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
          )}

          {/* Viewfinder Video Stream */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Overlays / HUD */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-20">
              {/* Top HUD Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono font-black text-rose-400 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    LIVE CAMERA
                  </span>
                  <span className="text-[10px] font-mono font-bold text-white/80 bg-black/50 px-2 py-1 rounded-md backdrop-blur-md">
                    {currentTime}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-amber-400 font-bold backdrop-blur-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>STAMP ACTIVE</span>
                </div>
              </div>

              {/* Viewfinder Target Framing Brackets */}
              <div className="self-center w-48 h-32 sm:w-64 sm:h-44 border border-white/20 rounded-2xl relative">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              </div>

              {/* Bottom HUD: Live watermark simulation preview */}
              <div className="w-full py-1.5 px-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-between text-[9px] font-mono text-white/80">
                <span className="text-amber-400 font-bold">
                  ⚡ {currentJob.vehicleNumber} · {currentJob.vehicleName}
                </span>
                <span>{currentTime} IST · PROOF BURNT ON SHUTTER</span>
              </div>
            </div>

            {/* Error / Fallback State */}
            {cameraError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/90 text-white space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-mono text-slate-300 max-w-sm">{cameraError}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 transition active:scale-95 shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Phone Camera</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Native Camera Input (Fallback) */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeCameraFile}
            className="hidden"
          />

          {/* ── 2. STUDIO CONTROLS (Angle Chips + Remarks + Shutter) ── */}
          <div className="p-4 sm:p-5 space-y-3.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-900/60 dark:bg-black/60 backdrop-blur-xl">
            {/* Quick Angle Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Multi-Angle Inspection Tags</span>
                </span>
                <span className="text-slate-500 font-normal">Tap to tag & snap</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {INSPECTION_ANGLES.map((angle) => {
                  const isSelected = remarks === angle.note;
                  return (
                    <button
                      key={angle.label}
                      type="button"
                      onClick={() => setRemarks(isSelected ? '' : angle.note)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 border transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:border-amber-400/40 hover:text-white'
                      }`}
                    >
                      <span>{angle.icon}</span>
                      <span>{angle.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Inspection Remarks / Note
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Front bumper scratch, Engine bay, Odometer read..."
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 text-xs font-mono text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Helper Caption & Session Counter (No Checkbox) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                Tap SNAP to capture · Mark thumbnail directly on photos below
              </span>
              {sessionCaptures > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-400 font-mono text-[10px] font-bold">
                  {sessionCaptures} Captured
                </span>
              )}
            </div>

            {/* Shutter Button Action Dock */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {/* Camera Flip Button */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center gap-2 transition active:scale-95 cursor-pointer text-xs font-mono font-bold"
                title="Flip Camera (Front / Rear)"
              >
                <FlipHorizontal className="w-5 h-5 text-amber-400" />
                <span className="hidden sm:inline">Flip Camera</span>
              </button>

              {/* Main Tactile Shutter */}
              <button
                type="button"
                disabled={isCapturing || (!isCameraReady && !cameraError)}
                onClick={handleSnapAndUpload}
                className="relative group flex items-center justify-center p-1 rounded-full active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {/* Outer Glow Ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 opacity-60 group-hover:opacity-100 blur-sm transition" />

                {/* Shutter Body */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 hover:bg-amber-300 border-4 border-slate-950 flex flex-col items-center justify-center shadow-2xl transition">
                  {isCapturing ? (
                    <Loader2 className="w-7 h-7 text-slate-950 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950" />
                      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-slate-950 mt-0.5">
                        SNAP
                      </span>
                    </>
                  )}
                </div>
              </button>

              {/* Jump to Gallery Shortcut */}
              <a
                href="#inspection-gallery"
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center gap-2 transition active:scale-95 cursor-pointer text-xs font-mono font-bold"
                title="View captured photos below"
              >
                <Eye className="w-5 h-5 text-amber-400" />
                <span className="hidden sm:inline">Photos ({photosList.length})</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── 3. INSPECTION PHOTOS GALLERY (Captured Photos Listed Below) ── */}
        <section id="inspection-gallery" className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Captured Photos ({photosList.length})</span>
              </h2>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                Mark any photo below to set it as the primary vehicle thumbnail
              </p>
            </div>
            {photosList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setViewerIndex(0);
                  setViewerOpen(true);
                }}
                className="text-xs font-mono font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Fullscreen Slider</span>
              </button>
            )}
          </div>

          {photosList.length === 0 ? (
            <div className="py-10 text-center rounded-3xl glass-modern-card p-4 space-y-1">
              <Camera className="w-8 h-8 text-amber-500/50 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No photos captured yet</p>
              <p className="text-[11px] font-mono text-slate-400">
                Snap vehicle inspection angles above using the live camera shutter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {photosList.map((photo: any, index: number) => {
                const photoUrl = photo.url;
                const identifier = photo.publicId || photo.url;
                const isThumb = Boolean(photo.isThumbnail || photoUrl === currentJob.thumbnailUrl);

                return (
                  <div
                    key={photo.publicId || photo.url || index}
                    className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden glass-modern-card border transition-all ${
                      isThumb
                        ? 'border-amber-400 shadow-lg shadow-amber-400/10 ring-2 ring-amber-400/30'
                        : 'border-slate-200/80 dark:border-white/10 hover:border-amber-400/50'
                    }`}
                  >
                    {/* Thumbnail Image Viewport */}
                    <div
                      className="relative aspect-[4/3] overflow-hidden bg-black/40 cursor-pointer"
                      onClick={() => {
                        setViewerIndex(index);
                        setViewerOpen(true);
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt="Vehicle Angle"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Direct On-Photo Thumbnail Marking Action */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
                        {isThumb ? (
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 shadow-md flex items-center gap-1.5 pointer-events-auto border border-amber-300">
                            <Star className="w-3 h-3 fill-current text-slate-950" />
                            <span>Primary Thumbnail</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSettingThumb}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetThumbnail(identifier);
                            }}
                            className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-black/75 hover:bg-amber-400 hover:text-slate-950 text-white shadow-md flex items-center gap-1.5 pointer-events-auto border border-white/20 backdrop-blur-md transition active:scale-95 cursor-pointer ml-auto"
                            title="Mark this photo as vehicle thumbnail"
                          >
                            <Star className="w-3 h-3 text-amber-400" />
                            <span>Set as Thumbnail</span>
                          </button>
                        )}
                      </div>

                      {/* Hover Zoom / Expand Indicator */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                        <div className="w-9 h-9 rounded-2xl bg-black/60 backdrop-blur-md flex items-center justify-center shadow-lg">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card Footer */}
                    <div className="p-3 space-y-2 bg-white/5 backdrop-blur-md">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-mono font-black text-amber-500 dark:text-amber-400 truncate">
                            {photo.remarks || `Inspection Angle #${index + 1}`}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {photo.capturedAt
                              ? new Date(photo.capturedAt).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : 'Stamped & Verified'}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          disabled={isDeletingPhoto}
                          onClick={() => handleDeletePhoto(identifier)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 transition cursor-pointer"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Marking Bar on Listed Photo Itself */}
                      {!isThumb && (
                        <button
                          type="button"
                          disabled={isSettingThumb}
                          onClick={() => handleSetThumbnail(identifier)}
                          className="w-full py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Mark as Thumbnail</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── 4. REUSABLE EXPANDED LIGHTBOX IMAGE VIEWER ── */}
      <ImageViewerModal
        isOpen={viewerOpen}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};
