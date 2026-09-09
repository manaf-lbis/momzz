import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MessageSquare,
} from 'lucide-react';

export interface ViewerImage {
  url: string;
  title?: string;
  subtitle?: string;
  timestamp?: string | Date;
  remarks?: string;
  isThumbnail?: boolean;
}

interface ImageViewerModalProps {
  isOpen: boolean;
  images: ViewerImage[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(true);

  // Sync initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, images.length]);

  // Reset zoom & pan on slide change
  const handleIndexChange = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    handleIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, handleIndexChange]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    handleIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, handleIndexChange]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse pan / drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Download high-resolution image
  const handleDownload = async () => {
    const current = images[currentIndex];
    if (!current?.url) return;
    try {
      const res = await fetch(current.url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanName = (current.title || 'vehicle-photo')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .toLowerCase();
      a.download = `momzz_${cleanName}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(current.url, '_blank');
    }
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const formattedTimestamp = currentImage.timestamp
    ? new Date(currentImage.timestamp).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-2xl text-white select-none overflow-hidden">
        {/* Top Control Bar */}
        <div className="relative z-30 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 to-transparent">
          {/* Left Title & Counter */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white truncate">
                  {currentImage.title || 'Vehicle Photo'}
                </h3>
                {images.length > 1 && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-400 border border-white/10 shrink-0">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
                {currentImage.isThumbnail && (
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shrink-0">
                    Thumbnail
                  </span>
                )}
              </div>
              {currentImage.subtitle && (
                <p className="text-xs font-mono text-slate-400 truncate">
                  {currentImage.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
              title="Download Photo"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Toggle Info */}
            {(currentImage.remarks || formattedTimestamp) && (
              <button
                type="button"
                onClick={() => setShowInfo(!showInfo)}
                className={`p-2 rounded-xl border transition active:scale-95 cursor-pointer ${
                  showInfo
                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-400'
                    : 'bg-white/10 border-transparent text-white/70 hover:text-white'
                }`}
                title="Toggle Photo Details"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-300 transition active:scale-95 cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Stage: Scalable & Draggable Image Viewport */}
        <div
          className="relative flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleTap}
        >
          {/* Navigation Chevron Left */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 sm:left-6 z-20 w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 flex items-center justify-center backdrop-blur-md transition active:scale-90 cursor-pointer shadow-xl"
              title="Previous Photo (ArrowLeft)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Active Image */}
          <motion.div
            key={currentImage.url}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-full max-h-full flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <img
              src={currentImage.url}
              alt={currentImage.title || 'Inspection Photo'}
              draggable={false}
              className="max-h-[78vh] max-w-[94vw] object-contain rounded-xl shadow-2xl pointer-events-none"
            />
          </motion.div>

          {/* Navigation Chevron Right */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 sm:right-6 z-20 w-11 h-11 rounded-2xl bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 flex items-center justify-center backdrop-blur-md transition active:scale-90 cursor-pointer shadow-xl"
              title="Next Photo (ArrowRight)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Floating Zoom Controls Toolbar */}
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/75 border border-white/10 backdrop-blur-xl shadow-2xl">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-mono font-bold px-2 py-0.5 text-amber-400 min-w-[48px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {scale > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-2 rounded-xl text-amber-400 hover:bg-white/10 transition cursor-pointer ml-0.5"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Remarks & Timestamp Overlay */}
        <AnimatePresence>
          {showInfo && (currentImage.remarks || formattedTimestamp) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative z-20 px-4 py-2.5 sm:px-6 bg-black/80 border-t border-white/10 backdrop-blur-xl flex items-center justify-between gap-4 text-xs font-mono"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {formattedTimestamp && (
                  <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formattedTimestamp}</span>
                  </div>
                )}
                {currentImage.remarks && (
                  <div className="flex items-center gap-1.5 text-amber-300 truncate">
                    <span className="text-slate-500">•</span>
                    <span className="font-bold text-amber-400">Remarks:</span>
                    <span className="truncate">{currentImage.remarks}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Multi-Image Filmstrip Slider */}
        {images.length > 1 && (
          <div className="relative z-20 px-4 py-3 bg-black/90 border-t border-white/[0.08] overflow-x-auto flex items-center justify-center gap-2 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleIndexChange(idx)}
                className={`relative w-14 h-11 sm:w-16 sm:h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  currentIndex === idx
                    ? 'border-amber-400 scale-105 shadow-md shadow-amber-400/20'
                    : 'border-white/20 opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover object-center"
                />
                {img.isThumbnail && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
