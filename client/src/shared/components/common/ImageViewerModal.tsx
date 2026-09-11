import React from 'react';
import { PhotoSlider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { Star, Clock, AlertTriangle, ImageOff, X } from 'lucide-react';

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

/**
 * ImageViewerModal — powered by react-photo-view's PhotoSlider.
 * Provides pinch-to-zoom, swipe, rotate, download, and captions overlay.
 * Mobile-native feel — like a native photo app.
 */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [index, setIndex] = React.useState(initialIndex);

  // Filter out corrupted, empty, or non-URL entries
  const validImages = React.useMemo(() => {
    return (images || []).filter((img) =>
      Boolean(
        img?.url &&
          (img.url.startsWith('http://') ||
            img.url.startsWith('https://') ||
            img.url.startsWith('data:') ||
            img.url.startsWith('blob:'))
      )
    );
  }, [images]);

  React.useEffect(() => {
    if (isOpen && validImages.length > 0) {
      setIndex(Math.max(0, Math.min(initialIndex, validImages.length - 1)));
    }
  }, [isOpen, initialIndex, validImages.length]);

  if (!isOpen) return null;

  if (validImages.length === 0) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="max-w-sm w-full bg-slate-900 border border-white/10 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
            <ImageOff className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">No Vehicle Photo Found</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              No photos have been uploaded for this vehicle yet, or the image link is unavailable.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const slides = validImages.map((img, i) => ({
    key: img.url + i,
    src: img.url,
  }));

  const currentImage = validImages[index] ?? validImages[0];
  const ts = currentImage?.timestamp
    ? new Date(currentImage.timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <>
      <style>{`
        .PhotoView-Portal { z-index: 99999 !important; }
        .PhotoView-Slider__BannerWrap {
          background: rgba(6, 7, 14, 0.88) !important;
          backdrop-filter: blur(14px) !important;
          border-bottom: 1px solid rgba(251, 191, 36, 0.15) !important;
        }
        .PhotoView-Slider__Counter {
          color: #fbbf24 !important;
          font-family: ui-monospace, monospace !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          letter-spacing: 0.06em !important;
        }
        .PhotoView-Slider__ArrowLeft,
        .PhotoView-Slider__ArrowRight {
          background: rgba(0,0,0,0.55) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 14px !important;
          width: 44px !important;
          height: 44px !important;
          color: white !important;
          transition: all 0.15s ease !important;
        }
        .PhotoView-Slider__ArrowLeft:hover,
        .PhotoView-Slider__ArrowRight:hover {
          background: rgba(251, 191, 36, 0.28) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.45) !important;
        }
        .PhotoView-Slider__Backdrop {
          background: rgba(4, 5, 11, 0.97) !important;
        }
      `}</style>

      <PhotoSlider
        images={slides}
        visible={isOpen}
        onClose={onClose}
        index={index}
        onIndexChange={setIndex}
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
            <p className="text-[11px] text-slate-400 font-mono mt-1 mb-4">
              This photo could not be loaded from storage or is no longer accessible.
            </p>
            {currentImage?.url && (
              <a
                href={currentImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition"
              >
                Open Direct Link
              </a>
            )}
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
        overlayRender={() => (
          <div
            className="absolute bottom-0 inset-x-0 z-50 px-4 pb-6 pt-12 flex flex-col gap-1.5 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(4,5,11,0.92) 0%, transparent 100%)',
            }}
          >
            {currentImage?.title && (
              <p className="text-amber-400 font-black font-mono text-sm truncate">
                {currentImage.title}
              </p>
            )}
            {currentImage?.subtitle && (
              <p className="text-white/70 font-mono text-xs font-bold truncate">
                {currentImage.subtitle}
              </p>
            )}
            <div className="flex items-center gap-3 text-[10px] font-mono text-white/55 flex-wrap">
              {currentImage?.isThumbnail && (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-current" /> Primary Thumbnail
                </span>
              )}
              {ts && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {ts}
                </span>
              )}
              {currentImage?.remarks && (
                <span className="truncate text-amber-300/80">"{currentImage.remarks}"</span>
              )}
            </div>
          </div>
        )}
        toolbarRender={({ onScale, scale, rotate, onRotate }) => (
          <div className="flex items-center gap-1">
            {/* Download */}
            <a
              href={currentImage?.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-amber-400/30 text-white hover:text-amber-300 transition-colors"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            {/* Zoom in */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => onScale(scale + 1)}
              title="Zoom In"
            >
              <span className="text-base font-bold leading-none">+</span>
            </button>
            {/* Zoom out */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => onScale(scale - 1)}
              title="Zoom Out"
            >
              <span className="text-base font-bold leading-none">−</span>
            </button>
            {/* Rotate */}
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => onRotate(rotate + 90)}
              title="Rotate"
            >
              <span className="text-xs font-bold">↻</span>
            </button>
          </div>
        )}
      />
    </>
  );
};
