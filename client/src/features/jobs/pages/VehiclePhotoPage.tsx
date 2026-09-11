import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  Loader2,
  Sparkles,
  AlertTriangle,
  Star,
  Trash2,
  RefreshCw,
  ShieldCheck,
  SwitchCamera,
  ZoomIn,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/navbar/Navbar';
import { BackButton } from '../../../shared/components/common/BackButton';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

import {
  useGetJobCardByIdQuery,
  useUploadJobImageMutation,
  useSetJobThumbnailMutation,
  useDeleteJobPhotoMutation,
  JobCardData,
} from '../../jobs/api/jobApi';

// ── Inspection angle presets ──
const INSPECTION_ANGLES = [
  { label: 'Front', icon: '🚘', note: 'Front View & Grille' },
  { label: 'Rear', icon: '🚗', note: 'Rear View & Boot' },
  { label: 'Left', icon: '👈', note: 'Left Profile & Doors' },
  { label: 'Right', icon: '👉', note: 'Right Profile & Doors' },
  { label: 'Odo', icon: '⏱', note: 'Odometer & Fuel Level' },
  { label: 'Engine', icon: '🔧', note: 'Under Bonnet Engine Bay' },
  { label: 'Interior', icon: '💺', note: 'Interior Cabin & Seats' },
  { label: 'Damage', icon: '⚠️', note: 'Scratch / Dent Closeup' },
];

// ── Fixed capture aspect ratio: 4:3 (like Amazon product) ──
const CAPTURE_RATIO = 4 / 3; // width / height

export const VehiclePhotoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const viewfinderRef = useRef<HTMLDivElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [sessionCaptures, setSessionCaptures] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [localPhotos, setLocalPhotos] = useState<any[] | null>(null);

  const { data: jobResponse, isLoading, isError, refetch } = useGetJobCardByIdQuery(id!, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });
  const currentJob: JobCardData | undefined = jobResponse?.data;

  // Sync server photos to localPhotos whenever fresh job data arrives
  useEffect(() => {
    if (jobResponse?.data?.photos) {
      setLocalPhotos(jobResponse.data.photos);
    }
  }, [jobResponse?.data?.photos]);

  const [uploadJobImage] = useUploadJobImageMutation();
  const [setJobThumbnail, { isLoading: isSettingThumb }] = useSetJobThumbnailMutation();
  const [deleteJobPhoto, { isLoading: isDeletingPhoto }] = useDeleteJobPhotoMutation();

  // Ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Camera stream management ──
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }, []);

  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera not supported. Use the system camera button below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: CAPTURE_RATIO },
        },
        audio: false,
      });
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
        setCameraError('Camera permission denied. Please allow access and try again.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device. Use the system camera button below.');
      } else {
        setCameraError('Could not start camera. Use the system camera button below.');
      }
    }
  }, [cameraFacing, stopCameraStream]);

  useEffect(() => {
    startCameraStream();
    return () => stopCameraStream();
  }, [startCameraStream, stopCameraStream]);

  // ── Burn timestamp watermark + CAPTURE ONLY THE 4:3 CROP BOX ──
  const burnTimestampOntoCanvas = (
    sourceImage: CanvasImageSource,
    srcWidth: number,
    srcHeight: number,
    noteText: string
  ): string => {
    // Calculate the 4:3 crop from the source (center crop)
    let cropX = 0, cropY = 0, cropW = srcWidth, cropH = srcHeight;
    const sourceRatio = srcWidth / srcHeight;

    if (sourceRatio > CAPTURE_RATIO) {
      // Wider than 4:3 — crop left and right
      cropW = Math.round(srcHeight * CAPTURE_RATIO);
      cropX = Math.round((srcWidth - cropW) / 2);
    } else if (sourceRatio < CAPTURE_RATIO) {
      // Taller than 4:3 — crop top and bottom
      cropH = Math.round(srcWidth / CAPTURE_RATIO);
      cropY = Math.round((srcHeight - cropH) / 2);
    }

    const targetWidth = Math.min(cropW, 1920);
    const targetHeight = Math.round(targetWidth / CAPTURE_RATIO);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw only the crop box area
    ctx.drawImage(sourceImage, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight);

    // Timestamp
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = String(hours % 12 || 12).padStart(2, '0');
    const dateStr = `${day}-${month}-${year}`;
    const timeStr = `${hours12}:${minutes}:${seconds} ${ampm} IST`;
    const fullStamp = `${dateStr} • ${timeStr}`;

    const pX = Math.round(targetWidth * 0.022);

    // Top-right corner pill
    const cornerText = `DATE: ${dateStr} | ${timeStr}`;
    const cornerFontSize = Math.max(9, Math.round(targetHeight * 0.018));
    ctx.font = `800 ${cornerFontSize}px ui-monospace, monospace`;
    const cornerW = ctx.measureText(cornerText).width + 20;
    const cornerH = Math.max(22, Math.round(targetHeight * 0.034));
    const cornerX = targetWidth - cornerW - pX;
    const cornerY = pX;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 7, 14, 0.82)';
    ctx.beginPath();
    ctx.roundRect(cornerX, cornerY, cornerW, cornerH, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(cornerText, cornerX + 10, cornerY + cornerH * 0.7);
    ctx.restore();

    // Bottom banner
    const ribbonH = Math.max(52, Math.round(targetHeight * 0.075));
    const ribbonY = targetHeight - ribbonH;

    const grad = ctx.createLinearGradient(0, ribbonY, 0, targetHeight);
    grad.addColorStop(0, 'rgba(8,9,15,0.8)');
    grad.addColorStop(1, 'rgba(8,9,15,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, ribbonY, targetWidth, ribbonH);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, ribbonY, targetWidth, 2);

    const fz = Math.max(11, Math.round(ribbonH * 0.28));
    const sfz = Math.max(9, Math.round(ribbonH * 0.22));

    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.font = `900 ${fz}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('⚡ MOMZZ INSPECTION PROOF', pX, ribbonY + ribbonH * 0.42);

    ctx.font = `700 ${sfz}px ui-monospace, monospace`;
    ctx.fillStyle = '#ffffff';
    const vehicleTxt = `${currentJob?.vehicleNumber || ''} • ${currentJob?.vehicleName || 'Vehicle'}`;
    ctx.fillText(vehicleTxt, pX, ribbonY + ribbonH * 0.82);

    ctx.font = `900 ${fz}px ui-monospace, monospace`;
    ctx.fillStyle = '#ffffff';
    const stampW = ctx.measureText(fullStamp).width;
    ctx.fillText(fullStamp, targetWidth - pX - stampW, ribbonY + ribbonH * 0.42);

    if (noteText.trim()) {
      ctx.font = `700 ${sfz}px ui-monospace, monospace`;
      ctx.fillStyle = '#fbbf24';
      const remTxt = `REMARK: ${noteText.trim().toUpperCase()}`;
      const remW = ctx.measureText(remTxt).width;
      ctx.fillText(remTxt, targetWidth - pX - remW, ribbonY + ribbonH * 0.82);
    } else {
      ctx.font = `600 ${sfz}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const tag = 'VERIFIED TAMPER-PROOF CAPTURE';
      const tagW = ctx.measureText(tag).width;
      ctx.fillText(tag, targetWidth - pX - tagW, ribbonY + ribbonH * 0.82);
    }

    return canvas.toDataURL('image/jpeg', 0.90);
  };

  // ── SNAP: capture exactly what's visible in the 4:3 viewfinder ──
  const handleSnapAndUpload = async () => {
    if (!videoRef.current || !currentJob || isCapturing) return;

    setIsCapturing(true);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 180);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 960;

      const currentRemark = remarks.trim();
      const stampedBase64 = burnTimestampOntoCanvas(video, width, height, currentRemark);
      if (!stampedBase64) throw new Error('Failed to capture frame.');

      const targetId = id || currentJob.id || currentJob._id!;

      const response = await uploadJobImage({
        jobCardId: targetId,
        image: stampedBase64,
        remarks: currentRemark,
      }).unwrap();

      if (response?.data?.photos) {
        setLocalPhotos(response.data.photos);
      }
      refetch();

      setSessionCaptures((prev) => prev + 1);
      showStatus('success', '✓ Photo captured & added to inspection gallery!');
    } catch (err: any) {
      showStatus('error', err?.data?.message || err?.message || 'Failed to upload snapshot.');
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Native camera fallback ──
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
          const targetId = id || currentJob.id || currentJob._id!;
          const response = await uploadJobImage({
            jobCardId: targetId,
            image: stampedBase64,
            remarks: remarks.trim(),
          }).unwrap();
          if (response?.data?.photos) {
            setLocalPhotos(response.data.photos);
          }
          refetch();
          setSessionCaptures((prev) => prev + 1);
          showStatus('success', '✓ Photo captured & added to inspection gallery!');
          setRemarks('');
        } catch (err: any) {
          showStatus('error', err?.data?.message || 'Failed to process camera photo.');
        } finally {
          setIsCapturing(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset so same file can be selected again
    e.target.value = '';
  };

  const handleSetThumbnail = async (identifier: string) => {
    if (!currentJob) return;
    const targetId = id || currentJob.id || currentJob._id!;
    try {
      const response = await setJobThumbnail({ jobCardId: targetId, photoIdentifier: identifier }).unwrap();
      if (response?.data?.photos) {
        setLocalPhotos(response.data.photos);
      }
      refetch();
      showStatus('success', 'Vehicle thumbnail updated.');
    } catch {
      showStatus('error', 'Failed to set thumbnail.');
    }
  };

  const handleDeletePhoto = async (identifier: string) => {
    if (!currentJob) return;
    const targetId = id || currentJob.id || currentJob._id!;
    try {
      const response = await deleteJobPhoto({ jobCardId: targetId, photoIdentifier: identifier }).unwrap();
      if (response?.data?.photos) {
        setLocalPhotos(response.data.photos);
      }
      refetch();
      showStatus('success', 'Photo removed.');
    } catch {
      showStatus('error', 'Failed to delete photo.');
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // ── Computed photo list (combines server/local photos + intake thumbnail if not yet in array) ──
  const photosList = React.useMemo(() => {
    const rawPhotos = localPhotos !== null ? localPhotos : (currentJob?.photos || []);
    const list: any[] = Array.isArray(rawPhotos) ? [...rawPhotos] : [];
    if (currentJob?.thumbnailUrl) {
      const alreadyIn = list.some(
        (p: any) => p.url === currentJob.thumbnailUrl || p.publicId === currentJob.thumbnailUrl
      );
      if (!alreadyIn) {
        list.unshift({
          url: currentJob.thumbnailUrl,
          publicId: currentJob.thumbnailUrl,
          remarks: 'Original Intake Photo',
          capturedAt: currentJob.createdAt || new Date().toISOString(),
          isThumbnail: true,
        });
      }
    }
    return list;
  }, [localPhotos, currentJob]);

  // ── Loading / Error States ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080e] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-mono text-amber-500 font-bold">Loading Camera Studio...</p>
        </div>
      </div>
    );
  }

  if (isError || !currentJob) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07080e] flex flex-col">
        <Navbar />
        <div className="max-w-md mx-auto my-16 p-6 rounded-3xl glass-modern-card text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-sm font-bold uppercase">Job Card Not Found</h2>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-xl hover:bg-amber-300 transition"
          >
            ← Return to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white flex flex-col font-sans selection:bg-amber-400/20">
      <Navbar glass />

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 sm:top-14 z-30 glass-modern-header px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <BackButton to={`/jobs/${currentJob.id || currentJob._id}`} label="Back" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {currentJob.vehicleName}
              </h1>
              <span className="text-[11px] sm:text-xs font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-400/20 border border-amber-400/35 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {currentJob.vehicleNumber}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Live Camera Studio · Tamper-Proof Timestamp
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sessionCaptures > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-500 font-mono text-[10px] font-bold">
              {sessionCaptures} Snapped
            </span>
          )}
          <button
            onClick={() => setCameraFacing((p) => (p === 'environment' ? 'user' : 'environment'))}
            className="p-2 rounded-xl glass-ghost-btn text-slate-600 dark:text-slate-300 hover:text-amber-500 border border-slate-200/80 dark:border-white/10 active:scale-90 transition"
            title="Flip Camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── STATUS TOAST ── */}
      {statusMsg && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 shadow-xl backdrop-blur-md transition-all max-w-xs w-max ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/90 text-white'
              : statusMsg.type === 'info'
              ? 'bg-sky-500/90 text-white'
              : 'bg-rose-500/90 text-white'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : statusMsg.type === 'info' ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {statusMsg.text}
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {/* ══════════════════════════════════════════════
            SECTION 1 — FIXED-RATIO CAMERA VIEWFINDER
            (mobile-first: full width, 4:3 ratio, black letterbox)
        ══════════════════════════════════════════════ */}
        <div className="w-full max-w-2xl mx-auto px-0 sm:px-4 sm:pt-4">
          <div
            className="relative w-full overflow-hidden bg-black sm:rounded-3xl sm:border sm:border-white/10"
            style={{ aspectRatio: `${CAPTURE_RATIO}` }}
          >
            {/* Flash overlay */}
            {flashEffect && (
              <div className="absolute inset-0 z-40 bg-white opacity-90 pointer-events-none" />
            )}

            {/* Live Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* HUD Overlay */}
            {!cameraError && (
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[9px] font-mono font-black text-rose-400 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-[9px] font-mono font-bold text-white/80 bg-black/55 px-2 py-1 rounded-md backdrop-blur-md">
                      {currentTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/65 px-2 py-1 rounded-full border border-white/10 text-[9px] font-mono text-amber-400 font-bold backdrop-blur-md">
                    <ShieldCheck className="w-3 h-3" />
                    <span>STAMP ON</span>
                  </div>
                </div>

                {/* Center: 4:3 framing guides */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 relative opacity-60">
                    {/* Corner L-brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr-sm" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl-sm" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br-sm" />
                    {/* Rule of thirds crosshairs */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="border border-white/8" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom watermark preview */}
                <div className="flex items-center justify-between text-[8px] font-mono bg-black/70 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/10">
                  <span className="text-amber-400 font-bold truncate">
                    ⚡ {currentJob.vehicleNumber} · {currentJob.vehicleName}
                  </span>
                  <span className="text-white/60 shrink-0 ml-2">{currentTime} IST</span>
                </div>
              </div>
            )}

            {/* Camera Error State */}
            {cameraError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/90 text-white gap-4">
                <Camera className="w-10 h-10 text-amber-400/60" />
                <p className="text-xs font-mono text-slate-300 max-w-xs">{cameraError}</p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={startCameraStream}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 transition active:scale-95 shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5" /> System Camera
                  </button>
                </div>
              </div>
            )}

            {/* Loading spinner while camera initialises */}
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 2 — CONTROLS DOCK (below viewfinder)
        ══════════════════════════════════════════════ */}
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4">
          <div className="rounded-b-3xl sm:rounded-3xl sm:mt-2 bg-slate-900/80 dark:bg-black/70 backdrop-blur-xl border border-t-0 sm:border-t border-white/[0.07] p-3 sm:p-4 space-y-3">

            {/* Angle Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {INSPECTION_ANGLES.map((angle) => {
                const isSelected = remarks === angle.note;
                return (
                  <button
                    key={angle.label}
                    type="button"
                    onClick={() => setRemarks(isSelected ? '' : angle.note)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 border transition active:scale-95 ${
                      isSelected
                        ? 'bg-amber-400 border-amber-400 text-slate-950 shadow shadow-amber-400/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:border-amber-400/40'
                    }`}
                  >
                    <span>{angle.icon}</span>
                    <span>{angle.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Remarks input */}
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remark (e.g. front bumper scratch)…"
              maxLength={60}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 text-xs font-mono text-white placeholder-slate-500 outline-none transition"
            />

            {/* Shutter row */}
            <div className="flex items-center justify-between gap-3">
              {/* Flip camera */}
              <button
                onClick={() => setCameraFacing((p) => (p === 'environment' ? 'user' : 'environment'))}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center gap-2 transition active:scale-95 text-xs font-mono font-bold"
              >
                <FlipHorizontal className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Flip</span>
              </button>

              {/* SHUTTER */}
              <button
                type="button"
                disabled={isCapturing || (!isCameraReady && !cameraError)}
                onClick={handleSnapAndUpload}
                className="relative group flex items-center justify-center p-1 rounded-full active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 opacity-50 group-hover:opacity-90 blur-sm transition" />
                <div className="relative w-20 h-20 rounded-full bg-amber-400 hover:bg-amber-300 border-4 border-slate-950 flex flex-col items-center justify-center shadow-2xl transition">
                  {isCapturing ? (
                    <Loader2 className="w-7 h-7 text-slate-950 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-7 h-7 text-slate-950" />
                      <span className="text-[7px] font-black font-mono uppercase tracking-wider text-slate-950 mt-0.5">
                        SNAP
                      </span>
                    </>
                  )}
                </div>
              </button>

              {/* System camera fallback */}
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center gap-2 transition active:scale-95 text-xs font-mono font-bold"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">System</span>
              </button>
            </div>

            <p className="text-[9px] font-mono text-slate-500 text-center pb-1">
              Each snap creates a new photo · Mark thumbnail directly on photos below
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 3 — CAPTURED PHOTOS GALLERY
        ══════════════════════════════════════════════ */}
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-8 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-mono font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Inspection Photos ({photosList.length}/10)</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-amber-500 font-bold">
                {photosList.length} of 10 captured
              </span>
              {photosList.length > 1 && (
                <span className="text-slate-400 hidden sm:inline">· Tap to zoom</span>
              )}
            </div>
          </div>

          {photosList.length === 0 ? (
            <div className="py-12 text-center rounded-3xl glass-modern-card space-y-2">
              <Camera className="w-9 h-9 text-amber-500/40 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No photos captured yet</p>
              <p className="text-[10px] font-mono text-slate-400">
                Press SNAP above to capture inspection angles (1 to 10 photos).
              </p>
            </div>
          ) : (
            <PhotoProvider
              speed={() => 250}
              easing={() => 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'}
              maskClosable={true}
              pullClosable={true}
              brokenElement={
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm bg-slate-950/85 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 mb-3">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <p className="text-white font-black text-sm uppercase tracking-wide">
                    Photo Unavailable
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    This photo could not be loaded from storage or is no longer accessible.
                  </p>
                </div>
              }
              loadingElement={
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                    Loading Image...
                  </span>
                </div>
              }
              overlayRender={({ index: overlayIdx }) => {
                const photo = photosList[overlayIdx];
                if (!photo) return null;
                const ts = photo.capturedAt
                  ? new Date(photo.capturedAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })
                  : null;
                return (
                  <div
                    className="absolute bottom-0 inset-x-0 z-50 px-4 pb-6 pt-10 flex flex-col gap-1.5 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, rgba(5,6,12,0.92) 0%, transparent 100%)' }}
                  >
                    <p className="text-amber-400 font-black font-mono text-sm truncate">
                      #{overlayIdx + 1} · {photo.remarks || `Inspection Angle ${overlayIdx + 1}`}
                    </p>
                    <p className="text-white/60 font-mono text-xs">
                      {currentJob.vehicleNumber} · {currentJob.vehicleName}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
                      {(photo.isThumbnail || photo.url === currentJob.thumbnailUrl) && (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Primary Thumbnail
                        </span>
                      )}
                      {ts && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ts}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }}
              toolbarRender={({ onScale, scale, rotate, onRotate, index: toolbarIdx }) => {
                const photo = photosList[toolbarIdx];
                return (
                  <div className="flex items-center gap-1">
                    {photo?.url && (
                      <a
                        href={photo.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-amber-400/30 text-white hover:text-amber-300 transition-colors"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      onClick={() => onScale(scale + 1)}
                    >
                      <span className="text-base font-bold leading-none">+</span>
                    </button>
                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      onClick={() => onScale(scale - 1)}
                    >
                      <span className="text-base font-bold leading-none">−</span>
                    </button>
                    <button
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                      onClick={() => onRotate(rotate + 90)}
                    >
                      <span className="text-xs font-bold">↻</span>
                    </button>
                  </div>
                );
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {photosList.map((photo: any, index: number) => {
                  const identifier = photo.publicId || photo.url;
                  const isThumb = Boolean(photo.isThumbnail || photo.url === currentJob.thumbnailUrl);

                  return (
                    <div
                      key={photo.publicId || photo.url || index}
                      className={`group relative rounded-2xl overflow-hidden glass-modern-card border transition-all ${
                        isThumb
                          ? 'border-amber-400 shadow-lg shadow-amber-400/10 ring-2 ring-amber-400/25'
                          : 'border-slate-200/80 dark:border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      {/* Image (click = open react-photo-view) */}
                      <PhotoView src={photo.url}>
                        <div className="relative aspect-[4/3] overflow-hidden bg-black/40 cursor-pointer">
                          <img
                            src={photo.url}
                            alt={photo.remarks || `Angle ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Thumbnail badge */}
                          {isThumb && (
                            <span className="absolute top-2 left-2 text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 flex items-center gap-1 shadow pointer-events-none z-10">
                              <Star className="w-2.5 h-2.5 fill-current" /> Thumb
                            </span>
                          )}
                          {/* Photo Sequence Badge (#1, #2, #3, ..., #10) */}
                          <span className="absolute top-2 right-2 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-black/80 text-amber-400 border border-amber-400/40 shadow-md backdrop-blur-md pointer-events-none z-10">
                            #{index + 1}
                          </span>
                          {/* Hover zoom hint */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </PhotoView>

                      {/* Card footer */}
                      <div className="px-2.5 py-2 bg-black/30 backdrop-blur-md flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-mono font-black text-amber-400 truncate">
                            {photo.remarks || `Angle #${index + 1}`}
                          </p>
                          <p className="text-[9px] font-mono text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {photo.capturedAt
                              ? new Date(photo.capturedAt).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short',
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                })
                              : 'Live Capture'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isThumb && (
                            <button
                              type="button"
                              disabled={isSettingThumb}
                              onClick={() => handleSetThumbnail(identifier)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition"
                              title="Set as Thumbnail"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isDeletingPhoto}
                            onClick={() => handleDeletePhoto(identifier)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PhotoProvider>
          )}
        </div>
      </main>

      {/* Native camera input */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraFile}
        className="hidden"
      />
    </div>
  );
};
